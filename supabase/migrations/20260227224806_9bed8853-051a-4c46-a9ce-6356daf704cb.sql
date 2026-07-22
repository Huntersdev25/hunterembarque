
-- Drop existing INSERT policies (too permissive)
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Directors can insert tasks" ON public.tasks;

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Directors can update all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned or created tasks" ON public.tasks;

-- Drop existing DELETE policies  
DROP POLICY IF EXISTS "Directors can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete assigned or created tasks" ON public.tasks;

-- DROP existing SELECT policies
DROP POLICY IF EXISTS "Directors can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned or created tasks" ON public.tasks;

-- === SELECT: Any authenticated user can see tasks assigned to them or created by them ===
-- Directors and Coordenador de Operações see ALL tasks
CREATE POLICY "Privileged admins can view all tasks"
ON public.tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND cargo IN ('Diretor', 'Coordenador de Operações')
  )
);

-- Other users see only tasks they created or are assigned to
CREATE POLICY "Users can view their own tasks"
ON public.tasks FOR SELECT
USING (
  auth.uid() = created_by 
  OR auth.uid() = ANY(assigned_to)
);

-- === INSERT: Only Directors and Coordenador de Operações ===
CREATE POLICY "Privileged admins can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND cargo IN ('Diretor', 'Coordenador de Operações')
  )
);

-- === UPDATE: Directors/Coordenadores can update any task; others only their own/assigned ===
CREATE POLICY "Privileged admins can update all tasks"
ON public.tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND cargo IN ('Diretor', 'Coordenador de Operações')
  )
);

CREATE POLICY "Users can update their assigned tasks"
ON public.tasks FOR UPDATE
USING (
  auth.uid() = created_by 
  OR auth.uid() = ANY(assigned_to)
);

-- === DELETE: Only Directors and Coordenador de Operações ===
CREATE POLICY "Privileged admins can delete tasks"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.administrators 
    WHERE user_id = auth.uid() 
    AND cargo IN ('Diretor', 'Coordenador de Operações')
  )
);
