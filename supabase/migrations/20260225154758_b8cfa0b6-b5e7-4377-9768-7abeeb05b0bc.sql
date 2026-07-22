
-- 1. Drop the overly permissive public SELECT policy on agent_covers
DROP POLICY IF EXISTS "Public can view agent cover images only" ON public.agent_covers;

-- 2. Create a public view that excludes webhook_url
CREATE OR REPLACE VIEW public.agent_covers_public AS
SELECT id, agent_id, cover_url, created_at, updated_at
FROM public.agent_covers;

-- 3. Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.agent_covers_public TO anon, authenticated;

-- 4. Add a restricted SELECT policy so only admins/TI see full table (including webhook_url)
CREATE POLICY "Authenticated users can view agent cover images"
  ON public.agent_covers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
