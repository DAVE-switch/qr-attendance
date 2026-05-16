import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'

export default function ScanCamera() {
  const [status, setStatus] = useState('starting') // starting | scanning | error
  const [errorMsg, setErrorMsg] = useState('')
  const scannerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    Html5Qrcode.getCameras()
      .then(cameras => {
        if (!cameras || cameras.length === 0) {
          setStatus('error')
          setErrorMsg('No camera found on this device.')
          return
        }

        // prefer back camera on mobile
        const cam = cameras.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        ) || cameras[cameras.length - 1]

        return scanner.start(
          cam.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            scanner.stop().catch(() => {})
            const match = decodedText.match(/\/scan\/([^/\s?#]+)/)
            const token = match ? match[1] : decodedText.trim()
            navigate(`/scan/${token}`)
          },
          () => {} // ignore non-QR frames silently
        )
      })
      .then(() => setStatus('scanning'))
      .catch(err => {
        setStatus('error')
        if (err?.message?.includes('Permission') || err?.message?.includes('permission')) {
          setErrorMsg('Camera permission denied. Please allow camera access in your browser and reload.')
        } else {
          setErrorMsg('Could not start camera. Please check permissions and try again.')
        }
      })

    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  return (
    <div className="scan-page">
      <div className="scan-card" style={{ maxWidth: 480 }}>

        {/* Header */}
        <div className="scan-header">
          <div className="nav-logo-mark">QR</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)' }}>Scan QR Code</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Garden City University · AttendanceIQ</div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 10, padding: '10px 14px', marginBottom: 20,
          fontSize: 13, color: '#1d4ed8', textAlign: 'center'
        }}>
          📋 Point your camera at the QR code on the projector to mark attendance
        </div>

        {/* Camera view */}
        {status === 'starting' && (
          <div style={{
            height: 300, background: '#0f172a', borderRadius: 12,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
            marginBottom: 16, color: 'white'
          }}>
            <div className="scan-spinner" />
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Starting camera...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ marginBottom: 16 }}>
            <div className="scan-message scan-message-error">{errorMsg}</div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => window.location.reload()}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* The actual scanner renders here */}
        <div id="qr-reader" style={{
          width: '100%',
          display: status === 'error' ? 'none' : 'block'
        }} />

        <p style={{
          textAlign: 'center', fontSize: 12,
          color: 'var(--text-muted)', marginTop: 16
        }}>
          Keep the QR code steady and well-lit for best results
        </p>

        <Link to="/student" className="btn btn-ghost"
          style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
