-- Adicionar 'ti' ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ti';

-- Criar tabela para usuários de TI
CREATE TABLE IF NOT EXISTS public.ti_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS na tabela ti_users
ALTER TABLE public.ti_users ENABLE ROW LEVEL SECURITY;

-- Criar função para verificar se usuário é TI
CREATE OR REPLACE FUNCTION public.is_ti(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ti_users 
        WHERE user_id = user_uuid
    );
$$;

-- Criar função para verificar se usuário atual é TI
CREATE OR REPLACE FUNCTION public.is_current_user_ti()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ti_users 
        WHERE user_id = auth.uid()
    );
$$;

-- Atualizar função get_user_role para incluir TI (prioridade máxima)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- TI tem prioridade máxima
    IF EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = user_uuid) THEN
        RETURN 'ti'::app_role;
    ELSIF EXISTS (SELECT 1 FROM public.administrators WHERE user_id = user_uuid) THEN
        RETURN 'admin'::app_role;
    ELSIF EXISTS (SELECT 1 FROM public.clients WHERE user_id = user_uuid AND is_active = true) THEN
        RETURN 'client'::app_role;
    ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_uuid) THEN
        RETURN 'candidate'::app_role;
    ELSE
        RETURN 'candidate'::app_role;
    END IF;
END;
$$;

-- Políticas RLS para ti_users

-- TI pode ver todos os usuários TI
CREATE POLICY "TI users can view all ti_users"
ON public.ti_users
FOR SELECT
USING (is_current_user_ti());

-- TI pode criar outros usuários TI
CREATE POLICY "TI users can create ti_users"
ON public.ti_users
FOR INSERT
WITH CHECK (is_current_user_ti());

-- TI pode atualizar usuários TI
CREATE POLICY "TI users can update ti_users"
ON public.ti_users
FOR UPDATE
USING (is_current_user_ti());

-- TI pode deletar usuários TI
CREATE POLICY "TI users can delete ti_users"
ON public.ti_users
FOR DELETE
USING (is_current_user_ti());

-- Usuário pode ver sua própria entrada TI
CREATE POLICY "User can view own ti_user entry"
ON public.ti_users
FOR SELECT
USING (user_id = auth.uid());

-- Primeiro usuário TI pode ser criado (bootstrap)
CREATE POLICY "First TI user can be created"
ON public.ti_users
FOR INSERT
WITH CHECK (NOT EXISTS (SELECT 1 FROM ti_users));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ti_users_updated_at
BEFORE UPDATE ON public.ti_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Conceder acesso total aos usuários TI em todas as tabelas principais
-- TI pode ver tudo
CREATE POLICY "TI has full access to administrators"
ON public.administrators
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "TI has full access to clients"
ON public.clients
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "TI has full access to profiles"
ON public.profiles
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "TI has full access to jobs"
ON public.jobs
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "TI has full access to applications"
ON public.applications
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "TI has full access to certifications"
ON public.certifications
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "TI has full access to client_candidates"
ON public.client_candidates
FOR ALL
USING (is_current_user_ti());

CREATE POLICY "TI has full access to job_functions"
ON public.job_functions
FOR ALL
USING (is_current_user_ti());