-- Criar bucket para imagens de capa das vagas
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-covers', 'job-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Adicionar campos na tabela jobs para a imagem de capa e descrição breve
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Criar políticas RLS para o bucket job-covers
CREATE POLICY "Todos podem ver capas de vagas"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-covers');

CREATE POLICY "Admins podem fazer upload de capas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-covers' 
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins podem atualizar capas"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'job-covers' 
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins podem deletar capas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-covers' 
  AND is_admin(auth.uid())
);