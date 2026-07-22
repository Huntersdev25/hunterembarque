
-- 1. Change assigned_to from single uuid to uuid array for multiple assignees
ALTER TABLE public.tasks ALTER COLUMN assigned_to TYPE uuid[] USING CASE WHEN assigned_to IS NOT NULL THEN ARRAY[assigned_to] ELSE '{}'::uuid[] END;
ALTER TABLE public.tasks ALTER COLUMN assigned_to SET DEFAULT '{}'::uuid[];

-- 2. Make list_id nullable (we're removing spaces/lists requirement)
ALTER TABLE public.tasks ALTER COLUMN list_id DROP NOT NULL;

-- 3. Add status_name column for direct status storage (no more task_statuses dependency)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_name text NOT NULL DEFAULT 'A FAZER';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_color text NOT NULL DEFAULT '#6b7280';

-- 4. Migrate existing status data from task_statuses
UPDATE public.tasks t
SET status_name = COALESCE(ts.name, 'A FAZER'),
    status_color = COALESCE(ts.color, '#6b7280')
FROM public.task_statuses ts
WHERE t.status_id = ts.id;

-- 5. Add RLS policy so assigned users can view their own tasks
CREATE POLICY "Assigned users can view their tasks"
ON public.tasks
FOR SELECT
USING (auth.uid() = ANY(assigned_to));

-- 6. Add RLS policy so assigned users can update their tasks
CREATE POLICY "Assigned users can update their tasks"
ON public.tasks
FOR UPDATE
USING (auth.uid() = ANY(assigned_to));
