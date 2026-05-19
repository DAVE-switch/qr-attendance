import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function QuickSession({ course, onSessionCreated }) {
  const { profile } = useAuth()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [attendance, setAttendance] = useState([])

  useEffect(() => {
    if (session) {
      const timer = setInterval(() => {
        const remaining = new Date(session.expires_at) - new Date()
        setTimeLeft(Math.max(0, Math.floor(remaining / 1000)))
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      loadAttendance()
      const subscription = supabase
        .channel(`attendance-${session.id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'attendance', filter: `session_id=eq.${session.id}` },
          payload => {
            setAttendance(prev => [payload.new, ...prev])
            toast.success(`${payload.new.student_name} marked present!`)
          }
        )
        .subscribe()

      return () => subscription.unsubscribe()
    }
  }, [session])

  const loadAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', session.id)
        .order('scanned_at', { ascending: false })

      if (error) throw error
      setAttendance(data || [])
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const startSession = async () => {
    if (!course.gps_lat || !course.gps_lng) {
      toast.error('Please set classroom location for this course first')
      return
    }

    setLoading(true)
    try {
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + course.session_duration)

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          course_id: course.id,
          course_name: course.course_name,
          lecturer_id: profile.id,
          qr_token: `${course.course_code}_${Date.now()}`,
          expires_at: expiresAt.toISOString(),
          lat: course.gps_lat,
          lng: course.gps_lng
        })
        .select()
        .single()

      if (error) throw error

      setSession(data)
      toast.success(`Session started for ${course.course_code}!`)
      
      if (onSessionCreated) onSessionCreated(data)
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start session')
    } finally {
      setLoading(false)
    }
  }

  const stopSession = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', session.id)

      if (error) throw error

      toast.success('Session stopped')
      setSession(null)
      setAttendance([])
    } catch (error) {
      console.error('Error stopping session:', error)
      toast.error('Failed to stop session')
    }
  }

  const exportAttendance = () => {
    if (attendance.length === 0) {
      toast.error('No attendance records to export')
      return
    }

    const csv = [
      ['Time', 'Index Number', 'Student Name'],
      ...attendance.map(a => [
        new Date(a.scanned_at).toLocaleString(),
        a.index_number,
        a.student_name
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${course.course_code}_${new Date().toLocaleDateString()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Attendance exported successfully!')
  }

  if (!session) {
    return (
      <div className="card">
        <div className="card-title">Quick Session Start</div>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
          <h3 style={{ marginBottom: '8px' }}>{course.course_code}</h3>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            {course.course_name}
            {course.classroom && ` • ${course.classroom}`}
          </p>
          <button 
            className="btn btn-primary"
            onClick={startSession}
            disabled={loading || !course.gps_lat}
            style={{ fontSize: '16px', padding: '12px 24px' }}
          >
            {loading ? '⏳ Starting...' : '🚀 Start Session'}
          </button>
          {!course.gps_lat && (
            <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '12px' }}>
              ⚠️ Classroom location not set
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">Live Session - {course.course_code}</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* QR Code Section */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            border: '2px solid #e5e7eb',
            display: 'inline-block'
          }}>
            <QRCodeSVG 
              value={`${window.location.origin}/scan/${session.qr_token}`}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          <p style={{ marginTop: '12px', fontSize: '14px', color: '#64748b' }}>
            Students scan this QR code to mark attendance
          </p>
          <div style={{ 
            background: timeLeft > 0 ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            display: 'inline-block',
            marginTop: '12px',
            fontWeight: '600'
          }}>
            {timeLeft > 0 ? `⏱️ ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')} left` : '⏰ Session Ended'}
          </div>
        </div>

        {/* Attendance Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4>Live Attendance ({attendance.length})</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              {attendance.length > 0 && (
                <button className="btn btn-outline" onClick={exportAttendance} style={{ fontSize: '12px' }}>
                  📥 Export
                </button>
              )}
              <button className="btn btn-outline" onClick={stopSession} style={{ fontSize: '12px' }}>
                ⏹️ Stop Session
              </button>
            </div>
          </div>

          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            background: '#f9fafb'
          }}>
            {attendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                <p>Waiting for students to scan...</p>
              </div>
            ) : (
              attendance.map((a, i) => (
                <div key={a.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  background: 'white',
                  '&:hover': { background: '#f3f4f6' }
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      background: '#7c3aed', 
                      color: 'white', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {attendance.length - i}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{a.student_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{a.index_number}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(a.scanned_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
