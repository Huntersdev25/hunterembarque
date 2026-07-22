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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json();
    const schema = z.object({
      email: z.string().email('Email inválido').max(255).transform(v => v.trim().toLowerCase()),
      password: z.string().min(12, 'A senha deve ter pelo menos 12 caracteres').max(128),
      full_name: z.string().min(1, 'Nome é obrigatório').max(200).transform(v => v.replace(/<[^>]*>/g, '').trim()),
      phone: z.string().min(1, 'Telefone é obrigatório').max(20).transform(v => v.replace(/[^0-9+\-() ]/g, '')),
      created_by: z.string().uuid('ID do criador inválido'),
    });
    const { email, password, full_name, phone, created_by } = schema.parse(body);

    console.log(`🔒 Admin creation attempt by ${created_by} for ${email}`);

    const { data: isAdminData, error: adminCheckError } = await supabaseAdmin.rpc('is_admin', { user_uuid: created_by });
    if (adminCheckError || !isAdminData) { console.error(`❌ Unauthorized admin creation attempt by ${created_by}`); throw new Error('Acesso negado. Apenas administradores podem criar novos admins.'); }

    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    if (existingUser.user) throw new Error('Email já está em uso');

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, phone, role: 'admin' } });
    if (userError) { console.error('Erro ao criar usuário:', userError); throw new Error(`Erro ao criar usuário: ${userError.message}`); }
    if (!userData.user) throw new Error('Falha ao criar usuário');

    console.log(`✅ User created successfully: ${userData.user.id}`);

    const { error: adminError } = await supabaseAdmin.from('administrators').insert({ user_id: userData.user.id, email, full_name, phone, created_by });
    if (adminError) { console.error('Erro ao criar admin:', adminError); await supabaseAdmin.auth.admin.deleteUser(userData.user.id); throw new Error(`Erro ao criar administrador: ${adminError.message}`); }

    console.log(`🎉 Admin created successfully: ${userData.user.id} by ${created_by}`);

    await supabaseAdmin.from('audit_log').insert({ user_id: created_by, action: 'create_admin', details: { created_admin_id: userData.user.id, created_admin_email: email, timestamp: new Date().toISOString() } }).then(({ error }) => { if (error) console.error('Erro ao registrar auditoria:', error); });

    return new Response(JSON.stringify({ success: true, message: 'Administrador criado com sucesso', admin: { id: userData.user.id, email, full_name } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    console.error('❌ Error in create-secure-admin:', error);
    const ch = getCorsHeaders(req);
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...ch, 'Content-Type': 'application/json' }, status: 200 });
  }
})
