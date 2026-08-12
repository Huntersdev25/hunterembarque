/**
 * Copiloto de Cadastro — drawer lateral global do profissional.
 *
 * Texto: loop de agente (edge fn onboarding-copilot) que executa TOOLS para
 *        preencher o cadastro ao vivo (via copilotTools).
 * Voz:   OpenAI Realtime API (WebRTC), em tempo real, com as MESMAS tools.
 *
 * Visual: superfície marítima/offshore dedicada (tema escuro próprio),
 *         com hero, cards de acesso rápido e abertura com motion.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  openAITools, realtimeTools, runCopilotTool, certCatalogText, buildGreeting,
} from "@/lib/copilotTools";
import { HuntersFace } from "@/components/HuntersFace";
import { VoiceOrb, type OrbState } from "@/components/VoiceOrb";
import { useVoiceTurnLoop } from "@/hooks/useVoiceTurnLoop";
import { useSimliAvatar } from "@/hooks/useSimliAvatar";
import { medirStream, medirElemento, type Medidor } from "@/lib/audioLevel";
import {
  falar, calar, destravarAudio, destravarElemento, elementoDeAudio, VOZ_HABILITADA,
  AVATAR_HABILITADO, VOZES, VOZES_REALTIME, vozAtual, definirVoz, type VozId,
} from "@/lib/speak";
import {
  Send, X, Mic, Loader2, User, Wand2, Square,
  Waves, BadgeCheck, ListChecks, Volume2, VolumeX, AudioLines, Play,
} from "lucide-react";

/* Fallback p/ produção (VITE_* podem não estar no build da Vercel). */
const SUPA_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://augeppwihhzibvhzibxe.supabase.co";
const SUPA_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VwcHdpaGh6aWJ2aHppYnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODA4NDUsImV4cCI6MjA2OTA1Njg0NX0.8RUaODHeXMdRmFSRMaAoWuhnUdH7G0yCLQukqpDdD7w";

