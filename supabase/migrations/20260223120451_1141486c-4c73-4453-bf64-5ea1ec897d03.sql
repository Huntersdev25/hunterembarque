-- Add reminder column to tasks table
ALTER TABLE public.tasks ADD COLUMN reminder_at timestamp with time zone DEFAULT NULL;