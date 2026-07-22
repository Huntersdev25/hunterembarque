-- Criar buckets de storage para mídia e documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-media', 'feed-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-documents', 'feed-documents', false);

-- Políticas para bucket feed-media (público)
CREATE POLICY "Visualização pública de mídia do feed" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'feed-media');

CREATE POLICY "Usuários autenticados podem fazer upload de mídia" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'feed-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar suas próprias mídias" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'feed-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem deletar suas próprias mídias" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'feed-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para bucket feed-documents (privado)
CREATE POLICY "Usuários podem visualizar seus próprios documentos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'feed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins podem visualizar todos os documentos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'feed-documents' AND is_admin(auth.uid()));

CREATE POLICY "Usuários autenticados podem fazer upload de documentos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'feed-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar seus próprios documentos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'feed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem deletar seus próprios documentos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'feed-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Adicionar colunas para eventos na tabela feed_posts
ALTER TABLE feed_posts 
ADD COLUMN evento_data TIMESTAMP WITH TIME ZONE,
ADD COLUMN evento_local TEXT;

-- Adicionar colunas para vagas/contratação
ALTER TABLE feed_posts 
ADD COLUMN vaga_titulo TEXT,
ADD COLUMN vaga_descricao TEXT,
ADD COLUMN vaga_requisitos TEXT;

-- Adicionar colunas para enquetes
ALTER TABLE feed_posts 
ADD COLUMN enquete_opcoes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN enquete_votos JSONB DEFAULT '{}'::jsonb,
ADD COLUMN enquete_encerramento TIMESTAMP WITH TIME ZONE;

-- Criar trigger para atualizar updated_at em feed_comments  
CREATE TRIGGER update_feed_comments_updated_at
    BEFORE UPDATE ON feed_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para votar em enquetes
CREATE OR REPLACE FUNCTION votar_enquete(
    post_id UUID,
    opcao_index INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid UUID;
    post_exists BOOLEAN;
    enquete_ativa BOOLEAN;
    votos_atuais JSONB;
BEGIN
    -- Verificar se usuário está autenticado
    user_uuid := auth.uid();
    IF user_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se post existe e é uma enquete
    SELECT 
        EXISTS(SELECT 1 FROM feed_posts WHERE id = post_id AND tipo_postagem = 'enquete'),
        CASE 
            WHEN enquete_encerramento IS NULL OR enquete_encerramento > NOW() THEN TRUE 
            ELSE FALSE 
        END,
        enquete_votos
    INTO post_exists, enquete_ativa, votos_atuais
    FROM feed_posts 
    WHERE id = post_id;
    
    IF NOT post_exists OR NOT enquete_ativa THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar voto do usuário
    votos_atuais := COALESCE(votos_atuais, '{}'::jsonb);
    votos_atuais := jsonb_set(votos_atuais, ARRAY[user_uuid::text], to_jsonb(opcao_index));
    
    -- Salvar votos atualizados
    UPDATE feed_posts 
    SET enquete_votos = votos_atuais, updated_at = NOW()
    WHERE id = post_id;
    
    RETURN TRUE;
END;
$$;