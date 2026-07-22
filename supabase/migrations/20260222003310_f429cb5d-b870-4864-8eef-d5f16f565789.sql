
-- Create task_statuses table for custom statuses per list
CREATE TABLE public.task_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.task_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage task_statuses"
  ON public.task_statuses FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "TI can manage task_statuses"
  ON public.task_statuses FOR ALL
  USING (is_current_user_ti())
  WITH CHECK (is_current_user_ti());

-- Change tasks.status from enum to text (to support custom statuses)
ALTER TABLE public.tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.tasks ALTER COLUMN status TYPE TEXT USING status::TEXT;

-- Add status_id column to tasks referencing task_statuses
ALTER TABLE public.tasks ADD COLUMN status_id UUID REFERENCES public.task_statuses(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_task_statuses_list_id ON public.task_statuses(list_id);
CREATE INDEX idx_tasks_status_id ON public.tasks(status_id);
