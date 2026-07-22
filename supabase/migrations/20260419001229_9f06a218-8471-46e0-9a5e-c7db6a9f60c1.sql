-- 1. Tabela da timeline
CREATE TABLE public.candidate_onboarding_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  application_id uuid,
  event_type text NOT NULL, -- 'application_received' | 'ai_webhook_dispatched' | 'ai_update' | 'status_change' | 'admin_note' | 'ai_webhook_failed'
  title text NOT NULL,
  description text,
  source text NOT NULL DEFAULT 'system', -- 'system' | 'ai' | 'admin'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cot_job_candidate ON public.candidate_onboarding_timeline(job_id, candidate_id, created_at DESC);
CREATE INDEX idx_cot_application ON public.candidate_onboarding_timeline(application_id);

ALTER TABLE public.candidate_onboarding_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access onboarding timeline"
  ON public.candidate_onboarding_timeline FOR ALL
  USING (is_admin(auth.uid()) OR is_current_user_ti())
  WITH CHECK (is_admin(auth.uid()) OR is_current_user_ti());

-- 2. Função que insere evento e chama edge function via pg_net
CREATE OR REPLACE FUNCTION public.handle_new_application_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_title text;
  v_function_name text;
  v_candidate_name text;
  v_candidate_phone text;
BEGIN
  SELECT title, function_name INTO v_job_title, v_function_name
  FROM jobs WHERE id = NEW.job_id;

  SELECT full_name, phone INTO v_candidate_name, v_candidate_phone
  FROM profiles WHERE user_id = NEW.candidate_id;

  -- Evento inicial
  INSERT INTO public.candidate_onboarding_timeline (
    job_id, candidate_id, application_id, event_type, title, description, source, metadata
  ) VALUES (
    NEW.job_id,
    NEW.candidate_id,
    NEW.id,
    'application_received',
    'Candidatura recebida',
    format('%s se candidatou para %s', COALESCE(v_candidate_name, 'Candidato'), COALESCE(v_job_title, 'a vaga')),
    'system',
    jsonb_build_object(
      'candidate_name', v_candidate_name,
      'candidate_phone', v_candidate_phone,
      'job_title', v_job_title,
      'function_name', v_function_name
    )
  );

  -- Disparar edge function de webhook da IA (assíncrono via pg_net)
  PERFORM net.http_post(
    url := 'https://augeppwihhzibvhzibxe.supabase.co/functions/v1/trigger-recruitment-ai',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VwcHdpaGh6aWJ2aHppYnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODA4NDUsImV4cCI6MjA2OTA1Njg0NX0.8RUaODHeXMdRmFSRMaAoWuhnUdH7G0yCLQukqpDdD7w'
    ),
    body := jsonb_build_object(
      'application_id', NEW.id,
      'job_id', NEW.job_id,
      'candidate_id', NEW.candidate_id,
      'candidate_name', v_candidate_name,
      'candidate_phone', v_candidate_phone,
      'job_title', v_job_title,
      'function_name', v_function_name
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não bloquear a candidatura caso o webhook falhe
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_created_onboarding
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.handle_new_application_onboarding();

-- 3. Habilitar pg_net se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;