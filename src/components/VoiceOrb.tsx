/**
 * Orbe da conversa por voz.
 *
 * Uma esfera que respira e ondula conforme a amplitude do áudio — é ela que
 * substitui o chat enquanto a Hunters.IO está no ar. Desenhada em `<canvas>`
 * dentro de um `requestAnimationFrame`: o nível de áudio chega por uma função
 * lida a cada frame, e não por prop de state, justamente para não re-renderizar
 * o drawer sessenta vezes por segundo.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type OrbState = "conectando" | "ouvindo" | "pensando" | "falando" | "erro";

interface Paleta {
  /** Centro do gradiente. */
  centro: string;
  /** Borda do gradiente. */
  borda: string;
  /** Halo externo (shadowBlur). */
  halo: string;
  /** Quanto a forma se deforma com o áudio (0 = círculo perfeito). */
  reatividade: number;
}

/**
 * Âmbar quando é a vez do profissional falar (mesmo tom do botão de microfone),
 * ciano/azul quando é a Hunters.IO. A cor é o que diz de quem é o turno.
 */
const PALETAS: Record<OrbState, Paleta> = {
  conectando: { centro: "#7dd3fc", borda: "#0369a1", halo: "rgba(56,189,248,0.45)", reatividade: 0 },
  ouvindo:    { centro: "#fcd34d", borda: "#d97706", halo: "rgba(251,191,36,0.50)", reatividade: 1 },
  pensando:   { centro: "#cbd5e1", borda: "#475569", halo: "rgba(148,163,184,0.40)", reatividade: 0 },
  falando:    { centro: "#67e8f9", borda: "#0b6fa4", halo: "rgba(34,211,238,0.55)", reatividade: 1 },
  erro:       { centro: "#fca5a5", borda: "#b91c1c", halo: "rgba(248,113,113,0.40)", reatividade: 0 },
};

/** Interpola dois hex de 6 dígitos. Serve para a cor não pular na troca de turno. */
function misturar(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

interface VoiceOrbProps {
  estado: OrbState;
  /** Amplitude atual, 0..1. Lida a cada frame — não precisa ser estável. */
  nivel: () => number;
  /** Lado do canvas em CSS pixels. */
  tamanho?: number;
  className?: string;
}

export function VoiceOrb({ estado, nivel, tamanho = 200, className }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs para o loop enxergar o valor atual sem ser recriado a cada render.
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = tamanho * dpr;
    canvas.height = tamanho * dpr;
    ctx.scale(dpr, dpr);

    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let raf = 0;
    let t = 0;
    /** Estado anterior + progresso da transição, para a cor não trocar de golpe. */
    let anterior: OrbState = estadoRef.current;
    let mistura = 1;
    /** Nível suavizado uma segunda vez, no lado do desenho. */
    let amp = 0;
    /** Frames seguidos com áudio zerado enquanto ela deveria estar falando. */
    let mudo = 0;

    const centro = tamanho / 2;
    const raioBase = tamanho * 0.29;

    const desenhar = () => {
      const atual = estadoRef.current;
      if (atual !== anterior && mistura >= 1) { mistura = 0; }
      const p = PALETAS[atual];
      const pa = PALETAS[anterior];
      const cCentro = mistura >= 1 ? p.centro : misturar(pa.centro, p.centro, mistura);
      const cBorda = mistura >= 1 ? p.borda : misturar(pa.borda, p.borda, mistura);
      if (mistura < 1) {
        mistura = Math.min(1, mistura + 0.06);
        if (mistura >= 1) anterior = atual;
      }

      let bruto = 0;
      try { bruto = nivelRef.current() || 0; } catch { bruto = 0; }

      /*
       * Rede de segurança: em alguns navegadores o stream do WebRTC não
       * alimenta o Web Audio e o nível fica cravado em zero. Sem isto a orbe
       * ficaria parada justamente enquanto ela fala, que é o pior momento —
       * então, depois de ~1s de silêncio absoluto num turno de fala, a
       * amplitude passa a ser sintética.
       */
      if (p.reatividade > 0) {
        mudo = bruto < 0.005 ? mudo + 1 : 0;
        if (mudo > 60) bruto = 0.30 + 0.22 * Math.sin(t * 3.1) + 0.10 * Math.sin(t * 7.7);
      } else {
        mudo = 0;
      }

      amp = amp * 0.82 + bruto * 0.18;
      const reage = reduzido ? 0 : p.reatividade;

      // Respiração de fundo: existe mesmo em silêncio, para a orbe nunca
      // parecer uma imagem congelada.
      const respiro = reduzido ? 0 : 0.035 * Math.sin(t * 1.1);
      const raio = raioBase * (1 + respiro + amp * 0.22 * reage);

      ctx.clearRect(0, 0, tamanho, tamanho);

      /* Halo */
      ctx.save();
      ctx.shadowColor = p.halo;
      ctx.shadowBlur = 28 + amp * 46 * reage;

      /* Corpo: círculo amostrado por ângulo, com o raio modulado por três
         harmônicas de fase independente. É a soma delas que dá o aspecto de
         líquido em vez de "círculo que cresce e encolhe". */
      const passos = 96;
      const d = reduzido ? 0 : (0.035 + amp * 0.16 * reage);
      ctx.beginPath();
      for (let i = 0; i <= passos; i++) {
        const ang = (i / passos) * Math.PI * 2;
        const dobra =
          1 +
          d * Math.sin(3 * ang + t * 1.6) +
          d * 0.65 * Math.sin(5 * ang - t * 2.1) +
          d * 0.4 * Math.sin(7 * ang + t * 1.2);
        const r = raio * dobra;
        const x = centro + Math.cos(ang) * r;
        const y = centro + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Foco do gradiente deslocado para cima e para a esquerda: dá volume,
      // como se houvesse uma luz vindo da superfície.
      const g = ctx.createRadialGradient(
        centro - raio * 0.32, centro - raio * 0.36, raio * 0.1,
        centro, centro, raio * 1.15,
      );
      g.addColorStop(0, cCentro);
      g.addColorStop(1, cBorda);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();

      /* Brilho especular */
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(
        centro - raio * 0.3, centro - raio * 0.38,
        raio * 0.3, raio * 0.19,
        -0.5, 0, Math.PI * 2,
      );
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      /* Anel externo — só aparece quando há som, e é o que dá a leitura de
         "onda saindo da esfera". */
      if (reage && amp > 0.04) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, amp * 0.9);
        ctx.strokeStyle = cCentro;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centro, centro, raio * (1.22 + amp * 0.3), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      t += 1 / 60;
      raf = requestAnimationFrame(desenhar);
    };

    raf = requestAnimationFrame(desenhar);

    // Aba escondida: o navegador já congela o rAF, mas garantimos o cancelamento
    // para não acumular frames enfileirados na volta.
    const aoTrocarDeAba = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(desenhar);
      }
    };
    document.addEventListener("visibilitychange", aoTrocarDeAba);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", aoTrocarDeAba);
    };
  }, [tamanho]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: tamanho, height: tamanho }}
      className={cn("select-none", className)}
      aria-hidden="true"
    />
  );
}
