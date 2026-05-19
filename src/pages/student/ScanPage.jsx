import { useEffect, useState, useRef } from 'react'
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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function ScanPage() {
  const { token }  = useParams()
  const { profile, loading: authLoading } = useAuth()
  const navigate   = useNavigate()
  const hasRun     = useRef(false)  // FIX 5: prevent double-run

  const [status,  setStatus]  = useState('waiting')
  const [message, setMessage] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (authLoading) return               // FIX 2: wait for auth
    if (!profile) {                       // FIX 2: redirect to login if not logged in
      navigate(`/login?redirect=/scan/${token}`)
      return
    }
    if (profile.role !== 'student') {
      setStatus('error')
      setMessage('Only students can mark attendance.')
      return
    }
    if (hasRun.current) return            // FIX 5: only run once
    hasRun.current = true
    runScan(profile, token)
  }, [authLoading, profile])

  async function runScan(prof, tok) {
    try {
      setStatus('checking')

      // 1. Fetch session
      const { data: sess, error: sessErr } = await supabase
        .from('sessions').select('*').eq('qr_token', tok).single()

      if (sessErr || !sess) {
        setStatus('error')
        setMessage('Invalid QR code. This session does not exist.')
        return
      }
      setSession(sess)

      // 2. Check expiry
      if (new Date(sess.expires_at) < new Date()) {
        setStatus('error')
        setMessage('This QR code has expired. The session is now closed.')
        return
      }

      // 3. Check duplicate — FIX 1: use maybeSingle() not single()
      const { data: existing } = await supabase.from('attendance')
        .select('id')
        .eq('session_id', sess.id)
        .eq('student_id', prof.id)
        .maybeSingle()

      if (existing) {
        setStatus('error')
        setMessage('You have already been marked present for this session.')
        return
      }

      // 4. GPS — FIX 3: wrap everything in Promise + try-catch
      setStatus('gps')
      if (!navigator.geolocation) {
        setStatus('error')
        setMessage('GPS not supported. Please use Chrome browser.')
        return
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 0
        })
      }).catch(err => {
        if (err.code === 1)
          setMessage('Location denied. Allow location in browser settings then tap Try Again.')
        else if (err.code === 2)
          setMessage('GPS unavailable. Turn on Location in your phone settings.')
        else
          setMessage('Location timed out. Please try again.')
        setStatus('error')
        return null
      })

      if (!position) return

      // 5. Distance check
      const dist = Math.round(getDistance(
        position.coords.latitude, position.coords.longitude,
        sess.lat, sess.lng
      ))

      if (dist > GPS_RADIUS_METERS) {
        setStatus('error')
        setMessage(`You are ${dist}m away from the classroom. Move inside and tap Try Again.`)
        return
      }

      // 6. Save attendance — FIX 3: inside try-catch
      setStatus('marking')
      const { error: attErr } = await supabase.from('attendance').insert({
        session_id:   sess.id,
        student_id:   prof.id,
        index_number: prof.index_number || 'N/A',
        student_name: prof.full_name    || 'Unknown',
      })

      if (attErr) {
        if (attErr.code === '23505') {
          setStatus('error')
          setMessage('You have already been marked present for this session.')
        } else {
          setStatus('error')
          setMessage('Could not save attendance: ' + attErr.message)
        }
        return
      }

      setStatus('success')

    } catch (err) {
      // FIX 3: catch-all so it NEVER shows blank
      setStatus('error')
      setMessage('Something went wrong: ' + (err?.message || 'Unknown error'))
    }
  }

  const retry = () => {
    hasRun.current = false
    setStatus('waiting')
    setMessage('')
    setTimeout(() => {
      hasRun.current = true
      runScan(profile, token)
    }, 100)
  }

  // FIX 2: Show loading while auth is loading — never blank
  if (authLoading || status === 'waiting') {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <Header />
          <div style={S.center}>
            <div style={S.spinner} />
            <p style={{ color:'#64748b', fontSize:14, marginTop:12 }}>
              {authLoading ? 'Loading your account...' : 'Starting scan...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <Header />

        {/* Student chip */}
        {profile && (
          <div style={S.chip}>
            <div style={S.avatar}>{profile.full_name?.[0] || '?'}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{profile.full_name}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{profile.index_number}</div>
            </div>
          </div>
        )}

        {/* Course chip */}
        {session && (
          <div style={S.course}>
            <div style={{ fontWeight:700, color:'#1a56db', fontSize:15 }}>{session.course_name}</div>
            <div style={{ fontSize:12, color:'#93c5fd', marginTop:2 }}>
              Valid for {session.duration_minutes} minutes
            </div>
          </div>
        )}

        {/* Status */}
        <div style={S.center}>
          <div style={{ fontSize:48, marginBottom:10 }}>
            {{ checking:'🔍', gps:'📍', marking:'✏️', success:'✅', error:'❌' }[status]}
          </div>
          <div style={{ fontWeight:800, fontSize:18, marginBottom:10, color:
            status === 'success' ? '#16a34a' : status === 'error' ? '#dc2626' : '#1a56db'
          }}>
            {{ checking:'Verifying QR Code', gps:'Checking Location',
               marking:'Saving Attendance', success:'Attendance Marked!',
               error:'Could Not Mark Attendance' }[status]}
          </div>

          {['checking','gps','marking'].includes(status) && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={S.spinner} />
              {status === 'gps' && (
                <p style={{ fontSize:12, color:'#64748b', textAlign:'center' }}>
                  Tap Allow when browser asks for location
                </p>
              )}
            </div>
          )}

          {status === 'success' && (
            <>
              <div style={{ background:'#dcfce7', borderRadius:10, padding:'12px 16px',
                fontSize:14, color:'#166534', marginTop:8, textAlign:'center' }}>
                Marked <strong>present</strong> for <strong>{session?.course_name}</strong>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:14, justifyContent:'center' }}>
                <div style={S.infoBox}>
                  <span style={S.infoLabel}>Index No.</span>
                  <span style={S.infoVal}>{profile?.index_number}</span>
                </div>
                <div style={S.infoBox}>
                  <span style={S.infoLabel}>Time</span>
                  <span style={S.infoVal}>
                    {new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
              </div>
              <Link to="/student" style={{ ...S.btnPrimary, marginTop:16, display:'block', textAlign:'center' }}>
                Back to Dashboard
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ background:'#fee2e2', borderRadius:10, padding:'12px 16px',
                fontSize:13, color:'#991b1b', marginTop:8, lineHeight:1.6 }}>
                {message}
              </div>
              <div style={{ display:'flex', gap:10, marginTop:14,
                justifyContent:'center', flexWrap:'wrap' }}>
                <button style={S.btnPrimary} onClick={retry}>🔄 Try Again</button>
                <Link to="/student" style={S.btnOutline}>Dashboard</Link>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

