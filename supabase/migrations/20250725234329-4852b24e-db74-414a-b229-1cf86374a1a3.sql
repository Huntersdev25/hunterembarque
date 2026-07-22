-- Remover políticas antigas da tabela profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Criar novas políticas usando a função correta
CREATE POLICY "Administradores podem ver todos os candidatos" 
ON public.profiles 
FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "Administradores podem atualizar candidatos" 
ON public.profiles 
FOR UPDATE 
USING (public.is_current_user_admin());

-- Também permitir que admin veja sua própria entrada (caso tenha migrado dados)
CREATE POLICY "Usuário pode ver seu próprio perfil de candidato" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);