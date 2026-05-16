import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="loading">
      <span className="btn-spinner" style={{ borderTopColor: 'var(--primary)', width: 24, height: 24 }} />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (!profile) return (
    <div className="loading">
      <span className="btn-spinner" style={{ borderTopColor: 'var(--primary)', width: 24, height: 24 }} />
    </div>
  )

  if (allowedRoles && !allowedRoles.includes(profile.role))
    return <Navigate to="/login" replace />

  // Pending lecturer
  if (profile.role === 'lecturer' && profile.status === 'pending') return (
    <div className="pending-screen">
      <div className="pending-card">
        <div className="pending-icon">⏳</div>
        <h2>Account Pending Approval</h2>
        <p>Your lecturer account is awaiting admin approval.<br />Please check back after the admin reviews your registration.</p>
        <button
          onClick={async () => { const { supabase } = await import('../lib/supabase'); await supabase.auth.signOut(); window.location.href = '/login' }}
          className="btn btn-outline" style={{ marginTop: 20 }}>
          Sign Out
        </button>
      </div>
    </div>
  )

  // Rejected lecturer
  if (profile.role === 'lecturer' && profile.status === 'rejected') return (
    <div className="pending-screen">
      <div className="pending-card">
        <div className="pending-icon">❌</div>
        <h2>Account Rejected</h2>
        <p>Your lecturer account was not approved.<br />Please contact the system administrator.</p>
        <button
          onClick={async () => { const { supabase } = await import('../lib/supabase'); await supabase.auth.signOut(); window.location.href = '/login' }}
          className="btn btn-outline" style={{ marginTop: 20 }}>
          Sign Out
        </button>
      </div>
    </div>
  )

  return children
}
