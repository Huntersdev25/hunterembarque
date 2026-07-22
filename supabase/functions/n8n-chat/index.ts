import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from 'https://esm.sh/zod@3.23.8';

const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const userId = claimsData.claims.sub;

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: allowed } = await serviceClient.rpc('check_rate_limit', { p_user_id: userId, p_endpoint: 'n8n-chat', p_max_requests: 5, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const body = await req.json();
    const schema = z.object({ message: z.string().min(1).max(5000), agentId: z.string().optional() });
    const { message, agentId } = schema.parse(body);

    let n8nWebhookUrl: string | null = null;
    if (agentId) {
      const { data: agentData } = await supabase.from('agent_covers').select('webhook_url').eq('agent_id', agentId).single();
      n8nWebhookUrl = agentData?.webhook_url || null;
    }
    if (!n8nWebhookUrl) n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || null;
    if (!n8nWebhookUrl) return new Response(JSON.stringify({ error: 'Webhook não configurado para este agente' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    console.log('📤 Enviando mensagem para n8n:', { message: message.substring(0, 50), userId, agentId });

    const response = await fetch(n8nWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, userId, agentId, timestamp: new Date().toISOString() }) });

    const rawText = await response.text();
    let parsed: any = null;
    try { parsed = rawText ? JSON.parse(rawText) : null; } catch { /* keep as text */ }

    if (!response.ok) {
      console.error('❌ Erro do n8n:', response.status, response.statusText, rawText);
      return new Response(JSON.stringify({ error: `n8n retornou erro: ${response.status}`, n8n_status: response.status, n8n_statusText: response.statusText, n8n_body: parsed ?? rawText }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = parsed ?? rawText;
    console.log('✅ Resposta do n8n:', data);

    return new Response(JSON.stringify({ response: data.response || data.message || data.output || data.text || 'Mensagem recebida com sucesso', data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('❌ Erro na função:', error);
    const ch = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: error.message, response: 'Desculpe, não consegui processar sua mensagem no momento.' }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
