
-- Fix SECURITY DEFINER view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.agent_covers_public;

CREATE VIEW public.agent_covers_public 
WITH (security_invoker = true) AS
SELECT id, agent_id, cover_url, created_at, updated_at
FROM public.agent_covers;

GRANT SELECT ON public.agent_covers_public TO anon, authenticated;