/** POST ao onboarding-copilot com timeout + 1 retry (invoke falhava em chamadas repetidas). */
async function callCopilot(messages: any[], instructions: string): Promise<any> {
  const attempt = async () => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      const resp = await fetch(`${SUPA_URL}/functions/v1/onboarding-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
        body: JSON.stringify({
          messages,
          tools: openAITools(),
          certCatalog: certCatalogText(),
          instructions,
        }),
        signal: ctrl.signal,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.message) throw new Error(data.error || `HTTP ${resp.status}`);
      return data.message;
    } finally {
      clearTimeout(to);
    }
  };
  try { return await attempt(); }
  catch { await new Promise((r) => setTimeout(r, 600)); return await attempt(); }
}

type Display = { role: "user" | "assistant" | "action"; content: string };
type OAIMsg = any;

const INSTRUCTIONS = `Você é a Hunters.IO, a copiloto de cadastro da Hunters Manpower (recrutamento marítimo/offshore).
Seu trabalho é preencher o cadastro do profissional conversando com ele, usando as ferramentas — ele não deveria precisar digitar em formulário.

PROTOCOLO OBRIGATÓRIO — siga a cada mensagem do profissional, sem exceção:
1. Releia a mensagem dele e extraia TODO dado aproveitável: nome, CPF, nascimento, gênero, telefone, cidade, estado, CEP, função, tipo de embarcação, experiência, certificações.
2. GRAVE tudo isso chamando as ferramentas AGORA. Pode chamar várias de uma vez. Você não tem permissão de responder em texto antes de gravar o que foi dito.
3. Só depois faça UMA pergunta, sobre o próximo item que falta.

Erros que você não pode cometer:
- Perguntar algo que a pessoa acabou de dizer. Se ela falou "sou marinheiro de convés e moro em Niterói", isso vira desired_function e cidade/UF gravados, não vira pergunta.
- Ignorar um dado por estar "fora de ordem". Se ela falar de certificação enquanto falta o CPF, grave a certificação e continue; a ordem das etapas é sua, não dela.
- Travar a conversa num campo. Se ela não quiser responder algo agora, siga em frente e volte depois.
- Deixar uma validade pela metade. Se ela disser "STCW válido até 2027", grave o STCW e pergunte na MESMA resposta: "que dia e mês de 2027 vence o seu STCW?".
- Tratar silêncio como resposta. Se você perguntou "tem HUET?" e a pessoa falou de outra coisa, ela NÃO respondeu: não grave owned=false. Só registre certificação que ela afirmou ter ou não ter, com todas as letras. Pergunte de novo depois, sem insistir.

Como conversar:
- Português brasileiro, no tom de um colega de bordo: direto, cordial, sem formalidade e sem jargão corporativo.
- Uma pergunta por vez. Nunca despeje uma lista de campos a preencher.
- Respostas curtas, de 1 a 3 frases.
- Confirme o que gravou em linguagem natural ("anotei seu telefone") em vez de repetir número por número, a não ser que peçam.
- Se a pessoa desviar do assunto, responda com naturalidade e volte ao cadastro sem insistir.
- Se não entender (áudio ruim, nome incomum), peça para repetir só aquele pedaço.
- Nunca invente dado nenhum. Na dúvida, pergunte.

Regras de preenchimento:
- Comece SEMPRE por consultar_cadastro, para não perguntar o que já está preenchido.
- Datas em YYYY-MM-DD. gender: masculino|feminino|outro ("homem" = masculino, "mulher" = feminino).
- Quando a cidade for conhecida, preencha o estado junto (Niterói e Macaé = RJ, Santos = SP, Salvador = BA).
- Uma chamada de definir_certificacao por certificação. Pergunte em blocos ("tem STCW? e CIR?"), nunca uma por vez de forma robótica.
- Registre TAMBÉM o que a pessoa não tem: "não tenho NR34" vira definir_certificacao com owned=false. A etapa só fecha quando todas foram respondidas, inclusive as negativas.
- Datas de certificado só valem completas (dia, mês e ano). Se a pessoa disser só o ano ("válido até 2027"), grave owned=true SEM a validade e pergunte o dia e o mês na mesma resposta. Nunca chute uma data.
- A validade dos certificados é o dado mais importante da plataforma: é ela que decide se o profissional pode embarcar. Não deixe uma validade pela metade passar batido.
- Cada gravação devolve o estado recalculado entre colchetes. Use SEMPRE esse estado para dizer o que falta — nunca o que você leu no começo da conversa.
- Anexos (currículo, PDF de certificado) você não consegue enviar — oriente a pessoa a anexar na etapa de documentos.
- Antes de afirmar o que ainda falta, chame consultar_cadastro de novo: o estado muda a cada gravação, e falar "só falta X" quando falta muito mais destrói a confiança.
- Ao terminar um bloco, diga em uma frase o que ainda falta para concluir.

Códigos de certificação: ${certCatalogText()}.`;

/**
 * Realtime: mesma persona, com as seções de direção de fala que o guia de
 * prompting da OpenAI recomenda. A voz (`cedar`) entrega a prosódia; é este
 * bloco que decide se ela soa como gente ou como locutor de URA.
 */
const VOICE_INSTRUCTIONS = `${INSTRUCTIONS}

## Personalidade e tom
Você está em uma conversa POR VOZ e VOCÊ FALA: tudo que você diz vira áudio e o profissional vai OUVIR.
Nunca diga que não consegue falar, que não tem voz ou que só funciona por texto — isso é falso. Se perguntarem se você fala, responda que sim e continue a conversa.
Você é uma colega de trabalho brasileira, na faixa dos trinta, que conhece o setor marítimo e gosta de resolver. Calorosa e direta, nunca bajuladora, nunca formal demais.

## Ritmo
Fale rápido, como quem conversa de verdade, mas sem soar apressada.
No máximo duas frases por resposta. Se precisar de mais, pergunte antes se pode explicar.
Use as pausas naturais da fala. Pode hesitar de leve quando estiver consultando algo ("deixa eu ver aqui…", "peraí que eu confiro") em vez de ficar muda enquanto usa uma ferramenta.

## Variedade
Não repita a mesma frase duas vezes na conversa. Varie confirmações e aberturas para não soar robótica.
Confirmações possíveis, entre outras: "anotei", "beleza", "isso", "certo", "pode deixar". NÃO use sempre estas — invente outras no mesmo tom.
Nada de listas numeradas, markdown, emoji ou pontuação soletrada: nada disso existe quando se ouve.

## Idioma
A conversa é só em português brasileiro, sotaque neutro. Não mude de idioma nem se pedirem.

## Como pronunciar
Não leia código técnico de certificação em voz alta: use o nome por extenso ("STCW" vira "ésse-tê-cê-dáblio" só se a pessoa perguntar pela sigla; prefira "curso básico de segurança").
Número de documento, CPF e telefone: leia dígito por dígito, pausando a cada grupo.
Data: por extenso ("doze de março de dois mil e vinte e sete"), nunca "12/03/2027".

## Áudio ruim
Se o áudio vier cortado, com ruído ou você não tiver certeza do que ouviu, NÃO adivinhe: peça para repetir só o pedaço que faltou. Nome próprio e número você sempre repete de volta para confirmar.

## Interrupção
Se a pessoa começar a falar por cima, pare na hora e escute. Não termine a frase.`;

/* ---------------- Fundo claro, marítimo, com movimento ---------------- */

/** Keyframes locais: o tailwind.config do projeto só tem fade-in/slide-in. */
const BACKDROP_CSS = `
@keyframes io-flutua {
  0%,100% { transform: translate3d(0,0,0) scale(1); }
  50%     { transform: translate3d(6%,-4%,0) scale(1.12); }
}
@keyframes io-flutua-lento {
  0%,100% { transform: translate3d(0,0,0) scale(1.05); }
  50%     { transform: translate3d(-7%,5%,0) scale(1); }
}
@keyframes io-onda { from { transform: translateX(0); } to { transform: translateX(-400px); } }
@keyframes io-sobe { 0% { transform: translateY(0); opacity: 0; } 15%,85% { opacity: 1; } 100% { transform: translateY(-190px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .io-anim { animation: none !important; }
}
`;

function MaritimeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-white">
      <style>{BACKDROP_CSS}</style>

      {/* Lavagem de cor suave */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-cyan-50/70" />

      {/* Manchas de luz que respiram devagar */}
      <div
        className="io-anim absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl"
        style={{ animation: "io-flutua 19s ease-in-out infinite" }}
      />
      <div
        className="io-anim absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-blue-300/25 blur-3xl"
        style={{ animation: "io-flutua-lento 24s ease-in-out infinite" }}
      />
      <div
        className="io-anim absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"
        style={{ animation: "io-flutua 27s ease-in-out infinite reverse" }}
      />

      {/* Bolhas subindo — o toque "submarino" */}
      {[
        { left: "12%", size: 7, delay: 0, dur: 15 },
        { left: "27%", size: 4, delay: 4, dur: 12 },
        { left: "68%", size: 9, delay: 2, dur: 18 },
        { left: "83%", size: 5, delay: 7, dur: 14 },
        { left: "48%", size: 6, delay: 9, dur: 16 },
      ].map((b, i) => (
        <span
          key={i}
          className="io-anim absolute bottom-24 rounded-full border border-cyan-400/25 bg-cyan-200/20"
          style={{
            left: b.left,
            height: b.size,
            width: b.size,
            animation: `io-sobe ${b.dur}s linear ${b.delay}s infinite`,
          }}
        />
      ))}

      {/* Silhueta offshore + ondas que correm */}
      <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g stroke="rgb(56 152 224 / 0.14)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M58 250 L100 470 M142 250 L100 470 M58 250 L142 250" />
          <path d="M62 300 L138 300 M70 360 L130 360 M78 415 L122 415" />
          <path d="M64 250 L136 250 L140 234 L60 234 Z" />
          <path d="M92 234 L100 176 L108 234 M95 214 L105 214 M97 198 L103 198" />
          <path d="M140 240 L162 232 L158 246" />
        </g>
        <g stroke="rgb(56 152 224 / 0.14)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M246 452 L374 452 L360 476 L262 476 Z" />
          <path d="M330 452 L330 424 L360 424 L360 452 M337 431 L337 446 M345 431 L345 446 M353 431 L353 446" />
          <path d="M298 452 L298 428 L280 438" />
        </g>

        {/* Cada onda é desenhada em dobro e deslizada 400px: o loop fica invisível. */}
        <g className="io-anim" style={{ animation: "io-onda 22s linear infinite" }}>
          <path d="M0 560 Q50 544 100 560 T200 560 T300 560 T400 560 T500 560 T600 560 T700 560 T800 560"
                stroke="rgb(56 152 224 / 0.16)" strokeWidth="1.5" fill="none" />
        </g>
        <g className="io-anim" style={{ animation: "io-onda 15s linear infinite" }}>
          <path d="M0 592 Q50 574 100 592 T200 592 T300 592 T400 592 T500 592 T600 592 T700 592 T800 592"
                stroke="rgb(34 197 214 / 0.14)" strokeWidth="1.5" fill="none" />
        </g>
        <g className="io-anim" style={{ animation: "io-onda 30s linear infinite" }}>
          <path d="M0 624 Q50 608 100 624 T200 624 T300 624 T400 624 T500 624 T600 624 T700 624 T800 624"
                stroke="rgb(56 152 224 / 0.10)" strokeWidth="1.5" fill="none" />
        </g>
      </svg>
    </div>
  );
}

/** Avatar da Hunters.IO usado em todos os pontos do chat. */
const IOAvatar = HuntersFace;

const QUICK_TONES: Record<string, string> = {
  amber: "bg-amber-100 text-amber-600",
  cyan: "bg-cyan-100 text-cyan-600",
  emerald: "bg-emerald-100 text-emerald-600",
  blue: "bg-sky-100 text-sky-600",
};

export function CopilotDrawer({ autoOpen = false }: { autoOpen?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");

  const [display, setDisplay] = useState<Display[]>([
    { role: "assistant", content: "Oi! Eu sou a Hunters.IO e preencho seu cadastro pra você. É só me contar sobre você — por exemplo: “Sou marinheiro de convés, moro em Niterói, tenho STCW válido até 2027.”" },
  ]);
  const oaiRef = useRef<OAIMsg[]>([]);
  /** Tudo que o profissional disse — usado para barrar registros sem respaldo na conversa. */
  const userSaidRef = useRef<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // voz — "realtime" = WebRTC full-duplex; "turns" = Whisper + TTS (fallback)
  const [engine, setEngine] = useState<"realtime" | "turns">("realtime");
  /** Por que o tempo real não subiu — mostrado na barra de voz para diagnóstico. */
  const [motivoFallback, setMotivoFallback] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  /* --- orbe da conversa por voz ---
   * De quem é o turno agora. No tempo real vem dos eventos da sessão; no
   * fallback por turnos é derivado do `fallback.status` (ver `orbEstado`).
   */
  const [orbRealtime, setOrbRealtime] = useState<OrbState>("conectando");
  /** Medidores de amplitude que alimentam a orbe. */
  const medidorIA = useRef<Medidor | null>(null);
  const medidorMic = useRef<Medidor | null>(null);
  /** Espelho do estado da orbe, lido dentro do rAF (que não re-renderiza). */
  const orbEstadoRef = useRef<OrbState>("conectando");

  /** Avatar com lip-sync. Quando sobe, é ele quem toca o som da conversa. */
  const avatar = useSimliAvatar();

  /** Autoplay recusado: mostra um botão para o usuário liberar o som. */
  const [audioBloqueado, setAudioBloqueado] = useState(false);
  const [voz, setVoz] = useState<VozId>(() => vozAtual());
  const [seletorVozAberto, setSeletorVozAberto] = useState(false);

  // Saudação falada ao abrir — o usuário pode silenciar, e a escolha persiste.
  const [saudacaoComVoz, setSaudacaoComVoz] = useState(() => {
    try { return localStorage.getItem("hunters-io-saudacao") !== "muda"; } catch { return true; }
  });
  const jaSaudou = useRef(false);
  /** Saudação escrita na abertura — a sessão de voz retoma daqui, sem repeti-la. */
  const saudacaoRef = useRef("");
  const saudacaoAudioRef = useRef<HTMLAudioElement | null>(null);
  const [falando, setFalando] = useState(false);

  const uid = user?.id;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [display, busy]);

  // Abre sozinho ao carregar a trilha (uma vez por sessão), com motion.
  useEffect(() => {
    if (!autoOpen || !uid) return;
    try { if (sessionStorage.getItem("copilot-autoopened")) return; } catch { /* noop */ }
    const t = setTimeout(() => {
      setOpen(true);
      try { sessionStorage.setItem("copilot-autoopened", "1"); } catch { /* noop */ }
    }, 650);
    return () => clearTimeout(t);
  }, [autoOpen, uid]);

  /** Listener armado quando o autoplay é bloqueado, para falar no primeiro gesto. */
  const gestoRef = useRef<(() => void) | null>(null);

  const pararSaudacao = () => {
    calar(saudacaoAudioRef.current);
    saudacaoAudioRef.current = null;
    setFalando(false);
    if (gestoRef.current) {
      document.removeEventListener("pointerdown", gestoRef.current);
      document.removeEventListener("keydown", gestoRef.current);
      gestoRef.current = null;
    }
  };

  /** Fala um texto marcando o estado visual de "falando". Devolve se saiu som. */
  const dizer = async (texto: string): Promise<boolean> => {
    setFalando(true);
    const tocou = await falar(texto, (audio) => { saudacaoAudioRef.current = audio; });
    saudacaoAudioRef.current = null;
    setFalando(false);
    return tocou;
  };

  /**
   * Ao abrir, a Hunters.IO se apresenta: escreve e fala (TTS gpt-4o-mini-tts).
   *
   * O texto fica em `saudacaoRef` para a sessão de voz retomar dali sem repetir
   * a apresentação inteira.
   */
  useEffect(() => {
    if (!open || !uid || jaSaudou.current) return;
    jaSaudou.current = true;

    (async () => {
      const texto = await buildGreeting(uid);
      saudacaoRef.current = texto;
      setDisplay([{ role: "assistant", content: texto }]);
      oaiRef.current.push({ role: "assistant", content: texto });

      if (!VOZ_HABILITADA || !saudacaoComVoz) return;
      if (!(await dizer(texto))) {
        // Autoplay bloqueado (abertura automática, sem clique): fala no 1º gesto.
        // Os dois listeners saem juntos — senão o que não disparou ficaria
        // armado e ela repetiria a saudação mais tarde.
        const noGesto = () => {
          document.removeEventListener("pointerdown", noGesto);
          document.removeEventListener("keydown", noGesto);
          gestoRef.current = null;
          void dizer(texto);
        };
        gestoRef.current = noGesto;
        document.addEventListener("pointerdown", noGesto);
        document.addEventListener("keydown", noGesto);
      }
    })();
  }, [open, uid, saudacaoComVoz]);

  /**
   * Troca a voz. No TTS vale na próxima fala; na conversa ao vivo a voz é
   * fixada na abertura da sessão, então reabrimos para ouvir a nova.
   */
  const trocarVoz = async (id: VozId) => {
    definirVoz(id);
    setVoz(id);
    setSeletorVozAberto(false);
    if (mode === "voice") {
      closeRealtime();
      fallback.stop();
      setVoiceStatus("connecting");
      setMode("text");
      // O setMode acima destrava o guard do startVoice.
      setTimeout(() => { void startVoice(); }, 0);
    } else {
      void dizer(`Pronto, agora eu falo com a voz ${VOZES.find((v) => v.id === id)?.nome}.`);
    }
  };

  const alternarSaudacao = () => {
    setSaudacaoComVoz((v) => {
      const proximo = !v;
      try { localStorage.setItem("hunters-io-saudacao", proximo ? "voz" : "muda"); } catch { /* noop */ }
      if (!proximo) pararSaudacao();
      return proximo;
    });
  };

  const pushDisplay = (d: Display) => setDisplay((p) => [...p, d]);

  /* ---------------- Loop de agente (texto e voz-fallback) ---------------- */
  /** Roda o agente a partir de uma fala/mensagem do usuário e devolve a resposta final. */
  const runAgent = async (text: string): Promise<string> => {
    const clean = text.trim();
    if (!clean || !uid) return "";
    pararSaudacao(); // se ela ainda estiver se apresentando, cala e escuta
    pushDisplay({ role: "user", content: clean });
    oaiRef.current.push({ role: "user", content: clean });
    userSaidRef.current.push(clean);
    setBusy(true);
    try {
      // No modo de voz a resposta vai ser FALADA, então a persona precisa saber
      // disso — com a persona de texto ela chegava a dizer "não consigo falar
      // por áudio", que é falso, e respondia longo demais para ouvir.
      const persona = mode === "voice" ? VOICE_INSTRUCTIONS : INSTRUCTIONS;
      for (let i = 0; i < 6; i++) {
        const msg = await callCopilot(oaiRef.current, persona);
        oaiRef.current.push(msg);

        if (msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            let args: any = {};
            try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* noop */ }
            const result = await runCopilotTool(tc.function.name, args, uid, { userSaid: userSaidRef.current });
            oaiRef.current.push({ role: "tool", tool_call_id: tc.id, content: result });
            if (tc.function.name !== "consultar_cadastro") pushDisplay({ role: "action", content: result });
          }
          continue;
        }

        if (msg.content) pushDisplay({ role: "assistant", content: msg.content });
        return msg.content || "";
      }
      return "";
    } catch (e: any) {
      pushDisplay({ role: "assistant", content: `⚠️ ${e.message}` });
      return "";
    } finally {
      setBusy(false);
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || busy || !uid) return;
    setInput("");
    await runAgent(text);
  };

  /* ---------------- VOZ ----------------
   * Preferimos a Realtime API (WebRTC, full-duplex, dá para interromper).
   * Se ela não estiver disponível na conta, caímos automaticamente no loop
   * por turnos (Whisper + TTS), que usa o MESMO agente e as mesmas tools.
   */
  const fallback = useVoiceTurnLoop({
    respond: runAgent,
    onError: (m) => pushDisplay({ role: "assistant", content: `⚠️ Voz: ${m}` }),
  });

  /**
   * Amplitude que a orbe desenha. Chamada uma vez por frame, então lê tudo de
   * ref: quando é a vez do profissional, mede o microfone; no resto, a voz dela.
   */
  const nivelDaOrbe = () => {
    const m = orbEstadoRef.current === "ouvindo" ? medidorMic.current : medidorIA.current;
    return m?.nivel() ?? 0;
  };

  const soltarMedidores = () => {
    medidorIA.current?.parar();
    medidorMic.current?.parar();
    medidorIA.current = null;
    medidorMic.current = null;
  };

  /**
   * Cria (uma vez) o elemento que toca a voz do WebRTC.
   *
   * Chamado DENTRO do clique em "Cadastrar por voz", justamente para destravar
   * o autoplay enquanto o gesto do usuário ainda vale. Sem isso o `play()` do
   * `ontrack` acontecia segundos depois, já fora do gesto, e o navegador
   * bloqueava: a resposta chegava e não saía som nenhum.
   */
  const prepararAudio = (): HTMLAudioElement => {
    let el = audioElRef.current;
    if (!el) {
      el = document.createElement("audio");
      el.autoplay = true;
      (el as any).playsInline = true;
      el.style.display = "none";
      // Precisa estar no documento: elemento solto não toca de forma
      // confiável em vários navegadores, e a voz sumia sem erro nenhum.
      document.body.appendChild(el);
      audioElRef.current = el;
    }
    return el;
  };

  /**
   * Troca o SDP com a OpenAI e devolve a resposta (ou null, com o motivo já
   * registrado). Tenta pelo servidor e, se a function não estiver publicada,
   * cai no POST direto do navegador — que é o caminho da doc.
   */
  const trocarSDP = async (offerSdp: string, token: string, model?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("openai-realtime-sdp", {
        body: { sdp: offerSdp, token, ...(model ? { model } : {}) },
      });
      if (!error && data?.sdp) return data.sdp as string;
      console.warn("[voz] SDP pelo servidor falhou:", data?.error || error?.message, data?.detail ?? "");
      if (data?.error) { setMotivoFallback(`SDP: ${data.error}`); return null; }
    } catch (e: any) {
      console.warn("[voz] edge function de SDP indisponível:", e?.message);
    }

    // A function pode não estar publicada neste ambiente: tenta direto.
    try {
      const url = model
        ? `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`
        : "https://api.openai.com/v1/realtime/calls";
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" },
        body: offerSdp,
      });
      const texto = await resp.text();
      if (resp.ok) return texto;
      console.warn("[voz] SDP recusado:", resp.status, texto.slice(0, 300));
      setMotivoFallback(`SDP ${resp.status}`);
    } catch (e: any) {
      // "Failed to fetch" aqui = o navegador não alcança a OpenAI.
      console.warn("[voz] SDP direto bloqueado:", e?.message);
      setMotivoFallback("navegador bloqueou o acesso à OpenAI");
    }
    return null;
  };

  const startRealtime = async (): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke("openai-realtime-token", {
      // Se o usuário escolheu uma voz de TTS, a Realtime recusa e a edge
      // function cai em cedar sozinha — a conversa ao vivo nunca fica muda
      // por causa da escolha do seletor.
      body: { instructions: VOICE_INSTRUCTIONS, tools: realtimeTools(), voice: voz },
    });
    const ephemeral = data?.client_secret?.value;
    if (error || !ephemeral) {
      const motivo = data?.error || error?.message || "token recusado";
      console.warn("Realtime indisponível:", motivo, data?.attempts ?? "");
      setMotivoFallback(`token: ${motivo}`);
      return false;
    }
    const isGA = data.api === "ga";

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.ontrack = (e) => {
      // O elemento já foi criado e destravado no clique (ver prepararAudio).
      const el = prepararAudio();
      // O WAV vazio do destravamento continua no `src`; sem tirar, alguns
      // navegadores ignoram o srcObject e tocam silêncio.
      el.removeAttribute("src");
      el.srcObject = e.streams[0];
      el.muted = false;
      el.volume = 1;
      console.info("[voz] track de áudio recebido da OpenAI");

      // A orbe ondula a partir deste stream. Se o navegador não alimentar o
      // Web Audio com áudio de WebRTC, ela cai na pulsação sintética sozinha.
      // Continua valendo enquanto o avatar sobe — e é o que aparece se ele não subir.
      medidorIA.current?.parar();
      medidorIA.current = medirStream(e.streams[0]);

      /*
       * Avatar com lip-sync: entregamos o MESMO track ao Simli, que devolve
       * vídeo e áudio sincronizados.
       *
       * Se ele subir, este elemento aqui precisa emudecer na hora — os dois
       * tocando juntos fazem o profissional ouvir cada frase duas vezes, com
       * o atraso do processamento entre elas. Se não subir, nada muda: o áudio
       * direto continua tocando e a chamada segue na orbe.
       */
      if (AVATAR_HABILITADO) {
        void avatar.iniciar(e.track).then((subiu) => {
          if (subiu) {
            el.muted = true;
            console.info("[voz] avatar no ar — áudio direto mutado");
          }
        });
      }

      // O play pode ser recusado se o navegador não considerar o clique como
      // gesto válido. Antes isso morria num warn e parecia "ela não fala":
      // agora aparece um botão para o usuário liberar o som.
      const tentarTocar = () => el.play()
        .then(() => { setAudioBloqueado(false); console.info("[voz] áudio tocando"); })
        .catch((err) => {
          console.warn("[voz] play recusado:", err?.name || err);
          setAudioBloqueado(true);
        });
      el.onloadedmetadata = tentarTocar;
      void tentarTocar();
    };

    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    micRef.current = mic;
    medidorMic.current?.parar();
    medidorMic.current = medirStream(mic);
    mic.getTracks().forEach((t) => pc.addTrack(t, mic));

    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;
    dc.onopen = () => {
      // O formato da sessão mudou na GA: áudio passou a ser aninhado em `audio`.
      const session = isGA
        ? {
            type: "realtime",
            instructions: VOICE_INSTRUCTIONS,
            tools: realtimeTools(),
            tool_choice: "auto",
            // `output_modalities` e a voz PRECISAM ser repetidos aqui. O
            // session.update reescreve a configuração da sessão, e sem estes
            // campos ela volta ao padrão de texto: conecta, transcreve o que
            // você fala, responde por escrito e não sai áudio nenhum.
            output_modalities: ["audio"],
            audio: {
              input: {
                transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
                turn_detection: { type: "semantic_vad", interrupt_response: true },
              },
              output: { voice: data.voice || "cedar" },
            },
          }
        : {
            instructions: VOICE_INSTRUCTIONS,
            tools: realtimeTools(),
            tool_choice: "auto",
            modalities: ["audio", "text"],
            voice: data.voice || "cedar",
            turn_detection: { type: "server_vad" },
            input_audio_transcription: { model: "whisper-1" },
          };
      dc.send(JSON.stringify({ type: "session.update", session }));
      setVoiceStatus("live");
      // Ela abre a conversa falando (ver o pedirResposta logo abaixo).
      setOrbRealtime("falando");

      /*
       * Ela abre a conversa falando, em vez de esperar o profissional começar.
       * É esta a saudação em voz — pela `cedar`, dentro da sessão, e não por
       * TTS. Como o texto já está escrito na tela, ela retoma dali em vez de
       * se apresentar de novo.
       */
      const jaEscrita = saudacaoRef.current.trim();
      pedirResposta(jaEscrita
        ? `Cumprimente o profissional em voz alta agora, em uma frase curta e calorosa, e siga direto para a próxima pergunta do cadastro. Ele JÁ LEU esta mensagem sua na tela, então não a repita: "${jaEscrita}"`
        : "Cumprimente o profissional em voz alta agora, em uma frase curta, diga que vai preencher o cadastro conversando e faça a primeira pergunta.");
    };
    dc.onmessage = (ev) => handleRealtimeEvent(ev.data);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    /*
     * A troca de SDP vai pelo servidor (edge function `openai-realtime-sdp`).
     *
     * O POST direto do navegador para api.openai.com é o caminho da doc e o
     * CORS de lá permite, mas aqui ele morria com "Failed to fetch" — o erro
     * genérico de quando uma extensão, antivírus ou proxy derruba a conexão
     * antes de sair. Pelo Supabase a requisição parte de um domínio que a
     * aplicação já usa, e um erro real chega com status em vez de opaco.
     */
    const modelParam = isGA ? undefined : (data.model || "gpt-4o-realtime-preview");
    const answer = await trocarSDP(offer.sdp || "", ephemeral, modelParam);
    if (!answer) return false;

    await pc.setRemoteDescription({ type: "answer", sdp: answer });
    return true;
  };

  const startVoice = async () => {
    if (!VOZ_HABILITADA || !uid || mode === "voice") return;
    // Os dois destravamentos precisam ser aqui: dentro do gesto do clique,
    // antes de qualquer await. O primeiro libera o áudio do TTS; o segundo
    // libera o elemento que vai tocar a voz do WebRTC lá na frente.
    destravarAudio();
    destravarElemento(prepararAudio());
    pararSaudacao();
    setMode("voice");
    setVoiceStatus("connecting");
    setOrbRealtime("conectando");
    try {
      if (await startRealtime()) return;
    } catch (e: any) {
      console.warn("Realtime falhou:", e);
      setMotivoFallback(e?.name === "NotAllowedError" ? "microfone negado" : (e?.message || "erro no WebRTC"));
    }
    // Realtime fora do ar: limpa o que sobrou e usa o modo por turnos.
    closeRealtime();
    soltarMedidores();
    setEngine("turns");
    const ok = await fallback.start();
    setVoiceStatus(ok ? "live" : "error");
    if (!ok) { setMode("text"); return; }

    /*
     * No fallback a fala sai pelo elemento do TTS, e é dele que a orbe tira a
     * amplitude. Medir aqui, e não antes, é proposital: `medirElemento` desvia
     * o áudio pelo Web Audio, e num AudioContext ainda suspenso isso emudeceria
     * o TTS. Neste ponto ainda estamos dentro do clique do usuário.
     */
    medidorIA.current = medirElemento(elementoDeAudio());
    medidorMic.current = medirStream(fallback.micStream());
  };

  /** Fecha só os recursos de WebRTC (sem mexer no modo da UI). */
  const closeRealtime = () => {
    try { dcRef.current?.close(); } catch { /* noop */ }
    try { pcRef.current?.close(); } catch { /* noop */ }
    micRef.current?.getTracks().forEach((t) => t.stop());
    dcRef.current = null; pcRef.current = null; micRef.current = null;
    // A sessão do Simli é cobrada por minuto: deixar de fechar aqui queimaria
    // saldo com o drawer já encerrado.
    avatar.parar();
    // O áudio direto foi mutado quando o avatar subiu; devolvemos o som para o
    // caso da próxima sessão cair na orbe.
    if (audioElRef.current) audioElRef.current.muted = false;
  };

  /**
   * Pede uma resposta ao modelo SEMPRE declarando saída em áudio.
   *
   * Toda `response.create` precisa passar por aqui. Uma delas ia "pelada"
   * depois de cada tool call e, como a Hunters.IO chama tools a cada turno, a
   * conversa inteira virava texto a partir da primeira chamada — ela ouvia e
   * respondia por escrito, sem áudio nenhum.
   */
  const pedirResposta = (instructions?: string) => {
    audioDoTurno.current = false;
    dcRef.current?.send(JSON.stringify({
      type: "response.create",
      response: { output_modalities: ["audio"], ...(instructions ? { instructions } : {}) },
    }));
  };

  /** Chegou áudio neste turno? Distingue "modelo mudo" de "áudio não tocou". */
  const audioDoTurno = useRef(false);

  const handledCalls = useRef<Set<string>>(new Set());
  /** Na voz a transcrição chega depois do tool call; sem esperar, a trava de
   *  evidência rejeitaria registros legítimos por ainda não ter o texto. */
  const pendingTranscript = useRef(false);

  const aguardarTranscricao = async () => {
    for (let i = 0; i < 15 && pendingTranscript.current; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  /** Executa uma tool pedida pelo modelo e devolve o resultado pelo data channel. */
  const dispatchToolCall = async (name: string, callId: string, rawArgs: string) => {
    if (!name || !callId || handledCalls.current.has(callId)) return;
    handledCalls.current.add(callId);
    setOrbRealtime("pensando");
    await aguardarTranscricao();
    let args: any = {};
    try { args = JSON.parse(rawArgs || "{}"); } catch { /* noop */ }
    const result = uid
      ? await runCopilotTool(name, args, uid, { userSaid: userSaidRef.current })
      : "Sem usuário autenticado.";
    if (name !== "consultar_cadastro") pushDisplay({ role: "action", content: result });
    dcRef.current?.send(JSON.stringify({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output: result },
    }));
    pedirResposta();
  };

  /** Texto de uma resposta da Realtime, seja ela de texto ou transcrição de áudio. */
  const textoDaResposta = (response: any): string =>
    (response?.output ?? [])
      .flatMap((it: any) => it?.content ?? [])
      .map((c: any) => c?.text || c?.transcript || "")
      .join(" ")
      .trim();

  const handleRealtimeEvent = async (raw: string) => {
    let evt: any;
    try { evt = JSON.parse(raw); } catch { return; }

    switch (evt.type) {
      // Tool call — caminho principal.
      case "response.function_call_arguments.done":
        await dispatchToolCall(evt.name, evt.call_id, evt.arguments);
        break;

      // Marca que veio áudio neste turno (nome antigo e nome da GA).
      case "response.audio.delta":
      case "response.output_audio.delta":
        audioDoTurno.current = true;
        setOrbRealtime("falando");
        break;

      // Rede de segurança: se o evento acima mudar de nome, ainda pegamos aqui.
      case "response.done": {
        const items = evt.response?.output ?? [];
        for (const it of items) {
          if (it?.type === "function_call") await dispatchToolCall(it.name, it.call_id, it.arguments);
        }
        /*
         * Respondeu por escrito em vez de falar.
         *
         * Não basta avisar: em modo de voz a resposta TEM que sair em áudio.
         * Então lemos o texto dela pelo TTS. Não é o timbre da voz-a-voz, mas
         * é infinitamente melhor que uma resposta muda — e o console registra
         * para sabermos que a sessão caiu de modalidade.
         */
        const soTool = items.length > 0 && items.every((it: any) => it?.type === "function_call");
        if (!audioDoTurno.current && !soTool && items.length > 0) {
          const mods = evt.response?.output_modalities ?? evt.response?.modalities;
          console.warn("[voz] resposta sem áudio, lendo por TTS. modalities:", mods);
          const texto = textoDaResposta(evt.response);
          if (texto) void dizer(texto);
        }
        // Turno só de tool call não devolve a palavra a ninguém: a resposta
        // falada ainda vem depois, então a orbe segue em "pensando".
        if (!soTool) setOrbRealtime("ouvindo");
        break;
      }

      // Transcrição do que o usuário falou.
      case "input_audio_buffer.speech_started":
        pendingTranscript.current = true;
        setOrbRealtime("ouvindo");
        /*
         * A OpenAI para de gerar quando o profissional fala por cima
         * (semantic_vad + interrupt_response), mas o áudio que já saiu está na
         * fila do Simli — sem isto o avatar terminaria a frase sozinho, falando
         * por cima de quem o interrompeu.
         */
        avatar.interromper();
        break;

      case "conversation.item.input_audio_transcription.completed":
      case "conversation.item.input_audio_transcription.failed":
        pendingTranscript.current = false;
        if (evt.transcript?.trim()) {
          userSaidRef.current.push(evt.transcript.trim());
          pushDisplay({ role: "user", content: evt.transcript.trim() });
        }
        break;

      // Transcrição do que a IA falou (nome antigo e nome da GA).
      case "response.audio_transcript.done":
      case "response.output_audio_transcript.done":
        if (evt.transcript?.trim()) pushDisplay({ role: "assistant", content: evt.transcript.trim() });
        break;

      // Resposta que veio como TEXTO. Sem estes casos ela aparecia no chat
      // apenas se tivesse virado áudio — o texto puro sumia sem rastro.
      case "response.text.done":
      case "response.output_text.done":
        if (evt.text?.trim()) pushDisplay({ role: "assistant", content: evt.text.trim() });
        break;

      // Um parâmetro recusado (voz inexistente, campo fora de formato) chega
      // como `error` e a sessão segue muda. Antes isso morria num console.warn
      // e parecia que "simplesmente não falava" — agora aparece no chat.
      case "error": {
        const e = evt.error ?? {};
        console.warn("Realtime error:", e);
        setOrbRealtime("erro");
        pushDisplay({ role: "assistant", content: `⚠️ Voz: ${e.message || e.code || "erro na sessão"}` });
        break;
      }
    }
  };

  const stopVoice = () => {
    closeRealtime();
    fallback.stop();
    soltarMedidores();
    handledCalls.current.clear();
    setVoiceStatus("idle");
    setOrbRealtime("conectando");
    setEngine("realtime");
    setMotivoFallback(null);
    setMode("text");
  };

  useEffect(() => () => {
    closeRealtime();
    fallback.stop();
    soltarMedidores();
    pararSaudacao();
    audioElRef.current?.remove();
    audioElRef.current = null;
  }, []); // cleanup ao desmontar
  // eslint-disable-next-line react-hooks/exhaustive-deps

  if (!uid) return null;

  const showHero = mode === "text" && display.length <= 1;

  /** Chamada em curso: a tela vira orbe e o chat some até encerrar. */
  const emChamada = mode === "voice" && voiceStatus !== "idle";

  /**
   * Estado visual da orbe. No tempo real vem dos eventos da sessão; no fallback
   * por turnos o `fallback.status` já diz exatamente a mesma coisa.
   */
  const orbEstado: OrbState = (() => {
    if (voiceStatus === "error") return "erro";
    if (voiceStatus === "connecting") return "conectando";
    if (engine === "realtime") return orbRealtime;
    switch (fallback.status) {
      case "listening": return "ouvindo";
      case "thinking":  return "pensando";
      case "speaking":  return "falando";
      case "error":     return "erro";
      default:          return "conectando";
    }
  })();
  orbEstadoRef.current = orbEstado;

  const voiceLabel = (() => {
    if (voiceStatus === "connecting") return "Conectando voz…";
    if (voiceStatus === "error") return "Voz indisponível";
    if (engine === "realtime") return voiceStatus === "live" ? "No ar — pode falar" : "Voz encerrada";
    switch (fallback.status) {
      case "listening": return "Ouvindo — pode falar";
      case "thinking": return "Pensando…";
      case "speaking": return "Respondendo…";
      case "connecting": return "Abrindo o microfone…";
      default: return "Voz encerrada";
    }
  })();

  const QUICK = [
    ...(VOZ_HABILITADA
      ? [{ icon: Mic, label: "Cadastrar por voz", tone: "amber", onClick: () => startVoice() }]
      : [{ icon: Wand2, label: "Cadastre pra mim", tone: "amber", onClick: () => send("Quero que você preencha meu cadastro.") }]),
    { icon: User, label: "Preencher meus dados", tone: "cyan", onClick: () => send("Quero preencher meus dados pessoais.") },
    { icon: BadgeCheck, label: "Minhas certificações", tone: "emerald", onClick: () => send("Vamos cadastrar minhas certificações.") },
    { icon: ListChecks, label: "O que falta?", tone: "blue", onClick: () => send("O que falta para concluir meu cadastro?") },
  ];

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          type="button"
          onClick={() => { destravarAudio(); setOpen(true); }}
          className="fixed bottom-6 right-6 z-50 flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-maritime-blue to-cyan-500 py-1 pl-1 pr-4 text-white shadow-lg shadow-maritime-blue/30 transition-transform hover:scale-105"
        >
          <IOAvatar className="h-10 w-10 border-2 border-white/40" iconClass="h-4 w-4 text-white" />
          <span className="text-[13px] font-semibold">Hunters.IO</span>
        </button>
      )}

      {/* Backdrop mobile */}
      {open && <div className="fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-sm md:hidden" onClick={() => { pararSaudacao(); stopVoice(); setOpen(false); }} />}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-slate-200 text-slate-800 shadow-2xl transition-all duration-500 ease-out",
          open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        )}
      >
        <MaritimeBackdrop />

        <div className="relative z-10 flex h-full flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/70 px-4 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="relative">
                <IOAvatar className="h-8 w-8 ring-1 ring-slate-200" iconClass="h-4 w-4 text-white" />
                {falando && (
                  <span className="absolute -inset-1 animate-ping rounded-full border border-maritime-blue/40" />
                )}
              </span>
              <p className="text-sm font-semibold text-slate-900">Hunters.IO</p>
            </div>
            <div className="flex items-center gap-0.5">
              {VOZ_HABILITADA && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSeletorVozAberto((v) => !v)}
                    className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    title="Trocar a voz da Hunters.IO"
                    aria-haspopup="listbox"
                    aria-expanded={seletorVozAberto}
                  >
                    <AudioLines className="h-4 w-4" />
                    {VOZES.find((v) => v.id === voz)?.nome ?? voz}
                  </button>

                  {seletorVozAberto && (
                    <>
                      {/* Clique fora fecha */}
                      <div className="fixed inset-0 z-10" onClick={() => setSeletorVozAberto(false)} />
                      <ul
                        role="listbox"
                        className="absolute right-0 z-20 mt-1 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                      >
                        {VOZES.map((v) => {
                          const aoVivo = VOZES_REALTIME.includes(v.id);
                          return (
                            <li key={v.id}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={v.id === voz}
                                onClick={() => void trocarVoz(v.id)}
                                className={cn(
                                  "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50",
                                  v.id === voz && "bg-maritime-blue/5",
                                )}
                              >
                                <span className={cn(
                                  "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                  aoVivo ? "bg-emerald-500" : "bg-slate-300",
                                )} />
                                <span className="min-w-0">
                                  <span className="block text-[13px] font-medium text-slate-800">{v.nome}</span>
                                  <span className="block text-[11px] text-slate-500">{v.nota}</span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                        <li className="border-t border-slate-100 px-3 py-2 text-[10px] leading-snug text-slate-400">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
                          Só estas funcionam na conversa ao vivo. As demais valem
                          para a saudação e o ditado; ao vivo, a Cedar assume.
                        </li>
                      </ul>
                    </>
                  )}
                </div>
              )}
              {VOZ_HABILITADA && (
                <button
                  type="button"
                  onClick={alternarSaudacao}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title={saudacaoComVoz ? "Silenciar a saudação falada" : "Deixar a Hunters.IO falar ao abrir"}
                  aria-label={saudacaoComVoz ? "Silenciar a saudação falada" : "Ativar a saudação falada"}
                >
                  {saudacaoComVoz ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => { pararSaudacao(); stopVoice(); setOpen(false); }}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Corpo */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2">
            {emChamada ? (
              /* --- Chamada por voz ---
               * Nada de transcrição ao vivo: só a orbe, o estado e a prova de
               * que o cadastro anda (os selos de campo gravado). A conversa
               * inteira já está em `display` e reaparece escrita ao encerrar.
               */
              <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
                {/*
                  * O vídeo e o áudio do avatar ficam SEMPRE montados: o hook
                  * precisa dos refs já preenchidos quando o track da OpenAI
                  * chega, e renderizar condicionalmente deixaria os dois nulos
                  * justamente na hora de subir a sessão. Quem esconde é o CSS.
                  */}
                <div className="relative flex h-[220px] w-[220px] animate-in fade-in zoom-in-95 items-center justify-center duration-500">
                  <video
                    ref={avatar.videoRef}
                    autoPlay
                    playsInline
                    muted={false}
                    className={cn(
                      "absolute inset-0 h-full w-full rounded-full object-cover shadow-xl ring-2 ring-white transition-opacity duration-500",
                      avatar.status === "live" ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                  />
                  <audio ref={avatar.audioRef} autoPlay className="hidden" />

                  {/* Enquanto o avatar não sobe (ou não vai subir), é a orbe. */}
                  {avatar.status !== "live" && (
                    <VoiceOrb estado={orbEstado} nivel={nivelDaOrbe} tamanho={220} />
                  )}
                </div>

                <p
                  className="mt-2 text-sm font-medium text-slate-700"
                  aria-live="polite"
                >
                  {voiceLabel}
                </p>
                {engine === "turns" && motivoFallback && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    tempo real indisponível ({motivoFallback})
                  </p>
                )}
                {AVATAR_HABILITADO && avatar.status === "error" && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    avatar indisponível ({avatar.motivo() || "erro"}) — seguindo só por voz
                  </p>
                )}

                {/* Selos de campo gravado — só os últimos, para não virar lista */}
                <div className="mt-5 flex min-h-[4.5rem] w-full flex-col items-center gap-1.5">
                  {display
                    .filter((m) => m.role === "action")
                    .slice(-3)
                    .map((m, i, arr) => (
                      <div
                        key={`${i}-${m.content}`}
                        style={{ opacity: 0.45 + (0.55 * (i + 1)) / arr.length }}
                        className="flex w-fit animate-in fade-in slide-in-from-bottom-2 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 duration-300"
                      >
                        <Wand2 className="h-3 w-3 shrink-0" /> {m.content}
                      </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-col items-center gap-2">
                  {/* O navegador recusou tocar o áudio: um clique resolve, mas
                      tem que ser do usuário — por isso um botão, e não um retry. */}
                  {audioBloqueado && (
                    <button
                      type="button"
                      onClick={() => {
                        // Com o avatar no ar quem toca é a mídia do Simli; sem
                        // ele, o elemento do áudio direto. Destrava os dois: só
                        // um vai estar ativo, e errar aqui deixaria a chamada muda.
                        void avatar.videoRef.current?.play().catch(() => { /* noop */ });
                        void avatar.audioRef.current?.play().catch(() => { /* noop */ });
                        audioElRef.current?.play()
                          .then(() => setAudioBloqueado(false))
                          .catch((e) => console.warn("[voz] play ainda recusado:", e));
                        if (avatar.status === "live") setAudioBloqueado(false);
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
                    >
                      <Play className="h-3 w-3" /> Ouvir a Hunters.IO
                    </button>
                  )}

                  {engine === "turns" && fallback.status === "listening" && (
                    <button
                      type="button"
                      onClick={fallback.submitNow}
                      className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-[12px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-white"
                    >
                      Terminei de falar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={stopVoice}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-red-500/25 transition-transform hover:scale-105"
                  >
                    <Square className="h-3.5 w-3.5" /> Encerrar
                  </button>
                  <p className="max-w-[15rem] text-[10px] leading-relaxed text-slate-400">
                    Ao encerrar, a conversa aparece escrita aqui para você conferir.
                  </p>
                </div>
              </div>
            ) : showHero ? (
              <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
                {/* Avatar — pulsa enquanto ela fala */}
                <div className="relative mb-4 animate-in fade-in zoom-in-95 duration-700">
                  <span className="absolute -inset-3 rounded-full bg-cyan-300/25 blur-2xl" />
                  <span
                    className={cn(
                      "absolute -inset-1 rounded-full border border-maritime-blue/30",
                      falando ? "animate-ping" : "animate-pulse",
                    )}
                  />
                  <IOAvatar
                    className="relative h-24 w-24 shadow-xl ring-2 ring-white"
                    iconClass="h-10 w-10 text-white"
                  />
                </div>
                <h2 className="animate-in fade-in slide-in-from-bottom-3 text-xl font-bold tracking-tight text-slate-900 duration-700">
                  Hunters.IO
                </h2>
                <p className="mt-1.5 max-w-[17rem] animate-in fade-in slide-in-from-bottom-4 text-[13px] leading-relaxed text-slate-500 delay-100 duration-700">
                  Me conte sobre você que eu preencho seu cadastro, por texto ou por voz
                </p>

                {/* Acesso rápido */}
                <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
                  {QUICK.map((q, idx) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={q.onClick}
                      style={{ animationDelay: `${150 + idx * 80}ms` }}
                      className="group flex animate-in fade-in slide-in-from-bottom-4 flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white/80 p-2.5 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-maritime-blue/40 hover:bg-white hover:shadow-md"
                    >
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-110", QUICK_TONES[q.tone])}>
                        <q.icon className="h-4 w-4" />
                      </span>
                      <span className="text-[12.5px] font-medium leading-tight text-slate-700">{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-3">
                {display.map((m, i) =>
                  m.role === "action" ? (
                    <div key={i} className="mx-auto flex w-fit animate-in fade-in zoom-in-95 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 duration-300">
                      <Wand2 className="h-3 w-3" /> {m.content}
                    </div>
                  ) : (
                    <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                      {m.role === "assistant" && (
                        <IOAvatar className="h-7 w-7 shrink-0 ring-1 ring-slate-200" iconClass="h-3.5 w-3.5 text-white" />
                      )}
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300",
                        m.role === "user"
                          ? "rounded-br-md bg-gradient-to-br from-maritime-blue to-cyan-500 text-white shadow-sm"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm",
                      )}>
                        {m.content}
                      </div>
                      {m.role === "user" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-maritime-blue">
                          <User className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  ),
                )}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <IOAvatar className="h-7 w-7 ring-1 ring-slate-200" iconClass="h-3.5 w-3.5 text-white" />
                    <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-maritime-blue" /> preenchendo…
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer — escondido na chamada: lá quem manda é a orbe */}
          <div className={cn("relative z-10 shrink-0 p-3", emChamada && "hidden")}>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-1 shadow-sm transition-colors focus-within:border-maritime-blue/50">
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  rows={1}
                  placeholder="Conte sobre você que eu preencho…"
                  disabled={busy}
                  className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || busy}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-maritime-blue text-white transition-all hover:bg-cyan-500 disabled:opacity-30"
                  aria-label="Enviar"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Botão de voz (tempo real) — oculto enquanto a voz está desligada */}
              {VOZ_HABILITADA && (
                <button
                  type="button"
                  onClick={() => (mode === "voice" ? stopVoice() : startVoice())}
                  disabled={busy}
                  title="Conversar por voz (tempo real)"
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105",
                    mode === "voice"
                      ? "bg-red-500 text-white shadow-red-500/25"
                      : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-orange-500/25",
                  )}
                >
                  {mode === "voice" ? <Square className="h-4 w-4" /> : <Waves className="h-4 w-4" />}
                </button>
              )}
            </div>
            <p className="mt-1.5 px-1 text-center text-[10px] text-slate-400">
              O copiloto preenche seu cadastro. Confira os dados na etapa de revisão.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
