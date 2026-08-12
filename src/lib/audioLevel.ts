/**
 * Medidor de amplitude de áudio — o que faz a orbe da voz se mexer.
 *
 * Devolve um número de 0 a 1 lido sob demanda (nunca por callback ou state):
 * quem desenha está num `requestAnimationFrame` e chama `nivel()` a cada frame.
 * Um `setState` por frame derrubaria a árvore inteira 60 vezes por segundo.
 */

/** RMS de um buffer de domínio do tempo (0..~1). Coração dos dois medidores. */
export function rmsDe(buf: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

export interface Medidor {
  /** Nível suavizado, 0..1. */
  nivel(): number;
  /** Libera o analyser (não fecha o AudioContext compartilhado). */
  parar(): void;
}

/** Medidor morto — usado quando não há AudioContext ou a fonte falhou. */
const MUDO: Medidor = { nivel: () => 0, parar: () => {} };

/* ------------------------------------------------------------------ */
/* AudioContext compartilhado                                          */
/* ------------------------------------------------------------------ */

let ctx: AudioContext | null = null;

function obterCtx(): AudioContext | null {
  if (ctx) {
    // O navegador suspende o contexto sozinho; sem retomar, o analyser zera.
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  }
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  try {
    ctx = new Ctx();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * `createMediaElementSource` só pode ser chamado UMA vez por elemento — a
 * segunda chamada lança. Como o `speak.ts` reusa um único elemento para toda a
 * sessão, o nó fica guardado aqui.
 */
const fontesDeElemento = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

/* ------------------------------------------------------------------ */
/* Fábrica                                                             */
/* ------------------------------------------------------------------ */

function medirNo(no: AudioNode, ctxLocal: AudioContext): Medidor {
  const analyser = ctxLocal.createAnalyser();
  analyser.fftSize = 1024;
  no.connect(analyser);

  const buf = new Uint8Array(analyser.fftSize);
  let suave = 0;
  let vivo = true;

  return {
    nivel() {
      if (!vivo) return 0;
      analyser.getByteTimeDomainData(buf);
      // Ganho de 2.2: fala normal fica na casa de 0.05–0.2 de RMS, o que
      // mal sairia do lugar se fosse direto para o raio da esfera.
      const alvo = Math.min(1, rmsDe(buf) * 2.2);
      suave = suave * 0.75 + alvo * 0.25;
      return suave;
    },
    parar() {
      vivo = false;
      try { no.disconnect(analyser); } catch { /* noop */ }
    },
  };
}

/** Medidor de um stream (microfone, ou a voz que chega pelo WebRTC). */
export function medirStream(stream: MediaStream | null | undefined): Medidor {
  if (!stream) return MUDO;
  const c = obterCtx();
  if (!c) return MUDO;
  try {
    return medirNo(c.createMediaStreamSource(stream), c);
  } catch {
    return MUDO;
  }
}

/**
 * Medidor de um elemento `<audio>` (a fala do TTS).
 *
 * Atenção: ao criar a fonte, o áudio do elemento passa a sair pelo grafo do Web
 * Audio. Sem o `connect(destination)` abaixo, o TTS emudece — e emudece em
 * silêncio, sem erro nenhum no console.
 */
export function medirElemento(el: HTMLAudioElement | null | undefined): Medidor {
  if (!el) return MUDO;
  const c = obterCtx();
  if (!c) return MUDO;
  try {
    let fonte = fontesDeElemento.get(el);
    if (!fonte) {
      fonte = c.createMediaElementSource(el);
      fonte.connect(c.destination);
      fontesDeElemento.set(el, fonte);
    }
    return medirNo(fonte, c);
  } catch {
    // Elemento já capturado por outro contexto, ou origem cruzada: melhor
    // devolver mudo (a orbe cai na pulsação sintética) do que quebrar a fala.
    return MUDO;
  }
}
