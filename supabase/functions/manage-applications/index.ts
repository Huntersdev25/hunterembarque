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

    const { data: allowed } = await supabase.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'manage-applications', p_max_requests: 15, p_window_minutes: 1 });
    if (!allowed) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabase.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const schema = z.object({ applicationId: z.string().uuid(), action: z.enum(['approve', 'reject']) });
    const { applicationId, action } = schema.parse(body);

    console.log(`Processing application ${applicationId}: ${action} by ${user.id}`);

    const { data: application, error: appError } = await supabase.from('applications').select(`*, jobs:job_id (title, function_name), profiles:candidate_id (full_name, email)`).eq('id', applicationId).single();
    if (appError) throw new Error(`Failed to get application: ${appError.message}`);

    const newStatus = action === 'approve' ? 'aprovado' : 'rejeitado';
    const { error: updateError } = await supabase.from('applications').update({ status: newStatus }).eq('id', applicationId);
    if (updateError) throw new Error(`Failed to update application: ${updateError.message}`);

    try {
      await supabase.functions.invoke('send-notification', { body: { type: action === 'approve' ? 'application_approved' : 'application_rejected', userId: application.candidate_id, data: { jobTitle: application.jobs.title, applicationId } } });
    } catch (notificationError) { console.error('Failed to send notification:', notificationError); }

    return new Response(JSON.stringify({ success: true, message: `Application ${action}d successfully`, application: { id: applicationId, status: newStatus, candidateName: application.profiles.full_name, jobTitle: application.jobs.title } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Application management error:', error);
    const ch = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(JSON.stringify({ error: isZodError ? 'Dados de entrada inválidos' : error.message }), { status: isZodError ? 400 : 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
