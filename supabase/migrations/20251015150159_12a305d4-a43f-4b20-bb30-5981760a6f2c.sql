-- Adicionar campos para controle de contatos e notas em applications
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS contact_made BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_notes TEXT,
ADD COLUMN IF NOT EXISTS contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS interview_stage TEXT DEFAULT 'lista_espera';