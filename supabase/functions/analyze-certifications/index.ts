import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function respond(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return respond({ success: false, error: "Serviço de IA não configurado." });
    }

    const { certifications, profileName } = await req.json();

    if (!certifications || !Array.isArray(certifications)) {
      return respond({ success: false, error: "Dados de certificações inválidos." });
    }

    const today = new Date().toISOString().split('T')[0];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em certificações marítimas brasileiras. 
Analise as certificações do profissional e forneça um resumo claro e útil sobre o status de cada uma.
Seja direto, use linguagem acessível e emojis para tornar o texto mais visual.
A data de hoje é ${today}.
Responda em texto corrido (não JSON), organizado em parágrafos curtos.
Use no máximo 300 palavras.
Foque em:
1. Certificações vencidas (urgente!)
2. Certificações prestes a vencer nos próximos 30 dias
3. Certificações em dia
4. Recomendações práticas de renovação`
          },
          {
            role: "user",
            content: `Analise as certificações de ${profileName || 'este profissional'}:\n\n${JSON.stringify(certifications, null, 2)}`
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return respond({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." });
      }
      if (aiResponse.status === 402) {
        return respond({ success: false, error: "Créditos de IA esgotados." });
      }
      return respond({ success: false, error: `Erro ao consultar IA (status ${aiResponse.status}).` });
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return respond({ success: true, analysis });
  } catch (error) {
    console.error("Error analyzing certifications:", error);
    return respond({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao analisar certificações.",
    });
  }
});
