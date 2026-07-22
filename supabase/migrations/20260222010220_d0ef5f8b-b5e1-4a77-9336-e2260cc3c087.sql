
-- Add tags, estimate, time spent, and client_id columns to tasks table
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estimate_minutes integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS time_spent_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS project text DEFAULT NULL;

-- Add foreign key for client_id
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
