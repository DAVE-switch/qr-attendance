import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function ScanPage() {
  const { token }  = useParams()
  const { profile, loading: authLoading } = useAuth()
  const navigate   = useNavigate()
  const hasRun     = useRef(false)

  const [status,  setStatus]  = useState('waiting')
  const [message, setMessage] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      navigate(`/login?redirect=/scan/${token}`)
      return
    }
    if (profile.role !== 'student') {
      setStatus('error')
      setMessage('Only students can mark attendance.')
      return
    }
    if (hasRun.current) return
    hasRun.current = true
    runScan()
  }, [authLoading, profile])

  async function runScan() {
    try {
      setStatus('checking')

      // 1. Get session
      const { data: sess, error: sessErr } = await supabase
        .from('sessions').select('*').eq('qr_token', token).single()

      if (sessErr || !sess) {
        setStatus('error')
        setMessage('Invalid QR code. This session does not exist.')
        return
      }
      setSession(sess)

      // 2. Check expiry
      if (new Date(sess.expires_at) < new Date()) {
        setStatus('error')
        setMessage('This QR code has expired. Ask your lecturer to start a new session.')
        return
      }

      // 3. Check duplicate — maybeSingle so it doesn't throw if no row
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('session_id', sess.id)
        .eq('student_id', profile.id)
        .maybeSingle()

      if (existing) {
        setStatus('error')
        setMessage('You have already been marked present for this session.')
        return
      }

      // 4. Save attendance — no GPS needed
      setStatus('marking')
      const { error: attErr } = await supabase.from('attendance').insert({
        session_id:   sess.id,
        student_id:   profile.id,
        index_number: profile.index_number || 'N/A',
        student_name: profile.full_name    || 'Unknown',
      })

      if (attErr) {
        if (attErr.code === '23505') {
          setStatus('error')
          setMessage('You have already been marked present for this session.')
        } else {
          setStatus('error')
          setMessage('Could not save: ' + attErr.message)
        }
        return
      }

      setStatus('success')

    } catch (err) {
      setStatus('error')
      setMessage('Something went wrong: ' + (err?.message || 'Please try again.'))
    }
  }

  const retry = () => {
    hasRun.current = false
    setStatus('waiting')
    setTimeout(() => {
      hasRun.current = true
      runScan()
    }, 200)
  }

  const stateIcon = { waiting:'⏳', checking:'🔍', marking:'✏️', success:'✅', error:'❌' }
  const stateTitle = {
    waiting:  'Loading...',
    checking: 'Verifying QR Code',
    marking:  'Marking Attendance',
    success:  'Attendance Marked!',
    error:    'Could Not Mark Attendance',
  }
  const isLoading = ['waiting','checking','marking'].includes(status)

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={S.card}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.logo}>QR</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>AttendanceIQ</div>
            <div style={{ fontSize:11, color:'#64748b' }}>Garden City University</div>
          </div>
        </div>

        {/* Student info */}
        {profile && (
          <div style={S.chip}>
            <div style={S.avatar}>{profile.full_name?.[0] || '?'}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:'#0f172a' }}>{profile.full_name}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{profile.index_number}</div>
            </div>
          </div>
        )}

        {/* Session info */}
        {session && (
          <div style={S.sessionBox}>
            <div style={{ fontWeight:700, color:'#1a56db', fontSize:15 }}>{session.course_name}</div>
            <div style={{ fontSize:12, color:'#93c5fd', marginTop:3 }}>
              Session · {session.duration_minutes} min QR
            </div>
          </div>
        )}

        {/* Status */}
        <div style={{ textAlign:'center', padding:'16px 0' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>{stateIcon[status]}</div>

          <div style={{
            fontWeight:800, fontSize:20, marginBottom:14,
            color: status==='success' ? '#16a34a' : status==='error' ? '#dc2626' : '#1a56db'
          }}>
            {stateTitle[status]}
          </div>

          {isLoading && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={S.spinner} />
              <p style={{ fontSize:13, color:'#64748b' }}>
                {status === 'checking' && 'Checking your QR code…'}
                {status === 'marking'  && 'Recording your attendance…'}
                {status === 'waiting'  && 'Loading your profile…'}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div style={S.successBox}>
                ✅ You are marked <strong>present</strong> for{' '}
                <strong>{session?.course_name}</strong>
              </div>
              <div style={S.infoRow}>
                <div style={S.infoBox}>
                  <span style={S.infoLabel}>Index No.</span>
                  <span style={S.infoVal}>{profile?.index_number}</span>
                </div>
                <div style={S.infoBox}>
                  <span style={S.infoLabel}>Time</span>
                  <span style={S.infoVal}>
                    {new Date().toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <div style={S.infoBox}>
                  <span style={S.infoLabel}>Date</span>
                  <span style={S.infoVal}>
                    {new Date().toLocaleDateString('en-GB',{ day:'numeric', month:'short' })}
                  </span>
                </div>
              </div>
              <Link to="/student" style={{ ...S.btnPrimary, display:'block', textAlign:'center', marginTop:20 }}>
                Back to Dashboard
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div style={S.errorBox}>{message}</div>
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
                {!message.includes('already') && (
                  <button style={S.btnPrimary} onClick={retry}>🔄 Try Again</button>
                )}
                <Link to="/student" style={S.btnOutline}>Go to Dashboard</Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

const S = {
  page:{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    padding:16, background:'linear-gradient(135deg,#080f1e 0%,#1e3a5f 100%)' },
  card:{ background:'white', borderRadius:20, padding:24, width:'100%', maxWidth:420,
    boxShadow:'0 24px 60px rgba(0,0,0,0.3)' },
  header:{ display:'flex', alignItems:'center', gap:10, marginBottom:20,
    paddingBottom:14, borderBottom:'1px solid #e2e8f0' },
  logo:{ width:36, height:36, background:'#1a56db', color:'white', borderRadius:8,
    display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13 },
  chip:{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc',
    borderRadius:10, padding:'10px 14px', marginBottom:12 },
  avatar:{ width:34, height:34, background:'#7c3aed', color:'white', borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:700, fontSize:14, flexShrink:0 },
  sessionBox:{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10,
    padding:12, textAlign:'center', marginBottom:18 },
  spinner:{ width:36, height:36, border:'3px solid #e2e8f0', borderTopColor:'#1a56db',
    borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto' },
  successBox:{ background:'#dcfce7', borderRadius:10, padding:'12px 16px',
    fontSize:14, color:'#166534', lineHeight:1.6 },
  errorBox:{ background:'#fee2e2', borderRadius:10, padding:'12px 16px',
    fontSize:13, color:'#991b1b', lineHeight:1.6 },
  infoRow:{ display:'flex', gap:10, justifyContent:'center', marginTop:16, flexWrap:'wrap' },
  infoBox:{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8,
    padding:'8px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  infoLabel:{ fontSize:10, color:'#64748b', textTransform:'uppercase',
    letterSpacing:'0.05em', fontWeight:600 },
  infoVal:{ fontSize:14, fontWeight:700, color:'#0f172a' },
  btnPrimary:{ background:'#1a56db', color:'white', border:'none', padding:'12px 24px',
    borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer', textDecoration:'none' },
  btnOutline:{ background:'white', color:'#1a56db', border:'1.5px solid #1a56db',
    padding:'12px 24px', borderRadius:8, fontWeight:600, fontSize:14,
    cursor:'pointer', textDecoration:'none' },
}
