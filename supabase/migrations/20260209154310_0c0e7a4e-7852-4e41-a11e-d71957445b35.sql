-- Add storage policy for clients to view admin-uploaded documents in client-candidates/ folder
CREATE POLICY "Clients can view admin-uploaded documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'feed-documents'
  AND (storage.foldername(name))[1] = 'client-candidates'
  AND (
    EXISTS (
      SELECT 1 FROM client_candidates cc
      JOIN clients c ON cc.client_id = c.id
      WHERE cc.id::text = (storage.foldername(name))[2]
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
  )
);