
-- Add client_id to jobs table to associate jobs with clients
ALTER TABLE public.jobs ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_jobs_client_id ON public.jobs(client_id);

-- Allow clients to view their own jobs
CREATE POLICY "Clients can view their own jobs"
ON public.jobs
FOR SELECT
USING (
  client_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = jobs.client_id 
      AND clients.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM company_users cu
      JOIN clients c ON cu.client_id = c.id
      WHERE c.id = jobs.client_id
      AND cu.user_id = auth.uid()
      AND cu.is_active = true
    )
  )
);

-- Create table for candidate-job documents (documents attached per candidate per client job)
CREATE TABLE public.client_candidate_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_candidate_id uuid NOT NULL REFERENCES public.client_candidates(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  document_type text DEFAULT 'other',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_candidate_documents ENABLE ROW LEVEL SECURITY;

-- Admins can manage all documents
CREATE POLICY "Admins can manage candidate documents"
ON public.client_candidate_documents
FOR ALL
USING (is_admin(auth.uid()) OR is_current_user_ti())
WITH CHECK (is_admin(auth.uid()) OR is_current_user_ti());

-- Clients can view documents for their candidates
CREATE POLICY "Clients can view their candidate documents"
ON public.client_candidate_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON cc.client_id = c.id
    WHERE cc.id = client_candidate_documents.client_candidate_id
    AND (
      c.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.client_id = c.id
        AND cu.user_id = auth.uid()
        AND cu.is_active = true
      )
    )
  )
);

-- Index for performance
CREATE INDEX idx_client_candidate_documents_cc_id ON public.client_candidate_documents(client_candidate_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_candidate_documents_updated_at
BEFORE UPDATE ON public.client_candidate_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
