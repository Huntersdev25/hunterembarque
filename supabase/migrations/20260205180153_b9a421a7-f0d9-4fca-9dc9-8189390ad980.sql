-- Criar bucket para vídeos de candidatos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('candidate-videos', 'candidate-videos', true, 104857600); -- 100MB limit

-- Políticas para o bucket de vídeos
-- Admins e TI podem fazer upload
CREATE POLICY "Admins can upload candidate videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'candidate-videos' 
  AND (is_admin(auth.uid()) OR is_current_user_ti())
);

-- Admins e TI podem atualizar
CREATE POLICY "Admins can update candidate videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'candidate-videos' 
  AND (is_admin(auth.uid()) OR is_current_user_ti())
);

-- Admins e TI podem deletar
CREATE POLICY "Admins can delete candidate videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'candidate-videos' 
  AND (is_admin(auth.uid()) OR is_current_user_ti())
);

-- Vídeos são públicos para leitura (simplifica o player)
CREATE POLICY "Candidate videos are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'candidate-videos');

-- Atualizar tabela para usar file_path ao invés de video_url
ALTER TABLE public.candidate_videos 
  ADD COLUMN file_path TEXT,
  ADD COLUMN file_name TEXT,
  ADD COLUMN file_size BIGINT;

-- Tornar video_url opcional (para compatibilidade)
ALTER TABLE public.candidate_videos 
  ALTER COLUMN video_url DROP NOT NULL;