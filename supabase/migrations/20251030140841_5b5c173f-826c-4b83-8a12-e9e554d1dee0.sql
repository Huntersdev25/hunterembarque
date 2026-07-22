-- Fix RLS recursion on company_users by using security definer function
-- Drop the recursive SELECT policy and recreate it using is_company_admin()

BEGIN;

-- Ensure function exists (no-op if already present). Keeping here for clarity; won't overwrite.
-- CREATE OR REPLACE FUNCTION public.is_company_admin(company_id uuid)
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.company_users
--     WHERE user_id = auth.uid()
--     AND client_id = company_id
--     AND role = 'company_admin'
--     AND is_active = true
--   );
-- $$;

DROP POLICY IF EXISTS "Company admins podem ver usuários da empresa" ON public.company_users;

CREATE POLICY "Company admins podem ver usuários da empresa"
ON public.company_users
FOR SELECT
USING (
  public.is_company_admin(client_id)
);

COMMIT;
