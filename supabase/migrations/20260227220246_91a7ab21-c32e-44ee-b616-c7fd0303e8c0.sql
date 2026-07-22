
-- Drop the overly permissive "all admins" policy
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;

-- Directors: full access (already have SELECT and UPDATE, add INSERT and DELETE)
CREATE POLICY "Directors can insert tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid() AND cargo = 'Diretor')
);

CREATE POLICY "Directors can delete tasks"
ON public.tasks FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid() AND cargo = 'Diretor')
);

-- Non-director admins: can create tasks
CREATE POLICY "Admins can insert tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
);

-- Non-director admins: can delete only their own or assigned tasks
CREATE POLICY "Users can delete assigned or created tasks"
ON public.tasks FOR DELETE
USING (
  auth.uid() = created_by OR auth.uid() = ANY(assigned_to)
);
