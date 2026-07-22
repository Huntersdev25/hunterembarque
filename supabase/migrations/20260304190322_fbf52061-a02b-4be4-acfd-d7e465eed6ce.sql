
-- Table to track daily admin activities for executive reports
CREATE TABLE public.daily_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_role text NOT NULL DEFAULT 'admin',
  action_type text NOT NULL, -- 'task_created', 'task_updated', 'task_completed', 'candidate_added', 'job_created', etc.
  action_description text NOT NULL,
  entity_type text, -- 'task', 'candidate', 'job', 'client', 'application'
  entity_id text,
  entity_title text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage daily_activity_logs"
ON public.daily_activity_logs FOR ALL
TO authenticated
USING (is_current_user_admin() OR is_current_user_ti())
WITH CHECK (is_current_user_admin() OR is_current_user_ti());

-- Index for date-based queries
CREATE INDEX idx_daily_activity_logs_created_at ON public.daily_activity_logs (created_at DESC);
CREATE INDEX idx_daily_activity_logs_user_id ON public.daily_activity_logs (user_id);
