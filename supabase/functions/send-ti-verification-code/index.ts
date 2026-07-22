import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";
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

function generateCode(): string { return Math.floor(100000 + Math.random() * 900000).toString(); }

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

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'send') {
      const body = await req.json();
      const sendSchema = z.object({ userId: z.string().uuid(), email: z.string().email() });
      const { userId, email } = sendSchema.parse(body);

      if (userId !== user.id) return new Response(JSON.stringify({ error: 'Forbidden: Cannot request verification for another user' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: tiUser, error: tiError } = await supabase.from('ti_users').select('id').eq('user_id', userId).single();
      if (tiError || !tiUser) return new Response(JSON.stringify({ success: true, requiresVerification: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      await supabase.from('ti_verification_codes').delete().eq('user_id', userId);

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: insertError } = await supabase.from('ti_verification_codes').insert({ user_id: userId, code, email, expires_at: expiresAt.toISOString(), verified: false });
      if (insertError) { console.error('Error inserting verification code:', insertError); throw new Error('Failed to create verification code'); }

      const { error: emailError } = await resend.emails.send({
        from: 'Hunters Embarque <noreply@hunters.com.br>', to: [email],
        subject: 'Código de Verificação - Hunters Embarque',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;"><tr><td align="center"><table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;"><tr><td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Hunters Embarque</h1><p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">Acesso Administrativo TI</p></td></tr><tr><td style="padding: 40px 32px;"><h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Código de Verificação</h2><p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 1.6;">Para acessar o painel administrativo, use o código abaixo:</p><div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;"><span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', monospace;">${code}</span></div><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center;">Este código expira em <strong style="color: #64748b;">10 minutos</strong></p></td></tr><tr><td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">Se você não solicitou este código, ignore este email.<br>© ${new Date().getFullYear()} Hunters Manpower. Todos os direitos reservados.</p></td></tr></table></td></tr></table></body></html>`,
      });
      if (emailError) { console.error('Error sending email:', emailError); throw new Error('Failed to send verification email'); }

      console.log('Verification code sent successfully to:', email);
      return new Response(JSON.stringify({ success: true, requiresVerification: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else if (action === 'verify') {
      const body = await req.json();
      const verifySchema = z.object({ userId: z.string().uuid(), code: z.string().min(6) });
      const { userId, code } = verifySchema.parse(body);

      if (userId !== user.id) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: verificationData, error: fetchError } = await supabase.from('ti_verification_codes').select('*').eq('user_id', userId).eq('code', code).eq('verified', false).gt('expires_at', new Date().toISOString()).single();
      if (fetchError || !verificationData) return new Response(JSON.stringify({ success: false, error: 'Código inválido ou expirado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      await supabase.from('ti_verification_codes').update({ verified: true }).eq('id', verificationData.id);
      console.log('Code verified successfully for user:', userId);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      throw new Error('Invalid action. Use ?action=send or ?action=verify');
    }
  } catch (error) {
    console.error('Error in send-ti-verification-code:', error);
    const ch = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
  }
});
