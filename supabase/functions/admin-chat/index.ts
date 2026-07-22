import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from 'https://esm.sh/zod@3.23.8';

const ALLOWED_ORIGINS = [
  'https://preview--hunterembarque.lovable.app',
  'https://hunterembarque.com',
  'https://hunterembarque.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const SYSTEM_PROMPT = `Você é o assistente de IA do sistema Hunters Manpower, uma plataforma de gestão de profissionais marítimos e offshore.

Você ajuda administradores com dúvidas sobre o sistema. Aqui estão as principais funcionalidades:

## Navegação Principal:
- **Dashboard**: Visão geral do sistema com estatísticas de candidatos, vagas e candidaturas
- **Gestão de Vagas**: Criar, editar e gerenciar vagas de emprego
- **Candidatos**: Visualizar e gerenciar candidatos cadastrados
- **Clientes**: Gerenciar empresas clientes
- **Solicitações**: Visualizar solicitações de profissionais feitas por clientes
- **Profissionais Validados**: Lista de profissionais já aprovados para clientes
- **Controle de Embarque**: Gerenciar embarques de profissionais
- **Custos e Requisitos**: Controlar custos e requisitos legais
- **Gestão Operacional**: Controle de diárias, cancelamentos e encargos

## Tipos de Usuários:
- **Candidatos/Profissionais**: Pessoas buscando vagas offshore
- **Clientes**: Empresas que contratam profissionais
- **Administradores**: Gestores do sistema
- **TI**: Acesso técnico completo

## Certificações Marítimas:
O sistema gerencia diversas certificações como CIR, STCW, CBSP, THUET, DP, GMDSS, entre outras. Cada certificação tem validade e precisa ser renovada.

## Fluxo de Trabalho:
1. Candidato se cadastra e preenche perfil com certificações
2. Admin cria vagas ou cliente solicita profissionais
3. Admin valida candidatos e atribui a clientes
4. Cliente avalia em entrevista e aprova/reprova
5. Profissional aprovado é vinculado ao controle de embarque

Responda de forma clara, objetiva e em português. Se não souber algo específico, sugira onde o usuário pode encontrar a informação no sistema.`;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'admin-chat',
      p_max_requests: 5,
      p_window_minutes: 1
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Aguarde 1 minuto.' }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const { data: adminCheck } = await supabase
      .from('administrators')
      .select('id')
      .eq('user_id', userId)
      .single();

    const { data: tiCheck } = await supabase
      .from('ti_users')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!adminCheck && !tiCheck) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a administradores' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages } = requestSchema.parse(body);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Admin chat error:", error);
    const corsHeaders = getCorsHeaders(req);
    const isZodError = error?.name === 'ZodError';
    return new Response(
      JSON.stringify({ error: isZodError ? 'Dados de entrada inválidos' : (error instanceof Error ? error.message : "Erro desconhecido") }),
      { status: isZodError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
