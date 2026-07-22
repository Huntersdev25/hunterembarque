-- Add explicit INSERT policy for admins/TI on feed-documents
CREATE POLICY "Admins can upload to feed-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feed-documents'
  AND (
    EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM ti_users WHERE user_id = auth.uid())
  )
);