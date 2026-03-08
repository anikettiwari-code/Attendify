/*
  # Initial Schema Setup for Attendify

  ## Query Description:
  Sets up the core tables for the attendance system: profiles, classes, lectures, attendance, and student_photos.
  Includes RLS policies and triggers for user creation.

  ## Metadata:
  - Schema-Category: Structural
  - Impact-Level: High
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - profiles: Extends auth.users with role (student/teacher), name, roll_no
  - classes: Defines student groups (e.g., CS-A)
  - lectures: Schedule of classes
  - attendance: Records of student attendance
  - student_photos: Links to storage for face recognition
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late');
CREATE TYPE attendance_method AS ENUM ('Manual', 'AI');

-- Create Classes table
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    student_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role user_role DEFAULT 'student',
    roll_no TEXT,
    department TEXT,
    class_id UUID REFERENCES public.classes(id),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Lectures table
CREATE TABLE public.lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id),
    class_id UUID REFERENCES public.classes(id),
    subject TEXT NOT NULL,
    lecture_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_no TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Attendance table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id),
    lecture_id UUID REFERENCES public.lectures(id),
    status attendance_status DEFAULT 'Absent',
    method attendance_method DEFAULT 'Manual',
    confidence_score FLOAT,
    camera_id TEXT,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, lecture_id)
);

-- Create Student Photos table
CREATE TABLE public.student_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id),
    photo_url TEXT NOT NULL,
    photo_index INT CHECK (photo_index BETWEEN 1 AND 5),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_photos ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for MVP)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Classes are viewable by everyone" ON public.classes FOR SELECT USING (true);

CREATE POLICY "Lectures are viewable by everyone" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "Teachers can insert lectures" ON public.lectures FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Attendance viewable by involved parties" ON public.attendance FOR SELECT USING (
    auth.uid() = student_id OR 
    EXISTS (SELECT 1 FROM public.lectures l WHERE l.id = lecture_id AND l.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can insert attendance" ON public.attendance FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Teachers can update attendance" ON public.attendance FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);

CREATE POLICY "Students manage own photos" ON public.student_photos FOR ALL USING (auth.uid() = student_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'role')::user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed some initial data (Optional, but helpful)
INSERT INTO public.classes (name, department, student_count) VALUES 
('CS-A Div 1', 'Computer Science', 60),
('CS-B Div 2', 'Computer Science', 55),
('IT-A Div 1', 'Information Technology', 62);
