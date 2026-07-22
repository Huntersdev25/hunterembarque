-- Add structured fields to client_candidates for boarding integration
ALTER TABLE public.client_candidates
ADD COLUMN IF NOT EXISTS vessel_name text,
ADD COLUMN IF NOT EXISTS period_start date,
ADD COLUMN IF NOT EXISTS period_end date,
ADD COLUMN IF NOT EXISTS boarding_employee_id uuid REFERENCES public.boarding_employees(id) ON DELETE SET NULL;

-- Add candidate_id to boarding_employees to link approved candidates
ALTER TABLE public.boarding_employees
ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_candidate_id uuid REFERENCES public.client_candidates(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_boarding_employees_candidate_id ON public.boarding_employees(candidate_id);
CREATE INDEX IF NOT EXISTS idx_boarding_employees_client_candidate_id ON public.boarding_employees(client_candidate_id);
CREATE INDEX IF NOT EXISTS idx_client_candidates_vessel_name ON public.client_candidates(vessel_name);

-- Add unique constraint for boarding_records to support upsert
ALTER TABLE public.boarding_records 
DROP CONSTRAINT IF EXISTS boarding_records_employee_date_unique;

ALTER TABLE public.boarding_records
ADD CONSTRAINT boarding_records_employee_date_unique UNIQUE (employee_id, record_date);