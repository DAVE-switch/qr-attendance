import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="scan-page">
      <div className="scan-card" style={{ maxWidth: 480, textAlign: 'center' }}>
        {/* Header */}
        <div className="scan-header" style={{ justifyContent: 'center', marginBottom: 32 }}>
          <div className="nav-logo-mark">QR</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)' }}>Page Not Found</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Garden City University · AttendanceIQ</div>
          </div>
        </div>

        {/* 404 Icon */}
        <div style={{
          fontSize: 80, 
          marginBottom: 24, 
          opacity: 0.3,
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800
        }}>
          404
        </div>

        {/* Error Message */}
        <h2 style={{
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--dark)',
          marginBottom: 12,
          fontFamily: 'Syne, sans-serif'
        }}>
          Invalid QR Code
        </h2>

        <p style={{
          fontSize: 16,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: 32,
          maxWidth: 320,
          margin: '0 auto 32px'
        }}>
          The QR code you scanned is not valid or has expired. Please scan a valid attendance QR code.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column', alignItems: 'center' }}>
          <Link to="/student" className="btn btn-primary" style={{ width: '100%', maxWidth: 200 }}>
            📱 Open Scanner
          </Link>
          
          <Link to="/student" className="btn btn-ghost" style={{ width: '100%', maxWidth: 200 }}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Help Text */}
        <p style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginTop: 24,
          lineHeight: 1.5
        }}>
          If you believe this is an error, please contact your lecturer or the system administrator.
        </p>
      </div>
    </div>
  )
}
