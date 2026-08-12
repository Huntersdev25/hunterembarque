/**
 * Voz da Hunters.IO. São DOIS caminhos, e eles não se substituem:
 *
 *  1. Conversa ao vivo → Realtime API (speech-to-speech), voz `cedar`. O modelo
 *     gera o áudio direto, com entonação e pausa. É a tecnologia do modo de voz
 *     do app do ChatGPT e a que soa humana de verdade. Não passa por este
 *     arquivo — ver VOZ_REALTIME e CopilotDrawer.
 *
 *  2. Fala avulsa (saudação ao abrir, ditado) → TTS `gpt-4o-mini-tts`, voz
 *     `alloy`, via edge function `openai-tts`. A Realtime API não atende esse
 *     caso: ela precisa de uma sessão WebRTC aberta e de permissão de
 *     microfone, o que não faz sentido só para ler uma frase na tela.
 *
 * Sobre o timbre: `alloy` é uma voz sintética e soa menos natural que `cedar`.
 * O que dá para fazer é dirigir a interpretação — o gpt-4o-mini-tts obedece ao
 * campo `instructions` (o tts-1 ignorava), e é daí que vem o ganho. Por isso
 * ESTILO abaixo é detalhado: ele é a única alavanca de naturalidade deste
 * caminho.
 *
 * Nota factual: as vozes com nome do app do ChatGPT (juniper, ember, cove,
 * breeze, sol, vale) NÃO existem na API — testadas uma a uma, todas rejeitadas.
 * Também não existe "zillow". `cedar` e `marin` são as equivalentes expostas.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Chave geral da voz da Hunters.IO.
 *
 * Com `false`, some o botão de voz e o modo de conversa por áudio.
 */
export const VOZ_HABILITADA = true;

/**
 * Avatar com lip-sync (Simli) na conversa ao vivo.
 *
 * Com `false`, a chamada usa a orbe e o áudio sai direto da OpenAI — é o
 * comportamento anterior, inteiro. Existe como freio: a sessão do Simli é
 * cobrada por minuto e entra no caminho crítico da conversa, então precisa
 * haver um jeito de desligar sem reverter código.
 */
export const AVATAR_HABILITADO = false;

/**
 * Voz da conversa em tempo real.
 *
 * `cedar` é a mais conversacional; `marin` é mais formal e entra como
 * alternativa no fallback da edge function. As duas existem só na Realtime API.
 */
export const VOZ_REALTIME = "cedar";

/**
 * Vozes disponíveis, na ordem em que aparecem no seletor do chat.
 *
 * `cedar` e `marin` vêm primeiro porque são as únicas que a Realtime API aceita
 * — escolher qualquer outra faz a conversa ao vivo cair para uma voz do TTS,
 * que é o timbre sintético. No TTS as dez funcionam.
 */
export const VOZES = [
  { id: "cedar",   nome: "Cedar",   nota: "voz-a-voz, conversacional" },
  { id: "marin",   nome: "Marin",   nota: "voz-a-voz, mais formal" },
  { id: "alloy",   nome: "Alloy",   nota: "TTS, neutra" },
  { id: "ash",     nome: "Ash",     nota: "TTS, grave" },
  { id: "ballad",  nome: "Ballad",  nota: "TTS, suave" },
  { id: "coral",   nome: "Coral",   nota: "TTS, clara" },
  { id: "echo",    nome: "Echo",    nota: "TTS, seca" },
  { id: "sage",    nome: "Sage",    nota: "TTS, calma" },
  { id: "shimmer", nome: "Shimmer", nota: "TTS, brilhante" },
  { id: "verse",   nome: "Verse",   nota: "TTS, expressiva" },
] as const;

export type VozId = typeof VOZES[number]["id"];

/** Só estas duas existem na Realtime API — o resto é TTS. */
export const VOZES_REALTIME: readonly string[] = ["cedar", "marin"];

const CHAVE_VOZ = "hunters-io-voz";

/** Voz escolhida pelo usuário no chat. Persiste entre sessões. */
export function vozAtual(): VozId {
  try {
    const v = localStorage.getItem(CHAVE_VOZ);
    if (v && VOZES.some((o) => o.id === v)) return v as VozId;
  } catch { /* noop */ }
  return "alloy";
}

export function definirVoz(id: VozId) {
  try { localStorage.setItem(CHAVE_VOZ, id); } catch { /* noop */ }
}

/**
 * Direção de interpretação — só o gpt-4o-mini-tts obedece a isto.
 *
 * É deliberadamente específico: mandar "fale natural" não muda quase nada,
 * enquanto instruções concretas de ritmo, pausa e intenção mudam bastante. É a
 * única alavanca de naturalidade que o TTS oferece.
 */
