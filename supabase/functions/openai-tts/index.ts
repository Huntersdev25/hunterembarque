import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (o: unknown) =>
  new Response(JSON.stringify(o), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API");
    if (!OPENAI_API_KEY) return json({ success: false, error: "OPENAI_API não configurado." });

    const { text, voice, instructions, model: modelFromBody } = await req.json();
    if (!text || typeof text !== "string" || !text.trim())
      return json({ success: false, error: "Texto não fornecido." });

    // gpt-4o-mini-tts é o TTS dirigível: diferente do tts-1, ele obedece ao
    // campo `instructions`, e é daí que sai a diferença de naturalidade — a voz
    // sozinha (alloy) é a mesma de sempre.
    const model = modelFromBody || Deno.env.get("OPENAI_TTS_MODEL") || "gpt-4o-mini-tts";
    const selectedVoice = voice || Deno.env.get("OPENAI_TTS_VOICE") || "alloy";

    // Direção de interpretação só existe nos modelos gpt-4o-*; o tts-1 rejeita.
    const aceitaEstilo = model.startsWith("gpt-4o");
    const estilo = instructions || Deno.env.get("OPENAI_TTS_STYLE") ||
      "Fale português brasileiro com confiança e otimismo, como quem tem boas notícias. " +
      "Ritmo natural e animado, tom caloroso e profissional.";

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        voice: selectedVoice,
        input: text.slice(0, 4000),
        ...(aceitaEstilo ? { instructions: estilo } : {}),
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI TTS error:", response.status, t);
      return json({ success: false, error: `Erro ao gerar áudio (${response.status}).`, details: t.slice(0, 300) });
    }

    const audioBuffer = await response.arrayBuffer();
    return json({ success: true, audioContent: base64Encode(audioBuffer) });
  } catch (error) {
    console.error("openai-tts error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido." });
  }
});
