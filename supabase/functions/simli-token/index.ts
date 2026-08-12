import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Token de sessão do Simli — o avatar com lip-sync da conversa por voz.
 *
 * O `simli-client` traz um `generateSimliSessionToken()` que roda no browser,
 * mas ele recebe a API key como parâmetro: usar aquilo no front entregaria a
 * chave (e a fatura) para qualquer um com o DevTools aberto. Aqui replicamos a
 * mesma chamada do lado do servidor — é literalmente um POST em
 * `/compose/token` com a chave no header.
 *
 * O rosto também sai daqui, e não do bundle: trocar o avatar vira uma troca de
 * secret no Supabase, sem deploy do front.
 *
 * Secrets esperados:
 *   SIMLI_API_KEY  (obrigatório)
 *   SIMLI_FACE_ID  (obrigatório — o rosto gerado a partir de hunters-io.jpg)
 *   SIMLI_MODEL, SIMLI_MAX_SESSION, SIMLI_MAX_IDLE (opcionais)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SIMLI_API_KEY = Deno.env.get("SIMLI_API_KEY");
    if (!SIMLI_API_KEY) return json({ error: "SIMLI_API_KEY não configurado no Supabase." }, 500);

    const faceId = Deno.env.get("SIMLI_FACE_ID");
    if (!faceId) return json({ error: "SIMLI_FACE_ID não configurado no Supabase." }, 500);

    const num = (nome: string, padrao: number) => {
      const v = Number(Deno.env.get(nome));
      return Number.isFinite(v) && v > 0 ? v : padrao;
    };

    /*
     * Os dois limites abaixo são freio de custo, não detalhe técnico: a sessão
     * é cobrada por minuto e uma aba esquecida aberta continuaria queimando.
     * O Simli fecha sozinho ao bater qualquer um dos dois.
     */
    const config: Record<string, unknown> = {
      faceId,
      handleSilence: true,          // fica respirando/parada quando não há áudio
      maxSessionLength: num("SIMLI_MAX_SESSION", 1800), // 30 min de teto
      maxIdleTime: num("SIMLI_MAX_IDLE", 180),          // 3 min sem áudio, encerra
    };
    const model = Deno.env.get("SIMLI_MODEL");
    if (model === "fasttalk" || model === "artalk") config.model = model;

    const resp = await fetch("https://api.simli.ai/compose/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-simli-api-key": SIMLI_API_KEY },
      body: JSON.stringify(config),
    });

    if (!resp.ok) {
      const detail = (await resp.text()).slice(0, 300);
      console.error("Simli recusou o token:", resp.status, detail);
      return json({ error: `O Simli recusou abrir a sessão (${resp.status}).`, detail }, 502);
    }

    const data = await resp.json().catch(() => ({} as Record<string, unknown>));
    const token = data?.session_token;
    if (!token) return json({ error: "O Simli respondeu sem session_token.", detail: data }, 502);

    return json({ token, faceId });
  } catch (e) {
    console.error("simli-token error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido." }, 500);
  }
});
