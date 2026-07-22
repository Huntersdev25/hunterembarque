-- Criar usuário T.I Master diretamente
-- Primeiro, criar o usuário no auth.users usando extensão
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Gerar um UUID para o novo usuário
  new_user_id := gen_random_uuid();
  
  -- Inserir diretamente no auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'ti.admin@huntersio.com',
    crypt('HuntersTI@2024', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Administrador T.I", "phone": "11999888777", "role": "ti"}',
    now(),
    now(),
    'authenticated',
    'authenticated',
    ''
  );
  
  -- Criar identidade para o usuário
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at,
    last_sign_in_at
  ) VALUES (
    new_user_id,
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'ti.admin@huntersio.com'),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );
  
  -- Criar registro na tabela ti_users
  INSERT INTO public.ti_users (
    user_id,
    email,
    full_name,
    phone,
    created_by
  ) VALUES (
    new_user_id,
    'ti.admin@huntersio.com',
    'Administrador T.I',
    '11999888777',
    NULL
  );
  
  RAISE NOTICE 'Usuário T.I criado com ID: %', new_user_id;
END $$;