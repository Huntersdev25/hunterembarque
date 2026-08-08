/**
 * Voz da Hunters.IO.
 *
 * Nem toda edge function de TTS está publicada em todo ambiente, então tentamos
 * uma cascata e memorizamos qual provedor respondeu — as falas seguintes vão
 * direto no vencedor, sem pagar a tentativa perdida de novo. Se nenhuma
 * responder, caímos na síntese do próprio navegador: pior timbre, mas ela fala.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Chave geral da voz da Hunters.IO.
 *
 * Desligada enquanto o timbre não estiver bom: com `false`, some o botão de
 * voz, a saudação falada e o modo de conversa por áudio — a implementação
 * inteira continua aqui, é só voltar para `true` para reativar tudo.
 */
export const VOZ_HABILITADA = false;

type Provedor = "openai-tts" | "elevenlabs-tts" | "onboarding-copilot";

/**
 * Voz da Hunters.IO: `echo` no modelo tts-1 — a mesma combinação validada no
 * n8n, que soa bem menos robótica em português. (A "ember" do app do ChatGPT
 * não existe na API: é rejeitada com 400 nos dois endpoints.)
 */
export const VOZ = "echo";

/** Direção de interpretação — usada só pelos modelos gpt-4o-*, ignorada no tts-1. */
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

/* ------------------------------------------------------------------ */
/* Elemento de áudio único, destravado no gesto do usuário             */
/* ------------------------------------------------------------------ */

/**
 * No celular o `play()` só é liberado dentro do gesto do usuário, e gerar a fala
 * leva alguns segundos de rede — quando o áudio finalmente ficava pronto, a
 * janela de permissão já havia expirado e o navegador bloqueava em silêncio.
 *
 * A solução é ter UM elemento de áudio, destravado tocando um WAV vazio no
 * clique. Depois disso ele toca por conta própria, sem precisar de novo gesto.
 */
const WAV_VAZIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

let elemento: HTMLAudioElement | null = null;

function obterElemento(): HTMLAudioElement {
  if (!elemento) {
    elemento = new Audio();
    elemento.setAttribute("playsinline", "");
    elemento.preload = "auto";
    elemento.style.display = "none";
    // Alguns navegadores só reproduzem elemento que está no documento.
    document.body.appendChild(elemento);
  }
  return elemento;
}

/** Chame DENTRO do onClick, antes de qualquer await, para liberar o áudio. */
export function destravarAudio() {
  const el = obterElemento();
  try {
    el.src = WAV_VAZIO;
    el.play().then(() => el.pause()).catch(() => { /* já estava liberado ou não precisa */ });
  } catch { /* noop */ }
}

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
  if (!VOZ_HABILITADA) return false;
  const limpo = texto?.trim();
  if (!limpo) return false;

  const base64 = await gerarFala(limpo);
  if (!base64) return falarNoNavegador(limpo);

  // Reusa o elemento destravado no clique — criar um novo aqui perderia a
  // permissão de reprodução e o áudio não sairia no celular.
  const audio = obterElemento();
  audio.src = `data:audio/mpeg;base64,${base64}`;
  onStart?.(audio);

  const tocou = await new Promise<boolean>((resolve) => {
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch((e) => {
      console.warn("Áudio bloqueado pelo navegador:", e?.name || e);
      resolve(false);
    });
  });

  // Bloqueado mesmo assim: melhor a voz do sistema do que resposta muda.
  return tocou || falarNoNavegador(limpo);
}

/** Cala qualquer fala em andamento (áudio ou síntese do navegador). */
export function calar(audio?: HTMLAudioElement | null) {
  (audio ?? elemento)?.pause();
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}
