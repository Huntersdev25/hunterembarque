-- Função para buscar candidatos qualificados para uma vaga
CREATE OR REPLACE FUNCTION public.get_qualified_candidates(job_uuid uuid)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    email text,
    phone text,
    desired_function text,
    salary_expectation numeric,
    has_stcw boolean,
    has_relevant_experience boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        p.user_id,
        p.full_name,
        p.email,
        p.phone,
        p.desired_function,
        p.salary_expectation,
        c.stcw,
        CASE 
            WHEN p.professional_experience IS NOT NULL AND LENGTH(p.professional_experience) > 50 THEN true 
            ELSE false 
        END as has_relevant_experience
    FROM profiles p
    LEFT JOIN certifications c ON p.user_id = c.user_id
    WHERE p.role = 'candidate'
    AND p.profile_complete = true
    AND NOT EXISTS (
        SELECT 1 FROM applications a 
        WHERE a.candidate_id = p.user_id 
        AND a.job_id = job_uuid
    );
$$;

-- Função para estatísticas do admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
    total_jobs bigint,
    active_jobs bigint,
    total_candidates bigint,
    total_applications bigint,
    pending_applications bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        (SELECT COUNT(*) FROM jobs) as total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE is_active = true) as active_jobs,
        (SELECT COUNT(*) FROM profiles WHERE role = 'candidate') as total_candidates,
        (SELECT COUNT(*) FROM applications) as total_applications,
        (SELECT COUNT(*) FROM applications WHERE status = 'lista_espera') as pending_applications;
$$;

-- Função para verificar se candidato pode se candidatar
CREATE OR REPLACE FUNCTION public.can_apply_to_job(candidate_uuid uuid, job_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM applications 
        WHERE candidate_id = candidate_uuid 
        AND job_id = job_uuid
    ) AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = candidate_uuid 
        AND role = 'candidate'
        AND profile_complete = true
    ) AND EXISTS (
        SELECT 1 FROM jobs 
        WHERE id = job_uuid 
        AND is_active = true
    );
$$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);

-- Adicionar constraint para evitar aplicações duplicadas
ALTER TABLE applications ADD CONSTRAINT unique_candidate_job 
UNIQUE (candidate_id, job_id);