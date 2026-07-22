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
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: allowed } = await supabase.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'send-notification', p_max_requests: 10, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    // Only admins and TI can send notifications
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabase.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return new Response(JSON.stringify({ error: 'Forbidden: Admin or TI access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const schema = z.object({ type: z.enum(['application_submitted', 'application_approved', 'application_rejected', 'job_created']), userId: z.string().uuid(), data: z.record(z.any()) });
    const { type, userId, data } = schema.parse(body);

    console.log(`Processing notification: ${type} for user: ${userId} by ${user.id}`);

    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (profileError) throw new Error(`Failed to get user profile: ${profileError.message}`);

    let subject = ''; let message = '';
    switch (type) {
      case 'application_submitted': subject = 'Candidatura Enviada com Sucesso'; message = `Olá ${profile.full_name}, sua candidatura para a vaga "${data.jobTitle}" foi enviada com sucesso.`; break;
      case 'application_approved': subject = 'Candidatura Aprovada!'; message = `Parabéns ${profile.full_name}! Sua candidatura para a vaga "${data.jobTitle}" foi aprovada.`; break;
      case 'application_rejected': subject = 'Atualização da sua Candidatura'; message = `Olá ${profile.full_name}, sua candidatura para a vaga "${data.jobTitle}" não foi selecionada.`; break;
      case 'job_created': subject = 'Nova Oportunidade Disponível'; message = `Olá ${profile.full_name}, nova oportunidade: "${data.jobTitle}".`; break;
    }

    console.log('=== NOTIFICATION ===');
    console.log(`To: ${profile.email}, Subject: ${subject}`);

    return new Response(JSON.stringify({ success: true, message: 'Notification processed successfully', details: { recipient: profile.email, subject, type } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Notification error:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ error: isZodError ? 'Dados de entrada inválidos' : error.message }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
