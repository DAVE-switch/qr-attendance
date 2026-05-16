import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

/* ── SIDEBAR ── */
function Sidebar({ active, setActive, mobileMenuOpen, closeMobileMenu }) {
  const { profile, logout } = useAuth()
  const nav = [
    { id: 'overview',  icon: '📊', label: 'Overview' },
    { id: 'pending',   icon: '⏳', label: 'Pending Approvals' },
    { id: 'lecturers', icon: '🧑‍🏫', label: 'Lecturers' },
    { id: 'students',  icon: '🎓', label: 'Students' },
    { id: 'sessions',  icon: '📋', label: 'All Sessions' },
  ]
  
  const handleNavClick = (navId) => {
    setActive(navId)
    closeMobileMenu()
  }
  
  const handleLogout = () => {
    logout()
    closeMobileMenu()
  }
  
  return (
    <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="nav-logo-mark">QR</div>
        <div className="sidebar-logo-text">
          <h2>AttendanceIQ</h2>
          <p>Admin Portal</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map(n => (
          <button
            key={n.id}
            className={active === n.id ? 'active' : ''}
            onClick={() => handleNavClick(n.id)}
          >
            <span className="nav-icon">{n.icon}</span> {n.label}
          </button>
        ))}
        <div className="sidebar-divider" />
        <button onClick={handleLogout} style={{ color: '#ef4444' }}>
          <span className="nav-icon">🚪</span> Sign Out
        </button>
      </nav>
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {profile?.full_name?.[0] ?? 'A'}
        </div>
        <div className="sidebar-user-name">{profile?.full_name}</div>
        <div className="sidebar-user-role">Administrator</div>
      </div>
    </aside>
  )
}

