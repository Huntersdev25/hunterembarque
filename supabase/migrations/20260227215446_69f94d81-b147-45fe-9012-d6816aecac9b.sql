
-- Add role/cargo column to administrators
ALTER TABLE public.administrators ADD COLUMN IF NOT EXISTS cargo text NOT NULL DEFAULT 'Operacional';

-- Set the roles
UPDATE public.administrators SET cargo = 'Diretor' WHERE email IN ('julio.cesar@hunters.com.br', 'rogerio.soares@hunters.com.br');
UPDATE public.administrators SET cargo = 'Coordenador de Operações' WHERE email = 'marcelo.tobias@hunters.com.br';
UPDATE public.administrators SET cargo = 'Analista de Operações' WHERE email = 'suelaine.alexandre@hunters.com.br';
UPDATE public.administrators SET cargo = 'Supervisor de Operações' WHERE email = 'anderson.santos@hunters.com.br';

-- Update tasks RLS: drop old assigned-only policies, replace with role-aware ones
DROP POLICY IF EXISTS "Assigned users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Assigned users can update their tasks" ON public.tasks;

-- Directors can see ALL tasks
CREATE POLICY "Directors can view all tasks"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.administrators
    WHERE user_id = auth.uid() AND cargo = 'Diretor'
  )
);

CREATE POLICY "Directors can update all tasks"
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.administrators
    WHERE user_id = auth.uid() AND cargo = 'Diretor'
  )
);

-- Non-directors: can see tasks they created OR are assigned to
CREATE POLICY "Users can view assigned or created tasks"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = created_by
  OR auth.uid() = ANY(assigned_to)
);

CREATE POLICY "Users can update assigned or created tasks"
ON public.tasks
FOR UPDATE
USING (
  auth.uid() = created_by
  OR auth.uid() = ANY(assigned_to)
);
