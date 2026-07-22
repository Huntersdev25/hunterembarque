-- Criar tabela de relacionamento entre clientes e candidatos aprovados
CREATE TABLE IF NOT EXISTS public.client_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(client_id, candidate_id)
);

-- Habilitar RLS
ALTER TABLE public.client_candidates ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar todas as associações
CREATE POLICY "Admins podem gerenciar client_candidates"
ON public.client_candidates
FOR ALL
USING (is_admin(auth.uid()));

-- Clientes podem ver seus candidatos
CREATE POLICY "Clientes podem ver seus candidatos"
ON public.client_candidates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_candidates.client_id
    AND clients.user_id = auth.uid()
    AND clients.is_active = true
  )
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_client_candidates_client ON public.client_candidates(client_id);
CREATE INDEX IF NOT EXISTS idx_client_candidates_candidate ON public.client_candidates(candidate_id);

-- Comentários para documentação
COMMENT ON TABLE public.client_candidates IS 'Relacionamento entre clientes e candidatos aprovados que foram atribuídos a eles';
COMMENT ON COLUMN public.client_candidates.client_id IS 'ID do cliente que recebeu o candidato';
COMMENT ON COLUMN public.client_candidates.candidate_id IS 'ID do usuário candidato';
COMMENT ON COLUMN public.client_candidates.assigned_by IS 'ID do administrador que fez a atribuição';
COMMENT ON COLUMN public.client_candidates.notes IS 'Notas opcionais sobre a atribuição';