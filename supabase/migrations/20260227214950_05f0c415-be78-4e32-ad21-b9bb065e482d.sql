
-- Add comments and subtasks as JSONB columns in tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS comments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing data
UPDATE public.tasks t SET comments = COALESCE((
  SELECT jsonb_agg(jsonb_build_object('id', c.id, 'user_id', c.user_id, 'content', c.content, 'created_at', c.created_at) ORDER BY c.created_at)
  FROM public.task_comments c WHERE c.task_id = t.id
), '[]'::jsonb);

UPDATE public.tasks t SET subtasks = COALESCE((
  SELECT jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'is_completed', s.is_completed, 'sort_order', s.sort_order) ORDER BY s.sort_order)
  FROM public.task_subtasks s WHERE s.task_id = t.id
), '[]'::jsonb);

-- Drop the separate tables
DROP TABLE IF EXISTS public.task_subtasks CASCADE;
DROP TABLE IF EXISTS public.task_comments CASCADE;
