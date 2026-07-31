import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Emite um token efêmero para a OpenAI Realtime API (voz em tempo real, WebRTC).
 * O cliente envia instructions/tools/voice; nunca exponha a OPENAI_API no browser.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API");
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API não configurado." }, 500);

    const { instructions, tools, voice } = await req.json().catch(() => ({}));
    const model = Deno.env.get("OPENAI_REALTIME_MODEL") ?? "gpt-4o-realtime-preview";

    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        voice: voice || Deno.env.get("OPENAI_REALTIME_VOICE") || "alloy",
        modalities: ["audio", "text"],
        instructions: instructions || "Você é um assistente por voz em português brasileiro.",
        tools: tools && tools.length ? tools : undefined,
        tool_choice: tools && tools.length ? "auto" : undefined,
        input_audio_transcription: { model: "whisper-1" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Realtime session error:", resp.status, t);
      return json({ error: `Falha ao iniciar voz em tempo real (${resp.status}).`, details: t }, resp.status);
    }

    const data = await resp.json();
    // data.client_secret.value = token efêmero; data.model útil para o SDP.
    return json({ client_secret: data.client_secret, model });
  } catch (e) {
    console.error("openai-realtime-token error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido." }, 500);
  }
});
