-- Criar políticas de storage para permitir clientes verem documentos dos candidatos atribuídos

-- Permitir clientes visualizarem documentos de candidatos atribuídos a eles
CREATE POLICY "Clients can view assigned candidate documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'feed-documents' 
  AND (
    -- Administradores têm acesso total
    EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid())
    OR
    -- TI tem acesso total
    EXISTS (SELECT 1 FROM ti_users WHERE user_id = auth.uid())
    OR
    -- Candidatos podem ver seus próprios documentos
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Clientes podem ver documentos de candidatos atribuídos a eles
    EXISTS (
      SELECT 1 FROM client_candidates cc
      JOIN clients c ON cc.client_id = c.id
      JOIN client_candidate_visibility v ON v.client_candidate_id = cc.id
      WHERE cc.candidate_id::text = (storage.foldername(name))[1]
      AND (c.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM company_users cu 
        WHERE cu.client_id = c.id 
        AND cu.user_id = auth.uid() 
        AND cu.is_active = true
      ))
      AND v.show_documents = true
    )
  )
);

-- Permitir candidatos fazerem upload de seus próprios documentos
CREATE POLICY "Candidates can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'feed-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir candidatos atualizarem seus próprios documentos
CREATE POLICY "Candidates can update their own documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'feed-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permitir candidatos deletarem seus próprios documentos
CREATE POLICY "Candidates can delete their own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'feed-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins e TI podem gerenciar todos os documentos
CREATE POLICY "Admins can manage all documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'feed-documents'
  AND (
    EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM ti_users WHERE user_id = auth.uid())
  )
);

-- Também precisamos adicionar política RLS na tabela certifications para clientes verem
CREATE POLICY "Clients can view assigned candidate certifications"
ON public.certifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON cc.client_id = c.id
    JOIN client_candidate_visibility v ON v.client_candidate_id = cc.id
    WHERE cc.candidate_id = certifications.user_id
    AND (c.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM company_users cu 
      WHERE cu.client_id = c.id 
      AND cu.user_id = auth.uid() 
      AND cu.is_active = true
    ))
    AND v.show_certifications = true
  )
);