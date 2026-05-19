import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function CourseRegistration({ onCourseCreated }) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    semester: '2025/2026',
    sessionDuration: '120',
    gpsLat: null,
    gpsLng: null
  })

  const [courses, setCourses] = useState([])

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('lecturer_id', profile.id)
        .eq('semester', '2025/2026')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error loading courses:', error)
    }
  }

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFormData(prev => ({
          ...prev,
          gpsLat: pos.coords.latitude,
          gpsLng: pos.coords.longitude
        }))
        toast.success('Classroom location captured ✓')
        setGpsLoading(false)
      },
      () => {
        toast.error('Could not get location. Allow browser location access.')
        setGpsLoading(false)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.courseCode || !formData.courseName) {
        toast.error('Course code and name are required')
        setLoading(false)
        return
      }

      // Insert course
      const { data, error } = await supabase
        .from('courses')
        .insert({
          lecturer_id: profile.id,
          course_code: formData.courseCode.toUpperCase(),
          course_name: formData.courseName,
          semester: formData.semester,
          gps_lat: formData.gpsLat,
          gps_lng: formData.gpsLng,
          session_duration: parseInt(formData.sessionDuration)
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`Course "${formData.courseCode}" registered successfully!`)
      
      // Reset form
      setFormData({
        courseCode: '',
        courseName: '',
        semester: '2025/2026',
        sessionDuration: '120',
        gpsLat: null,
        gpsLng: null
      })
      setShowForm(false)
      
      // Reload courses
      await loadCourses()
      
      // Notify parent
      if (onCourseCreated) onCourseCreated(data)

    } catch (error) {
      console.error('Error creating course:', error)
      toast.error(error.message || 'Failed to create course')
    } finally {
      setLoading(false)
    }
  }

  const deleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course? This will also delete all associated sessions.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)

      if (error) throw error

      toast.success('Course deleted successfully')
      await loadCourses()
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Failed to delete course')
    }
  }

  if (!showForm) {
    return (
      <div>
        <div className="card">
          <div className="card-title">My Courses - Semester {formData.semester}</div>
          
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
              <h3 style={{ marginBottom: '8px' }}>No Courses Registered</h3>
              <p style={{ color: '#64748b', marginBottom: '24px' }}>
                Register your courses for the semester to start taking attendance
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                ➕ Register First Course
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>
                    {courses.length} course{courses.length !== 1 ? 's' : ''} registered
                  </span>
                </div>
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowForm(true)}
                >
                  ➕ Add Course
                </button>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                {courses.map(course => (
                  <div key={course.id} className="card" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ 
                            background: '#1a56db', 
                            color: 'white', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px', 
                            fontWeight: '600' 
                          }}>
                            {course.course_code}
                          </span>
                        </div>
                        <h4 style={{ marginBottom: '4px' }}>{course.course_name}</h4>
                        <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
                          Duration: {course.session_duration} minutes • GPS: {course.gps_lat ? '✓ Set' : '✗ Not set'}
                        </p>
                      </div>
                      <button 
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => deleteCourse(course.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Register New Course</div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Course Code *
                </label>
                <input
                  type="text"
                  value={formData.courseCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, courseCode: e.target.value }))}
                  placeholder="e.g., CS301"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Course Name *
                </label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, courseName: e.target.value }))}
                  placeholder="e.g., Data Structures and Algorithms"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Semester
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="2025/2026">2025/2026</option>
                  <option value="2024/2025">2024/2025</option>
                  <option value="2026/2027">2026/2027</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Session Duration (minutes)
                </label>
                <select
                  value={formData.sessionDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, sessionDuration: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours (recommended)</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Classroom Location (GPS)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={formData.gpsLat ? `${formData.gpsLat.toFixed(6)}, ${formData.gpsLng.toFixed(6)}` : ''}
                  readOnly
                  placeholder="Click 'Capture Location' to set GPS coordinates"
                  style={{ 
                    flex: 1, 
                    padding: '8px 12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px',
                    background: '#f9fafb'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={captureGPS}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? '🔄 Capturing...' : '📍 Capture Location'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                Capture location where you typically teach this course
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '⏳ Creating...' : '✅ Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
