-- Add aso_status column to client_candidates table
ALTER TABLE public.client_candidates 
ADD COLUMN IF NOT EXISTS aso_status text DEFAULT 'pendente';

-- Add interview_date and interview_time columns
ALTER TABLE public.client_candidates 
ADD COLUMN IF NOT EXISTS interview_date date,
ADD COLUMN IF NOT EXISTS interview_time time;

-- Add a comment for documentation
COMMENT ON COLUMN public.client_candidates.aso_status IS 'Status do ASO: pendente, marcado, finalizado';
COMMENT ON COLUMN public.client_candidates.interview_date IS 'Data agendada para entrevista';
COMMENT ON COLUMN public.client_candidates.interview_time IS 'Horário agendado para entrevista';