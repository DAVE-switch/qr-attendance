import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function SemesterExport() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState([])
  const [selectedCourses, setSelectedCourses] = useState([])
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [exportFormat, setExportFormat] = useState('csv')
  const [attendanceData, setAttendanceData] = useState([])

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
        .order('course_code')

      if (error) throw error
      setCourses(data || [])
      setSelectedCourses(data?.map(c => c.id) || [])
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Failed to load courses')
    }
  }

  const toggleCourse = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const selectAllCourses = () => {
    setSelectedCourses(courses.map(c => c.id))
  }

  const clearAllCourses = () => {
    setSelectedCourses([])
  }

  const generateReport = async () => {
    if (selectedCourses.length === 0) {
      toast.error('Please select at least one course')
      return
    }

    setLoading(true)
    try {
      // Build query
      let query = supabase
        .from('attendance')
        .select(`
          *,
          sessions!inner(
            course_id,
            created_at,
            courses!inner(
              course_code,
              course_name
            )
          )
        `)
        .in('sessions.course_id', selectedCourses)

      // Add date filter if specified
      if (dateRange.start) {
        query = query.gte('scanned_at', new Date(dateRange.start).toISOString())
      }
      if (dateRange.end) {
        query = query.lte('scanned_at', new Date(dateRange.end + 'T23:59:59').toISOString())
      }

      const { data, error } = await query.order('scanned_at', { ascending: false })

      if (error) throw error
      setAttendanceData(data || [])
      
      if (data.length === 0) {
        toast.error('No attendance records found for the selected criteria')
        return
      }

      // Export based on format
      if (exportFormat === 'csv') {
        exportCSV(data)
      } else {
        exportPDF(data)
      }

    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = (data) => {
    // Group by course for better organization
    const groupedData = data.reduce((acc, record) => {
      const courseCode = record.sessions.courses.course_code
      if (!acc[courseCode]) acc[courseCode] = []
      acc[courseCode].push(record)
      return acc
    }, {})

    let csvContent = ''
    
    // Add summary header
    csvContent += 'SEMESTER ATTENDANCE REPORT - 2025/2026\n'
    csvContent += `Generated: ${new Date().toLocaleString()}\n`
    csvContent += `Total Records: ${data.length}\n`
    csvContent += `Courses: ${Object.keys(groupedData).join(', ')}\n\n`

    // Add each course's data
    Object.entries(groupedData).forEach(([courseCode, records]) => {
      csvContent += `\n${courseCode} - ${records[0].sessions.courses.course_name}\n`
      csvContent += `Total Sessions: ${new Set(records.map(r => r.session_id)).size}\n`
      csvContent += `Total Attendances: ${records.length}\n\n`
      
      csvContent += 'Date,Time,Index Number,Student Name,Course Code,Course Name\n'
      records.forEach(record => {
        const date = new Date(record.scanned_at)
        csvContent += `${date.toLocaleDateString()},${date.toLocaleTimeString()},${record.index_number},"${record.student_name}",${courseCode},"${record.sessions.courses.course_name}"\n`
      })
    })

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `semester_attendance_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Semester report exported successfully!')
  }

  const exportPDF = (data) => {
    // For PDF export, we'll create a formatted text file that can be easily converted to PDF
    const groupedData = data.reduce((acc, record) => {
      const courseCode = record.sessions.courses.course_code
      if (!acc[courseCode]) acc[courseCode] = []
      acc[courseCode].push(record)
      return acc
    }, {})

    let pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Semester Attendance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .course-section { margin: 30px 0; }
        .course-title { background: #f5f5f5; padding: 10px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .summary { background: #e8f4fd; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SEMESTER ATTENDANCE REPORT</h1>
        <h2>Academic Year 2025/2026</h2>
        <p>Lecturer: ${profile.full_name}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <h3>Summary Statistics</h3>
        <p><strong>Total Attendance Records:</strong> ${data.length}</p>
        <p><strong>Courses Included:</strong> ${Object.keys(groupedData).join(', ')}</p>
        <p><strong>Total Sessions:</strong> ${new Set(data.map(r => r.session_id)).size}</p>
    </div>
`

    Object.entries(groupedData).forEach(([courseCode, records]) => {
      const uniqueSessions = new Set(records.map(r => r.session_id))
      const uniqueStudents = new Set(records.map(r => r.index_number))
      
      pdfContent += `
    <div class="course-section">
        <div class="course-title">
            ${courseCode} - ${records[0].sessions.courses.course_name}
        </div>
        <div class="summary">
            <strong>Course Statistics:</strong><br>
            Total Sessions: ${uniqueSessions.size}<br>
            Total Attendances: ${records.length}<br>
            Unique Students: ${uniqueStudents.size}
        </div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Index Number</th>
                    <th>Student Name</th>
                </tr>
            </thead>
            <tbody>
`

      records.forEach(record => {
        const date = new Date(record.scanned_at)
        pdfContent += `
                <tr>
                    <td>${date.toLocaleDateString()}</td>
                    <td>${date.toLocaleTimeString()}</td>
                    <td>${record.index_number}</td>
                    <td>${record.student_name}</td>
                </tr>
`
      })

      pdfContent += `
            </tbody>
        </table>
    </div>
`
    })

    pdfContent += `
</body>
</html>
`

    // Create and download HTML file (can be printed to PDF)
    const blob = new Blob([pdfContent], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `semester_attendance_${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('PDF report exported! Open the HTML file and print to PDF.')
  }

  return (
    <div>
      <div className="page-header">
        <h1>Semester Export</h1>
        <p>Generate comprehensive attendance reports for the semester</p>
      </div>

      <div className="card">
        <div className="card-title">Export Configuration</div>
        
        {/* Course Selection */}
        <div className="form-group">
          <label>Select Courses</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button type="button" className="btn btn-outline" onClick={selectAllCourses}>
              Select All
            </button>
            <button type="button" className="btn btn-outline" onClick={clearAllCourses}>
              Clear All
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {courses.map(course => (
              <label key={course.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedCourses.includes(course.id)}
                  onChange={() => toggleCourse(course.id)}
                  style={{ margin: 0 }}
                />
                <span>{course.course_code} - {course.course_name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="form-group">
          <label>Date Range (Optional)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b' }}>From Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b' }}>To Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Export Format */}
        <div className="form-group">
          <label>Export Format</label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              <span>CSV (Excel Compatible)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="pdf"
                checked={exportFormat === 'pdf'}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              <span>PDF (Printable Report)</span>
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button
          className="btn btn-primary"
          onClick={generateReport}
          disabled={loading || selectedCourses.length === 0}
          style={{ width: '100%', padding: '12px' }}
        >
          {loading ? '⏳ Generating Report...' : '📊 Generate Semester Report'}
        </button>
      </div>

      {/* Preview Data */}
      {attendanceData.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-title">Report Preview</div>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
            <p><strong>Total Records:</strong> {attendanceData.length}</p>
            <p><strong>Courses:</strong> {new Set(attendanceData.map(a => a.sessions.courses.course_code)).size}</p>
            <p><strong>Sessions:</strong> {new Set(attendanceData.map(a => a.session_id)).size}</p>
            <p><strong>Unique Students:</strong> {new Set(attendanceData.map(a => a.index_number)).size}</p>
          </div>
        </div>
      )}
    </div>
  )
}
