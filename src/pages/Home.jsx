import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'

export default function Home() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && profile) navigate(`/${profile.role}`)
  }, [profile, loading])

  return (
    <div className="home">

      {/* ── NAV ── */}
      <nav className="home-nav">
        <div className="home-nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-mark">QR</div>
            <div className="nav-logo-text">
              <span className="nav-logo-name">AttendanceIQ</span>
              <span className="nav-logo-school">Garden City University</span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="nav-actions desktop-only">
            <Link to="/login" className="nav-signin">Sign In</Link>
            <Link to="/register" className="nav-register">Get Started</Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
          >
            <span className={menuOpen ? 'bar bar-1 open' : 'bar bar-1'} />
            <span className={menuOpen ? 'bar bar-2 open' : 'bar bar-2'} />
            <span className={menuOpen ? 'bar bar-3 open' : 'bar bar-3'} />
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="nav-mobile-menu">
            <Link to="/login" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>
              Sign In
            </Link>
            <Link to="/register" className="nav-mobile-link nav-mobile-primary" onClick={() => setMenuOpen(false)}>
              Get Started — Register
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-glow" />
        <div className="lp-hero-inner">

          {/* Text side */}
          <div className="lp-hero-text">
            <div className="lp-pill">
              <span className="lp-pulse" />
              Garden City University · 2025/2026
            </div>
            <h1 className="lp-title">
              Smart<br />Attendance<br />
              <span className="lp-title-grad">for GCUC</span>
            </h1>
            <p className="lp-desc">
              A QR-based attendance system built specifically for Garden City University College.
              Lecturers generate a timed QR code. Students scan it in class.
              Recorded instantly — no paper, no proxy.
            </p>
            <div className="lp-btns">
              <Link to="/register" className="lp-btn-primary">
                📱 Register as Student
              </Link>
              <Link to="/register?role=lecturer" className="lp-btn-secondary">
                I'm a Lecturer →
              </Link>
            </div>
            <div className="lp-trust-row">
              {['GPS Verified', 'Real-time Feed', 'CSV Export', 'No Proxy'].map((t, i) => (
                <div className="lp-trust-item" key={i}>
                  <span>✓</span> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Live card */}
          <div className="lp-card-wrap">
            <div className="lp-live-card">
              <div className="lp-card-header">
                <div className="lp-live-dot" />
                <span>Live Session · CS 301</span>
                <span className="lp-timer">04:47</span>
              </div>
              <div className="lp-qr-box">
                <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" width="90" height="90">
                  <rect x="6" y="6" width="30" height="30" rx="4" fill="none" stroke="#1a56db" strokeWidth="3.5"/>
                  <rect x="14" y="14" width="14" height="14" rx="2" fill="#1a56db"/>
                  <rect x="54" y="6" width="30" height="30" rx="4" fill="none" stroke="#1a56db" strokeWidth="3.5"/>
                  <rect x="62" y="14" width="14" height="14" rx="2" fill="#1a56db"/>
                  <rect x="6" y="54" width="30" height="30" rx="4" fill="none" stroke="#1a56db" strokeWidth="3.5"/>
                  <rect x="14" y="62" width="14" height="14" rx="2" fill="#1a56db"/>
                  <rect x="54" y="54" width="8" height="8" rx="1" fill="#1a56db"/>
                  <rect x="66" y="54" width="8" height="8" rx="1" fill="#1a56db"/>
                  <rect x="54" y="66" width="8" height="8" rx="1" fill="#1a56db"/>
                  <rect x="66" y="66" width="8" height="8" rx="1" fill="#1a56db"/>
                  <rect x="78" y="54" width="8" height="8" rx="1" fill="#1a56db"/>
                  <rect x="78" y="78" width="8" height="8" rx="1" fill="#1a56db"/>
                  <rect x="54" y="78" width="8" height="8" rx="1" fill="#1a56db"/>
                </svg>
              </div>
              <p className="lp-card-sub">Scan within range to mark present</p>
              <div className="lp-attendance-list">
                <div className="lp-att-header">Recent scans</div>
                {[
                  { init: 'KA', name: 'Kwame Asante', id: 'IT/2021/012', time: '09:02 AM' },
                  { init: 'AM', name: 'Ama Mensah',   id: 'IT/2021/034', time: '09:03 AM' },
                  { init: 'KB', name: 'Kofi Boateng', id: 'IT/2021/056', time: '09:04 AM' },
                ].map((s, i) => (
                  <div className="lp-att-row" key={i}>
                    <div className="lp-att-avatar">{s.init}</div>
                    <div className="lp-att-info">
                      <span className="lp-att-name">{s.name}</span>
                      <span className="lp-att-id">{s.id}</span>
                    </div>
                    <div className="lp-att-right">
                      <span className="lp-att-time">{s.time}</span>
                      <span className="lp-att-check">✓</span>
                    </div>
                  </div>
                ))}
                <div className="lp-att-footer">3 of 38 students marked present</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES STRIP ── */}
      <section className="lp-features">
        <div className="lp-features-inner">
          {[
            { icon: '⏱', title: 'Timed QR Codes',       desc: 'Lecturer sets how long the QR is valid. Once expired, no more scans.' },
            { icon: '📍', title: 'GPS Verification',     desc: 'Students must be physically in the classroom.' },
            { icon: '📋', title: 'Live Attendance Feed', desc: 'See index number, name and scan time in real time.' },
            { icon: '📥', title: 'CSV Export',           desc: 'Download any session attendance list instantly.' },
          ].map((f, i) => (
            <div className="lp-feature" key={i}>
              <div className="lp-feature-icon">{f.icon}</div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-how">
        <div className="lp-how-inner">
          <p className="lp-section-label">How it works</p>
          <h2 className="lp-section-title">Simple for everyone</h2>
          <div className="lp-how-grid">
            <div className="lp-how-col">
              <div className="lp-how-role lp-role-lec">🧑‍🏫 Lecturer</div>
              {[
                { n: '1', t: 'Register & get approved', d: 'Sign up with your Lecturer ID. Admin approves once.' },
                { n: '2', t: 'Create a session',        d: 'Set course name, QR duration, capture classroom GPS.' },
                { n: '3', t: 'Display the QR code',     d: 'Show it on the projector. Students scan with phone.' },
                { n: '4', t: 'Watch live & export',     d: 'Real-time attendance feed. Download CSV when done.' },
              ].map((s, i) => (
                <div className="lp-step" key={i}>
                  <div className="lp-step-num lp-num-lec">{s.n}</div>
                  <div>
                    <div className="lp-step-title">{s.t}</div>
                    <div className="lp-step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-divider" />
            <div className="lp-how-col">
              <div className="lp-how-role lp-role-stu">🎓 Student</div>
              {[
                { n: '1', t: 'Register once',         d: 'Create account with name, email, and index number.' },
                { n: '2', t: 'Open the scan page',    d: 'Log in and go to scan during class.' },
                { n: '3', t: 'GPS check passes',      d: 'System confirms you are inside the classroom.' },
                { n: '4', t: "You're marked present", d: 'Index number, name and time recorded instantly.' },
              ].map((s, i) => (
                <div className="lp-step" key={i}>
                  <div className="lp-step-num lp-num-stu">{s.n}</div>
                  <div>
                    <div className="lp-step-title">{s.t}</div>
                    <div className="lp-step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <h2>Ready to get started?</h2>
        <p>Join the GCUC digital attendance platform today.</p>
        <div className="lp-cta-btns">
          <Link to="/register" className="lp-btn-primary">Register as Student</Link>
          <Link to="/register?role=lecturer" className="lp-cta-outline">Register as Lecturer</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">
          <div className="nav-logo-mark sm">QR</div>
          <span>AttendanceIQ · Garden City University</span>
        </div>
        <p>Final Year Project · 2025 / 2026 Academic Year</p>
        <p className="lp-footer-name">Department of Computer Science &amp; Information Technology</p>
      </footer>

    </div>
  )
}
