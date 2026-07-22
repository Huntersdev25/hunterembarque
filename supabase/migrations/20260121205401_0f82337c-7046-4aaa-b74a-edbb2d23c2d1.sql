-- Tabela para histórico de embarques profissionais (manual + automático)
CREATE TABLE public.professional_boarding_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  vessel_name TEXT,
  vessel_type TEXT,
  position TEXT NOT NULL,
  embarked_at DATE NOT NULL,
  disembarked_at DATE,
  is_internal BOOLEAN DEFAULT false, -- true = embarque conosco, false = experiência anterior
  boarding_employee_id UUID REFERENCES public.boarding_employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para alertas de certificados
CREATE TABLE public.certificate_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certification_key TEXT NOT NULL,
  certification_name TEXT NOT NULL,
  validity_date DATE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_30', 'expiring_15', 'expiring_7', 'expired')),
  is_read BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para notificações gerais (email, push, etc.)
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('certificate_alert', 'application_update', 'job_match', 'system')),
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar match scores calculados
CREATE TABLE public.job_match_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  certification_score INTEGER NOT NULL CHECK (certification_score >= 0 AND certification_score <= 100),
  experience_score INTEGER NOT NULL CHECK (experience_score >= 0 AND experience_score <= 100),
  ai_analysis TEXT,
  ai_summary TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, job_id)
);

-- Índices para performance
CREATE INDEX idx_boarding_history_profile ON public.professional_boarding_history(profile_id);
CREATE INDEX idx_boarding_history_internal ON public.professional_boarding_history(is_internal);
CREATE INDEX idx_certificate_alerts_profile ON public.certificate_alerts(profile_id);
CREATE INDEX idx_certificate_alerts_unread ON public.certificate_alerts(profile_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_match_scores_profile ON public.job_match_scores(profile_id);
CREATE INDEX idx_match_scores_job ON public.job_match_scores(job_id);

-- Enable RLS
ALTER TABLE public.professional_boarding_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_match_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies para professional_boarding_history
CREATE POLICY "Users can view their own boarding history"
ON public.professional_boarding_history FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own boarding history"
ON public.professional_boarding_history FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own boarding history"
ON public.professional_boarding_history FOR UPDATE
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own boarding history"
ON public.professional_boarding_history FOR DELETE
USING (auth.uid() = profile_id);

CREATE POLICY "Admins can manage all boarding history"
ON public.professional_boarding_history FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
);

-- RLS Policies para certificate_alerts
CREATE POLICY "Users can view their own alerts"
ON public.certificate_alerts FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Users can update their own alerts"
ON public.certificate_alerts FOR UPDATE
USING (auth.uid() = profile_id);

CREATE POLICY "Admins can manage all alerts"
ON public.certificate_alerts FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
);

-- RLS Policies para notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
);

-- RLS Policies para job_match_scores
CREATE POLICY "Users can view their own match scores"
ON public.job_match_scores FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Admins can manage all match scores"
ON public.job_match_scores FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_boarding_history_updated_at
BEFORE UPDATE ON public.professional_boarding_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar alertas de certificados automaticamente
CREATE OR REPLACE FUNCTION public.check_certificate_validity()
RETURNS void AS $$
DECLARE
  cert_record RECORD;
  days_until_expiry INTEGER;
  alert_exists BOOLEAN;
BEGIN
  -- Loop através de todas as certificações com validade
  FOR cert_record IN
    SELECT 
      c.id,
      c.profile_id,
      c.cir_validity, c.stcw_validity, c.caaq_validity, c.tbs1_validity,
      c.espe_validity, c.esrs_validity, c.ebps_validity, c.ecin_validity,
      c.ecia_caci_validity, c.eopn_validity, c.ebcp_validity, c.epsm_validity,
      c.thuet_validity, c.cbsp_validity, c.cess_validity, c.cerr_validity,
      c.efnt_validity, c.ebpq_validity, c.ebgl_validity, c.esop_validity,
      c.bco_validity, c.dp_validity, c.alph_validity, c.cpso_validity,
      c.cipn_validity, c.ticb_validity, c.epoe_validity, c.epor_validity,
      c.gmdss_validity, c.cns014_validity, c.lpna_validity, c.ht_validity, c.cft_validity
    FROM public.certifications c
  LOOP
    -- Check each certification validity date
    -- This would need to be expanded for each certification type
    NULL; -- Placeholder - full implementation would check each field
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;