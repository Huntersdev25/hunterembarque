-- Atualizar tabela jobs para incluir certificações obrigatórias
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_certifications_list JSONB DEFAULT '[]'::jsonb;

-- Buscar todas as funções existentes na tabela job_functions
-- Se não existir, criar algumas funções padrão
INSERT INTO public.job_functions (name, description, is_active) VALUES
  ('Oficiais de Náutica', 'Responsáveis pela navegação e operação da embarcação', true),
  ('Oficiais de Máquinas', 'Responsáveis pelos sistemas de propulsão e energia', true),
  ('Marinheiros', 'Tripulação geral da embarcação', true),
  ('Taifeiros', 'Responsáveis pelos serviços gerais a bordo', true),
  ('Engenheiros', 'Especialistas em sistemas técnicos da embarcação', true),
  ('Eletricistas', 'Responsáveis pelos sistemas elétricos', true),
  ('Soldadores', 'Especialistas em soldagem e reparo', true),
  ('Mecânicos', 'Responsáveis pela manutenção mecânica', true)
ON CONFLICT (name) DO NOTHING;

-- Função para verificar se candidato pode se candidatar a uma vaga (incluindo validação de certificações)
CREATE OR REPLACE FUNCTION public.can_apply_to_job_enhanced(candidate_uuid uuid, job_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    job_record RECORD;
    profile_record RECORD;
    required_certs JSONB;
    cert_key TEXT;
    has_all_certs BOOLEAN := true;
BEGIN
    -- Buscar informações da vaga
    SELECT * INTO job_record 
    FROM jobs 
    WHERE id = job_uuid AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Buscar perfil do candidato
    SELECT * INTO profile_record 
    FROM profiles 
    WHERE user_id = candidate_uuid 
    AND role = 'candidate'
    AND profile_complete = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Verificar se já se candidatou
    IF EXISTS (
        SELECT 1 FROM applications 
        WHERE candidate_id = candidate_uuid 
        AND job_id = job_uuid
    ) THEN
        RETURN false;
    END IF;
    
    -- Verificar compatibilidade de função
    IF job_record.function_name IS NOT NULL AND profile_record.desired_function IS NOT NULL THEN
        IF LOWER(TRIM(job_record.function_name)) != LOWER(TRIM(profile_record.desired_function)) THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Verificar certificações obrigatórias
    required_certs := COALESCE(job_record.required_certifications_list, '[]'::jsonb);
    
    IF jsonb_array_length(required_certs) > 0 THEN
        -- Buscar certificações do candidato
        SELECT * INTO STRICT profile_record FROM certifications WHERE user_id = candidate_uuid;
        
        -- Verificar cada certificação obrigatória
        FOR cert_key IN SELECT jsonb_array_elements_text(required_certs)
        LOOP
            -- Verificar se o candidato tem a certificação e se está válida
            IF NOT COALESCE((profile_record.data ->> cert_key)::boolean, false) THEN
                has_all_certs := false;
                EXIT;
            END IF;
            
            -- Verificar se a certificação não está vencida (se tiver data de validade)
            DECLARE
                validity_date DATE;
            BEGIN
                validity_date := (profile_record.data ->> (cert_key || '_validity'))::date;
                IF validity_date IS NOT NULL AND validity_date < CURRENT_DATE THEN
                    has_all_certs := false;
                    EXIT;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Se houver erro na conversão, continua
                    NULL;
            END;
        END LOOP;
        
        IF NOT has_all_certs THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;