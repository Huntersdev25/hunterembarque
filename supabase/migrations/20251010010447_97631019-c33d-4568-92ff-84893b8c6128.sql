-- Habilitar RLS na tabela n8n_chat_histories
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso público (caso seja necessário para o n8n)
-- Ajuste conforme suas necessidades de segurança
CREATE POLICY "Allow public access to n8n_chat_histories"
ON public.n8n_chat_histories
FOR ALL
USING (true);