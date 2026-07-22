import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Role validation: only candidates (voice assistant), admins, and TI can request tokens
    const { data: userRole } = await supabase.rpc('get_user_role', { user_uuid: user.id });
    if (!userRole || userRole === 'client') {
      return new Response(JSON.stringify({ error: 'Acesso restrito. Recurso não disponível para este perfil.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: allowed } = await supabase.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'elevenlabs-scribe-token', p_max_requests: 10, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) { console.error("ELEVENLABS_API_KEY not configured"); return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    console.log(`Requesting ElevenLabs Scribe token for user: ${user.id}`);

    const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", { method: "POST", headers: { "xi-api-key": ELEVENLABS_API_KEY } });
    if (!response.ok) { const errorText = await response.text(); console.error("ElevenLabs API error:", response.status, errorText); return new Response(JSON.stringify({ error: "Failed to get scribe token", details: errorText }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const data = await response.json();
    console.log("Scribe token obtained successfully");

    return new Response(JSON.stringify({ token: data.token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in elevenlabs-scribe-token:", error);
    const ch = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...ch, "Content-Type": "application/json" } });
  }
});
