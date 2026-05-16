import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import MobileTopBar from '../../components/MobileTopBar'

function Sidebar({ active, setActive }) {
  const { profile, logout } = useAuth()
  const nav = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'history',  icon: '📋', label: 'My Attendance' },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="nav-logo-mark">QR</div>
        <div className="sidebar-logo-text">
          <h2>AttendanceIQ</h2>
          <p>Student Portal</p>
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
        <div className="sidebar-user-avatar" style={{ background: '#7c3aed' }}>
          {profile?.full_name?.[0]}
        </div>
        <div className="sidebar-user-name">{profile?.full_name}</div>
        <div className="sidebar-user-role">{profile?.index_number}</div>
      </div>
    </aside>
  )
}

function Overview({ profile, stats }) {
  return (
    <div>
      <div className="page-header">
        <h1>My Dashboard</h1>
        <p>Welcome, {profile?.full_name?.split(' ')[0]} — here's your attendance summary</p>
      </div>

      <div className="scan-cta-card">
        <div className="scan-cta-left">
          <div className="scan-cta-icon">📱</div>
          <div>
            <div className="scan-cta-title">Ready to mark attendance?</div>
            <div className="scan-cta-sub">
              Ask your lecturer to display the session QR code, then tap below to scan it.
            </div>
          </div>
        </div>
        <Link to="/scan" className="btn scan-cta-btn">
          Scan QR Code →
        </Link>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: '✅', label: 'Total Present',  value: stats.total },
          { icon: '📅', label: 'This Week',       value: stats.week },
          { icon: '📆', label: 'This Month',      value: stats.month },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">My Profile</div>
        <div className="profile-grid">
          {[
            { label: 'Full Name',    value: profile?.full_name },
            { label: 'Index Number', value: profile?.index_number },
            { label: 'Email',        value: profile?.email },
            { label: 'Phone',        value: profile?.phone || '—' },
          ].map((r, i) => (
            <div className="profile-row" key={i}>
              <div className="profile-label">{r.label}</div>
              <div className="profile-value">{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AttendanceHistory({ studentId }) {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    supabase
      .from('attendance')
      .select('*, sessions(course_name, duration_minutes)')
      .eq('student_id', studentId)
      .order('scanned_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setList(data || [])
        setLoading(false)
      })
  }, [studentId])

  return (
    <div>
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>All sessions you have attended</p>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No attendance recorded yet. Scan a QR code in class to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Course</th>
                  <th>Index Number</th>
                  <th>Time Scanned</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{a.sessions?.course_name}</td>
                    <td><code className="code-chip">{a.index_number}</code></td>
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
  )
}

export default function StudentDashboard() {
  const { profile }           = useAuth()
  const [active, setActive]   = useState('overview')
  const [stats, setStats]     = useState({ total: 0, week: 0, month: 0 })

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('attendance')
      .select('scanned_at')
      .eq('student_id', profile.id)
      .then(({ data, error }) => {
        if (error || !data) return
        const now      = new Date()
        const weekAgo  = new Date(now - 7  * 86400000)
        const monthAgo = new Date(now - 30 * 86400000)
        setStats({
          total: data.length,
          week:  data.filter(a => new Date(a.scanned_at) > weekAgo).length,
          month: data.filter(a => new Date(a.scanned_at) > monthAgo).length,
        })
      })
  }, [profile?.id])

  return (
    <div className="dashboard-layout">
      <Sidebar active={active} setActive={setActive} />
      <main className="main-content">
      <MobileTopBar title="Student Portal" />
        {active === 'overview' && <Overview profile={profile} stats={stats} />}
        {active === 'history'  && <AttendanceHistory studentId={profile?.id} />}
      </main>
    </div>
  )
}
