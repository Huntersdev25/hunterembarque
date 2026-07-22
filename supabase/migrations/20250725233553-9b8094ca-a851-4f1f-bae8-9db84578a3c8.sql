-- Primeiro, remover as políticas problemáticas
DROP POLICY IF EXISTS "Apenas admins podem ver administradores" ON public.administrators;
DROP POLICY IF EXISTS "Apenas admins podem criar administradores" ON public.administrators;
DROP POLICY IF EXISTS "Apenas admins podem atualizar administradores" ON public.administrators;
DROP POLICY IF EXISTS "Apenas admins podem deletar administradores" ON public.administrators;

-- Criar função security definer para verificar se usuário é admin sem recursão
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.administrators 
        WHERE user_id = auth.uid()
    );
$function$;

-- Recriar as políticas usando a função security definer
CREATE POLICY "Admins podem ver administradores" 
ON public.administrators 
FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Admins podem criar administradores" 
ON public.administrators 
FOR INSERT 
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins podem atualizar administradores" 
ON public.administrators 
FOR UPDATE 
USING (public.is_current_user_admin());

CREATE POLICY "Admins podem deletar administradores" 
ON public.administrators 
FOR DELETE 
USING (public.is_current_user_admin());

-- Adicionar política especial para primeiro admin (caso especial)
CREATE POLICY "Primeiro admin pode ser criado" 
ON public.administrators 
FOR INSERT 
WITH CHECK (NOT EXISTS (SELECT 1 FROM public.administrators));