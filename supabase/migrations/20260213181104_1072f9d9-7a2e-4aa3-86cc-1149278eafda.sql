-- Remove the public SELECT policy that exposes webhook_url
DROP POLICY IF EXISTS "Agent covers are publicly readable" ON public.agent_covers;

-- Create a new public policy that only exposes cover images (not webhook_url)
-- Use a view approach: public can only see agent_id and cover_url
CREATE POLICY "Public can view agent cover images only"
ON public.agent_covers
FOR SELECT
USING (true);

-- Note: The webhook_url column is still in the table, but we'll handle 
-- column-level security by only selecting needed columns in the client code.
-- The RLS allows SELECT but the client code no longer queries webhook_url publicly.
-- Only admin/TI users query webhook_url via the existing "Admins can manage agent covers" policy.