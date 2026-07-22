-- Atualizar função get_admin_stats para nova estrutura
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(total_jobs bigint, active_jobs bigint, total_candidates bigint, total_applications bigint, pending_applications bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT 
        (SELECT COUNT(*) FROM jobs) as total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE is_active = true) as active_jobs,
        (SELECT COUNT(*) FROM profiles WHERE role = 'candidate') as total_candidates,
        (SELECT COUNT(*) FROM applications) as total_applications,
        (SELECT COUNT(*) FROM applications WHERE status = 'lista_espera') as pending_applications;
$function$;