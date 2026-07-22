
-- Add job_id to client_candidates to link assigned candidates to specific jobs
ALTER TABLE public.client_candidates ADD COLUMN job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_client_candidates_job_id ON public.client_candidates(job_id);
