
-- 1. Drop unused tables
DROP TABLE IF EXISTS public.task_statuses CASCADE;
DROP TABLE IF EXISTS public.task_lists CASCADE;

-- 2. Clean up legacy columns from tasks
ALTER TABLE public.tasks DROP COLUMN IF EXISTS status;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS status_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS list_id;

-- 3. Fix task_comments RLS: assigned users should see comments on their tasks
CREATE POLICY "Assigned users can view task comments"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND auth.uid() = ANY(t.assigned_to)
  )
);

CREATE POLICY "Assigned users can insert task comments"
ON public.task_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND auth.uid() = ANY(t.assigned_to)
  )
);

-- 4. Fix task_subtasks RLS: assigned users should manage subtasks on their tasks
CREATE POLICY "Assigned users can view subtasks"
ON public.task_subtasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_subtasks.task_id
    AND auth.uid() = ANY(t.assigned_to)
  )
);

CREATE POLICY "Assigned users can manage subtasks"
ON public.task_subtasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_subtasks.task_id
    AND auth.uid() = ANY(t.assigned_to)
  )
);
