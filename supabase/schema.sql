-- ==============================================================================
-- WSD ACADEMY - SUPABASE DATABASE SCHEMA
-- Execute this SQL in Supabase SQL Editor: https://supabase.com/dashboard/project/bnolwghgydybgfhwzpyn/sql/new
-- ==============================================================================

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) UNIQUE NOT NULL, -- លេខសម្គាល់សិស្ស (Student ID)
    last_name VARCHAR(100) NOT NULL,        -- គោត្តនាម
    first_name VARCHAR(100) NOT NULL,       -- នាម
    gender VARCHAR(20) NOT NULL,            -- ភេទ (ប្រុស / ស្រី)
    date_of_birth DATE NOT NULL,            -- ថ្ងៃខែឆ្នាំកំណើត (YYYY-MM-DD)
    grade VARCHAR(20) NOT NULL,             -- កម្រិតសិក្សា (ទី១០, ទី១១, ទី១២)
    classroom VARCHAR(50) NOT NULL,         -- ថ្នាក់ (ឧ. 12A, 11B)
    address TEXT NOT NULL,                  -- ទីលំនៅ
    email VARCHAR(255) UNIQUE NOT NULL,     -- អ៊ីម៉ែល
    phone VARCHAR(50) NOT NULL,             -- លេខទូរស័ព្ទ
    telegram VARCHAR(100),                  -- ឈ្មោះ Telegram (@username - មិនមានក៏បាន)
    password VARCHAR(255) NOT NULL,         -- ពាក្យសម្ងាត់
    role VARCHAR(20) DEFAULT 'student' NOT NULL CHECK (role IN ('student', 'admin', 'teacher')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_grade ON public.students(grade);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies:
-- Allow anyone to read for student login authentication check
CREATE POLICY "Allow public read for student authentication" 
ON public.students FOR SELECT 
USING (true);

-- Allow public registration (insert new student)
CREATE POLICY "Allow public student registration" 
ON public.students FOR INSERT 
WITH CHECK (true);

-- Allow students to update their own profile
CREATE POLICY "Allow student update" 
ON public.students FOR UPDATE 
USING (true);

-- 5. Optional Initial Admin / Sample Student Account
INSERT INTO public.students (
    student_id, 
    last_name, 
    first_name, 
    gender, 
    date_of_birth, 
    grade, 
    classroom, 
    address, 
    email, 
    phone, 
    telegram, 
    password, 
    role
) VALUES (
    'STU-12001',
    'សុវណ្ណ',
    'សារ៉ូ',
    'ប្រុស',
    '2008-05-15',
    'ទី១២',
    '12A',
    'រាជធានីភ្នំពេញ',
    'sovansaro2025@gmail.com',
    '012345678',
    '@sovansaro',
    '123456',
    'admin'
) ON CONFLICT (student_id) DO NOTHING;
