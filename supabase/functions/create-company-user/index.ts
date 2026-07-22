import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Sessão expirada' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: allowed } = await supabaseClient.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'create-company-user', p_max_requests: 10, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabaseClient.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários de empresa' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const schema = z.object({ email: z.string().email(), password: z.string().min(8), full_name: z.string().min(1).max(200), phone: z.string().min(1).max(30), client_id: z.string().uuid(), role: z.enum(['company_admin', 'company_user']) });
    const { email, password, full_name, phone, client_id, role } = schema.parse(body);

    console.log('📝 Creating company user:', { email, full_name, client_id, role });

    const { data: existingCompanyUser } = await supabaseClient.from('company_users').select('id').eq('email', email).maybeSingle();
    if (existingCompanyUser) return new Response(JSON.stringify({ success: false, error: 'Já existe um usuário com este email' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone } });
    if (userError) {
      if (userError.message?.includes('already been registered')) return new Response(JSON.stringify({ success: false, error: 'Email já cadastrado no sistema.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`Erro ao criar usuário: ${userError.message}`);
    }

    const { data: companyUserData, error: companyUserError } = await supabaseClient.from('company_users').insert({ user_id: userData.user.id, client_id, role, full_name, email, phone, created_by: user.id, is_active: true }).select().single();
    if (companyUserError) { await supabaseClient.auth.admin.deleteUser(userData.user.id); throw new Error(`Erro ao criar usuário da empresa: ${companyUserError.message}`); }

    return new Response(JSON.stringify({ success: true, data: companyUserData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    console.error('❌ Create company user error:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ success: false, error: isZodError ? 'Dados inválidos' : error.message }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
