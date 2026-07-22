-- Allow clients to read onboarding timeline for candidates assigned to them on a specific job
CREATE POLICY "Clients can view timeline of assigned candidates"
ON public.candidate_onboarding_timeline
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.client_candidates cc
    JOIN public.clients c ON c.id = cc.client_id
    WHERE cc.candidate_id = candidate_onboarding_timeline.candidate_id
      AND cc.job_id = candidate_onboarding_timeline.job_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.client_id = c.id
            AND cu.user_id = auth.uid()
            AND cu.is_active = true
        )
      )
  )
);