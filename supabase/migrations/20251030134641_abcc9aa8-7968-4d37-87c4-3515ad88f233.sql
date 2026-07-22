-- Criar enum para roles dentro da empresa
CREATE TYPE company_role AS ENUM ('company_admin', 'company_user');

-- Criar tabela de usuários da empresa
CREATE TABLE public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role company_role NOT NULL DEFAULT 'company_user',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, client_id)
);

-- Enable RLS
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies para company_users
CREATE POLICY "Admins podem gerenciar company_users"
ON public.company_users
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "TI has full access to company_users"
ON public.company_users
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "Company admins podem ver usuários da empresa"
ON public.company_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.client_id = company_users.client_id
    AND cu.role = 'company_admin'
    AND cu.is_active = true
  )
);

CREATE POLICY "Company users podem ver próprio registro"
ON public.company_users
FOR SELECT
USING (user_id = auth.uid());

-- Adicionar coluna na tabela professional_requests
ALTER TABLE public.professional_requests
ADD COLUMN company_user_id UUID REFERENCES public.company_users(id);

-- Atualizar RLS da professional_requests para incluir company admins e users
CREATE POLICY "Company admins podem ver todas solicitações da empresa"
ON public.professional_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.client_id = professional_requests.client_id
    AND cu.role = 'company_admin'
    AND cu.is_active = true
  )
);

CREATE POLICY "Company users podem ver próprias solicitações"
ON public.professional_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.id = professional_requests.company_user_id
    AND cu.is_active = true
  )
);

CREATE POLICY "Company users podem criar solicitações"
ON public.professional_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.id = professional_requests.company_user_id
    AND cu.client_id = professional_requests.client_id
    AND cu.is_active = true
  )
);

CREATE POLICY "Company users podem atualizar próprias solicitações"
ON public.professional_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.id = professional_requests.company_user_id
    AND cu.is_active = true
  )
);

-- Criar função helper
CREATE OR REPLACE FUNCTION is_company_admin(company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
    AND client_id = company_id
    AND role = 'company_admin'
    AND is_active = true
  );
$$;

-- Atualizar função get_user_role para incluir company roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- TI tem prioridade máxima
    IF EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = user_uuid) THEN
        RETURN 'ti'::app_role;
    ELSIF EXISTS (SELECT 1 FROM public.administrators WHERE user_id = user_uuid) THEN
        RETURN 'admin'::app_role;
    ELSIF EXISTS (SELECT 1 FROM public.company_users WHERE user_id = user_uuid AND is_active = true) THEN
        RETURN 'client'::app_role;
    ELSIF EXISTS (SELECT 1 FROM public.clients WHERE user_id = user_uuid AND is_active = true) THEN
        RETURN 'client'::app_role;
    ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_uuid) THEN
        RETURN 'candidate'::app_role;
    ELSE
        RETURN 'candidate'::app_role;
    END IF;
END;
$function$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_users_updated_at
BEFORE UPDATE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();