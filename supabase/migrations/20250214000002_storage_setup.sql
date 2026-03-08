/*
  # Supabase Storage Architecture Setup

  ## Description:
  Configures the storage bucket and RLS policies for student face photos.
  Bucket Name: student-faces
  Structure: {student_id}/photo_{index}.jpg (where index is 1-5)

  ## Policies:
  - Upload: Authenticated students can only upload to their own folder.
  - Read: Authenticated students can read their own photos; service roles/teachers can read for recognition.
  - Delete: Students can delete their own photos.
*/

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-faces', 
  'student-faces', 
  false, 
  2097152, -- 2MB limit (2 * 1024 * 1024)
  '{"image/jpeg"}'
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create policies

-- POLICY: Students can upload their own photos
-- Path format: {student_id}/photo_{index}.jpg
CREATE POLICY "Students can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-faces' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Students can view their own photos
CREATE POLICY "Students can view their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-faces' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Students can update (upsert) their own photos
CREATE POLICY "Students can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-faces' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Students can delete their own photos
CREATE POLICY "Students can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-faces' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY: Teachers/Admins can read photos (for recognition engine or verification)
CREATE POLICY "Teachers can view student photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-faces' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  )
);
