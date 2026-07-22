import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

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
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !caller) return new Response(JSON.stringify({ success: false, error: 'Sessão expirada' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', { p_user_id: caller.id, p_endpoint: 'create-ti-user', p_max_requests: 5, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ success: false, error: 'Limite de requisições excedido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const body = await req.json();
    const schema = z.object({ email: z.string().email(), password: z.string().min(8), full_name: z.string().min(1).max(200), phone: z.string().min(1).max(30), created_by: z.string().uuid() });
    const { email, password, full_name, phone, created_by } = schema.parse(body);

    const { data: isTI, error: verifyError } = await supabaseAdmin.rpc('is_ti', { user_uuid: created_by });
    if (verifyError || !isTI) return new Response(JSON.stringify({ success: false, error: 'Apenas usuários T.I podem criar outros usuários T.I' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: existingUser } = await supabaseAdmin.from('ti_users').select('email').eq('email', email).single();
    if (existingUser) return new Response(JSON.stringify({ success: false, error: 'Email já cadastrado' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone, role: 'ti' } });
    if (authError || !authUser.user) throw new Error(`Erro ao criar usuário: ${authError?.message}`);

    const { error: tiUserError } = await supabaseAdmin.from('ti_users').insert({ user_id: authUser.user.id, email, full_name, phone, created_by });
    if (tiUserError) { await supabaseAdmin.auth.admin.deleteUser(authUser.user.id); throw new Error(`Erro ao criar registro T.I: ${tiUserError.message}`); }

    return new Response(JSON.stringify({ success: true, message: 'Usuário T.I criado com sucesso', user_id: authUser.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    console.error('Erro na function:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ success: false, error: isZodError ? 'Dados inválidos' : error.message }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
