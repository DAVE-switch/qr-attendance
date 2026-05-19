import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import MobileTopBar from '../../components/MobileTopBar'

/* ── SIDEBAR ── */
function Sidebar({ active, setActive }) {
  const { profile, logout } = useAuth()
  const nav = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'courses',  icon: '📚', label: 'My Courses' },
    { id: 'sessions', icon: '📋', label: 'Session History' },
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

/* ── OVERVIEW — removed Total Attendances ── */
function Overview({ stats, setActive }) {
  return (
    <div>
      <div className="page-header">
        <h1>My Dashboard</h1>
        <p>Track your courses and student attendance</p>
      </div>
      <div className="stats-grid">
        {[
          { icon: '📚', label: 'Registered Courses', value: stats.courses },
          { icon: '🟢', label: 'Active Sessions',    value: stats.live },
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
          <button className="btn btn-primary" onClick={() => setActive('courses')}>
            📚 Manage Courses
          </button>
          <button className="btn btn-outline" onClick={() => setActive('sessions')}>
            📋 View Sessions
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── LIVE SESSION ── */
function LiveSession({ session, onBack }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [attendance, setAttendance] = useState([])
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = new Date(session.expires_at) - new Date()
      if (remaining <= 0) { setExpired(true); setTimeLeft(0); }
      else setTimeLeft(Math.floor(remaining / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [session])

  useEffect(() => {
    // Load existing attendance
    supabase.from('attendance').select('*')
      .eq('session_id', session.id)
      .order('scanned_at', { ascending: false })
      .then(({ data }) => setAttendance(data || []))

    // Real-time subscription
    const channel = supabase.channel(`attendance-${session.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance', filter: `session_id=eq.${session.id}` },
        payload => {
          setAttendance(prev => [payload.new, ...prev])
          toast.success(`${payload.new.student_name} marked present!`)
        }
      ).subscribe()

    return () => supabase.removeChannel(channel)
  }, [session.id])

  const exportCSV = () => {
    if (!attendance.length) return toast.error('No attendance to export')
    const header = 'Index Number,Student Name,Time Scanned,Date\n'
    const rows = attendance.map(a => {
      const d = new Date(a.scanned_at)
      return `${a.index_number},"${a.student_name}",${d.toLocaleTimeString()},${d.toLocaleDateString()}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.course_name}_${new Date().toISOString().slice(0,10)}_attendance.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  const stopSession = async () => {
    await supabase.from('sessions').update({ expires_at: new Date().toISOString() }).eq('id', session.id)
    toast.success('Session stopped')
    onBack()
  }

  const scanUrl = `${window.location.origin}/scan/${session.qr_token}`
  const mins = Math.floor(timeLeft / 60)
  const secs = (timeLeft % 60).toString().padStart(2, '0')

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to Courses
      </button>
      <div className="page-header">
        <h1>Live Session</h1>
        <p>{session.course_name}</p>
      </div>

      <div className="live-session-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>

        {/* QR Panel */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            {expired
              ? <span className="badge badge-rejected">⛔ Session Ended</span>
              : <span className="badge badge-active">🟢 Live</span>
            }
          </div>
          <div className="qr-container">
            <QRCodeSVG value={scanUrl} size={190} bgColor="#fff" fgColor="#0f172a" level="H" />
          </div>
          <div className={`qr-timer ${expired ? 'expired' : ''}`}>
            {expired ? 'Session Closed' : `${mins}:${secs} left`}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Show on your projector.<br />Students scan with their phone.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={exportCSV}>
              📥 Export CSV
            </button>
            {!expired && (
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={stopSession}>
                ⏹ Stop Session
              </button>
            )}
          </div>
        </div>

        {/* Live Feed */}
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
                    <th>Time</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a, i) => (
                    <tr key={a.id} className="att-row-new">
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{attendance.length - i}</td>
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

/* ── MY COURSES ── */
function Courses({ profile }) {
  const [courses, setCourses]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [liveSession, setLiveSession] = useState(null)
  const [form, setForm] = useState({
    courseCode: '', courseName: '', semester: '2025/2026',
    sessionDuration: '5', gpsLat: null, gpsLng: null
  })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('courses').select('*')
      .eq('lecturer_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, gpsLat: pos.coords.latitude, gpsLng: pos.coords.longitude }))
        toast.success('Classroom location captured ✓')
        setGpsLoading(false)
      },
      () => { toast.error('Could not get location'); setGpsLoading(false) }
    )
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.gpsLat) return toast.error('Please capture classroom GPS first')
    setSaving(true)
    try {
      const { error } = await supabase.from('courses').insert({
        lecturer_id:      profile.id,
        course_code:      form.courseCode.toUpperCase(),
        course_name:      form.courseName,
        semester:         form.semester,
        gps_lat:          form.gpsLat,
        gps_lng:          form.gpsLng,
        session_duration: parseInt(form.sessionDuration),
        is_active:        true,
      })
      if (error) throw error
      toast.success('Course registered!')
      setForm({ courseCode:'', courseName:'', semester:'2025/2026', sessionDuration:'5', gpsLat:null, gpsLng:null })
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  const deleteCourse = async (id) => {
    if (!confirm('Remove this course?')) return
    await supabase.from('courses').update({ is_active: false }).eq('id', id)
    toast.success('Course removed')
    load()
  }

  const startSession = async (course) => {
    try {
      const token     = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + course.session_duration * 60 * 1000).toISOString()
      const { data, error } = await supabase.from('sessions').insert({
        lecturer_id:      profile.id,
        course_id:        course.id,
        course_name:      `${course.course_code} — ${course.course_name}`,
        qr_token:         token,
        duration_minutes: course.session_duration,
        expires_at:       expiresAt,
        lat:              course.gps_lat,
        lng:              course.gps_lng,
      }).select().single()
      if (error) throw error
      toast.success(`Session started for ${course.course_code}!`)
      setLiveSession(data)
    } catch (err) {
      toast.error('Failed to start session: ' + err.message)
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  if (liveSession) return <LiveSession session={liveSession} onBack={() => setLiveSession(null)} />

  return (
    <div>
      <div className="page-header">
        <h1>My Courses</h1>
        <p>Register your courses once — start sessions with one tap</p>
      </div>

      {!showForm && (
        <button className="btn btn-primary" style={{ marginBottom: 20 }}
          onClick={() => setShowForm(true)}>
          + Register New Course
        </button>
      )}

      {/* REGISTER FORM */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title">Register New Course</div>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Course Code</label>
                <input value={form.courseCode} onChange={set('courseCode')}
                  placeholder="e.g. CS301" required />
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input value={form.courseName} onChange={set('courseName')}
                  placeholder="e.g. Data Structures" required />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <select value={form.semester} onChange={set('semester')}>
                  <option>2025/2026</option>
                  <option>2024/2025</option>
                </select>
              </div>
              <div className="form-group">
                <label>Default QR Duration</label>
                <select value={form.sessionDuration} onChange={set('sessionDuration')}>
                  <option value="2">2 minutes</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Classroom GPS</label>
              <div className="gps-box">
                {form.gpsLat ? (
                  <div className="gps-captured">
                    <span className="gps-ok">📍 Location captured</span>
                    <span className="gps-coords">{form.gpsLat.toFixed(5)}, {form.gpsLng.toFixed(5)}</span>
                    <button type="button" className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setForm(f => ({ ...f, gpsLat: null, gpsLng: null }))}>
                      Recapture
                    </button>
                  </div>
                ) : (
                  <div className="gps-empty">
                    <p>Save your classroom location once — used every session.</p>
                    <button type="button" className="btn btn-outline"
                      onClick={captureGPS} disabled={gpsLoading}>
                      {gpsLoading ? '📡 Getting location...' : '📍 Capture Classroom GPS'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary"
                disabled={saving || !form.gpsLat}>
                {saving ? 'Saving...' : '✓ Save Course'}
              </button>
              <button type="button" className="btn btn-ghost"
                onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* COURSES LIST */}
      {loading ? (
        <div className="empty-state"><p>Loading courses...</p></div>
      ) : courses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p>No courses yet. Click "Register New Course" to get started.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {courses.map(c => (
            <div key={c.id} className="card">
              {/* Course Info */}
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  background: 'var(--primary)', color: 'white',
                  padding: '3px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'inline-block'
                }}>
                  {c.course_code}
                </span>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--dark)', marginBottom: 4 }}>
                  {c.course_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  📅 {c.semester} &nbsp;·&nbsp; ⏱ {c.session_duration} min &nbsp;·&nbsp;
                  📍 {c.gps_lat ? <span style={{ color: '#22c55e' }}>GPS saved</span> : <span style={{ color: '#ef4444' }}>No GPS</span>}
                </div>
              </div>

              {/* ── ACTION BUTTONS: Start Session + Delete side by side ── */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: 14 }}
                  onClick={() => startSession(c)}
                  disabled={!c.gps_lat}
                >
                  ▶ Start Session
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '10px 14px', fontSize: 13 }}
                  onClick={() => deleteCourse(c.id)}
                  title="Delete course"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── SESSION HISTORY ── */
function Sessions({ profile }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [viewing, setViewing]   = useState(null)

  useEffect(() => {
    supabase.from('sessions')
      .select('*, courses(course_code, course_name)')
      .eq('lecturer_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setSessions(data || []); setLoading(false) })
  }, [profile.id])

  if (viewing) return <LiveSession session={viewing} onBack={() => setViewing(null)} />

  const isLive = s => new Date(s.expires_at) > new Date()

  return (
    <div>
      <div className="page-header">
        <h1>Session History</h1>
        <p>All sessions you have created</p>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No sessions yet. Go to My Courses and tap Start Session.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Date Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      {s.courses
                        ? <code className="code-chip">{s.courses.course_code}</code>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {s.courses?.course_name || s.course_name}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.duration_minutes} min</td>
                    <td>
                      {isLive(s)
                        ? <span className="badge badge-active">🟢 Live</span>
                        : <span className="badge" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Ended</span>
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
  const { profile }         = useAuth()
  const [active, setActive] = useState('overview')
  const [stats, setStats]   = useState({ courses: 0, live: 0 })

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const [crs, sess] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact' })
          .eq('lecturer_id', profile.id).eq('is_active', true),
        supabase.from('sessions').select('expires_at')
          .eq('lecturer_id', profile.id),
      ])
      setStats({
        courses: crs.count || 0,
        live: sess.data?.filter(s => new Date(s.expires_at) > new Date()).length || 0,
      })
    }
    load()
  }, [profile])

  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
        <MobileTopBar title="Lecturer Dashboard" />
        {active === 'overview' && <Overview stats={stats} setActive={setActive} />}
        {active === 'courses'  && <Courses  profile={profile} />}
        {active === 'sessions' && <Sessions profile={profile} />}
      </main>
    </div>
  )
}