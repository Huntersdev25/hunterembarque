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

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', { p_user_id: userData.user.id, p_endpoint: 'cleanup-orphaned-data', p_max_requests: 3, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const { data: isAdminData, error: isAdminError } = await supabaseAdmin.rpc('is_admin', { user_uuid: userData.user.id });
    const { data: isTIData } = await supabaseAdmin.rpc('is_ti', { user_uuid: userData.user.id });
    if ((isAdminError || !isAdminData) && !isTIData) return new Response(JSON.stringify({ error: 'Access denied. Admin or TI privileges required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log(`🧹 Admin ${userData.user.email} executing data cleanup...`);
    const { data: cleanupResult, error: cleanupError } = await supabaseAdmin.rpc('cleanup_orphaned_profiles');
    if (cleanupError) throw new Error(cleanupError.message);

    const result = cleanupResult[0] || { cleaned_profiles: 0, cleaned_certifications: 0, cleaned_applications: 0 };
    console.log('✅ Cleanup completed:', result);

    try {
      await supabaseAdmin.from('audit_logs').insert({ action: 'CLEANUP_ORPHANED_DATA', user_id: userData.user.id, user_email: userData.user.email || 'unknown', user_role: isTIData ? 'ti' : 'admin', table_name: 'system', new_data: result });
    } catch (auditError) { console.error('⚠️ Failed to log audit entry:', auditError); }

    return new Response(JSON.stringify({ success: true, message: 'Data cleanup completed successfully', result }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('❌ Error in cleanup function:', error);
    const ch = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: error.message || 'Failed to cleanup data' }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
})
