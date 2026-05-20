import { Link } from 'react-router-dom'

export default function ScanCamera() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16,
      background: 'linear-gradient(135deg, #080f1e 0%, #1e3a5f 100%)'
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 36, height: 36, background: '#1a56db', color: 'white',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13 }}>QR</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>AttendanceIQ</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Garden City University</div>
          </div>
        </div>

        <div style={{ fontSize: 56, marginBottom: 16 }}>📱</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          How to Scan
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
          Use your phone's <strong>built-in camera app</strong> to scan
          the QR code displayed by your lecturer.
        </p>

        {/* Steps */}
        {[
          { n: '1', t: 'Open your Camera app', d: 'Use the default camera that came with your phone' },
          { n: '2', t: 'Point at the QR code',  d: 'Aim at the QR code on the projector or screen' },
          { n: '3', t: 'Tap the link',           d: 'Your phone will show a banner — tap "Open in Chrome"' },
          { n: '4', t: 'Attendance recorded',    d: 'You will see a green confirmation screen' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start',
            textAlign: 'left', marginBottom: 16,
            paddingBottom: 16, borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ width: 30, height: 30, background: '#eff6ff', color: '#1a56db',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{s.n}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>{s.t}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{s.d}</div>
            </div>
          </div>
        ))}

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: 13, color: '#1d4ed8' }}>
          💡 Make sure you are logged in to AttendanceIQ before scanning
        </div>

        <Link to="/student" style={{
          display: 'block', background: '#1a56db', color: 'white',
          padding: '12px', borderRadius: 8, fontWeight: 600, fontSize: 14,
          textDecoration: 'none'
        }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}