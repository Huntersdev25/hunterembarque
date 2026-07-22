import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'

const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return { 'Access-Control-Allow-Origin': isAllowed ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'create-admin', p_max_requests: 5, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const body = await req.json();
    const schema = z.object({ email: z.string().email(), password: z.string().min(8), full_name: z.string().min(1), phone: z.string().min(1) });
    const { email, password, full_name, phone } = schema.parse(body);

    console.log(`🔒 Admin creation attempt by ${user.id} for ${email}`);

    const { data: isAdminData } = await supabaseAdmin.rpc('is_admin', { user_uuid: user.id });
    const { data: isTIData } = await supabaseAdmin.rpc('is_ti', { user_uuid: user.id });
    if (!isAdminData && !isTIData) {
      console.error(`❌ Unauthorized admin creation attempt by ${user.id}`);
      return new Response(JSON.stringify({ success: false, error: 'Acesso negado. Apenas administradores ou TI podem criar novos admins.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone, role: 'admin' } });
    if (createUserError || !userData.user) {
      console.error('Erro ao criar usuário:', createUserError);
      if (createUserError?.message?.includes('already been registered') || createUserError?.message?.includes('User already registered'))
        return new Response(JSON.stringify({ success: false, error: 'Email já está em uso' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: false, error: `Erro ao criar usuário: ${createUserError?.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`✅ User created successfully: ${userData.user.id}`);

    const { error: adminError } = await supabaseAdmin.from('administrators').insert({ user_id: userData.user.id, email, full_name, phone, created_by: user.id });
    if (adminError) {
      console.error('Erro ao criar admin:', adminError);
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return new Response(JSON.stringify({ success: false, error: `Erro ao criar administrador: ${adminError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`🎉 Admin created successfully: ${userData.user.id} by ${user.id}`);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id, user_role: isTIData ? 'ti' : 'admin', user_email: user.email || '',
      user_name: user.user_metadata?.full_name || '', action: 'INSERT', table_name: 'administrators',
      record_id: userData.user.id, new_data: { email, full_name, phone }
    });

    return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    console.error('❌ Error creating admin:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ success: false, error: isZodError ? 'Dados de entrada inválidos' : error.message }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
})
