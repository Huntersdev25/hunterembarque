-- Tabela para armazenar vídeos de apresentação dos candidatos
CREATE TABLE public.candidate_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT DEFAULT 'Apresentação',
  description TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Índice para busca rápida por candidato
CREATE INDEX idx_candidate_videos_candidate_id ON public.candidate_videos(candidate_id);

-- Enable RLS
ALTER TABLE public.candidate_videos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Admins podem gerenciar todos os vídeos
CREATE POLICY "Admins can manage all candidate videos"
ON public.candidate_videos
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- TI pode gerenciar todos os vídeos
CREATE POLICY "TI can manage all candidate videos"
ON public.candidate_videos
FOR ALL
USING (is_current_user_ti())
WITH CHECK (is_current_user_ti());

-- Candidatos podem ver seus próprios vídeos
CREATE POLICY "Candidates can view their own videos"
ON public.candidate_videos
FOR SELECT
USING (auth.uid() = candidate_id);

-- Clientes podem ver vídeos dos candidatos atribuídos a eles
CREATE POLICY "Clients can view assigned candidate videos"
ON public.candidate_videos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_candidates cc
    JOIN clients c ON cc.client_id = c.id
    WHERE cc.candidate_id = candidate_videos.candidate_id
    AND (c.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM company_users cu
      WHERE cu.client_id = c.id
      AND cu.user_id = auth.uid()
      AND cu.is_active = true
    ))
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_candidate_videos_updated_at
BEFORE UPDATE ON public.candidate_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();