import { useEffect, useState } from 'react'
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
  const { token } = useParams()
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]       = useState('waiting') 
  const [msg, setMsg]         = useState('')
  const [course, setCourse]   = useState('')
  const [dist, setDist]       = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      navigate(`/login?redirect=/scan/${token}`)
      return
    }
    if (profile.role !== 'student') {
      setStep('error')
      setMsg('Only students can mark attendance.')
      return
    }
    startScan()
  }, [authLoading, profile])

  async function startScan() {
    try {
      setStep('checking')

      // 1. Get session
      const { data: sess, error: sessErr } = await supabase
        .from('sessions').select('*').eq('qr_token', token).single()

      if (sessErr || !sess) {
        setStep('error'); setMsg('Invalid or expired QR code. Ask your lecturer to generate a new one.'); return
      }
      setCourse(sess.course_name)

      // 2. Expired?
      if (new Date(sess.expires_at) < new Date()) {
        setStep('error'); setMsg('This QR code has expired. The session is now closed.'); return
      }

      // 3. Already scanned?
      const { data: dup } = await supabase.from('attendance')
        .select('id').eq('session_id', sess.id).eq('student_id', profile.id).maybeSingle()
      if (dup) {
        setStep('error'); setMsg('You have already been marked present for this session.'); return
      }

      // 4. GPS
      setStep('gps')
      if (!navigator.geolocation) {
        setStep('error'); setMsg('Your browser does not support GPS. Please use Chrome.'); return
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const d = Math.round(getDistance(
            pos.coords.latitude, pos.coords.longitude, sess.lat, sess.lng
          ))
          setDist(d)

          if (d > GPS_RADIUS_METERS) {
            setStep('error')
            setMsg(`You are ${d}m away from the classroom. Move inside and try again.`)
            return
          }

          // 5. Insert
          setStep('saving')
          const { error: insErr } = await supabase.from('attendance').insert({
            session_id: sess.id, student_id: profile.id,
            index_number: profile.index_number, student_name: profile.full_name,
          })

          if (insErr) {
            if (insErr.code === '23505') {
              setStep('error'); setMsg('Already marked present for this session.')
            } else {
              setStep('error'); setMsg(`Database error: ${insErr.message}`)
            }
            return
          }
          setStep('success')
        },
        (err) => {
          setStep('error')
          if (err.code === 1) setMsg('Location denied. Go to browser Settings → allow Location for this site, then Try Again.')
          else if (err.code === 2) setMsg('GPS unavailable. Make sure Location is ON in your phone settings.')
          else setMsg('Location timed out. Try again.')
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    } catch (err) {
      setStep('error')
      setMsg(`Unexpected error: ${err.message}. Please try again.`)
    }
  }

  // ── ALWAYS render something visible ──
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
      background: 'linear-gradient(135deg, #080f1e 0%, #1e3a5f 100%)'
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.3)'
      }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24,
          paddingBottom:16, borderBottom:'1px solid #e2e8f0' }}>
          <div style={{ width:38, height:38, background:'#1a56db', color:'white',
            borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:800, fontSize:13, fontFamily:'sans-serif' }}>QR</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>AttendanceIQ</div>
            <div style={{ fontSize:12, color:'#64748b' }}>Garden City University</div>
          </div>
        </div>

        {/* Student chip */}
        {profile && (
          <div style={{ display:'flex', alignItems:'center', gap:10,
            background:'#f8fafc', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
            <div style={{ width:36, height:36, background:'#7c3aed', color:'white',
              borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:15 }}>{profile.full_name?.[0]}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{profile.full_name}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{profile.index_number}</div>
            </div>
          </div>
        )}

        {/* Course chip */}
        {course && (
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe',
            borderRadius:10, padding:'10px 14px', marginBottom:20, textAlign:'center' }}>
            <div style={{ fontWeight:700, color:'#1a56db', fontSize:15 }}>{course}</div>
          </div>
        )}

        {/* Auth loading */}
        {authLoading && <StatusBox icon="⏳" title="Loading..." color="#1a56db" />}

        {/* Checking */}
        {step === 'checking' && <StatusBox icon="🔍" title="Verifying QR Code..." spin color="#1a56db" />}

        {/* GPS */}
        {step === 'gps' && (
          <StatusBox icon="📍" title="Checking your location..." spin color="#1a56db">
            <p style={{ fontSize:13, color:'#64748b', textAlign:'center', marginTop:8 }}>
              Please allow location access when your browser asks
            </p>
          </StatusBox>
        )}

        {/* Saving */}
        {step === 'saving' && <StatusBox icon="✏️" title="Recording attendance..." spin color="#1a56db" />}

        {/* Success */}
        {step === 'success' && (
          <StatusBox icon="✅" title="Attendance Marked!" color="#16a34a">
            <div style={{ background:'#dcfce7', borderRadius:10, padding:'12px 16px',
              marginTop:12, textAlign:'center', fontSize:14, color:'#166534' }}>
              You are marked <strong>present</strong> for <strong>{course}</strong>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:14, justifyContent:'center' }}>
              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0',
                borderRadius:8, padding:'8px 16px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:'0.05em' }}>Index No.</div>
                <div style={{ fontWeight:700, fontSize:15 }}>{profile?.index_number}</div>
              </div>
              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0',
                borderRadius:8, padding:'8px 16px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase',
                  letterSpacing:'0.05em' }}>Time</div>
                <div style={{ fontWeight:700, fontSize:15 }}>
                  {new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            </div>
            <Link to="/student" style={{ display:'block', textAlign:'center',
              marginTop:16, background:'#1a56db', color:'white', padding:'11px',
              borderRadius:8, fontWeight:600, textDecoration:'none', fontSize:14 }}>
              Back to Dashboard
            </Link>
          </StatusBox>
        )}

        {/* Error */}
        {step === 'error' && (
          <StatusBox icon="❌" title="Could Not Mark Attendance" color="#dc2626">
            <div style={{ background:'#fee2e2', borderRadius:10, padding:'12px 16px',
              marginTop:12, fontSize:13, color:'#991b1b', lineHeight:1.6 }}>
              {msg}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap', justifyContent:'center' }}>
              {(msg.includes('away') || msg.includes('denied') || msg.includes('timed out') || msg.includes('unavailable')) && (
                <button onClick={startScan}
                  style={{ background:'#1a56db', color:'white', border:'none',
                    padding:'10px 20px', borderRadius:8, fontWeight:600,
                    fontSize:14, cursor:'pointer' }}>
                  🔄 Try Again
                </button>
              )}
              <Link to="/student"
                style={{ background:'white', color:'#1a56db', border:'1.5px solid #1a56db',
                  padding:'10px 20px', borderRadius:8, fontWeight:600,
                  fontSize:14, textDecoration:'none' }}>
                Dashboard
              </Link>
            </div>
          </StatusBox>
        )}

      </div>
    </div>
  )
}

function StatusBox({ icon, title, color, spin, children }) {
  return (
    <div style={{ textAlign:'center', padding:'12px 0' }}>
      <div style={{ fontSize:48, marginBottom:10 }}>{icon}</div>
      <div style={{ fontWeight:800, fontSize:18, color: color || '#0f172a',
        marginBottom:8, fontFamily:'sans-serif' }}>{title}</div>
      {spin && (
        <div style={{ width:32, height:32, border:'3px solid #e2e8f0',
          borderTopColor: color || '#1a56db', borderRadius:'50%',
          animation:'spin 0.7s linear infinite', margin:'0 auto 8px' }} />
      )}
      {children}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
