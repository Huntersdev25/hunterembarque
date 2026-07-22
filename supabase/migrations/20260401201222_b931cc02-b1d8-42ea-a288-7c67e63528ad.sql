-- Remove the overly permissive "geral" policy from chats table
DROP POLICY IF EXISTS "geral" ON public.chats;