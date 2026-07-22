
-- Drop existing task policies
DROP POLICY IF EXISTS "Privileged admins can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Privileged admins can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Privileged admins can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Privileged admins can delete tasks" ON public.tasks;

-- SELECT: Directors/Coordinators/Supervisors see ALL tasks
CREATE POLICY "Privileged admins can view all tasks"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND cargo IN ('Diretor', 'Coordenador de Operações', 'Supervisor')
  )
);

-- SELECT: Other users see only tasks they created or are assigned to
CREATE POLICY "Users can view their own tasks"
ON public.tasks FOR SELECT
USING (
  auth.uid() = created_by 
  OR auth.uid() = ANY(assigned_to)
);

-- INSERT: Any authenticated user can create tasks
CREATE POLICY "Any user can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = created_by
);

-- UPDATE: Privileged admins can update all tasks
CREATE POLICY "Privileged admins can update all tasks"
ON public.tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND cargo IN ('Diretor', 'Coordenador de Operações', 'Supervisor')
  )
);

-- UPDATE: Other users can update tasks they created or are assigned to
CREATE POLICY "Users can update their assigned tasks"
ON public.tasks FOR UPDATE
USING (
  auth.uid() = created_by 
  OR auth.uid() = ANY(assigned_to)
);

-- DELETE: Only privileged admins can delete tasks
CREATE POLICY "Privileged admins can delete tasks"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND cargo IN ('Diretor', 'Coordenador de Operações', 'Supervisor')
  )
);
