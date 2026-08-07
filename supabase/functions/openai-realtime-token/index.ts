import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Token efêmero da OpenAI Realtime API (voz em tempo real via WebRTC).
 *
 * A API saiu de preview e trocou de endpoint:
 *   GA      -> POST /v1/realtime/client_secrets   (body aninhado em "session", resposta com "value")
 *   legado  -> POST /v1/realtime/sessions         (resposta com "client_secret.value")
 *
 * Tentamos as combinações de modelo/voz do mais novo para o mais antigo e
 * devolvemos qual API venceu, porque o cliente monta o SDP de forma diferente
 * em cada uma. A OPENAI_API nunca vai para o browser.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API");
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API não configurado no Supabase." }, 500);

    const body = await req.json().catch(() => ({} as any));
    const instructions: string = body?.instructions || "Você é um assistente por voz em português brasileiro.";
    const tools: unknown[] = Array.isArray(body?.tools) ? body.tools : [];
    const wantedVoice: string = body?.voice || Deno.env.get("OPENAI_REALTIME_VOICE") || "";

    const envModel = Deno.env.get("OPENAI_REALTIME_MODEL");
    const gaModels = envModel ? [envModel] : ["gpt-realtime", "gpt-realtime-2.1"];
    // `ash` é a mesma voz usada no TTS, para o timbre não mudar entre a
    // saudação falada e a conversa em tempo real.
    const gaVoices = wantedVoice ? [wantedVoice, "ash", "alloy"] : ["ash", "alloy"];

    const auth = { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" };
    const attempts: string[] = [];

    /* ---------- 1) API GA: /v1/realtime/client_secrets ---------- */
    for (const model of gaModels) {
      for (const voice of gaVoices) {
        const resp = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers: auth,
          body: JSON.stringify({
            session: {
              type: "realtime",
              model,
              instructions,
              output_modalities: ["audio"],
              audio: {
                input: {
                  transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
                  turn_detection: { type: "semantic_vad", interrupt_response: true },
                },
                output: { voice },
              },
              ...(tools.length ? { tools, tool_choice: "auto" } : {}),
            },
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const value = data?.value ?? data?.client_secret?.value;
          if (value) return json({ api: "ga", client_secret: { value }, model, voice });
          attempts.push(`ga ${model}/${voice}: resposta sem token`);
          continue;
        }

        const text = await resp.text();
        attempts.push(`ga ${model}/${voice}: ${resp.status} ${text.slice(0, 300)}`);
        // 401/403 = chave sem acesso; insistir com outro modelo não ajuda.
        if (resp.status === 401 || resp.status === 403) {
          return json({ error: `A chave da OpenAI não tem acesso à Realtime API (${resp.status}).`, attempts }, 502);
        }
      }
    }

    /* ---------- 2) Fallback: API legada /v1/realtime/sessions ---------- */
    const legacyModel = envModel ?? "gpt-4o-realtime-preview";
    const legacyResp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        model: legacyModel,
        voice: wantedVoice || "alloy",
        modalities: ["audio", "text"],
        instructions,
        ...(tools.length ? { tools, tool_choice: "auto" } : {}),
        input_audio_transcription: { model: "whisper-1" },
      }),
    });

    if (legacyResp.ok) {
      const data = await legacyResp.json();
      const value = data?.client_secret?.value;
      if (value) return json({ api: "legacy", client_secret: { value }, model: legacyModel });
      attempts.push("legacy: resposta sem token");
    } else {
      attempts.push(`legacy: ${legacyResp.status} ${(await legacyResp.text()).slice(0, 300)}`);
    }

    console.error("Realtime token — todas as tentativas falharam:", attempts);
    return json({ error: "A OpenAI recusou abrir a sessão de voz em tempo real.", attempts }, 502);
  } catch (e) {
    console.error("openai-realtime-token error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido." }, 500);
  }
});
