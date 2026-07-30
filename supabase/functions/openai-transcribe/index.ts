import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    if (!OPENAI_API_KEY) return json({ success: false, error: "OPENAI_API não configurado." });

    const { audioBase64, mimeType } = await req.json();
    if (!audioBase64) return json({ success: false, error: "Áudio não fornecido." });

    const bytes = base64Decode(audioBase64);
    const type = mimeType || "audio/webm";
    const ext = type.includes("mp4") ? "mp4"
      : type.includes("mpeg") ? "mp3"
      : type.includes("wav") ? "wav"
      : type.includes("ogg") ? "ogg"
      : "webm";

    const form = new FormData();
    form.append("file", new File([bytes], `audio.${ext}`, { type }));
    form.append("model", Deno.env.get("OPENAI_TRANSCRIBE_MODEL") ?? "gpt-4o-mini-transcribe");
    form.append("language", "pt");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI transcribe error:", response.status, t);
      return json({ success: false, error: `Erro ao transcrever (${response.status}).` });
    }

    const data = await response.json();
    return json({ success: true, text: (data.text || "").trim() });
  } catch (error) {
    console.error("openai-transcribe error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido." });
  }
});
