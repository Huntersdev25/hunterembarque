import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Troca de SDP da Realtime API, feita pelo servidor.
 *
 * O normal seria o próprio navegador dar POST em api.openai.com/v1/realtime/calls
 * com o token efêmero — o CORS de lá permite (`allow-origin: *`). Mas essa
 * chamada morria com "Failed to fetch" na máquina do usuário, que é o erro que
 * o navegador dá quando ALGO no meio derruba a requisição: extensão de bloqueio,
 * antivírus com inspeção de TLS ou proxy corporativo filtrando o domínio da
 * OpenAI. Nada disso dá para consertar pelo código do cliente.
 *
 * Aqui a requisição sai do servidor do Supabase, que já é um domínio que a
 * aplicação usa o tempo todo. De quebra, um erro passa a chegar com status e
 * corpo em vez de um "Failed to fetch" opaco.
 *
 * O token efêmero vem do cliente e vale poucos minutos; a OPENAI_API não é
 * usada aqui e continua sem sair do servidor.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sdp, token, model } = await req.json().catch(() => ({} as any));
    if (!sdp || typeof sdp !== "string") return json({ error: "SDP não enviado." }, 400);
    if (!token || typeof token !== "string") return json({ error: "Token efêmero não enviado." }, 400);

    // A API GA ignora o model na URL (ele já vem fixado no token); a legada usa.
    const url = model
      ? `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`
      : "https://api.openai.com/v1/realtime/calls";

    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" },
      body: sdp,
    });

    const answer = await resp.text();
    if (!resp.ok) {
      console.error("SDP recusado pela OpenAI:", resp.status, answer.slice(0, 300));
      return json({ error: `A OpenAI recusou a conexão de voz (${resp.status}).`, detail: answer.slice(0, 300) }, 502);
    }

    return json({ sdp: answer });
  } catch (e) {
    console.error("openai-realtime-sdp error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido." }, 500);
  }
});
