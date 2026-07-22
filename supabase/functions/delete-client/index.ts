import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://esm.sh/zod@3.23.8";

const VERSION = "v3.1.0";
const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com');
  return { 'Access-Control-Allow-Origin': isAllowed ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
}

function respond(corsHeaders: Record<string, string>, success: boolean, data?: Record<string, unknown>, errorMsg?: string) {
  return new Response(
    JSON.stringify({ success, ...(data || {}), ...(errorMsg ? { error: errorMsg } : {}), _version: VERSION }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return respond(corsHeaders, false, undefined, 'Não autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return respond(corsHeaders, false, undefined, 'Sessão expirada');

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'delete-client', p_max_requests: 5, p_window_minutes: 1 });
    if (!allowed) return respond(corsHeaders, false, undefined, 'Limite de requisições excedido.');

    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabaseAdmin.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return respond(corsHeaders, false, undefined, 'Apenas administradores podem excluir clientes');

    let body;
    try { body = await req.json(); } catch { return respond(corsHeaders, false, undefined, 'Body inválido'); }
    const schema = z.object({ userId: z.string().uuid() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return respond(corsHeaders, false, undefined, 'Dados inválidos');
    const { userId } = parsed.data;

    console.log(`[${VERSION}] 🗑️ Deleting client with user_id:`, userId);

    const { data: clientData } = await supabaseAdmin.from('clients').select('id').eq('user_id', userId).maybeSingle();
    if (clientData) {
      const { data: clientCandidates } = await supabaseAdmin.from('client_candidates').select('id').eq('client_id', clientData.id);
      if (clientCandidates && clientCandidates.length > 0) {
        const ccIds = clientCandidates.map(cc => cc.id);
        await supabaseAdmin.from('legal_requirements').delete().in('client_candidate_id', ccIds);
        await supabaseAdmin.from('client_candidate_visibility').delete().in('client_candidate_id', ccIds);
        await supabaseAdmin.from('client_candidate_documents').delete().in('client_candidate_id', ccIds);
      }
      await supabaseAdmin.from('client_candidates').delete().eq('client_id', clientData.id);
      const { data: vessels } = await supabaseAdmin.from('measurement_vessels').select('id').eq('client_id', clientData.id);
      if (vessels && vessels.length > 0) await supabaseAdmin.from('measurement_costs').delete().in('vessel_id', vessels.map(v => v.id));
      await supabaseAdmin.from('measurement_vessels').delete().eq('client_id', clientData.id);
      await supabaseAdmin.from('company_users').delete().eq('client_id', clientData.id);
    }

    await supabaseAdmin.from('company_users').delete().eq('user_id', userId);
    await supabaseAdmin.from('clients').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
    await supabaseAdmin.from('certifications').delete().eq('user_id', userId);

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) return respond(corsHeaders, false, undefined, `Erro ao deletar usuário: ${authDeleteError.message}`);

    console.log(`[${VERSION}] ✅ Client deleted successfully`);

    return respond(corsHeaders, true);
  } catch (error) {
    console.error(`[${VERSION}] ❌ Delete client error:`, error);
    return respond(getCorsHeaders(req), false, undefined, error?.message || 'Erro interno');
  }
});
