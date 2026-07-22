-- Allow admins to INSERT/UPDATE certifications for candidates
CREATE POLICY "Admins can manage all certifications"
ON public.certifications
FOR ALL
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());
