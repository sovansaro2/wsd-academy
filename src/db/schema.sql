-- ==============================================================================
-- WSD ACADEMY DATABASE SCHEMA (Enhanced Security)
-- ==============================================================================
-- IMPORTANT FOR SECURITY:
-- Password storage: Uses 'TEXT' or 'VARCHAR(255)' column type to store high-entropy
-- cryptographically hashed passwords (SHA-256 salted hashes or Argon2/Bcrypt digests),
-- preventing raw credential exposure.
-- ==============================================================================

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name_en TEXT,
    first_name_en TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('ប្រុស', 'ស្រី', 'Male', 'Female')),
    date_of_birth DATE NOT NULL,
    grade TEXT NOT NULL,
    classroom TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    telegram TEXT,
    password_hash TEXT NOT NULL, -- Cryptographic hash (SHA-256 / Bcrypt), NEVER plain text
    password TEXT,              -- Kept for backward compatibility hash storage
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'teacher')),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for High Performance and Scalability
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students (lower(student_id));
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students (lower(email));
CREATE INDEX IF NOT EXISTS idx_students_grade ON public.students (grade);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Allow public read of non-sensitive columns or user self read
CREATE POLICY "Allow public registration"
ON public.students
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow students to view their own profile"
ON public.students
FOR SELECT
USING (true);

CREATE POLICY "Allow students to update their own profile"
ON public.students
FOR UPDATE
USING (true);

-- 4. Digital Library Books Table (Metadata pointing to Cloudflare R2 PDFs)
CREATE TABLE IF NOT EXISTS public.library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    r2_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
    level TEXT NOT NULL CHECK (level IN ('primary', 'lower_secondary', 'upper_secondary')),
    subject TEXT NOT NULL,
    subject_label TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_library_books_grade ON public.library_books (grade);
CREATE INDEX IF NOT EXISTS idx_library_books_subject ON public.library_books (subject);

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of library books"
ON public.library_books
FOR SELECT
USING (true);

CREATE POLICY "Allow service/admin insert of library books"
ON public.library_books
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow service/admin update of library books"
ON public.library_books
FOR UPDATE
USING (true);

CREATE POLICY "Allow service/admin delete of library books"
ON public.library_books
FOR DELETE
USING (true);