/* ── OVERVIEW TAB ── */
function Overview({ stats }) {
  return (
    <div>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back — here's what's happening at GCU</p>
      </div>
      <div className="stats-grid">
        {[
          { icon: '🎓', label: 'Total Students',  value: stats.students },
          { icon: '🧑‍🏫', label: 'Total Lecturers', value: stats.lecturers },
          { icon: '⏳', label: 'Pending Approval', value: stats.pending,
            highlight: stats.pending > 0 },
          { icon: '📋', label: 'Total Sessions',   value: stats.sessions },
        ].map((s, i) => (
          <div className="stat-card" key={i}
            style={s.highlight ? { borderColor: '#f59e0b', borderWidth: 2 } : {}}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value"
              style={s.highlight ? { color: '#d97706' } : {}}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {stats.pending > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {stats.pending} lecturer{stats.pending > 1 ? 's' : ''} waiting for approval
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Go to Pending Approvals to review them.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">System Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Institution', value: 'Garden City University' },
            { label: 'System',      value: 'QR Attendance — AttendanceIQ' },
            { label: 'Academic Year', value: '2025 / 2026' },
            { label: 'Admin Role',  value: 'Full Access' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── PENDING TAB ── */
function PendingApprovals({ onAction }) {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'lecturer')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPending(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handle = async (id, action) => {
    setActing(id + action)
    const status = action === 'approve' ? 'active' : 'rejected'
    const { error, data } = await supabase
      .from('profiles').update({ status }).eq('id', id).select().single()
    if (error) { 
      toast.error('Action failed: ' + error.message); 
    }
    else {
      const lecturerName = data?.full_name || 'Lecturer'
      if (action === 'approve') {
        toast.success(`${lecturerName} approved successfully! ✓`)
      } else {
        toast.error(`${lecturerName} rejected`)
      }
      load()
      onAction()
    }
    setActing(null)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Pending Approvals</h1>
        <p>Review and approve lecturer registrations</p>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty-state"><div className="empty-state-icon">⏳</div><p>Loading...</p></div>
        ) : pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <p>No pending approvals — all clear!</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Lecturer ID</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="table-avatar">{l.full_name?.[0]}</div>
                        <span style={{ fontWeight: 600 }}>{l.full_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.email}</td>
                    <td>
                      <span className="badge badge-pending">{l.lecturer_id}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(l.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-success"
                          disabled={!!acting}
                          onClick={() => handle(l.id, 'approve')}
                        >
                          {acting === l.id + 'approve' ? '...' : '✓ Approve'}
                        </button>
                        <button
                          className="btn btn-danger"
                          disabled={!!acting}
                          onClick={() => handle(l.id, 'reject')}
                        >
                          {acting === l.id + 'reject' ? '...' : '✗ Reject'}
                        </button>
                      </div>
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

/* ── LECTURERS TAB ── */
function Lecturers() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadLecturers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'lecturer')
      .order('created_at', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadLecturers()
    
    // Listen for profile changes to update list in real-time
    const channel = supabase.channel('lecturers-list-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.lecturer'
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setList(prev => prev.map(lecturer => 
            lecturer.id === payload.new.id ? payload.new : lecturer
          ))
        } else if (payload.eventType === 'INSERT') {
          setList(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'DELETE') {
          setList(prev => prev.filter(lecturer => lecturer.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = list.filter(l =>
    l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.lecturer_id?.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = s => {
    if (s === 'active')  return <span className="badge badge-active">Active</span>
    if (s === 'pending') return <span className="badge badge-pending">Pending</span>
    return <span className="badge badge-rejected">Rejected</span>
  }

  return (
    <div>
      <div className="page-header">
        <h1>Lecturers</h1>
        <p>All registered lecturers and their status</p>
      </div>
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <input className="search-input" placeholder="Search by name, email or ID…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧑‍🏫</div>
            <p>No lecturers found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Lecturer ID</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="table-avatar">{l.full_name?.[0]}</div>
                        <span style={{ fontWeight: 600 }}>{l.full_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.email}</td>
                    <td><code className="code-chip">{l.lecturer_id}</code></td>
                    <td>{statusBadge(l.status)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(l.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
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

/* ── STUDENTS TAB ── */
function Students() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setList(data || []); setLoading(false) })
  }, [])

  const filtered = list.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.index_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h1>Students</h1>
        <p>All registered students on the platform</p>
      </div>
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <input className="search-input" placeholder="Search by name, email or index number…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎓</div>
            <p>No students found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Index Number</th>
                  <th>Phone</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="table-avatar" style={{ background: '#7c3aed' }}>
                          {s.full_name?.[0]}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                    <td><code className="code-chip">{s.index_number}</code></td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.phone || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(s.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
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

/* ── SESSIONS TAB ── */
function Sessions() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('sessions')
      .select('*, profiles(full_name, lecturer_id)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setList(data || []); setLoading(false) })
  }, [])

  const isLive = s => new Date(s.expires_at) > new Date()

  return (
    <div>
      <div className="page-header">
        <h1>All Sessions</h1>
        <p>Every session created across all lecturers</p>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No sessions created yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Lecturer</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.course_name}</td>
                    <td>
                      <div>{s.profiles?.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {s.profiles?.lecturer_id}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.duration_minutes} min</td>
                    <td>
                      {isLive(s)
                        ? <span className="badge badge-active">🟢 Live</span>
                        : <span className="badge badge-rejected">Expired</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(s.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
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
export default function AdminDashboard() {
  const [active, setActive] = useState('overview')
  const [stats, setStats] = useState({ students: 0, lecturers: 0, pending: 0, sessions: 0 })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const loadStats = async () => {
    const [s, l, p, sess] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'lecturer').neq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'lecturer').eq('status', 'pending'),
      supabase.from('sessions').select('id', { count: 'exact' }),
    ])
    setStats({
      students:  s.count  ?? 0,
      lecturers: l.count  ?? 0,
      pending:   p.count  ?? 0,
      sessions:  sess.count ?? 0,
    })
  }

  useEffect(() => {
    loadStats()
    
    // Listen for profile status changes to update stats in real-time
    const channel = supabase.channel('admin-profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.lecturer'
      }, (payload) => {
        // Reload stats when lecturer status changes
        loadStats()
        
        // Show notification for status changes
        if (payload.new.status === 'active' && payload.old.status === 'pending') {
          toast.success(`${payload.new.full_name} has been approved!`)
        } else if (payload.new.status === 'rejected' && payload.old.status === 'pending') {
          toast.error(`${payload.new.full_name} has been rejected`)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="dashboard-layout">
      {/* Mobile hamburger menu button */}
      <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
        {mobileMenuOpen ? '✕' : '☰'}
      </button>
      
      {/* Mobile overlay */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={closeMobileMenu} />
      
      <Sidebar active={active} setActive={setActive} mobileMenuOpen={mobileMenuOpen} closeMobileMenu={closeMobileMenu} />
      <main className="main-content">
        {active === 'overview'  && <Overview stats={stats} />}
        {active === 'pending'   && <PendingApprovals onAction={loadStats} />}
        {active === 'lecturers' && <Lecturers />}
        {active === 'students'  && <Students />}
        {active === 'sessions'  && <Sessions />}
      </main>
    </div>
  )
}
