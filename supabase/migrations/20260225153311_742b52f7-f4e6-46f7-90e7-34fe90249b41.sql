
-- =============================================
-- 1. api_rate_limits: política explícita de negação (tabela gerenciada apenas por service_role)
-- =============================================
CREATE POLICY "Deny all client access to rate limits"
  ON public.api_rate_limits
  FOR ALL
  TO authenticated
  USING (false);

-- =============================================
-- 2. professional_boarding_history: acesso TI
-- =============================================
CREATE POLICY "TI has full access to boarding history"
  ON public.professional_boarding_history
  FOR ALL
  USING (is_current_user_ti());

-- =============================================
-- 3. job_match_scores: acesso TI
-- =============================================
CREATE POLICY "TI has full access to match scores"
  ON public.job_match_scores
  FOR ALL
  USING (is_current_user_ti());

-- =============================================
-- 4. certificate_alerts: acesso TI
-- =============================================
CREATE POLICY "TI has full access to certificate alerts"
  ON public.certificate_alerts
  FOR ALL
  USING (is_current_user_ti());

-- =============================================
-- 5. notifications: acesso TI para visualização
-- =============================================
CREATE POLICY "TI can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (is_current_user_ti());

-- =============================================
-- 6. n8n_chat_histories: restringir INSERT apenas para admins/TI
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can insert chat histories" ON public.n8n_chat_histories;

CREATE POLICY "Admins and TI can insert chat histories"
  ON public.n8n_chat_histories
  FOR INSERT
  WITH CHECK (is_current_user_admin() OR is_current_user_ti());

-- =============================================
-- 7. profiles: company_users podem ver perfis de candidatos atribuídos
-- =============================================
CREATE POLICY "Company users podem ver perfis de candidatos atribuídos"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_candidates cc
      JOIN company_users cu ON cu.client_id = cc.client_id
      WHERE cc.candidate_id = profiles.user_id
        AND cu.user_id = auth.uid()
        AND cu.is_active = true
    )
  );

-- =============================================
-- 8. audit_logs: admins podem visualizar logs de auditoria
-- =============================================
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (is_current_user_admin());

-- =============================================
-- 9. professional_boarding_history: admins e clientes podem ver histórico de candidatos atribuídos
-- =============================================
CREATE POLICY "Clients can view assigned candidate boarding history"
  ON public.professional_boarding_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_candidates cc
      JOIN clients c ON cc.client_id = c.id
      WHERE cc.candidate_id = professional_boarding_history.profile_id
        AND c.user_id = auth.uid()
        AND c.is_active = true
    )
  );

-- =============================================
-- 10. legal_requirements: company_users podem ver requisitos legais
-- =============================================
CREATE POLICY "Company users can view their legal requirements"
  ON public.legal_requirements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_candidates cc
      JOIN company_users cu ON cu.client_id = cc.client_id
      WHERE cc.id = legal_requirements.client_candidate_id
        AND cu.user_id = auth.uid()
        AND cu.is_active = true
    )
  );
