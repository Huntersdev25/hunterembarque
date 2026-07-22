-- Adicionar coluna company_user_id na tabela client_candidates
ALTER TABLE public.client_candidates
ADD COLUMN IF NOT EXISTS company_user_id UUID REFERENCES public.company_users(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_client_candidates_company_user_id 
ON public.client_candidates(company_user_id);