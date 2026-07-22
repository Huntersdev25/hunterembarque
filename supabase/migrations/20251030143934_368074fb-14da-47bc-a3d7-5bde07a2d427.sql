-- Políticas RLS para client_candidates permitir que company_users vejam seus candidatos

-- Remove políticas antigas se existirem
DROP POLICY IF EXISTS "Company users can view their assigned candidates" ON public.client_candidates;
DROP POLICY IF EXISTS "Client owners can view all candidates" ON public.client_candidates;
DROP POLICY IF EXISTS "Company admins can view all company candidates" ON public.client_candidates;

-- Política para donos da empresa (clients table) verem todos os candidatos da empresa
CREATE POLICY "Client owners can view all company candidates"
ON public.client_candidates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_candidates.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Política para company_admins verem todos os candidatos da empresa
CREATE POLICY "Company admins can view all company candidates"
ON public.client_candidates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_users.client_id = client_candidates.client_id
    AND company_users.user_id = auth.uid()
    AND company_users.role = 'company_admin'
    AND company_users.is_active = true
  )
);

-- Política para company_users comuns verem apenas candidatos atribuídos a eles
CREATE POLICY "Company users can view their assigned candidates"
ON public.client_candidates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_users.id = client_candidates.company_user_id
    AND company_users.user_id = auth.uid()
    AND company_users.is_active = true
  )
);

-- Política para permitir updates por donos da empresa
CREATE POLICY "Client owners can update company candidates"
ON public.client_candidates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_candidates.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Política para permitir updates por company_admins
CREATE POLICY "Company admins can update company candidates"
ON public.client_candidates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_users.client_id = client_candidates.client_id
    AND company_users.user_id = auth.uid()
    AND company_users.role = 'company_admin'
    AND company_users.is_active = true
  )
);

-- Política para permitir updates por company_users em seus candidatos
CREATE POLICY "Company users can update their assigned candidates"
ON public.client_candidates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_users.id = client_candidates.company_user_id
    AND company_users.user_id = auth.uid()
    AND company_users.is_active = true
  )
);