/**
 * Voz da Hunters.IO.
 *
 * Nem toda edge function de TTS está publicada em todo ambiente, então tentamos
 * uma cascata e memorizamos qual provedor respondeu — as falas seguintes vão
 * direto no vencedor, sem pagar a tentativa perdida de novo. Se nenhuma
 * responder, caímos na síntese do próprio navegador: pior timbre, mas ela fala.
 */
import { supabase } from "@/integrations/supabase/client";

type Provedor = "openai-tts" | "elevenlabs-tts" | "onboarding-copilot";

/**
 * Voz da Hunters.IO. A "ember" que o ChatGPT usa no app não existe na API
 * (rejeitada com 400 tanto no /audio/speech quanto na Realtime); `ash` é a mais
 * próxima daquele timbre confiante, e é a mesma usada na conversa em tempo real.
 */
export const VOZ = "ash";

/** Direção de interpretação — é o que dá o tom, mais do que a voz escolhida. */
const ESTILO =
  "Fale português brasileiro com confiança e otimismo, como quem tem boas notícias. " +
  "Ritmo natural e animado, tom caloroso e profissional.";

const ORDEM: Provedor[] = ["openai-tts", "elevenlabs-tts", "onboarding-copilot"];

// A voz vai no corpo da requisição (e não só no padrão da edge function) para
// valer mesmo quando a function publicada estiver numa versão anterior.
const corpo = (fn: Provedor, texto: string) =>
  fn === "onboarding-copilot"
    ? { speak: texto, voice: VOZ, instructions: ESTILO }
    : { text: texto, voice: VOZ, instructions: ESTILO };

let vencedor: Provedor | null = null;

/** Gera o áudio da fala. Devolve mp3 em base64, ou null se nenhum provedor responder. */
export async function gerarFala(texto: string): Promise<string | null> {
  const limpo = texto?.trim();
  if (!limpo) return null;

  const tentativas = vencedor ? [vencedor, ...ORDEM.filter((f) => f !== vencedor)] : ORDEM;

  for (const fn of tentativas) {
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: corpo(fn, limpo) });
      if (!error && data?.audioContent) {
        vencedor = fn;
        return data.audioContent as string;
      }
    } catch {
      /* provedor indisponível: tenta o próximo */
    }
  }
  return null;
}

/** Último recurso: voz do sistema. Não é bonita, mas não deixa a Hunters.IO muda. */
function falarNoNavegador(texto: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sintese = window.speechSynthesis;
    if (!sintese) return resolve(false);

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    fala.rate = 1.05;
    const ptBR = sintese.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (ptBR) fala.voice = ptBR;

    let comecou = false;
    fala.onstart = () => { comecou = true; };
    fala.onend = () => resolve(comecou);
    fala.onerror = () => resolve(false);
    sintese.cancel();
    sintese.speak(fala);
  });
}

/**
 * Fala o texto e resolve quando termina.
 *
 * Devolve `false` quando não saiu som — em geral porque o navegador bloqueou o
 * autoplay (abertura sem clique). Quem chama pode então tentar de novo no
 * primeiro gesto do usuário. `onStart` recebe o áudio para poder interromper.
 */
export async function falar(
  texto: string,
  onStart?: (audio: HTMLAudioElement) => void,
): Promise<boolean> {
  const limpo = texto?.trim();
  if (!limpo) return false;

  const base64 = await gerarFala(limpo);
  if (!base64) return falarNoNavegador(limpo);

  const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
  onStart?.(audio);
  return new Promise<boolean>((resolve) => {
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });
}

/** Cala qualquer fala em andamento (áudio ou síntese do navegador). */
export function calar(audio?: HTMLAudioElement | null) {
  audio?.pause();
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}