const ESTILO = [
  "Você é uma recrutadora brasileira falando com um profissional do setor marítimo.",
  "Fale português brasileiro com sotaque neutro, em tom caloroso e confiante, como quem tem boa notícia para dar.",
  "Ritmo de conversa real, nem apressado nem arrastado. Faça pausas curtas nas vírgulas e respire nos pontos.",
  "Varie a entonação entre as frases: não leia todas com a mesma melodia, é isso que soa robótico.",
  "Não soe como locutor de propaganda nem como atendimento automático.",
].join(" ");

/* ------------------------------------------------------------------ */
/* Destravar áudio no gesto do usuário                                 */
/* ------------------------------------------------------------------ */

/**
 * No celular o `play()` só é liberado dentro do gesto do usuário, e abrir a
 * sessão de voz leva alguns segundos de rede — quando o áudio ficava pronto, a
 * janela de permissão já havia expirado e o navegador bloqueava em silêncio.
 *
 * Tocar um WAV vazio no clique destrava a reprodução para o resto da sessão.
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

/**
 * Destrava UM elemento de áudio tocando um WAV vazio.
 *
 * Precisa rodar DENTRO do onClick, antes de qualquer await: é o gesto do
 * usuário que dá a permissão, e ela se perde no primeiro `await`. Vale para
 * qualquer elemento — inclusive o do WebRTC, que recebe `srcObject` só lá na
 * frente, quando o gesto já passou.
 */
export function destravarElemento(el: HTMLAudioElement) {
  try {
    el.src = WAV_VAZIO;
    el.play().then(() => el.pause()).catch(() => { /* já estava liberado ou não precisa */ });
  } catch { /* noop */ }
}

/** Chame DENTRO do onClick, antes de qualquer await, para liberar o áudio. */
export function destravarAudio() {
  destravarElemento(obterElemento());
}

/**
 * O elemento por onde sai toda fala do TTS.
 *
 * Exposto para que a orbe da voz consiga medir a amplitude do que está tocando
 * (ver `medirElemento` em lib/audioLevel). É o mesmo elemento sempre — o que
 * importa, já que a fonte do Web Audio só pode ser criada uma vez por elemento.
 */
export function elementoDeAudio(): HTMLAudioElement {
  return obterElemento();
}

/** Cala qualquer áudio em andamento. */
export function calar(audio?: HTMLAudioElement | null) {
  (audio ?? elemento)?.pause();
}

/* ------------------------------------------------------------------ */
/* Fala avulsa via TTS                                                 */
/* ------------------------------------------------------------------ */

/** Gera o áudio da fala. Devolve mp3 em base64, ou null se o TTS não responder. */
export async function gerarFala(texto: string): Promise<string | null> {
  const limpo = texto?.trim();
  if (!limpo) return null;
  try {
    const { data, error } = await supabase.functions.invoke("openai-tts", {
      // Modelo, voz e estilo vão no corpo (e não só no padrão da edge function)
      // para valerem mesmo se a function publicada estiver numa versão anterior.
      body: { text: limpo, voice: vozAtual(), instructions: ESTILO, model: "gpt-4o-mini-tts" },
    });
    if (!error && data?.audioContent) return data.audioContent as string;
    console.warn("TTS não respondeu:", data?.error || error?.message);
  } catch (e) {
    console.warn("TTS indisponível:", e);
  }
  return null;
}

/**
 * Fala o texto e resolve quando termina.
 *
 * Devolve `false` quando não saiu som — em geral porque o navegador bloqueou o
 * autoplay (abertura sem clique). Quem chama pode tentar de novo no primeiro
 * gesto do usuário. `onStart` recebe o áudio para poder interromper.
 */
export async function falar(
  texto: string,
  onStart?: (audio: HTMLAudioElement) => void,
): Promise<boolean> {
  if (!VOZ_HABILITADA) return false;
  const limpo = texto?.trim();
  if (!limpo) return false;

  const base64 = await gerarFala(limpo);
  if (!base64) return false;

  // Reusa o elemento destravado no clique — criar um novo aqui perderia a
  // permissão de reprodução e o áudio não sairia no celular.
  const audio = obterElemento();
  audio.src = `data:audio/mpeg;base64,${base64}`;
  onStart?.(audio);

  return new Promise<boolean>((resolve) => {
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch((e) => {
      console.warn("Áudio bloqueado pelo navegador:", e?.name || e);
      resolve(false);
    });
  });
}
