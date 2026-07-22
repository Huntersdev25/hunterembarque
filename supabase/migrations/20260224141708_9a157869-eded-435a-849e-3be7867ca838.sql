
-- =============================================
-- 1. Remove overly permissive "geral" policies on chats and jobs
-- These grant ALL with USING(true) which bypasses all security
-- =============================================

DROP POLICY IF EXISTS "geral" ON public.chats;
DROP POLICY IF EXISTS "geral" ON public.jobs;

-- =============================================
-- 2. Fix ti_verification_codes policies - restrict to authenticated or TI users
-- Edge functions use service_role which bypasses RLS entirely
-- =============================================

DROP POLICY IF EXISTS "System can delete verification codes" ON public.ti_verification_codes;
DROP POLICY IF EXISTS "System can insert verification codes" ON public.ti_verification_codes;
DROP POLICY IF EXISTS "System can update verification codes" ON public.ti_verification_codes;

-- TI users can manage verification codes (service role bypasses RLS for edge functions)
CREATE POLICY "TI can manage verification codes"
  ON public.ti_verification_codes
  FOR ALL
  USING (is_current_user_ti())
  WITH CHECK (is_current_user_ti());

-- Users can manage their own verification codes
CREATE POLICY "Users can manage own verification codes"
  ON public.ti_verification_codes
  FOR ALL
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

-- =============================================
-- 3. Fix audit_logs INSERT policy - restrict to admin/TI
-- The trigger uses SECURITY DEFINER so it bypasses RLS
-- =============================================

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins and TI can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (is_current_user_admin() OR is_current_user_ti());

-- =============================================
-- 4. Fix n8n_chat_histories INSERT policy - restrict to authenticated users
-- =============================================

DROP POLICY IF EXISTS "System can insert chat histories" ON public.n8n_chat_histories;

CREATE POLICY "Authenticated users can insert chat histories"
  ON public.n8n_chat_histories
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 5. Fix check_certificate_validity() function - add search_path
-- =============================================

CREATE OR REPLACE FUNCTION public.check_certificate_validity()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cert_record RECORD;
  days_until_expiry INTEGER;
  alert_exists BOOLEAN;
BEGIN
  FOR cert_record IN
    SELECT 
      c.id,
      c.user_id,
      c.cir_validity, c.stcw_validity, c.caaq_validity, c.tbs1_validity,
      c.espe_validity, c.esrs_validity, c.ebps_validity, c.ecin_validity,
      c.ecia_caci_validity, c.eopn_validity, c.ebcp_validity, c.epsm_validity,
      c.thuet_validity, c.cbsp_validity, c.cess_validity, c.cerr_validity,
      c.efnt_validity, c.ebpq_validity, c.ebgl_validity, c.esop_validity,
      c.dp_validity, c.alph_validity,
      c.gmdss_validity, c.cns014_validity, c.cft_validity,
      c.lpn_validity
    FROM public.certifications c
  LOOP
    NULL;
  END LOOP;
END;
$function$;
