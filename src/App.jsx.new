import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home             from './pages/Home'
import Login            from './pages/Login'
import Register         from './pages/Register'
import AdminDashboard   from './pages/admin/AdminDashboard'
import LecturerDashboard from './pages/lecturer/LecturerDashboard'
import StudentDashboard  from './pages/student/StudentDashboard'
import ScanPage          from './pages/student/ScanPage'
import ScanCamera        from './pages/student/ScanCamera'

// Waits for auth + profile then navigates — works on all browsers
function RootRedirect() {
  const { profile, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return             // still fetching — wait
    if (!user) {                    // not logged in
      navigate('/', { replace: true })
      return
    }
    if (!profile) return            // logged in but profile loading — keep waiting
    navigate(`/${profile.role}`, { replace: true })
  }, [loading, user, profile])

  // Always show a spinner while deciding
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#f8fafc'
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid #e2e8f0',
        borderTopColor: '#1a56db', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <p style={{ color: '#64748b', fontSize: 14, fontFamily: 'sans-serif' }}>
        Loading your dashboard…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: 14, borderRadius: 10 }
        }} />
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />
          <Route path="/dashboard" element={<RootRedirect />} />

          <Route path="/scan/:token" element={<ScanPage />} />
          <Route path="/scan" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ScanCamera />
            </ProtectedRoute>
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/lecturer/*" element={
            <ProtectedRoute allowedRoles={['lecturer']}>
              <LecturerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/*" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
