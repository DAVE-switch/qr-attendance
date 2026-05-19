import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import MobileTopBar from '../../components/MobileTopBar'

/* ── SIDEBAR ── */
function Sidebar({ active, setActive }) {
  const { profile, logout } = useAuth()
  const nav = [
    { id: 'overview',       icon: '📊', label: 'Overview' },
    { id: 'create',         icon: '➕', label: 'New Session' },
    { id: 'sessions',       icon: '📋', label: 'My Sessions' },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="nav-logo-mark">QR</div>
        <div className="sidebar-logo-text">
          <h2>AttendanceIQ</h2>
          <p>Lecturer Portal</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map(n => (
          <button key={n.id} className={active === n.id ? 'active' : ''}
            onClick={() => setActive(n.id)}>
            <span className="nav-icon">{n.icon}</span> {n.label}
          </button>
        ))}
        <div className="sidebar-divider" />
        <button onClick={logout} style={{ color: '#ef4444' }}>
          <span className="nav-icon">🚪</span> Sign Out
        </button>
      </nav>
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">{profile?.full_name?.[0]}</div>
        <div className="sidebar-user-name">{profile?.full_name}</div>
        <div className="sidebar-user-role">Lecturer · {profile?.lecturer_id}</div>
      </div>
    </aside>
  )
}

