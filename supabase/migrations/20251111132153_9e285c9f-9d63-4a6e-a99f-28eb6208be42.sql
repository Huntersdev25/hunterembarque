-- ================================
-- CORREÇÃO DE FALHAS DE SEGURANÇA
-- ================================

-- 1. PROFILES TABLE - Remover política pública perigosa
DROP POLICY IF EXISTS "geral" ON public.profiles;

-- 2. CERTIFICATIONS TABLE - Remover política pública perigosa  
DROP POLICY IF EXISTS "geral" ON public.certifications;

-- 3. CHATS TABLE - Remover todas as políticas públicas e criar políticas seguras
DROP POLICY IF EXISTS "Allow public access to view chats" ON public.chats;
DROP POLICY IF EXISTS "Allow public access to insert chats" ON public.chats;
DROP POLICY IF EXISTS "Allow public access to update chats" ON public.chats;
DROP POLICY IF EXISTS "Allow public access to delete chats" ON public.chats;
DROP POLICY IF EXISTS "Allow anonymous access to view chats (temporary)" ON public.chats;

-- Criar políticas seguras para chats (apenas admins e TI)
CREATE POLICY "Admins can view all chats"
ON public.chats
FOR SELECT
USING (is_current_user_admin());

CREATE POLICY "Admins can insert chats"
ON public.chats
FOR INSERT
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update chats"
ON public.chats
FOR UPDATE
USING (is_current_user_admin());

CREATE POLICY "Admins can delete chats"
ON public.chats
FOR DELETE
USING (is_current_user_admin());

CREATE POLICY "TI has full access to chats"
ON public.chats
FOR ALL
USING (is_current_user_ti());

-- 4. N8N_CHAT_HISTORIES TABLE - Remover política pública e criar políticas seguras
DROP POLICY IF EXISTS "Allow public access to n8n_chat_histories" ON public.n8n_chat_histories;

-- Criar políticas seguras para n8n_chat_histories (apenas admins e TI)
CREATE POLICY "Admins can view chat histories"
ON public.n8n_chat_histories
FOR SELECT
USING (is_current_user_admin());

CREATE POLICY "TI has full access to chat histories"
ON public.n8n_chat_histories
FOR ALL
USING (is_current_user_ti());

-- Políticas para permitir que o sistema (edge functions) insira dados
CREATE POLICY "System can insert chat histories"
ON public.n8n_chat_histories
FOR INSERT
WITH CHECK (true);

-- ================================
-- AUDITORIA DAS MUDANÇAS
-- ================================

-- Registrar auditoria da correção de segurança
INSERT INTO audit_logs (
  user_id,
  user_role,
  user_email,
  user_name,
  action,
  table_name,
  record_id,
  new_data
) VALUES (
  auth.uid(),
  'ti',
  'security-fix@system.internal',
  'Sistema de Segurança',
  'SECURITY_FIX',
  'multiple_tables',
  gen_random_uuid(),
  jsonb_build_object(
    'description', 'Correção de políticas RLS públicas perigosas',
    'tables_fixed', jsonb_build_array('profiles', 'certifications', 'chats', 'n8n_chat_histories'),
    'timestamp', now()
  )
);