-- Enable real-time functionality for jobs table
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Add jobs table to realtime publication
BEGIN;
  -- Remove the table from the publication first if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create the publication with the jobs table
  CREATE PUBLICATION supabase_realtime FOR TABLE public.jobs;
COMMIT;