/* ── OVERVIEW ── */
function Overview({ stats, setActive }) {
  return (
    <div>
      <div className="page-header">
        <h1>My Dashboard</h1>
        <p>Track your sessions and student attendance</p>
      </div>
      <div className="stats-grid">
        {[
          { icon: '📋', label: 'Total Sessions',   value: stats.sessions },
          { icon: '🟢', label: 'Live Sessions',    value: stats.live },
          { icon: '👥', label: 'Total Attendances', value: stats.attendances },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setActive('create')}>
            ➕ Create New Session
          </button>
          <button className="btn btn-outline" onClick={() => setActive('sessions')}>
            📋 View My Sessions
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── CREATE SESSION ── */
function CreateSession({ onCreated }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ courseName: '', duration: '5' })
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [location, setLocation] = useState(null)

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        toast.success('Classroom location captured ✓')
        setGpsLoading(false)
      },
      () => { toast.error('Could not get location. Allow browser location access.'); setGpsLoading(false) }
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!location) return toast.error('Please capture your classroom GPS location first')
    setLoading(true)
    try {
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + parseInt(form.duration) * 60 * 1000).toISOString()
      const { error } = await supabase.from('sessions').insert({
        lecturer_id:      profile.id,
        course_name:      form.courseName,
        qr_token:         token,
        duration_minutes: parseInt(form.duration),
        expires_at:       expiresAt,
        lat:              location.lat,
        lng:              location.lng,
      })
      if (error) throw error
      toast.success('Session created!')
      setForm({ courseName: '', duration: '5' })
      setLocation(null)
      onCreated()
    } catch (err) {
      toast.error(err.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>New Session</h1>
        <p>Generate a QR code for your class</p>
      </div>
      <div className="create-session-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* FORM */}
        <div className="card">
          <div className="card-title">Session Details</div>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Course Name</label>
              <input value={form.courseName}
                onChange={e => setForm(f => ({ ...f, courseName: e.target.value }))}
                placeholder="e.g. Introduction to Computer Science"
                required />
            </div>

            <div className="form-group">
              <label>QR Code Duration</label>
              <select value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
                <option value="2">2 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label>Classroom GPS Location</label>
              <div className="gps-box">
                {location ? (
                  <div className="gps-captured">
                    <span className="gps-ok">📍 Location captured</span>
                    <span className="gps-coords">
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </span>
                    <button type="button" className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setLocation(null)}>
                      Recapture
                    </button>
                  </div>
                ) : (
                  <div className="gps-empty">
                    <p>Your classroom location is used to verify students are present.</p>
                    <button type="button" className="btn btn-outline"
                      onClick={captureGPS} disabled={gpsLoading}>
                      {gpsLoading ? '📡 Getting location...' : '📍 Capture Classroom Location'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: 15 }}
              disabled={loading || !location}>
              {loading ? 'Creating...' : '🚀 Generate QR Session'}
            </button>
          </form>
        </div>

        {/* INFO CARD */}
        <div className="card">
          <div className="card-title">How it works</div>
          {[
            { n: '1', t: 'Fill in the form', d: 'Enter your course name and how long the QR should be valid.' },
            { n: '2', t: 'Capture your location', d: 'Click the GPS button to anchor the session to your classroom.' },
            { n: '3', t: 'Generate the QR', d: 'A unique QR code is created and the timer starts immediately.' },
            { n: '4', t: 'Display to students', d: 'Show the QR on your screen or projector. Students scan it to attend.' },
            { n: '5', t: 'Watch live & export', d: 'See attendance in real time. Download CSV from My Sessions.' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, background: '#eff6ff', color: 'var(--primary)',
                borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne', fontWeight: 800, fontSize: 13, flexShrink: 0
              }}>{s.n}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── LIVE SESSION VIEWER ── */
function LiveSession({ session, onBack }) {
  const [attendance, setAttendance] = useState([])
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(false)
  const scanUrl = `${window.location.origin}/scan/${session.qr_token}` 

  // Real-time attendance subscription
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('attendance')
        .select('*').eq('session_id', session.id)
        .order('scanned_at', { ascending: false })
      setAttendance(data || [])
    }
    load()

    const channel = supabase.channel(`session-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'attendance',
        filter: `session_id=eq.${session.id}` 
      }, payload => {
        setAttendance(prev => [payload.new, ...prev])
        toast.success(`${payload.new.student_name} marked present`)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session.id])

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const diff = new Date(session.expires_at) - new Date()
      if (diff <= 0) { setExpired(true); setTimeLeft('Expired'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [session.expires_at])

  // CSV Export
  const exportCSV = () => {
    if (attendance.length === 0) return toast.error('No attendance to export')
    const header = 'Index Number,Student Name,Time Scanned,Date\n'
    const rows = attendance.map(a => {
      const d = new Date(a.scanned_at)
      return `${a.index_number},"${a.student_name}",${d.toLocaleTimeString()},${d.toLocaleDateString()}` 
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.course_name.replace(/\s+/g, '_')}_attendance.csv` 
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  // PDF Export (using browser print functionality)
  const exportPDF = () => {
    if (attendance.length === 0) return toast.error('No attendance to export')
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    const sessionDate = new Date(session.created_at).toLocaleDateString()
    const currentTime = new Date().toLocaleString()
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${session.course_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1a56db; text-align: center; }
          .header { text-align: center; margin-bottom: 30px; }
          .session-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .attendance-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .attendance-table th, .attendance-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          .attendance-table th { background: #1a56db; color: white; }
          .attendance-table tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attendance Report</h1>
          <h2>${session.course_name}</h2>
        </div>
        
        <div class="session-info">
          <p><strong>Lecturer:</strong> ${profile?.full_name}</p>
          <p><strong>Lecturer ID:</strong> ${profile?.lecturer_id}</p>
          <p><strong>Session Date:</strong> ${sessionDate}</p>
          <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
          <p><strong>Total Attendees:</strong> ${attendance.length}</p>
          <p><strong>Generated:</strong> ${currentTime}</p>
        </div>
        
        <table class="attendance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Index Number</th>
              <th>Student Name</th>
              <th>Time Scanned</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.map((a, i) => {
              const d = new Date(a.scanned_at)
              return `
                <tr>
                  <td>${attendance.length - i}</td>
                  <td>${a.index_number}</td>
                  <td>${a.student_name}</td>
                  <td>${d.toLocaleTimeString()}</td>
                  <td>${d.toLocaleDateString()}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Garden City University · AttendanceIQ · QR Attendance System</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
      toast.success('PDF download initiated!')
    }
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 20 }}>
        ← Back to Sessions
      </button>

      <div className="page-header">
        <h1>{session.course_name}</h1>
        <p>Live attendance session</p>
      </div>

      <div className="live-session-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>

        {/* QR PANEL */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            {expired
              ? <span className="badge badge-rejected" style={{ fontSize: 13 }}>⛔ Session Expired</span>
              : <span className="badge badge-active" style={{ fontSize: 13 }}>🟢 Session Live</span>
            }
          </div>

          <div className="qr-container">
            <QRCodeSVG value={scanUrl} size={200}
              bgColor="#ffffff" fgColor="#0f172a"
              level="H" style={{ borderRadius: 8 }} />
          </div>

          <div className={`qr-timer ${expired ? 'expired' : timeLeft && parseInt(timeLeft) < 1 ? 'warning' : ''}`}>
            {expired ? 'QR Expired' : `Expires in ${timeLeft}`}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Show this QR on your projector.<br />Students scan it with their phone.
          </p>

          <div style={{ fontSize: 11, wordBreak: 'break-all', color: '#94a3b8',
            background: '#f8fafc', borderRadius: 6, padding: '8px 10px', marginBottom: 16 }}>
            {scanUrl}
          </div>

          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={exportCSV}>
              📥 Export Attendance CSV
            </button>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={exportPDF}>
              📄 Export Attendance PDF
            </button>
          </div>
        </div>

        {/* LIVE FEED */}
        <div className="card">
          <div className="card-title">
            <span>Live Attendance Feed</span>
            <span className="live-count">{attendance.length} present</span>
          </div>

          {attendance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📱</div>
              <p>Waiting for students to scan…</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Index Number</th>
                    <th>Student Name</th>
                    <th>Time Scanned</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a, i) => (
                    <tr key={a.id} className="att-row-new">
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {attendance.length - i}
                      </td>
                      <td><code className="code-chip">{a.index_number}</code></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="table-avatar" style={{ background: '#7c3aed' }}>
                            {a.student_name?.[0]}
                          </div>
                          <span style={{ fontWeight: 600 }}>{a.student_name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {new Date(a.scanned_at).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(a.scanned_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td><span className="badge badge-active">✓ Present</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── MY SESSIONS ── */
function MySessions({ lecturerId, refreshKey }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    supabase.from('sessions').select('*')
      .eq('lecturer_id', lecturerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [lecturerId, refreshKey])

  if (viewing) return <LiveSession session={viewing} onBack={() => setViewing(null)} />

  const isLive = s => new Date(s.expires_at) > new Date()

  return (
    <div>
      <div className="page-header">
        <h1>My Sessions</h1>
        <p>All sessions you have created</p>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No sessions yet — create your first one!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.course_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.duration_minutes} min</td>
                    <td>
                      {isLive(s)
                        ? <span className="badge badge-active">🟢 Live</span>
                        : <span className="badge" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Expired</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(s.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <button className="btn btn-outline" style={{ fontSize: 13 }}
                        onClick={() => setViewing(s)}>
                        👁 View & Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── MAIN ── */
export default function LecturerDashboard() {
  const { profile } = useAuth()
  const [active, setActive] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState({ sessions: 0, live: 0, attendances: 0 })

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [sess, att] = await Promise.all([
        supabase.from('sessions').select('*').eq('lecturer_id', profile.id),
        supabase.from('attendance')
          .select('id', { count: 'exact' })
          .in('session_id',
            (await supabase.from('sessions').select('id').eq('lecturer_id', profile.id))
              .data?.map(s => s.id) || []
          ),
      ])
      const now = new Date()
      setStats({
        sessions:    sess.data?.length ?? 0,
        live:        sess.data?.filter(s => new Date(s.expires_at) > now).length ?? 0,
        attendances: att.count ?? 0,
      })
    }
    load()
  }, [profile, refreshKey])

  const handleCreated = () => { setRefreshKey(k => k + 1); setActive('sessions') }

  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
      <MobileTopBar title="Lecturer Portal" />
        {active === 'overview' && <Overview stats={stats} setActive={setActive} />}
        {active === 'create'   && <CreateSession onCreated={handleCreated} />}
        {active === 'sessions' && <MySessions lecturerId={profile?.id} refreshKey={refreshKey} />}
      </main>
    </div>
  )
}
