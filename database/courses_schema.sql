-- Courses Table - Store lecturer courses for the semester
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lecturer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  semester TEXT NOT NULL, -- e.g., "2025/2026"
  classroom TEXT,
  schedule TEXT, -- e.g., "Mon/Wed/Fri 9:00-10:00"
  gps_lat FLOAT,
  gps_lng FLOAT,
  session_duration INTEGER DEFAULT 5, -- minutes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course Enrollments - Track which students are enrolled in which courses
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- Update sessions table to reference courses
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_lecturer_id ON courses(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course_id ON sessions(course_id);

-- RLS Policies for courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Courses RLS: Lecturers can only manage their own courses
CREATE POLICY "Lecturers can manage their own courses" ON courses
  FOR ALL USING (auth.uid() = lecturer_id);

-- Course Enrollments RLS: Lecturers can manage enrollments for their courses
CREATE POLICY "Lecturers can manage enrollments for their courses" ON course_enrollments
  FOR ALL USING (
    course_id IN (
      SELECT id FROM courses WHERE lecturer_id = auth.uid()
    )
  );

-- Students can view their own enrollments
CREATE POLICY "Students can view their own enrollments" ON course_enrollments
  FOR SELECT USING (auth.uid() = student_id);

-- Functions for course management
CREATE OR REPLACE FUNCTION create_course(
  p_lecturer_id UUID,
  p_course_code TEXT,
  p_course_name TEXT,
  p_semester TEXT,
  p_classroom TEXT DEFAULT NULL,
  p_schedule TEXT DEFAULT NULL,
  p_gps_lat FLOAT DEFAULT NULL,
  p_gps_lng FLOAT DEFAULT NULL,
  p_session_duration INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
  course_id UUID;
BEGIN
  INSERT INTO courses (
    lecturer_id, course_code, course_name, semester, 
    classroom, schedule, gps_lat, gps_lng, session_duration
  ) VALUES (
    p_lecturer_id, p_course_code, p_course_name, p_semester,
    p_classroom, p_schedule, p_gps_lat, p_gps_lng, p_session_duration
  ) RETURNING id INTO course_id;
  
  RETURN course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enroll students in a course
CREATE OR REPLACE FUNCTION enroll_students(
  p_course_id UUID,
  p_student_ids UUID[]
) RETURNS INTEGER AS $$
DECLARE
  enrolled_count INTEGER := 0;
  student_id UUID;
BEGIN
  FOREACH student_id IN ARRAY p_student_ids LOOP
    INSERT INTO course_enrollments (course_id, student_id)
    VALUES (p_course_id, student_id)
    ON CONFLICT (course_id, student_id) DO NOTHING;
    
    IF FOUND THEN
      enrolled_count := enrolled_count + 1;
    END IF;
  END LOOP;
  
  RETURN enrolled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
