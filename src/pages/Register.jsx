import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [searchParams] = useSearchParams()
  const [role, setRole] = useState(searchParams.get('role') || 'student')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    indexNumber: '', lecturerId: '', phone: ''
  })
  const { registerStudent, registerLecturer } = useAuth()
  const navigate = useNavigate()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  /* Password strength */
  const getStrength = () => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 6) s++
    if (p.length >= 10) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9!@#$%^&*]/.test(p)) s++
    return s
  }
  const strength = getStrength()
  const strengthMeta = [
    null,
    { label: 'Weak',   color: '#ef4444' },
    { label: 'Fair',   color: '#f59e0b' },
    { label: 'Good',   color: '#3b82f6' },
    { label: 'Strong', color: '#22c55e' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword)
      return toast.error('Passwords do not match')
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      if (role === 'student') {
        await registerStudent({
          email: form.email, password: form.password,
          fullName: form.fullName, indexNumber: form.indexNumber,
          phone: form.phone || null,
        })
        toast.success('Account created! Please sign in.')
      } else {
        await registerLecturer({
          email: form.email, password: form.password,
          fullName: form.fullName, lecturerId: form.lecturerId,
        })
        toast.success('Account submitted! Awaiting admin approval.')
      }
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">

      {/* ── LEFT: FORM ── */}
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
            <h1>Create account</h1>
            <p>Join the GCU attendance platform</p>
          </div>

          {/* ROLE TOGGLE */}
          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${role === 'student' ? 'active' : ''}`}
              onClick={() => setRole('student')}
            >
              <span>🎓</span> Student
            </button>
            <button
              type="button"
              className={`role-tab ${role === 'lecturer' ? 'active' : ''}`}
              onClick={() => setRole('lecturer')}
            >
              <span>🧑‍🏫</span> Lecturer
            </button>
          </div>

          {role === 'lecturer' && (
            <div className="auth-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Your account will be reviewed by the admin before you can create sessions.
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Full Name */}
            <div className="field">
              <label>Full Name</label>
              <div className="field-wrap">
                <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                <input value={form.fullName} onChange={set('fullName')}
                  placeholder="Your full name" required />
              </div>
            </div>

            {/* Email */}
            <div className="field">
              <label>Email address</label>
              <div className="field-wrap">
                <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="you@example.com" required />
              </div>
            </div>

            {/* Role-specific fields */}
            {role === 'student' ? (
              <div className="fields-row">
                <div className="field">
                  <label>Index Number</label>
                  <div className="field-wrap">
                    <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M8 10h8M8 14h5" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    <input value={form.indexNumber} onChange={set('indexNumber')}
                      placeholder="e.g. 2021001" required />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Phone
                    <span className="field-opt"> · optional</span>
                  </label>
                  <div className="field-wrap">
                    <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.63 12 19.79 19.79 0 0 1 1.56 3.38 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    <input value={form.phone} onChange={set('phone')}
                      placeholder="0244 000 000" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="field">
                <label>Lecturer ID</label>
                <div className="field-wrap">
                  <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M8 10h8M8 14h5" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <input value={form.lecturerId} onChange={set('lecturerId')}
                    placeholder="Enter your lecturer ID" required />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="field">
              <label>Password</label>
              <div className="field-wrap">
                <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={set('password')} placeholder="Min. 6 characters" required />
                <button type="button" className="field-eye" onClick={() => setShowPass(p => !p)}>
                  {showPass
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  }
                </button>
              </div>
              {form.password && (
                <div className="strength-row">
                  <div className="strength-bars">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="strength-bar"
                        style={{ background: i <= strength ? strengthMeta[strength]?.color : '#e2e8f0' }}
                      />
                    ))}
                  </div>
                  <span className="strength-label"
                    style={{ color: strengthMeta[strength]?.color }}>
                    {strengthMeta[strength]?.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="field">
              <label>Confirm Password</label>
              <div className="field-wrap">
                <svg className="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input type="password" value={form.confirmPassword}
                  onChange={set('confirmPassword')} placeholder="Repeat your password" required />
                {form.confirmPassword && (
                  <span className="field-match-icon"
                    style={{ color: form.password === form.confirmPassword ? '#22c55e' : '#ef4444' }}>
                    {form.password === form.confirmPassword ? '✓' : '✗'}
                  </span>
                )}
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading && <span className="btn-spinner" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in instead</Link>
          </p>

        </div>
      </div>

      {/* ── RIGHT: BRANDED PANEL ── */}
      <div className="auth-right">
        <div className="auth-right-bg" />
        <div className="auth-right-glow" />
        <div className="auth-right-inner">
          <div className="auth-panel-badge">Garden City University</div>
          <h2 className="auth-panel-title">
            {role === 'student'
              ? <>Your index<br />number is your<br />identity.</>
              : <>Manage your<br />class, your<br />way.</>
            }
          </h2>
          <p className="auth-panel-sub">
            {role === 'student'
              ? 'Register once. Scan to attend every class. Your full history is always available on your dashboard.'
              : 'Create sessions, generate QR codes, and watch attendance fill in real time — then export to CSV.'
            }
          </p>
          <div className="auth-panel-checks">
            {(role === 'student'
              ? [
                  'Register with name, email & index number',
                  'Scan the QR shown by your lecturer',
                  'Must be within GPS range of classroom',
                  'Instantly marked present — no manual entry',
                  'View your full attendance history anytime',
                ]
              : [
                  'Sign up with your Lecturer ID',
                  'Admin approves your account once',
                  'Generate QR for any session in seconds',
                  'Set custom duration for each QR',
                  'Live feed + CSV export per session',
                ]
            ).map((t, i) => (
              <div className="auth-check-row" key={i}>
                <div className="auth-check-icon">✓</div>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
