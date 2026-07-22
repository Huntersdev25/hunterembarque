-- Allow clients to view profiles of candidates assigned to them
CREATE POLICY "Clientes podem ver perfis de candidatos atribuídos"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.client_candidates cc
    JOIN public.clients c ON cc.client_id = c.id
    WHERE cc.candidate_id = profiles.user_id
      AND c.user_id = auth.uid()
      AND c.is_active = true
  )
);
