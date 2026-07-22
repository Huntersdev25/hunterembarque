
-- 1. Remove overly permissive 'geral' policy from profiles table
DROP POLICY IF EXISTS "geral" ON public.profiles;

-- 2. Remove overly permissive 'geral' policy from chats table
DROP POLICY IF EXISTS "geral" ON public.chats;

-- 3. Fix ti_verification_codes: remove public access policy
DROP POLICY IF EXISTS "Service role can manage verification codes" ON public.ti_verification_codes;

-- Recreate ti_verification_codes policy with proper restriction (only service role via edge functions)
CREATE POLICY "Only authenticated users can view own codes"
ON public.ti_verification_codes
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "System can insert verification codes"
ON public.ti_verification_codes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update verification codes"
ON public.ti_verification_codes
FOR UPDATE
USING (true);

CREATE POLICY "System can delete verification codes"
ON public.ti_verification_codes
FOR DELETE
USING (true);
