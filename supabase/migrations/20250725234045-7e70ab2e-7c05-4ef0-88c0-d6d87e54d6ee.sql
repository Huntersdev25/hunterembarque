-- Adicionar política que permite que o usuário veja sua própria entrada
CREATE POLICY "Usuário pode ver sua própria entrada de admin" 
ON public.administrators 
FOR SELECT 
USING (user_id = auth.uid());

-- Reordenar políticas para que esta tenha prioridade
DROP POLICY IF EXISTS "Admins podem ver administradores" ON public.administrators;
CREATE POLICY "Admins podem ver administradores" 
ON public.administrators 
FOR SELECT 
USING (public.is_current_user_admin());