-- Deletar o usuário criado incorretamente e recriar corretamente
-- Primeiro deletar da tabela ti_users (cascade não aplicável aqui)
DELETE FROM public.ti_users WHERE email = 'ti.admin@huntersio.com';

-- Deletar da tabela profiles
DELETE FROM public.profiles WHERE user_id = '74c00301-9236-4cf8-9c03-6f3e30f444dd';

-- Deletar da tabela certifications
DELETE FROM public.certifications WHERE user_id = '74c00301-9236-4cf8-9c03-6f3e30f444dd';

-- Deletar identity
DELETE FROM auth.identities WHERE user_id = '74c00301-9236-4cf8-9c03-6f3e30f444dd';

-- Deletar do auth.users
DELETE FROM auth.users WHERE id = '74c00301-9236-4cf8-9c03-6f3e30f444dd';