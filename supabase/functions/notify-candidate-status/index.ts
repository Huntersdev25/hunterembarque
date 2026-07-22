import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: allowed } = await supabaseClient.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'notify-candidate-status', p_max_requests: 10, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabaseClient.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return new Response(JSON.stringify({ error: 'Forbidden: Admin or TI access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const schema = z.object({ candidateName: z.string().min(1).max(200), candidateFunction: z.string().max(200).optional(), clientName: z.string().max(200).optional(), status: z.string().min(1).max(50), interviewDate: z.string().optional(), interviewTime: z.string().optional(), rejectionReason: z.string().max(1000).optional(), assignmentId: z.string().uuid().optional() });
    const { candidateName, candidateFunction, clientName, status, interviewDate, interviewTime, rejectionReason, assignmentId } = schema.parse(body);

    const { data: webhookConfig, error: webhookError } = await supabaseClient.from('system_webhooks').select('webhook_url, is_active').eq('webhook_key', 'notify-candidate-status').single();
    if (webhookError || !webhookConfig?.webhook_url) return new Response(JSON.stringify({ error: 'Webhook não configurado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!webhookConfig.is_active) return new Response(JSON.stringify({ success: false, message: 'Webhook desativado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const payload = { candidateName, candidateFunction, clientName, status, interviewDate: interviewDate || null, interviewTime: interviewTime || null, rejectionReason: rejectionReason || null, assignmentId, timestamp: new Date().toISOString(), changedBy: user.email || 'unknown' };

    const response = await fetch(webhookConfig.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const rawText = await response.text();
    let parsed: any = null;
    try { parsed = rawText ? JSON.parse(rawText) : null; } catch { /* keep as text */ }

    await supabaseClient.from('system_webhooks').update({ last_triggered_at: new Date().toISOString() }).eq('webhook_key', 'notify-candidate-status');

    if (!response.ok) return new Response(JSON.stringify({ error: `Webhook error: ${response.status}`, webhook_status: response.status }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify({ success: true, message: 'Notificação enviada', data: parsed ?? rawText }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('❌ Erro na função:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ error: isZodError ? 'Dados inválidos' : error.message, success: false }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
