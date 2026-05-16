import { useState, useEffect } from 'react'

export default function MobileTopBar({ title, sidebar }) {
  const [open, setOpen] = useState(false)

  // Close sidebar when clicking overlay
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Inject open class into sidebar */}
      {open && document.querySelector('.sidebar')?.classList.add('open')}
      {!open && document.querySelector('.sidebar')?.classList.remove('open')}

      {/* Top bar */}
      <div className="mobile-topbar">
        <button
          className="mobile-nav-toggle"
          onClick={() => {
            setOpen(o => !o)
            document.querySelector('.sidebar')?.classList.toggle('open')
          }}
        >
          <span />
          <span />
          <span />
        </button>
        <span className="mobile-topbar-title">{title}</span>
      </div>
    </>
  )
}
