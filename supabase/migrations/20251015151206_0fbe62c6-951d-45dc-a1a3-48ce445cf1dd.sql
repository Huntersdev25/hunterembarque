-- Adicionar política para admins poderem criar applications para candidatos
CREATE POLICY "Admins can create applications for candidates"
ON public.applications
FOR INSERT
WITH CHECK (is_admin(auth.uid()));