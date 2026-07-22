-- Adicionar colunas para avaliação de entrevista em client_candidates
ALTER TABLE public.client_candidates
ADD COLUMN interview_status TEXT CHECK (interview_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN rejection_reason TEXT,
ADD COLUMN interview_evaluated_at TIMESTAMP WITH TIME ZONE;

-- Definir status padrão como pending para registros existentes
UPDATE public.client_candidates 
SET interview_status = 'pending' 
WHERE interview_status IS NULL;

-- Adicionar constraint para garantir que rejection_reason só existe quando status é rejected
CREATE OR REPLACE FUNCTION validate_rejection_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interview_status = 'rejected' AND (NEW.rejection_reason IS NULL OR TRIM(NEW.rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required when interview status is rejected';
  END IF;
  
  IF NEW.interview_status != 'rejected' THEN
    NEW.rejection_reason = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_rejection_reason_trigger
BEFORE INSERT OR UPDATE ON public.client_candidates
FOR EACH ROW
EXECUTE FUNCTION validate_rejection_reason();

-- Atualizar política RLS para clientes poderem atualizar o status de entrevista
CREATE POLICY "Clientes podem atualizar status de entrevista de seus candidatos"
ON public.client_candidates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_candidates.client_id
    AND clients.user_id = auth.uid()
    AND clients.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = client_candidates.client_id
    AND clients.user_id = auth.uid()
    AND clients.is_active = true
  )
);