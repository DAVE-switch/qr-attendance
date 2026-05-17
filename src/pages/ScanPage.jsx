import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const GPS_RADIUS_METERS = 100

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function ScanPage() {
  const { token } = useParams()
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [session, setSession] = useState(null)
  const [started, setStarted] = useState(false)

  // Wait for auth to load before doing anything
  useEffect(() => {
    if (authLoading) return

    // Not logged in — send to login then come back
    if (!profile) {
      navigate(`/login?redirect=/scan/${token}`)
      return
    }

    // Only students can scan
    if (profile.role !== 'student') {
      setStatus('error')
      setMessage('Only students can mark attendance. Please log in with a student account.')
      return
    }

    if (!started) {
      setStarted(true)
      runScan()
    }
  }, [authLoading, profile])

  const runScan = async () => {
    setStatus('checking')
    setMessage('Verifying QR code...')

    // 1. Fetch session by token
    const { data: sess, error } = await supabase
      .from('sessions').select('*').eq('qr_token', token).single()

    if (error || !sess) {
      setStatus('error')
      setMessage('Invalid QR code. This session does not exist or has been deleted.')
      return
    }
    setSession(sess)

    // 2. Check expiry
    if (new Date(sess.expires_at) < new Date()) {
      setStatus('error')
      setMessage('This QR code has expired. The session is now closed. Ask your lecturer to create a new session.')
      return
    }

    // 3. Check duplicate
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('session_id', sess.id)
      .eq('student_id', profile.id)
      .maybeSingle()

    if (existing) {
      setStatus('error')
      setMessage(`You have already been marked present for ${sess.course_name}. Each student can only scan once per session.`)
      return
    }

    // 4. GPS check
    setStatus('gps')
    setMessage('Checking your location — please allow location access...')

    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Your browser does not support location access. Please use Chrome or Safari on your phone.')
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
            `You are ${Math.round(dist)} metres away from the classroom. ` +
            `You must be within ${GPS_RADIUS_METERS} metres to mark attendance. ` +
            `Please move inside the classroom and try again.` 
          )
          return
        }

        // 5. Mark attendance
        setStatus('marking')
        setMessage('Marking your attendance...')

        const { error: attErr } = await supabase.from('attendance').insert({
          session_id:   sess.id,
          student_id:   profile.id,
          index_number: profile.index_number,
          student_name: profile.full_name,
        })

        if (attErr) {
          // Handle duplicate gracefully
          if (attErr.code === '23505') {
            setStatus('error')
            setMessage('You have already been marked present for this session.')
          } else {
            setStatus('error')
            setMessage('Failed to record attendance. Please try again.')
          }
          return
        }

        setStatus('success')
      },
      (err) => {
        setStatus('error')
        if (err.code === 1) {
          setMessage(
            'Location permission was denied. ' +
            'Please go to your browser settings, allow location for this site, and try again.'
          )
        } else if (err.code === 2) {
          setMessage('Could not detect your location. Make sure GPS is enabled on your phone.')
        } else {
          setMessage('Location request timed out. Please try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // Show loading while auth loads
  if (authLoading) return (
    <div className="scan-page">
      <div className="scan-card">
        <div className="scan-status">
          <div className="scan-spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    </div>
  )

  const icons  = { idle: '📱', checking: '🔍', gps: '📍', marking: '✏️', success: '✅', error: '❌' }
  const titles = {
    idle:     'Preparing...',
    checking: 'Verifying QR Code',
    gps:      'Checking Location',
    marking:  'Marking Attendance',
    success:  'Attendance Marked!',
    error:    'Could Not Mark Attendance',
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
            <div className="scan-course-sub">QR valid for {session.duration_minutes} minutes</div>
          </div>
        )}

        {/* Status display */}
        <div className={`scan-status scan-status-${status}`}>
          <div className="scan-status-icon">{icons[status]}</div>
          <div className="scan-status-title">{titles[status]}</div>

          {['checking', 'gps', 'marking'].includes(status) && (
            <div className="scan-spinner-wrap">
              <div className="scan-spinner" />
              <p className="scan-message">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <p className="scan-message scan-message-success">
                You have been successfully marked <strong>present</strong> for{' '}
                <strong>{session?.course_name}</strong>.
              </p>
              <div className="scan-success-row">
                <div className="scan-success-item">
                  <span className="scan-success-label">Index No.</span>
                  <span className="scan-success-val">{profile?.index_number}</span>
                </div>
                <div className="scan-success-item">
                  <span className="scan-success-label">Time</span>
                  <span className="scan-success-val">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <Link to="/student" className="btn btn-primary"
                style={{ display: 'block', textAlign: 'center', marginTop: 20 }}>
                Back to Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="scan-message scan-message-error">{message}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                {(message.includes('metres away') || message.includes('timed out') || message.includes('denied')) && (
                  <button className="btn btn-primary" onClick={runScan}>
                    🔄 Try Again
                  </button>
                )}
                <Link to="/student" className="btn btn-outline">Go to Dashboard</Link>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
