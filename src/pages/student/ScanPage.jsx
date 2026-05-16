import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const GPS_RADIUS_METERS = 100

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function ScanPage() {
  const { token } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [status, setStatus] = useState('checking') // checking | gps | marking | success | error
  const [message, setMessage] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (!token || !profile) return
    handleScan()
  }, [token, profile])

  const handleScan = async () => {
    setStatus('checking')

    // 1. Fetch session
    const { data: sess, error } = await supabase
      .from('sessions').select('*').eq('qr_token', token).single()

    if (error || !sess) {
      // Redirect to 404 page for invalid QR codes
      navigate('/404')
      return
    }
    setSession(sess)

    // 2. Check expiry
    if (new Date(sess.expires_at) < new Date()) {
      setStatus('error')
      setMessage('This QR code has expired. The session is now closed.')
      return
    }

    // 3. Check duplicate
    const { data: existing } = await supabase.from('attendance')
      .select('id').eq('session_id', sess.id).eq('student_id', profile.id).single()
    if (existing) {
      setStatus('error')
      setMessage('You have already been marked present for this session.')
      return
    }

    // 4. GPS check
    setStatus('gps')
    setMessage('Verifying your location...')

    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Your browser does not support location access. Please use a modern mobile browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = getDistance(
          pos.coords.latitude, pos.coords.longitude,
          sess.lat, sess.lng
        )

        if (dist > GPS_RADIUS_METERS) {
          setStatus('error')
          setMessage(
            `You are ${Math.round(dist)}m away from the classroom. ` +
            `You must be within ${GPS_RADIUS_METERS}m to mark attendance. ` +
            `Please move inside the classroom and try again.` 
          )
          return
        }

        // 5. Mark attendance
        setStatus('marking')
        const { error: attErr } = await supabase.from('attendance').insert({
          session_id:   sess.id,
          student_id:   profile.id,
          index_number: profile.index_number,
          student_name: profile.full_name,
        })

        if (attErr) {
          setStatus('error')
          setMessage(attErr.message || 'Failed to mark attendance. Please try again.')
          return
        }

        setStatus('success')
      },
      (err) => {
        setStatus('error')
        if (err.code === 1) {
          setMessage('Location permission denied. Please allow location access in your browser settings and try again.')
        } else {
          setMessage('Could not get your location. Please try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const icons = {
    checking: '🔍', gps: '📍', marking: '✏️',
    success: '✅', error: '❌'
  }

  const titles = {
    checking: 'Verifying QR Code...',
    gps:      'Checking Your Location...',
    marking:  'Marking Attendance...',
    success:  'Attendance Marked!',
    error:    'Unable to Mark Attendance',
  }

  return (
    <div className="scan-page">
      <div className="scan-card">

        {/* Header */}
        <div className="scan-header">
          <div className="nav-logo-mark">QR</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)' }}>AttendanceIQ</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Garden City University</div>
          </div>
        </div>

        {/* Student info */}
        {profile && (
          <div className="scan-student-info">
            <div className="scan-avatar">{profile.full_name?.[0]}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{profile.index_number}</div>
            </div>
          </div>
        )}

        {/* Session info */}
        {session && (
          <div className="scan-session-info">
            <div className="scan-course">{session.course_name}</div>
            <div className="scan-course-sub">
              QR valid for {session.duration_minutes} minutes
            </div>
          </div>
        )}

        {/* Status */}
        <div className={`scan-status scan-status-${status}`}>
          <div className="scan-status-icon">{icons[status]}</div>
          <div className="scan-status-title">{titles[status]}</div>

          {(status === 'checking' || status === 'gps' || status === 'marking') && (
            <div className="scan-spinner-wrap">
              <div className="scan-spinner" />
              {message && <p className="scan-message">{message}</p>}
            </div>
          )}

          {status === 'success' && (
            <div>
              <p className="scan-message scan-message-success">
                You have been successfully marked <strong>present</strong> for{' '}
                <strong>{session?.course_name}</strong>.
              </p>
              <div className="scan-success-row">
                <div className="scan-success-item">
                  <span className="scan-success-label">Index</span>
                  <span className="scan-success-val">{profile?.index_number}</span>
                </div>
                <div className="scan-success-item">
                  <span className="scan-success-label">Time</span>
                  <span className="scan-success-val">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div>
              <p className="scan-message scan-message-error">{message}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                {message.includes('away') && (
                  <button className="btn btn-primary" onClick={handleScan}>
                    Try Again
                  </button>
                )}
                <Link to="/student" className="btn btn-outline">Go to Dashboard</Link>
              </div>
            </div>
          )}
        </div>

        {status === 'success' && (
          <Link to="/student" className="btn btn-primary"
            style={{ display: 'block', textAlign: 'center', marginTop: 20 }}>
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  )
}
