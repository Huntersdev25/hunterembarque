
-- Make candidate-videos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'candidate-videos';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Candidate videos are publicly readable" ON storage.objects;

-- Candidates can view their own videos
CREATE POLICY "Candidates can view own videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'candidate-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Candidates can upload their own videos
CREATE POLICY "Candidates can upload own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'candidate-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Candidates can delete their own videos
CREATE POLICY "Candidates can delete own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'candidate-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins and TI have full access to candidate videos
CREATE POLICY "Admins TI full access candidate videos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'candidate-videos'
  AND (is_admin(auth.uid()) OR is_current_user_ti())
);

-- Clients can view videos of candidates assigned to them
CREATE POLICY "Clients can view assigned candidate videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'candidate-videos'
  AND EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON cc.client_id = c.id
    WHERE cc.candidate_id::text = (storage.foldername(name))[1]
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
