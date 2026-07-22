import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://esm.sh/zod@3.23.8';

const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: allowed } = await supabase.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'notify-webhook', p_max_requests: 10, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido.' }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } });

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabase.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return new Response(JSON.stringify({ error: "Forbidden: Admin or TI access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const schema = z.object({ type: z.string().min(1).max(100), data: z.record(z.any()), webhookKey: z.string().min(1).max(100).optional() });
    const { type, data, webhookKey } = schema.parse(body);

    const key = webhookKey || 'notify-webhook';
    const { data: webhookConfig, error: webhookError } = await supabase.from('system_webhooks').select('webhook_url, is_active').eq('webhook_key', key).single();
    if (webhookError || !webhookConfig?.webhook_url) return new Response(JSON.stringify({ error: 'Webhook não configurado no sistema' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!webhookConfig.is_active) return new Response(JSON.stringify({ success: false, message: 'Webhook desativado' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = { type, timestamp: new Date().toISOString(), triggered_by: user.email, data };
    console.log(`📤 Sending webhook [${type}] by ${user.email}`);

    const webhookResponse = await fetch(webhookConfig.webhook_url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const responseText = await webhookResponse.text();
    console.log(`📥 Webhook response [${webhookResponse.status}]:`, responseText);

    return new Response(JSON.stringify({ success: true, status: webhookResponse.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ error: isZodError ? 'Dados inválidos' : (error.message || "Erro interno") }), { status: isZodError ? 400 : 500, headers: { ...ch, "Content-Type": "application/json" } });
  }
});
