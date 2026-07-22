-- Função para verificar se é cliente
CREATE OR REPLACE FUNCTION public.is_client(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.clients 
        WHERE user_id = user_uuid AND is_active = true
    );
$$;

-- Atualizar função get_user_role para incluir clientes
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.administrators WHERE user_id = user_uuid) THEN
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