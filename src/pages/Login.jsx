import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [waitingForProfile, setWaitingForProfile] = useState(false)
  const timeoutRef = useRef(null)

  const { login, profile, logout } = useAuth()
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  // Navigate as soon as profile loads
  useEffect(() => {
    if (waitingForProfile && profile) {
      clearTimeout(timeoutRef.current)
      navigate(redirect, { replace: true })
    }
  }, [waitingForProfile, profile])

  // Clean up timeout on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Sign out any existing session first to avoid conflicts
      await logout()
      await new Promise(r => setTimeout(r, 300))

      await login(email, password)
      setWaitingForProfile(true)
      setLoading(false)

      // Safety timeout — if profile doesn't load in 8 seconds, stop and show error
      timeoutRef.current = setTimeout(async () => {
        // Try fetching profile manually one more time
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('profiles').select('*').eq('id', user.id).maybeSingle()
          if (data) {
            navigate(`/${data.role}`, { replace: true })
            return
          }
        }
        setWaitingForProfile(false)
        toast.error('Profile load timed out. Please try again.')
      }, 8000)

    } catch (err) {
      toast.error(err.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  // Waiting spinner screen
  if (waitingForProfile) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'linear-gradient(135deg, #080f1e 0%, #1e3a5f 100%)'
      }}>
        <div style={{
          width: 48, height: 48, border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: 'white', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15,
          fontFamily: 'sans-serif', fontWeight: 600 }}>
          Signing you in…
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'sans-serif' }}>
          Loading your profile
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-inner">

          <Link to="/" className="auth-back">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </Link>

          <div className="auth-brand">
            <div className="auth-logo-mark">QR</div>
            <div>
              <div className="auth-brand-name">AttendanceIQ</div>
              <div className="auth-brand-school">Garden City University</div>
            </div>
          </div>

          <div className="auth-heading">
            <h1>Welcome back</h1>
            <p>Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label>Email address</label>
              <div className="field-wrap">
                <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email" />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="field-wrap">
                <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" required autoComplete="current-password" />
                <button type="button" className="field-eye"
                  onClick={() => setShowPass(p => !p)}>
                  {showPass
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8 11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading && <span className="btn-spinner" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>
          <p className="auth-switch">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
          <div className="auth-roles-hint">
            <div className="hint-item"><span>🎓</span> Students register with their index number</div>
            <div className="hint-item"><span>🧑‍🏫</span> Lecturers need admin approval after signup</div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-bg" />
        <div className="auth-right-glow" />
        <div className="auth-right-inner">
          <div className="auth-panel-badge">Garden City University</div>
          <h2 className="auth-panel-title">Attendance<br />made simple.</h2>
          <p className="auth-panel-sub">QR codes. GPS verification. Live dashboards. Built for GCUC.</p>
          <div className="auth-panel-checks">
            {[
              'Mark attendance in under 3 seconds',
              'GPS prevents proxy marking',
              'Live feed shows each student\'s arrival',
              'Export sessions to CSV anytime',
              'Admin controls lecturer access',
            ].map((t, i) => (
              <div className="auth-check-row" key={i}>
                <div className="auth-check-icon">✓</div>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div className="auth-deco-card">
            <div className="auth-deco-row">
              <div className="auth-deco-dot" />
              <span>CS 301 · Live</span>
              <span className="auth-deco-count">24 present</span>
            </div>
            <div className="auth-deco-bar">
              <div className="auth-deco-fill" style={{ width: '63%' }} />
            </div>
            <div className="auth-deco-label">63% of class scanned</div>
          </div>
        </div>
      </div>
    </div>
  )
}
