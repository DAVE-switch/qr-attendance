import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

export default function Home() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && profile) navigate(`/${profile.role}`)
  }, [profile, loading])

  return (
    <div className="home">

      {/* NAV */}
      <nav className="home-nav">
        <div className="home-nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-mark">QR</div>
            <div className="nav-logo-text">
              <span className="nav-logo-name">AttendanceIQ</span>
              <span className="nav-logo-school">Garden City University</span>
            </div>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-signin">Sign In</Link>
            <Link to="/register" className="nav-register">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-glow" />
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-pill">
              <span className="lp-pulse" />
              Garden City University · 2025/2026
            </div>
            <h1 className="lp-title">
              Smart Attendance<br />
              <span className="lp-title-grad">for GCU</span>
            </h1>
            <p className="lp-desc">
              A QR-based attendance system built specifically for Garden City University College.
              Lecturers generate a timed QR code. Students scan it in class.
              Attendance is recorded instantly — no paper, no proxy.
            </p>
            <div className="lp-btns">
              <Link to="/register" className="lp-btn-primary">Register as Student</Link>
              <Link to="/register?role=lecturer" className="lp-btn-ghost">I'm a Lecturer →</Link>
            </div>
          </div>

          {/* LIVE CARD */}
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
                  { init: 'KA', name: 'Kwame Asante', id: '2021012', time: '09:02 AM' },
                  { init: 'AM', name: 'Ama Mensah',   id: '2021034', time: '09:03 AM' },
                  { init: 'KB', name: 'Kofi Boateng', id: '2021056', time: '09:04 AM' },
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

      {/* HOW IT WORKS */}
      <section className="lp-how">
        <div className="lp-how-inner">
          <p className="lp-section-label">How it works</p>
          <h2 className="lp-section-title">Simple for everyone</h2>
          <div className="lp-how-grid">
            <div className="lp-how-col">
              <div className="lp-how-role lp-role-lec">🧑‍🏫 Lecturer</div>
              {[
                { n: '1', t: 'Register & get approved', d: 'Sign up with your Lecturer ID. Admin approves your account once.' },
                { n: '2', t: 'Create a session',        d: 'Set the course name, choose how long the QR stays active, and capture your classroom GPS.' },
                { n: '3', t: 'Display the QR code',     d: 'Put it on the projector. Students scan it with their phone camera.' },
                { n: '4', t: 'Watch live & export',     d: 'See attendance populate in real time. Download CSV when done.' },
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
                { n: '1', t: 'Register once',         d: 'Create an account with your name, email, and index number.' },
                { n: '2', t: 'Open the scan page',    d: 'Log in and navigate to your scan page during class.' },
                { n: '3', t: 'GPS check passes',      d: 'System confirms you are physically inside the classroom.' },
                { n: '4', t: "You're marked present", d: 'Your index number, name and scan time are recorded instantly.' },
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

      {/* FEATURES */}
      <section className="lp-features">
        <div className="lp-features-inner">
          {[
            { icon: '⏱', title: 'Timed QR Codes',      desc: 'Lecturer sets how long the QR is valid. Once expired, no more scans accepted.' },
            { icon: '📍', title: 'GPS Verification',    desc: 'Students must be physically inside the classroom to mark attendance.' },
            { icon: '📋', title: 'Live Attendance Feed',desc: "See each student's index number, name and scan time as they arrive." },
            { icon: '📥', title: 'CSV Export',          desc: 'Download any session attendance list as a spreadsheet instantly.' },
          ].map((f, i) => (
            <div className="lp-feature" key={i}>
              <div className="lp-feature-icon">{f.icon}</div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
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
