-- Add webhook_url column to agent_covers table
ALTER TABLE public.agent_covers
ADD COLUMN webhook_url TEXT;