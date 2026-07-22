import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return { 'Access-Control-Allow-Origin': isAllowed ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
}

const firstTISchema = z.object({
  email: z.string().email('Email inválido').max(255).transform(v => v.trim().toLowerCase()),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres').max(128),
  full_name: z.string().min(1, 'Nome é obrigatório').max(200).transform(v => v.replace(/<[^>]*>/g, '').trim()),
  phone: z.string().min(1, 'Telefone é obrigatório').max(20).transform(v => v.replace(/[^0-9+\-() ]/g, '')),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json();
    const { email, password, full_name, phone } = firstTISchema.parse(body);

    console.log('Criando primeiro usuário T.I:', { email, full_name });

    const { data: existingTIUsers, error: checkError } = await supabaseAdmin.from('ti_users').select('id').limit(1);
    if (checkError) { console.error('Erro ao verificar usuários T.I existentes:', checkError); throw new Error('Erro ao verificar usuários existentes'); }
    if (existingTIUsers && existingTIUsers.length > 0) throw new Error('Já existe um usuário T.I no sistema. Use a função create-ti-user para criar novos usuários T.I.');

    const { data: existingUser } = await supabaseAdmin.from('ti_users').select('email').eq('email', email).single();
    if (existingUser) throw new Error('Email já cadastrado');

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone, role: 'ti' } });
    if (authError) { console.error('Erro ao criar usuário no Auth:', authError); throw new Error(`Erro ao criar usuário: ${authError.message}`); }
    if (!authUser.user) throw new Error('Falha ao criar usuário');

    console.log('Usuário criado no Auth:', authUser.user.id);

    const { error: tiUserError } = await supabaseAdmin.from('ti_users').insert({ user_id: authUser.user.id, email, full_name, phone, created_by: null });
    if (tiUserError) { console.error('Erro ao criar T.I user:', tiUserError); await supabaseAdmin.auth.admin.deleteUser(authUser.user.id); throw new Error(`Erro ao criar registro T.I: ${tiUserError.message}`); }

    console.log('Primeiro usuário T.I criado com sucesso');

    return new Response(JSON.stringify({ success: true, message: 'Primeiro usuário T.I criado com sucesso', user_id: authUser.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    console.error('Erro na function:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ success: false, error: isZodError ? 'Dados inválidos: ' + error.errors?.map((e: any) => e.message).join(', ') : error.message }), { headers: { ...ch, 'Content-Type': 'application/json' }, status: 200 });
  }
});
