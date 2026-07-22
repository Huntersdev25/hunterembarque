-- Criar enum para tipos de postagem
CREATE TYPE public.feed_post_type AS ENUM ('texto', 'midia', 'evento', 'vaga', 'enquete', 'documento');

-- Criar tabela para postagens do feed
CREATE TABLE public.feed_posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_postagem feed_post_type NOT NULL DEFAULT 'texto',
    conteudo_texto TEXT NOT NULL,
    anexos JSONB DEFAULT '[]'::jsonb,
    data_publicacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    interacoes JSONB DEFAULT '{"curtidas": [], "comentarios": [], "votos": {}}'::jsonb,
    visivel_para TEXT DEFAULT 'publico',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos podem ver posts do feed"
ON public.feed_posts
FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem criar posts"
ON public.feed_posts
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar posts"
ON public.feed_posts
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar posts"
ON public.feed_posts
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_feed_posts_updated_at
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para comentários
CREATE TABLE public.feed_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para comentários
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para comentários
CREATE POLICY "Todos podem ver comentários"
ON public.feed_comments
FOR SELECT
USING (true);

CREATE POLICY "Usuários logados podem criar comentários"
ON public.feed_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar próprios comentários"
ON public.feed_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins e autores podem deletar comentários"
ON public.feed_comments
FOR DELETE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Trigger para updated_at em comentários
CREATE TRIGGER update_feed_comments_updated_at
BEFORE UPDATE ON public.feed_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();