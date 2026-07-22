-- Remover todas as políticas complicadas da tabela profiles
DROP POLICY IF EXISTS "Administradores podem ver todos os candidatos" ON public.profiles;
DROP POLICY IF EXISTS "Administradores podem atualizar candidatos" ON public.profiles;
DROP POLICY IF EXISTS "Usuário pode ver seu próprio perfil de candidato" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Criar políticas simples e diretas
-- Qualquer usuário autenticado da tabela administrators tem acesso total
CREATE POLICY "Administradores têm acesso total aos candidatos" 
ON public.profiles 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

-- Usuários podem ver e atualizar apenas seu próprio perfil
CREATE POLICY "Candidatos podem gerenciar próprio perfil" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = user_id);