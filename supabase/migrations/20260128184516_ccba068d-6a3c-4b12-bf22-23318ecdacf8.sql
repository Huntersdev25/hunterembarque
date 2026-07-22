-- Drop the old constraint
ALTER TABLE public.client_candidates 
DROP CONSTRAINT client_candidates_interview_status_check;

-- Add new constraint with all workflow statuses
ALTER TABLE public.client_candidates 
ADD CONSTRAINT client_candidates_interview_status_check 
CHECK (interview_status = ANY (ARRAY['pending', 'awaiting_company_approval', 'interview', 'aso', 'completed', 'approved', 'rejected', 'hired', 'contracted']));