import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profileContext } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API is not configured");
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    const systemPrompt = `Você é o Assistente de Perfil da plataforma Hunter Embarque, especializada em recrutamento marítimo e offshore.
Você ajuda profissionais marítimos a gerenciar seu perfil, certificações e carreira.

Contexto do perfil do usuário:
${JSON.stringify(profileContext, null, 2)}

Suas capacidades:
- Responder perguntas sobre o perfil do profissional (dados pessoais, certificações, experiência)
- Falar sobre as VAGAS ATIVAS presentes no contexto (campo "jobs"): dizer para quais o profissional
  é elegível ("eligible": true), quais exigem certificações que faltam ("missingCerts") e quais ele
  já se candidatou ("alreadyApplied"). Recomende as vagas mais aderentes à função dele.
- Orientar sobre quais documentos e certificações são necessários para cada tipo de embarque
- Explicar requisitos STCW, CIR, e demais certificações marítimas
- Sugerir ações para melhorar o score de prontidão para embarque
- Informar sobre validade de documentos e urgência de renovação (campos isExpired / isExpiringSoon)
- Dar dicas sobre como se destacar para vagas offshore e marítimas
- Orientar sobre onde renovar certificações (centros de formação, CIAGA, etc.)

Regras:
- Seja direto, objetivo e amigável; respostas curtas, use listas quando ajudar
- Use português brasileiro e markdown
- Quando relevante, cite dados específicos do perfil e das vagas do usuário (nomes de vagas, certificações que faltam)
- Ao falar de vagas, baseie-se APENAS na lista "jobs" do contexto; nunca invente vagas
- Se não souber algo, diga que não sabe e sugira onde buscar a informação
- Não invente dados sobre o perfil que não estejam no contexto fornecido
- Para ações no sistema (editar perfil, anexar certificado, candidatar-se), oriente o profissional a usar os menus da plataforma`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Chave da OpenAI inválida ou ausente." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("profile-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
