-- Atualizar o trigger para incluir desired_function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Por padrão, todos os novos usuários são candidatos
    INSERT INTO public.profiles (user_id, full_name, phone, email, role, desired_function)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email,
        'candidate',
        COALESCE(NEW.raw_user_meta_data->>'desired_function', NULL)
    );
    
    -- Create certifications record for the user
    INSERT INTO public.certifications (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;