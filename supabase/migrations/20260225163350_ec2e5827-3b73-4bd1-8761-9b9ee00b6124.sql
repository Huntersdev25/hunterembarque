
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Candidates can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Candidates can delete their own documents" ON storage.objects;

-- Candidates can upload documents to their own folder
CREATE POLICY "Candidates can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feed-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Candidates can view their own documents
CREATE POLICY "Candidates can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'feed-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Candidates can delete their own documents
CREATE POLICY "Candidates can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'feed-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all documents in feed-documents
CREATE POLICY "Admins can manage all feed-documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'feed-documents'
  AND (
    EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
  )
);

-- Admins can manage all files in feed-media
CREATE POLICY "Admins can manage all feed-media"
ON storage.objects FOR ALL
USING (
  bucket_id = 'feed-media'
  AND (
    EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
  )
);

-- Admins/TI can manage job-covers
CREATE POLICY "Admins can manage job-covers"
ON storage.objects FOR ALL
USING (
  bucket_id = 'job-covers'
  AND (
    EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
  )
);

-- Admins/TI can manage agent-covers
CREATE POLICY "Admins can manage agent-covers"
ON storage.objects FOR ALL
USING (
  bucket_id = 'agent-covers'
  AND (
    EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
  )
);

-- Public read for public buckets
CREATE POLICY "Public read access for feed-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'feed-media');

CREATE POLICY "Public read access for job-covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-covers');

CREATE POLICY "Public read access for agent-covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'agent-covers');
