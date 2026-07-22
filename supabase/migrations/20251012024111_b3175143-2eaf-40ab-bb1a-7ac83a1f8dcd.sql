-- Corrigir search_path da função validate_rejection_reason
CREATE OR REPLACE FUNCTION validate_rejection_reason()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.interview_status = 'rejected' AND (NEW.rejection_reason IS NULL OR TRIM(NEW.rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required when interview status is rejected';
  END IF;
  
  IF NEW.interview_status != 'rejected' THEN
    NEW.rejection_reason = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;