function Header() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20,
      paddingBottom:14, borderBottom:'1px solid #e2e8f0' }}>
      <div style={{ width:36, height:36, background:'#1a56db', color:'white',
        borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:800, fontSize:13 }}>QR</div>
      <div>
        <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>AttendanceIQ</div>
        <div style={{ fontSize:11, color:'#64748b' }}>Garden City University</div>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    padding:16, background:'linear-gradient(135deg,#080f1e 0%,#1e3a5f 100%)' },
  card: { background:'white', borderRadius:20, padding:24, width:'100%', maxWidth:420,
    boxShadow:'0 24px 60px rgba(0,0,0,0.3)' },
  center: { textAlign:'center', padding:'12px 0' },
  spinner: { width:32, height:32, border:'3px solid #e2e8f0', borderTopColor:'#1a56db',
    borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto' },
  chip: { display:'flex', alignItems:'center', gap:10, background:'#f8fafc',
    borderRadius:10, padding:'10px 14px', marginBottom:12 },
  avatar: { width:34, height:34, background:'#7c3aed', color:'white', borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:700, fontSize:14, flexShrink:0 },
  course: { background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10,
    padding:10, textAlign:'center', marginBottom:18 },
  infoBox: { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8,
    padding:'8px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:3 },
  infoLabel: { fontSize:11, color:'#64748b', textTransform:'uppercase',
    letterSpacing:'0.05em', fontWeight:600 },
  infoVal: { fontSize:15, fontWeight:700, color:'#0f172a' },
  btnPrimary: { background:'#1a56db', color:'white', border:'none', padding:'11px 20px',
    borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer', textDecoration:'none',
    display:'inline-block' },
  btnOutline: { background:'white', color:'#1a56db', border:'1.5px solid #1a56db',
    padding:'11px 20px', borderRadius:8, fontWeight:600, fontSize:14,
    cursor:'pointer', textDecoration:'none', display:'inline-block' },
}

// inject spin keyframe once
if (typeof document !== 'undefined' && !document.getElementById('scan-spin')) {
  const s = document.createElement('style')
  s.id = 'scan-spin'
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}'
  document.head.appendChild(s)
}
