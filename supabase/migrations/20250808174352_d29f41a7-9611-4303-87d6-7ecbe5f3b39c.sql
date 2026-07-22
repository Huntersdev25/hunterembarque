-- Criar edge function para deletar usuários completamente
-- Esta função deleta o usuário tanto da tabela profiles quanto do auth.users

-- Primeiro, vamos criar uma função que deleta o usuário do auth.users quando o profile é deletado
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Deletar o usuário da tabela auth.users também
    DELETE FROM auth.users WHERE id = OLD.user_id;
    RETURN OLD;
END;
$$;

-- Criar trigger para executar a função quando um profile for deletado
DROP TRIGGER IF EXISTS trigger_delete_auth_user_on_profile_delete ON public.profiles;
CREATE TRIGGER trigger_delete_auth_user_on_profile_delete
    AFTER DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.delete_auth_user_on_profile_delete();

-- Criar função para limpar dados órfãos existentes
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_profiles()
RETURNS TABLE(cleaned_profiles INTEGER, cleaned_certifications INTEGER, cleaned_applications INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profiles_count INTEGER := 0;
    certifications_count INTEGER := 0;
    applications_count INTEGER := 0;
BEGIN
    -- Deletar profiles que não têm usuário correspondente no auth.users
    DELETE FROM public.profiles 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS profiles_count = ROW_COUNT;
    
    -- Deletar certificações órfãs
    DELETE FROM public.certifications 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS certifications_count = ROW_COUNT;
    
    -- Deletar applications órfãs
    DELETE FROM public.applications 
    WHERE candidate_id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS applications_count = ROW_COUNT;
    
    RETURN QUERY SELECT profiles_count, certifications_count, applications_count;
END;
$$;

-- Executar limpeza imediata
SELECT * FROM public.cleanup_orphaned_profiles();