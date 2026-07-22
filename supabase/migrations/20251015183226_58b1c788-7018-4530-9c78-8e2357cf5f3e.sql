-- Criar tabela de solicitações de profissionais
CREATE TABLE IF NOT EXISTS public.professional_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  job_function TEXT NOT NULL,
  description TEXT,
  required_certifications JSONB DEFAULT '[]'::jsonb,
  quantity INTEGER NOT NULL DEFAULT 1,
  urgency TEXT CHECK (urgency IN ('baixa', 'media', 'alta')) DEFAULT 'media',
  status TEXT CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')) DEFAULT 'pendente',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID NOT NULL
);

-- Adicionar índices
CREATE INDEX idx_professional_requests_client_id ON public.professional_requests(client_id);
CREATE INDEX idx_professional_requests_status ON public.professional_requests(status);

-- Habilitar RLS
ALTER TABLE public.professional_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Clientes podem ver suas próprias solicitações"
  ON public.professional_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = professional_requests.client_id
      AND clients.user_id = auth.uid()
      AND clients.is_active = true
    )
  );

CREATE POLICY "Clientes podem criar solicitações"
  ON public.professional_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = professional_requests.client_id
      AND clients.user_id = auth.uid()
      AND clients.is_active = true
    )
  );

CREATE POLICY "Clientes podem atualizar suas próprias solicitações"
  ON public.professional_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = professional_requests.client_id
      AND clients.user_id = auth.uid()
      AND clients.is_active = true
    )
  );

CREATE POLICY "Admins podem gerenciar todas as solicitações"
  ON public.professional_requests
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "TI tem acesso total às solicitações"
  ON public.professional_requests
  FOR ALL
  USING (is_current_user_ti());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_professional_requests_updated_at
  BEFORE UPDATE ON public.professional_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.professional_requests;