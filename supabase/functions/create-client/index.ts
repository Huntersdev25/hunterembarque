import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://esm.sh/zod@3.23.8";

const VERSION = "v5.0.0";
const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com');
  return { 'Access-Control-Allow-Origin': isAllowed ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
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

    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', { p_user_id: user.id, p_endpoint: 'create-client', p_max_requests: 10, p_window_minutes: 1 });
    if (!allowed) return respond(corsHeaders, false, undefined, 'Limite de requisições excedido.');

    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { user_uuid: user.id });
    const { data: isTI } = await supabaseAdmin.rpc('is_ti', { user_uuid: user.id });
    if (!isAdmin && !isTI) return respond(corsHeaders, false, undefined, 'Apenas administradores podem criar clientes');

    let body;
    try { body = await req.json(); } catch { return respond(corsHeaders, false, undefined, 'Body inválido'); }
    
    const schema = z.object({ email: z.string().email(), companyName: z.string().min(1).max(200), contactName: z.string().min(1).max(200), phone: z.string().min(1).max(30), clientType: z.enum(['labor_supply', 'hunting']).optional().default('labor_supply') });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return respond(corsHeaders, false, undefined, 'Dados inválidos: ' + parsed.error.issues.map(i => i.message).join(', '));
    
    const { email, companyName, contactName, phone, clientType } = parsed.data;

    console.log(`[${VERSION}] 📝 Creating client:`, { email, companyName, contactName });

    const { data: existingClient } = await supabaseAdmin.from('clients').select('id').eq('email', email).maybeSingle();
    if (existingClient) return respond(corsHeaders, false, undefined, 'Já existe um cliente com este email');

    let existingAuthUser = null;
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (authUsers?.users) {
      existingAuthUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
    }

    let authUserId: string;
    const generatedPassword = generateRandomPassword();

    if (existingAuthUser) {
      const { data: hasAdmin } = await supabaseAdmin.from('administrators').select('id').eq('user_id', existingAuthUser.id).maybeSingle();
      const { data: hasTI } = await supabaseAdmin.from('ti_users').select('id').eq('user_id', existingAuthUser.id).maybeSingle();
      const { data: hasCompanyUser } = await supabaseAdmin.from('company_users').select('id').eq('user_id', existingAuthUser.id).maybeSingle();
      if (hasAdmin || hasTI || hasCompanyUser) return respond(corsHeaders, false, undefined, 'Email já cadastrado como admin, TI ou usuário de empresa.');

      const { data: hasProfile } = await supabaseAdmin.from('profiles').select('id').eq('user_id', existingAuthUser.id).maybeSingle();
      if (hasProfile) {
        await supabaseAdmin.from('applications').delete().eq('candidate_id', existingAuthUser.id);
        await supabaseAdmin.from('client_candidates').delete().eq('candidate_id', existingAuthUser.id);
        await supabaseAdmin.from('boarding_employees').delete().eq('candidate_id', existingAuthUser.id);
        await supabaseAdmin.from('certifications').delete().eq('user_id', existingAuthUser.id);
        await supabaseAdmin.from('profiles').delete().eq('user_id', existingAuthUser.id);
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { password: generatedPassword, email_confirm: true, user_metadata: { company_name: companyName, contact_name: contactName, phone } });
      if (updateError) return respond(corsHeaders, false, undefined, `Erro ao atualizar usuário: ${updateError.message}`);
      authUserId = existingAuthUser.id;
    } else {
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({ email, password: generatedPassword, email_confirm: true, user_metadata: { company_name: companyName, contact_name: contactName, phone } });
      if (createUserError) return respond(corsHeaders, false, undefined, `Erro ao criar usuário: ${createUserError.message}`);
      authUserId = newUser.user.id;
    }

    const { data: clientData, error: clientError } = await supabaseAdmin.from('clients').insert({ user_id: authUserId, company_name: companyName, contact_name: contactName, email, phone, client_type: clientType, created_by: user.id }).select().single();
    if (clientError) {
      if (!existingAuthUser) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return respond(corsHeaders, false, undefined, `Erro ao criar cliente: ${clientError.message}`);
    }

    const { error: companyUserError } = await supabaseAdmin.from('company_users').insert({ user_id: authUserId, client_id: clientData.id, role: 'company_admin', full_name: contactName, email, phone, created_by: user.id, is_active: true });
    if (companyUserError) {
      await supabaseAdmin.from('clients').delete().eq('id', clientData.id);
      if (!existingAuthUser) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return respond(corsHeaders, false, undefined, `Erro ao criar usuário da empresa: ${companyUserError.message}`);
    }

    // Retorna a senha gerada para o admin copiar e enviar manualmente
    return respond(corsHeaders, true, { userId: authUserId, clientId: clientData.id, generatedPassword });
  } catch (error) {
    console.error(`[${VERSION}] ❌ Create client error:`, error);
    return respond(getCorsHeaders(req), false, undefined, error?.message || 'Erro interno');
  }
});
