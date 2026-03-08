-- Add enrollment status to profiles
ALTER TABLE public.profiles
  ADD COLUMN enrollment_status TEXT DEFAULT NULL
  CHECK (enrollment_status IN ('pending', 'approved', 'rejected'));

-- Add target_id to notifications (points to the student being enrolled)
ALTER TABLE public.notifications
  ADD COLUMN target_id UUID REFERENCES public.profiles(id);

-- Teachers can view all student profiles for enrollment review
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

-- Teachers can update enrollment_status
CREATE POLICY "Teachers can update enrollment status"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

-- Teachers can view student photos for approval
CREATE POLICY "Teachers can view student photos"
  ON public.student_photos FOR SELECT
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

-- Teachers can delete student photos on rejection
CREATE POLICY "Teachers can delete student photos"
  ON public.student_photos FOR DELETE
  USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );
