-- Parte 1: Adicionar novo tipo de role para clientes
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'client';

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Habilitar RLS na tabela clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies para clients
CREATE POLICY "Admins podem ver todos os clientes"
ON public.clients
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem criar clientes"
ON public.clients
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar clientes"
ON public.clients
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar clientes"
ON public.clients
FOR DELETE
USING (is_admin(auth.uid()));

CREATE POLICY "Clientes podem ver seu próprio registro"
ON public.clients
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();