import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const GPS_RADIUS_METERS = 100

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function ScanPage() {
  const { token }   = useParams()
  const { profile, loading: authLoading } = useAuth()
  const navigate    = useNavigate()
  const hasRun      = useRef(false)

  const [step, setStep]   = useState('waiting')
  const [msg,  setMsg]    = useState('')
  const [course, setCourse] = useState('')

  function showError(text) {
    setStep('error')
    setMsg(String(text))
  }

  useEffect(() => {
    if (authLoading) return
    if (!profile) { navigate(`/login?redirect=/scan/${token}`); return }
    if (profile.role !== 'student') { showError('Only students can scan.'); return }
    if (hasRun.current) return   // prevent double-run
    hasRun.current = true
    runScan(profile, token)
  }, [authLoading, profile])

  // ── main scan logic — ALL errors caught ──
  async function runScan(prof, tok) {
    try {
      setStep('checking')

      // 1. Get session
      let sess
      try {
        const { data, error } = await supabase
          .from('sessions').select('*').eq('qr_token', tok).single()
        if (error) throw new Error('QR not found: ' + error.message)
        sess = data
      } catch (e) {
        showError('Invalid QR code. This session does not exist.'); return
      }

      setCourse(sess.course_name)

      // 2. Expired?
      if (new Date(sess.expires_at) < new Date()) {
        showError('This QR code has expired. Ask your lecturer to create a new session.'); return
      }

      // 3. Already scanned?
      try {
        const { data: dup } = await supabase.from('attendance')
          .select('id').eq('session_id', sess.id).eq('student_id', prof.id).maybeSingle()
        if (dup) { showError('You are already marked present for this session.'); return }
      } catch (e) { /* ignore duplicate check errors, proceed */ }

      // 4. GPS
      setStep('gps')

      if (!navigator.geolocation) {
        showError('GPS not supported. Please use Chrome browser.'); return
      }

      // Wrap geolocation in a Promise so we can await it and catch properly
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 0
        })
      }).catch(err => {
        if (err.code === 1) showError('Location access denied. Please allow location in your browser settings and tap Try Again.')
        else if (err.code === 2) showError('GPS unavailable. Make sure your phone location is turned ON.')
        else showError('Location timed out. Please try again.')
        return null
      })

      if (!position) return  // error already shown above

      // 5. Distance check
      const distM = Math.round(getDistance(
        position.coords.latitude,
        position.coords.longitude,
        sess.lat,
        sess.lng
      ))

      if (distM > GPS_RADIUS_METERS) {
        showError(`You are ${distM}m from the classroom. You must be within ${GPS_RADIUS_METERS}m. Move inside and tap Try Again.`)
        return
      }

      // 6. Save attendance
      setStep('saving')

      const { error: insErr } = await supabase.from('attendance').insert({
        session_id:   sess.id,
        student_id:   prof.id,
        index_number: prof.index_number || 'N/A',
        student_name: prof.full_name    || 'Unknown',
      })

      if (insErr) {
        if (insErr.code === '23505') {
          showError('Already marked present for this session.')
        } else {
          showError('Could not save: ' + insErr.message)
        }
        return
      }

      setStep('success')

    } catch (err) {
      // catch-all — should never reach here but ensures no blank screen
      showError('Something went wrong: ' + (err?.message || 'Unknown error'))
    }
  }

  const S = {
    page: { minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:16,
      background:'linear-gradient(135deg,#080f1e 0%,#1e3a5f 100%)' },
    card: { background:'white', borderRadius:20, padding:24, width:'100%',
      maxWidth:400, boxShadow:'0 24px 60px rgba(0,0,0,0.3)' },
    header: { display:'flex', alignItems:'center', gap:10, marginBottom:20,
      paddingBottom:14, borderBottom:'1px solid #e2e8f0' },
    logo: { width:36, height:36, background:'#1a56db', color:'white',
      borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:800, fontSize:13 },
    chip: { display:'flex', alignItems:'center', gap:10, background:'#f8fafc',
      borderRadius:10, padding:'10px 14px', marginBottom:12 },
    avatar: { width:34, height:34, background:'#7c3aed', color:'white',
      borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
      fontWeight:700, fontSize:14, flexShrink:0 },
    course: { background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10,
      padding:'10px', textAlign:'center', marginBottom:18,
      fontWeight:700, color:'#1a56db', fontSize:14 },
    center: { textAlign:'center', padding:'16px 0' },
    icon: { fontSize:44, marginBottom:8 },
    title: { fontWeight:800, fontSize:17, marginBottom:8, fontFamily:'sans-serif' },
    spinner: { width:30, height:30, border:'3px solid #e2e8f0',
      borderTopColor:'#1a56db', borderRadius:'50%',
      animation:'spin 0.7s linear infinite', margin:'0 auto 10px' },
    successBox: { background:'#dcfce7', borderRadius:10, padding:'12px 14px',
      fontSize:13, color:'#166534', lineHeight:1.6, marginTop:10 },
    errorBox: { background:'#fee2e2', borderRadius:10, padding:'12px 14px',
      fontSize:13, color:'#991b1b', lineHeight:1.6, marginTop:10 },
    btnPrimary: { background:'#1a56db', color:'white', border:'none',
      padding:'11px 20px', borderRadius:8, fontWeight:600,
      fontSize:14, cursor:'pointer', textDecoration:'none',
      display:'inline-block', textAlign:'center' },
    btnOutline: { background:'white', color:'#1a56db',
      border:'1.5px solid #1a56db', padding:'11px 20px',
      borderRadius:8, fontWeight:600, fontSize:14,
      cursor:'pointer', textDecoration:'none',
      display:'inline-block', textAlign:'center' },
    row: { display:'flex', gap:10, marginTop:14,
      justifyContent:'center', flexWrap:'wrap' },
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* Header */}
        <div style={S.header}>
          <div style={S.logo}>QR</div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>AttendanceIQ</div>
            <div style={{ fontSize:11, color:'#64748b' }}>Garden City University</div>
          </div>
        </div>

        {/* Student */}
        {profile && (
          <div style={S.chip}>
            <div style={S.avatar}>{profile.full_name?.[0] || '?'}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{profile.full_name}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{profile.index_number}</div>
            </div>
          </div>
        )}

        {/* Course */}
        {course && <div style={S.course}>{course}</div>}

        {/* States */}
        {(authLoading || step === 'waiting') && (
          <div style={S.center}>
            <div style={S.icon}>⏳</div>
            <div style={{ ...S.title, color:'#64748b' }}>Loading...</div>
            <div style={S.spinner} />
          </div>
        )}

        {step === 'checking' && (
          <div style={S.center}>
            <div style={S.icon}>🔍</div>
            <div style={{ ...S.title, color:'#1a56db' }}>Verifying QR Code</div>
            <div style={S.spinner} />
          </div>
        )}

        {step === 'gps' && (
          <div style={S.center}>
            <div style={S.icon}>📍</div>
            <div style={{ ...S.title, color:'#1a56db' }}>Checking Location</div>
            <div style={S.spinner} />
            <p style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
              Tap Allow when your browser asks for location
            </p>
          </div>
        )}

        {step === 'saving' && (
          <div style={S.center}>
            <div style={S.icon}>✏️</div>
            <div style={{ ...S.title, color:'#1a56db' }}>Saving Attendance</div>
            <div style={S.spinner} />
          </div>
        )}

        {step === 'success' && (
          <div style={S.center}>
            <div style={S.icon}>✅</div>
            <div style={{ ...S.title, color:'#16a34a' }}>Attendance Marked!</div>
            <div style={S.successBox}>
              Marked <strong>present</strong> for <strong>{course}</strong> at{' '}
              {new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
            </div>
            <div style={{ ...S.row, marginTop:16 }}>
              <Link to="/student" style={S.btnPrimary}>Back to Dashboard</Link>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div style={S.center}>
            <div style={S.icon}>❌</div>
            <div style={{ ...S.title, color:'#dc2626' }}>Could Not Mark Attendance</div>
            <div style={S.errorBox}>{msg}</div>
            <div style={S.row}>
              {(msg.includes('away') || msg.includes('denied') ||
                msg.includes('timed out') || msg.includes('unavailable') ||
                msg.includes('Try Again')) && (
                <button style={S.btnPrimary}
                  onClick={() => { hasRun.current = false; setStep('waiting'); runScan(profile, token) }}>
                  🔄 Try Again
                </button>
              )}
              <Link to="/student" style={S.btnOutline}>Dashboard</Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
