-- Tabela para armazenar códigos de verificação 2FA para usuários TI
CREATE TABLE public.ti_verification_codes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    code text NOT NULL,
    email text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ti_verification_codes_user_id ON public.ti_verification_codes(user_id);
CREATE INDEX idx_ti_verification_codes_code ON public.ti_verification_codes(code);
CREATE INDEX idx_ti_verification_codes_expires_at ON public.ti_verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.ti_verification_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Service role can manage verification codes"
ON public.ti_verification_codes
FOR ALL
USING (true)
WITH CHECK (true);

-- Função para limpar códigos expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.ti_verification_codes 
    WHERE expires_at < now() OR verified = true;
END;
$$;