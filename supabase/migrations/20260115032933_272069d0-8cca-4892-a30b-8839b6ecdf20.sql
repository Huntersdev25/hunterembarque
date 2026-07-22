-- Create storage bucket for agent cover images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent-covers', 'agent-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for anyone to view agent covers
CREATE POLICY "Agent covers are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'agent-covers');

-- Create policy for admins to upload agent covers
CREATE POLICY "Admins can upload agent covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'agent-covers' 
  AND (
    EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
  )
);

-- Create policy for admins to update agent covers
CREATE POLICY "Admins can update agent covers" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'agent-covers' 
  AND (
    EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
  )
);

-- Create policy for admins to delete agent covers
CREATE POLICY "Admins can delete agent covers" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'agent-covers' 
  AND (
    EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
  )
);

-- Create table to store agent cover configurations
CREATE TABLE public.agent_covers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL UNIQUE,
  cover_url TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_covers ENABLE ROW LEVEL SECURITY;

-- Anyone can read agent covers
CREATE POLICY "Agent covers are publicly readable" 
ON public.agent_covers 
FOR SELECT 
USING (true);

-- Only admins and TI can insert/update/delete
CREATE POLICY "Admins can manage agent covers" 
ON public.agent_covers 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.ti_users WHERE user_id = auth.uid())
);

-- Create trigger to update updated_at
CREATE TRIGGER update_agent_covers_updated_at
BEFORE UPDATE ON public.agent_covers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();