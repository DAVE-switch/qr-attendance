import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home            from './pages/Home'
import Login           from './pages/Login'
import Register        from './pages/Register'
import AdminDashboard  from './pages/admin/AdminDashboard'
import LecturerDashboard from './pages/lecturer/LecturerDashboard'
import StudentDashboard  from './pages/student/StudentDashboard'
import ScanPage          from './pages/student/ScanPage'
import ScanCamera        from './pages/student/ScanCamera'
import NotFound          from './pages/NotFound'

const RootRedirect = () => {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading"><span className="btn-spinner" style={{ borderTopColor: 'var(--primary)' }} /></div>
  if (!profile) return <Navigate to="/" replace />
  return <Navigate to={`/${profile.role}`} replace />
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

          {/* QR scan with token in URL */}
          <Route path="/scan/:token" element={<ScanPage />} />

          {/* Camera scanner (student opens this to scan) */}
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

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
