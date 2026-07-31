import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API");
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API não configurado." }, 500);

    const { messages, tools, certCatalog } = await req.json();
    const model = Deno.env.get("OPENAI_COPILOT_MODEL") ?? "gpt-4o-mini";

    const systemPrompt = `Você é o Copiloto de Cadastro da Hunters Manpower, recrutamento marítimo/offshore.
Seu trabalho é PREENCHER o cadastro do profissional para ele, com o mínimo de esforço da parte dele.

Como agir:
- Comece SEMPRE chamando "consultar_cadastro" para ver o que já existe e o que falta.
- A partir do que o profissional escrever/falar, extraia o máximo e chame as ferramentas para preencher (pode chamar várias em sequência).
- Preencha tudo que der de uma vez; depois pergunte, de forma curta e objetiva, só o que ainda falta.
- Datas SEMPRE no formato YYYY-MM-DD. gender é um de: masculino, feminino, outro.
- Para certificações, chame "definir_certificacao" uma vez por certificação. Códigos válidos: ${certCatalog || ""}.
- Não invente dados. Se não souber, pergunte. Não prometa vaga/salário.
- Anexos (currículo, PDF de certificado) você NÃO consegue enviar: oriente o profissional a anexar na etapa correspondente.
- Seja breve, amigável, em português brasileiro. Ao terminar um bloco, confirme o que preencheu em uma frase.`;

    const body = {
      model,
      messages: [{ role: "system", content: systemPrompt }, ...(messages || [])],
      tools: tools && tools.length ? tools : undefined,
      tool_choice: "auto" as const,
      temperature: 0.2,
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("OpenAI copilot error:", resp.status, t);
      if (resp.status === 429) return json({ error: "Limite de requisições excedido. Tente em instantes." }, 429);
      if (resp.status === 401) return json({ error: "Chave da OpenAI inválida." }, 401);
      return json({ error: "Erro no serviço de IA." }, 500);
    }

    const data = await resp.json();
    // Retorna a mensagem do assistente (pode conter tool_calls) para o cliente executar.
    return json({ message: data.choices?.[0]?.message ?? null });
  } catch (e) {
    console.error("onboarding-copilot error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido." }, 500);
  }
});
