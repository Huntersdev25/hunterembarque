import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, profileContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é o Assistente de Perfil da plataforma Hunter Embarque, especializada em recrutamento marítimo e offshore.
Você ajuda profissionais marítimos a gerenciar seu perfil, certificações e carreira.

Contexto do perfil do usuário:
${JSON.stringify(profileContext, null, 2)}

Suas capacidades:
- Responder perguntas sobre o perfil do profissional (dados pessoais, certificações, experiência)
- Orientar sobre quais documentos e certificações são necessários para cada tipo de embarque
- Explicar requisitos STCW, CIR, e demais certificações marítimas
- Sugerir ações para melhorar o score de prontidão para embarque
- Informar sobre validade de documentos e urgência de renovação
- Dar dicas sobre como se destacar para vagas offshore e marítimas
- Orientar sobre onde renovar certificações (centros de formação, CIAGA, etc.)

Regras:
- Seja direto, objetivo e amigável
- Use português brasileiro
- Quando relevante, cite dados específicos do perfil do usuário
- Se não souber algo, diga que não sabe e sugira onde buscar a informação
- Não invente dados sobre o perfil que não estejam no contexto fornecido`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
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
