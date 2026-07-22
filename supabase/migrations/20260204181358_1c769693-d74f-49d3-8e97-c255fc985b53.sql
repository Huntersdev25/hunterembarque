-- Create system_webhooks table for centralized webhook management
CREATE TABLE public.system_webhooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    webhook_key TEXT NOT NULL UNIQUE,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_webhooks ENABLE ROW LEVEL SECURITY;

-- Only TI users can manage webhooks
CREATE POLICY "TI users can view webhooks"
ON public.system_webhooks
FOR SELECT
USING (public.is_ti(auth.uid()));

CREATE POLICY "TI users can insert webhooks"
ON public.system_webhooks
FOR INSERT
WITH CHECK (public.is_ti(auth.uid()));

CREATE POLICY "TI users can update webhooks"
ON public.system_webhooks
FOR UPDATE
USING (public.is_ti(auth.uid()));

CREATE POLICY "TI users can delete webhooks"
ON public.system_webhooks
FOR DELETE
USING (public.is_ti(auth.uid()));

-- Add update trigger
CREATE TRIGGER update_system_webhooks_updated_at
BEFORE UPDATE ON public.system_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the existing webhook for candidate status notifications
INSERT INTO public.system_webhooks (name, description, webhook_key, webhook_url, is_active)
VALUES (
    'Notificação de Status de Candidato',
    'Webhook que dispara quando o cliente altera o status de um candidato (aprovação, rejeição, agendamento de entrevista)',
    'notify-candidate-status',
    'https://n8n-n8n.ooqqkc.easypanel.host/webhook/8bc74f3d-e4e7-44c8-baf5-1099842e6dba',
    true
);