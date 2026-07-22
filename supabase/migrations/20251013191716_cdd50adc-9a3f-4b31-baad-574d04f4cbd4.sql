-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Apenas TI pode ver os logs
CREATE POLICY "TI can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (is_current_user_ti());

-- Políticas RLS - Apenas sistema pode inserir logs (via triggers)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Função para registrar ações de auditoria
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value TEXT;
  user_email_value TEXT;
  user_name_value TEXT;
BEGIN
  -- Buscar informações do usuário
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM administrators WHERE user_id = auth.uid()) THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM ti_users WHERE user_id = auth.uid()) THEN 'ti'
      ELSE 'unknown'
    END,
    p.email,
    p.full_name
  INTO user_role_value, user_email_value, user_name_value
  FROM profiles p
  WHERE p.user_id = auth.uid();

  -- Apenas registrar ações de admins e TI
  IF user_role_value IN ('admin', 'ti') THEN
    INSERT INTO audit_logs (
      user_id,
      user_role,
      user_email,
      user_name,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      user_role_value,
      COALESCE(user_email_value, 'unknown'),
      user_name_value,
      TG_OP,
      TG_TABLE_NAME,
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      CASE 
        WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)
        ELSE NULL
      END,
      CASE 
        WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)
        ELSE NULL
      END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para tabelas principais
-- Jobs
DROP TRIGGER IF EXISTS audit_jobs_trigger ON jobs;
CREATE TRIGGER audit_jobs_trigger
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Profiles (para criação/edição de candidatos por admins)
DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Applications (para mudanças de status)
DROP TRIGGER IF EXISTS audit_applications_trigger ON applications;
CREATE TRIGGER audit_applications_trigger
  AFTER UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Clients
DROP TRIGGER IF EXISTS audit_clients_trigger ON clients;
CREATE TRIGGER audit_clients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Administrators
DROP TRIGGER IF EXISTS audit_administrators_trigger ON administrators;
CREATE TRIGGER audit_administrators_trigger
  AFTER INSERT OR UPDATE OR DELETE ON administrators
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Client Candidates (para atribuições)
DROP TRIGGER IF EXISTS audit_client_candidates_trigger ON client_candidates;
CREATE TRIGGER audit_client_candidates_trigger
  AFTER INSERT OR UPDATE OR DELETE ON client_candidates
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Job Functions
DROP TRIGGER IF EXISTS audit_job_functions_trigger ON job_functions;
CREATE TRIGGER audit_job_functions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON job_functions
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();