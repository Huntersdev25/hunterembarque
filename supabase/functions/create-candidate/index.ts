import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'

const ALLOWED_ORIGINS = ['https://preview--hunterembarque.lovable.app','https://hunterembarque.com','https://hunterembarque.lovable.app'];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return { 'Access-Control-Allow-Origin': isAllowed ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
}

class AppError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status = 400) { super(message); this.code = code; this.status = status; }
}

const sanitizeString = (v: string) => v.replace(/<[^>]*>/g, '').trim();

const candidateSchema = z.object({
  email: z.string().email().max(255).transform(v => v.trim().toLowerCase()),
  full_name: z.string().min(1).max(200).transform(sanitizeString),
  phone: z.string().min(1).max(20).transform(v => v.replace(/[^0-9+\-() ]/g, '')),
  cpf: z.string().max(20).transform(v => v.replace(/[^0-9.\-]/g, '')).optional(),
  rg: z.string().max(20).transform(sanitizeString).optional(),
  birth_date: z.string().max(10).optional(),
  gender: z.string().max(30).transform(sanitizeString).optional(),
  residence_location: z.string().max(200).transform(sanitizeString).optional(),
  desired_function: z.string().max(200).transform(sanitizeString).optional(),
  professional_experience: z.string().max(5000).transform(sanitizeString).optional(),
  salary_expectation: z.number().min(0).max(999999).optional(),
  vessel_type: z.string().max(200).transform(sanitizeString).optional(),
  available_from: z.string().max(10).optional(),
  available_until: z.string().max(10).optional(),
  cep: z.string().max(10).transform(v => v.replace(/[^0-9\-]/g, '')).optional(),
  street: z.string().max(300).transform(sanitizeString).optional(),
  neighborhood: z.string().max(200).transform(sanitizeString).optional(),
  city: z.string().max(200).transform(sanitizeString).optional(),
  state: z.string().max(2).transform(sanitizeString).optional(),
  address_number: z.string().max(20).transform(sanitizeString).optional(),
  address_complement: z.string().max(200).transform(sanitizeString).optional(),
  languages: z.string().max(500).transform(sanitizeString).optional(),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new AppError('AUTH_REQUIRED', 'Authorization header is required', 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new AppError('UNAUTHORIZED', 'Não autorizado', 401);

    const body = await req.json();
    const requestData = candidateSchema.parse(body);

    console.log(`🔒 Candidate creation attempt by ${user.id} for ${requestData.email}`);

    const { data: isAdminData } = await supabaseAdmin.rpc('is_admin', { user_uuid: user.id });
    const { data: isTIData } = await supabaseAdmin.rpc('is_ti', { user_uuid: user.id });
    if (!isAdminData && !isTIData) {
      console.error(`❌ Unauthorized candidate creation attempt by ${user.id}`);
      throw new AppError('FORBIDDEN', 'Acesso negado. Apenas administradores ou TI podem criar novos candidatos.', 403);
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === requestData.email.toLowerCase());
    if (emailExists) { console.log(`❌ Email already exists: ${requestData.email}`); throw new AppError('EMAIL_EXISTS', 'Este email já está cadastrado no sistema', 200); }

    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email, password: generateRandomPassword(), email_confirm: true,
      user_metadata: { full_name: requestData.full_name, phone: requestData.phone, role: 'candidate', must_change_password: true, is_first_login: true }
    });

    if (createUserError || !userData.user) {
      console.error('Erro ao criar usuário:', createUserError);
      if (createUserError?.message?.includes('already been registered') || createUserError?.message?.includes('User already registered'))
        throw new AppError('EMAIL_EXISTS', 'Este email já está cadastrado no sistema', 200);
      throw new AppError('AUTH_CREATE_USER_FAILED', `Erro ao criar usuário: ${createUserError?.message || 'Falha desconhecida'}`, 500);
    }

    console.log(`✅ User created successfully: ${userData.user.id}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const profileUpdateData: Record<string, any> = { full_name: requestData.full_name, email: requestData.email, phone: requestData.phone, role: 'candidate', profile_complete: true };
    const optionalFields = ['cpf','rg','birth_date','gender','residence_location','desired_function','professional_experience','salary_expectation','vessel_type','available_from','available_until','cep','street','neighborhood','city','state','address_number','address_complement','languages'] as const;
    for (const field of optionalFields) { if (requestData[field] !== undefined) profileUpdateData[field] = requestData[field]; }

    const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdateData).eq('user_id', userData.user.id);
    if (profileError) { console.error('Erro ao atualizar perfil:', profileError); await supabaseAdmin.auth.admin.deleteUser(userData.user.id); throw new Error(`Erro ao criar perfil do candidato: ${profileError.message}`); }

    console.log(`🎉 Candidate created successfully: ${userData.user.id} by ${user.id}`);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id, user_role: isTIData ? 'ti' : 'admin', user_email: user.email || '',
      user_name: user.user_metadata?.full_name || '', action: 'INSERT', table_name: 'profiles',
      record_id: userData.user.id, new_data: { email: requestData.email, full_name: requestData.full_name, phone: requestData.phone, role: 'candidate' }
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userData.user.id, message: 'Candidato criado com sucesso.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error creating candidate:', error);
    const ch = getCorsHeaders(req);
    const appError = error instanceof AppError ? error : null;
    const status = appError?.status ?? (error?.name === 'ZodError' ? 400 : 500);
    return new Response(
      JSON.stringify({ success: false, error: error?.name === 'ZodError' ? 'Dados inválidos: ' + error.errors?.map((e: any) => e.message).join(', ') : (error?.message || 'Erro interno'), code: appError?.code || (error?.name === 'ZodError' ? 'VALIDATION_ERROR' : 'UNKNOWN') }),
      { headers: { ...ch, 'Content-Type': 'application/json' }, status }
    );
  }
})
