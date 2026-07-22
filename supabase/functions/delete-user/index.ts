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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', { p_user_id: userData.user.id, p_endpoint: 'delete-user', p_max_requests: 5, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const body = await req.json();
    const schema = z.object({ user_id: z.string().uuid() });
    const { user_id } = schema.parse(body);

    const { data: isAdminData } = await supabaseAdmin.rpc('is_admin', { user_uuid: userData.user.id });
    const { data: isTiData } = await supabaseAdmin.rpc('is_ti', { user_uuid: userData.user.id });
    if (!isAdminData && !isTiData) return new Response(JSON.stringify({ error: 'Access denied. Admin or TI privileges required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log(`🗑️ User ${userData.user.email} deleting user: ${user_id}`);

    await supabaseAdmin.from('applications').delete().eq('candidate_id', user_id);
    await supabaseAdmin.from('client_candidates').delete().eq('candidate_id', user_id);
    await supabaseAdmin.from('boarding_employees').delete().eq('candidate_id', user_id);
    await supabaseAdmin.from('certifications').delete().eq('user_id', user_id);
    await supabaseAdmin.from('administrators').delete().eq('user_id', user_id);
    await supabaseAdmin.from('ti_users').delete().eq('user_id', user_id);
    await supabaseAdmin.from('company_users').delete().eq('user_id', user_id);
    await supabaseAdmin.from('clients').delete().eq('user_id', user_id);

    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('user_id', user_id);
    if (profileError) throw new Error(`Failed to delete profile: ${profileError.message}`);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) throw new Error(deleteError.message);

    try {
      await supabaseAdmin.from('audit_logs').insert({ action: 'DELETE_USER', user_id: userData.user.id, user_email: userData.user.email || 'unknown', user_role: isAdminData ? 'admin' : 'ti', table_name: 'auth.users', record_id: user_id, old_data: { deleted_user_id: user_id } });
    } catch (auditError) { console.error('⚠️ Failed to log audit entry:', auditError); }

    return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('❌ Error in delete-user function:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ error: isZodError ? 'Dados de entrada inválidos' : (error.message || 'Failed to delete user') }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
})
