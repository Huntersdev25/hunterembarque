import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "ElevenLabs não configurado." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Texto não fornecido." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate to 5000 chars max
    const truncatedText = text.slice(0, 5000);

    // Laura (multilíngue, aceitável em português) é só o padrão. Trocar por uma
    // voz nativa de pt-BR da voice-library é o maior ganho de naturalidade que
    // sobrou — basta setar ELEVENLABS_VOICE_ID, sem mexer no código.
    const selectedVoice = voiceId || Deno.env.get("ELEVENLABS_VOICE_ID") || "FGY2WhTYpPnrIDTdsKH5";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: "eleven_multilingual_v2",
          // Stability mais baixa = mais variação de entonação entre as frases.
          // É contraintuitivo, mas é o que tira o "lendo em voz alta": com 0.5
          // cada frase saía com a mesma curva melódica, e é isso que o ouvido
          // reconhece como robô. Style mais alto acentua a expressividade.
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.45,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao gerar áudio (${response.status}).` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ success: true, audioContent: audioBase64 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
