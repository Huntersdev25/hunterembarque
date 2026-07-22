-- Remove the overly permissive upload policy from feed-documents bucket
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de documentos" ON storage.objects;