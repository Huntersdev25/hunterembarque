-- Primeiro, criar a tabela administrators sem constraint na profiles ainda
CREATE TABLE public.administrators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS na tabela administrators
ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;

-- Migrar dados existentes de admins para a nova tabela
INSERT INTO public.administrators (user_id, full_name, email, phone, created_at, updated_at)
SELECT user_id, full_name, email, phone, created_at, updated_at 
FROM public.profiles 
WHERE role = 'admin';

-- Remover admins da tabela profiles
DELETE FROM public.profiles WHERE role = 'admin';

-- Agora podemos adicionar a constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check CHECK (role = 'candidate');

-- Políticas para a tabela administrators
CREATE POLICY "Apenas admins podem ver administradores" 
ON public.administrators 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

CREATE POLICY "Apenas admins podem criar administradores" 
ON public.administrators 
FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

CREATE POLICY "Apenas admins podem atualizar administradores" 
ON public.administrators 
FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

CREATE POLICY "Apenas admins podem deletar administradores" 
ON public.administrators 
FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.administrators WHERE user_id = auth.uid()));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_administrators_updated_at
BEFORE UPDATE ON public.administrators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.administrators 
        WHERE user_id = user_uuid
    );
$function$;

-- Atualizar função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM public.administrators WHERE user_id = user_uuid) THEN 'admin'::app_role
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_uuid) THEN 'candidate'::app_role
        ELSE 'candidate'::app_role
    END;
$function$;

-- Atualizar trigger para novos usuários (apenas candidatos por padrão)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Por padrão, todos os novos usuários são candidatos
    INSERT INTO public.profiles (user_id, full_name, phone, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email,
        'candidate'
    );
    
    -- Create certifications record for the user
    INSERT INTO public.certifications (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$function$;