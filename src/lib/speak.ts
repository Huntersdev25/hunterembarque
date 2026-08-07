/**
 * Fala da Hunters.IO (TTS da OpenAI).
 *
 * Tenta a edge function dedicada `openai-tts` e, se ela não estiver publicada,
 * usa o modo `speak` da `onboarding-copilot`. As duas devolvem mp3 em base64.
 */
import { supabase } from "@/integrations/supabase/client";

/** Gera o áudio da fala. Devolve mp3 em base64, ou null se não der. */
export async function gerarFala(texto: string): Promise<string | null> {
  const limpo = texto?.trim();
  if (!limpo) return null;

  for (const fn of ["openai-tts", "onboarding-copilot"] as const) {
    try {
      const body = fn === "openai-tts" ? { text: limpo } : { speak: limpo };
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (!error && data?.audioContent) return data.audioContent as string;
    } catch {
      /* tenta a próxima */
    }
  }
  return null;
}

/**
 * Fala o texto e resolve quando o áudio termina.
 * Devolve o elemento para quem precisar interromper no meio.
 */
export async function falar(
  texto: string,
  onStart?: (audio: HTMLAudioElement) => void,
): Promise<void> {
  const base64 = await gerarFala(texto);
  if (!base64) return;

  const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
  onStart?.(audio);
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    // Sem gesto do usuário o navegador bloqueia o autoplay — aí seguimos calados.
    audio.play().catch(() => resolve());
  });
}
