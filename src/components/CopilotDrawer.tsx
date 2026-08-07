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
  openAITools, realtimeTools, runCopilotTool, certCatalogText,
} from "@/lib/copilotTools";
import { HuntersFace } from "@/components/HuntersFace";
import {
  Send, X, Mic, Loader2, User, Wand2, Square,
  Waves, BadgeCheck, ListChecks,
} from "lucide-react";

/* Fallback p/ produção (VITE_* podem não estar no build da Vercel). */
const SUPA_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://augeppwihhzibvhzibxe.supabase.co";
const SUPA_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VwcHdpaGh6aWJ2aHppYnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODA4NDUsImV4cCI6MjA2OTA1Njg0NX0.8RUaODHeXMdRmFSRMaAoWuhnUdH7G0yCLQukqpDdD7w";

/** POST ao onboarding-copilot com timeout + 1 retry (invoke falhava em chamadas repetidas). */
async function callCopilot(messages: any[]): Promise<any> {
  const attempt = async () => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 45000);
    try {
      const resp = await fetch(`${SUPA_URL}/functions/v1/onboarding-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
        body: JSON.stringify({ messages, tools: openAITools(), certCatalog: certCatalogText() }),
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
Ajude o profissional a preencher o cadastro com o mínimo de esforço, usando as ferramentas para preencher os campos.
Comece consultando o cadastro atual. Preencha o que o profissional informar e pergunte, de forma curta, só o que faltar.
Datas em YYYY-MM-DD. gender: masculino|feminino|outro. Uma chamada de definir_certificacao por certificação.
Anexos (currículo/PDF) você não envia — oriente o profissional a anexar. Fale português brasileiro, seja breve e amigável.
Códigos de certificação: ${certCatalogText()}.`;

/* ---------------- Fundo marítimo / offshore ---------------- */
function MaritimeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a2432] via-[#0b2b38] to-[#05121a]" />
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -left-20 bottom-28 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {/* Plataforma offshore (esquerda) */}
        <g stroke="rgba(148,220,245,0.16)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M58 250 L100 470 M142 250 L100 470 M58 250 L142 250" />
          <path d="M62 300 L138 300 M70 360 L130 360 M78 415 L122 415" />
          <path d="M64 250 L136 250 L140 234 L60 234 Z" />
          <path d="M92 234 L100 176 L108 234 M95 214 L105 214 M97 198 L103 198" />
          <path d="M140 240 L162 232 L158 246" />
        </g>
        {/* Embarcação de apoio (direita) */}
        <g stroke="rgba(148,220,245,0.16)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M246 452 L374 452 L360 476 L262 476 Z" />
          <path d="M330 452 L330 424 L360 424 L360 452 M337 431 L337 446 M345 431 L345 446 M353 431 L353 446" />
          <path d="M298 452 L298 428 L280 438" />
        </g>
        {/* Ondas */}
        <g stroke="rgba(148,220,245,0.10)" strokeWidth="1.5" fill="none">
          <path d="M-10 560 Q40 544 90 560 T190 560 T290 560 T410 560" />
          <path className="animate-pulse" d="M-10 588 Q40 572 90 588 T190 588 T290 588 T410 588" />
          <path d="M-10 616 Q40 600 90 616 T190 616 T290 616 T410 616" />
        </g>
      </svg>
    </div>
  );
}

/** Avatar da Hunters.IO usado em todos os pontos do chat. */
const IOAvatar = HuntersFace;

const QUICK_TONES: Record<string, string> = {
  amber: "bg-amber-400/15 text-amber-200",
  cyan: "bg-cyan-400/15 text-cyan-200",
  emerald: "bg-emerald-400/15 text-emerald-200",
  blue: "bg-sky-400/15 text-sky-200",
};

export function CopilotDrawer({ autoOpen = false }: { autoOpen?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");

  const [display, setDisplay] = useState<Display[]>([
    { role: "assistant", content: "Oi! Eu sou a Hunters.IO e preencho seu cadastro pra você. É só me contar sobre você — por exemplo: “Sou marinheiro de convés, moro em Niterói, tenho STCW válido até 2027.”" },
  ]);
  const oaiRef = useRef<OAIMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // voz (WebRTC)
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

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

  const pushDisplay = (d: Display) => setDisplay((p) => [...p, d]);

  /* ---------------- TEXTO: loop de agente ---------------- */
  const send = async (text: string) => {
    if (!text.trim() || busy || !uid) return;
    pushDisplay({ role: "user", content: text.trim() });
    oaiRef.current.push({ role: "user", content: text.trim() });
    setInput("");
    setBusy(true);
    try {
      for (let i = 0; i < 6; i++) {
        const msg = await callCopilot(oaiRef.current);
        oaiRef.current.push(msg);

        if (msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            let args: any = {};
            try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* noop */ }
            const result = await runCopilotTool(tc.function.name, args, uid);
            oaiRef.current.push({ role: "tool", tool_call_id: tc.id, content: result });
            if (tc.function.name !== "consultar_cadastro") pushDisplay({ role: "action", content: result });
          }
          continue;
        }

        if (msg.content) pushDisplay({ role: "assistant", content: msg.content });
        break;
      }
    } catch (e: any) {
      pushDisplay({ role: "assistant", content: `⚠️ ${e.message}` });
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- VOZ: OpenAI Realtime (WebRTC) ---------------- */
  const startVoice = async () => {
    if (!uid) return;
    setMode("voice");
    setVoiceStatus("connecting");
    try {
      const { data, error } = await supabase.functions.invoke("openai-realtime-token", {
        body: { instructions: INSTRUCTIONS, tools: realtimeTools(), voice: "alloy" },
      });
      const ephemeral = data?.client_secret?.value;
      if (error || !ephemeral) throw new Error(data?.error || "Falha ao obter acesso de voz.");
      const model = data.model || "gpt-4o-realtime-preview";

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      if (!audioElRef.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        audioElRef.current = el;
      }
      pc.ontrack = (e) => { if (audioElRef.current) audioElRef.current.srcObject = e.streams[0]; };

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => {
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions: INSTRUCTIONS,
            tools: realtimeTools(),
            tool_choice: "auto",
            turn_detection: { type: "server_vad" },
            input_audio_transcription: { model: "whisper-1" },
          },
        }));
        setVoiceStatus("live");
      };
      dc.onmessage = (ev) => handleRealtimeEvent(ev.data);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ephemeral}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      const answer = await sdpResp.text();
      if (!sdpResp.ok) throw new Error("Falha na conexão de voz.");
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (e: any) {
      pushDisplay({ role: "assistant", content: `⚠️ Voz: ${e.message}` });
      setVoiceStatus("error");
      stopVoice();
    }
  };

  const handleRealtimeEvent = async (raw: string) => {
    let evt: any;
    try { evt = JSON.parse(raw); } catch { return; }

    if (evt.type === "response.function_call_arguments.done") {
      let args: any = {};
      try { args = JSON.parse(evt.arguments || "{}"); } catch { /* noop */ }
      const result = uid ? await runCopilotTool(evt.name, args, uid) : "Sem usuário.";
      if (evt.name !== "consultar_cadastro") pushDisplay({ role: "action", content: result });
      dcRef.current?.send(JSON.stringify({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: evt.call_id, output: result },
      }));
      dcRef.current?.send(JSON.stringify({ type: "response.create" }));
    }
    if (evt.type === "conversation.item.input_audio_transcription.completed" && evt.transcript) {
      pushDisplay({ role: "user", content: evt.transcript.trim() });
    }
    if (evt.type === "response.audio_transcript.done" && evt.transcript) {
      pushDisplay({ role: "assistant", content: evt.transcript.trim() });
    }
  };

  const stopVoice = () => {
    try { dcRef.current?.close(); } catch { /* noop */ }
    try { pcRef.current?.close(); } catch { /* noop */ }
    micRef.current?.getTracks().forEach((t) => t.stop());
    dcRef.current = null; pcRef.current = null; micRef.current = null;
    if (voiceStatus !== "error") setVoiceStatus("idle");
    setMode("text");
  };

  useEffect(() => () => stopVoice(), []); // cleanup ao desmontar
  // eslint-disable-next-line react-hooks/exhaustive-deps

  if (!uid) return null;

  const showHero = mode === "text" && display.length <= 1;

  const QUICK = [
    { icon: Mic, label: "Cadastrar por voz", tone: "amber", onClick: () => startVoice() },
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
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-maritime-blue to-cyan-500 py-1 pl-1 pr-5 text-white shadow-xl shadow-maritime-blue/30 transition-transform hover:scale-105"
        >
          <IOAvatar className="h-11 w-11 border-2 border-white/30" iconClass="h-5 w-5 text-white" />
          <span className="text-sm font-semibold">Hunters.IO</span>
        </button>
      )}

      {/* Backdrop mobile */}
      {open && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => { stopVoice(); setOpen(false); }} />}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden text-white shadow-2xl transition-all duration-500 ease-out",
          open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        )}
      >
        <MaritimeBackdrop />

        <div className="relative z-10 flex h-full flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <IOAvatar className="h-9 w-9 border border-white/20" iconClass="h-4 w-4 text-white" />
              <div>
                <p className="text-sm font-semibold">Hunters.IO</p>
                <p className="text-xs text-cyan-200/70">Sua copiloto de cadastro</p>
              </div>
            </div>
            <button type="button" onClick={() => { stopVoice(); setOpen(false); }} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Corpo */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2">
            {showHero ? (
              <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
                {/* Avatar */}
                <div className="relative mb-5 animate-in fade-in zoom-in-95 duration-700">
                  <span className="absolute -inset-2 rounded-full bg-cyan-400/20 blur-xl" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/10" />
                  <IOAvatar className="relative h-28 w-28 border border-white/20 shadow-2xl" iconClass="h-12 w-12 text-cyan-200" />
                </div>
                <h2 className="animate-in fade-in slide-in-from-bottom-3 text-2xl font-bold tracking-tight duration-700">Hunters.IO</h2>
                <p className="mt-1.5 max-w-xs animate-in fade-in slide-in-from-bottom-4 text-sm text-cyan-100/70 delay-100 duration-700">
                  Me conte sobre você que eu preencho a trilha inteira — por texto ou por voz.
                </p>

                {/* Acesso rápido */}
                <div className="mt-7 grid w-full grid-cols-2 gap-3">
                  {QUICK.map((q, idx) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={q.onClick}
                      style={{ animationDelay: `${150 + idx * 80}ms` }}
                      className="group flex animate-in fade-in slide-in-from-bottom-4 flex-col items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 text-left backdrop-blur-sm transition-all duration-500 hover:border-cyan-300/30 hover:bg-white/[0.1]"
                    >
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", QUICK_TONES[q.tone])}>
                        <q.icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-medium leading-tight">{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-3">
                {display.map((m, i) =>
                  m.role === "action" ? (
                    <div key={i} className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-200">
                      <Wand2 className="h-3 w-3" /> {m.content}
                    </div>
                  ) : (
                    <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                      {m.role === "assistant" && (
                        <IOAvatar className="h-7 w-7 shrink-0 border border-white/15" iconClass="h-3.5 w-3.5 text-cyan-200" />
                      )}
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300",
                        m.role === "user"
                          ? "rounded-br-md bg-gradient-to-br from-maritime-blue to-cyan-500 text-white"
                          : "rounded-bl-md border border-white/10 bg-white/10 text-cyan-50 backdrop-blur-sm",
                      )}>
                        {m.content}
                      </div>
                      {m.role === "user" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/80">
                          <User className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  ),
                )}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-cyan-100/70">
                    <IOAvatar className="h-7 w-7 border border-white/15" iconClass="h-3.5 w-3.5 text-cyan-200" />
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> preenchendo…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra de voz */}
          {mode === "voice" && (
            <div className="mx-3 mb-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur">
              <div className="flex items-center gap-2 text-sm text-cyan-50">
                <IOAvatar
                  className={cn("h-8 w-8 border", voiceStatus === "live" ? "animate-pulse border-amber-300/60" : "border-white/15")}
                  iconClass="h-4 w-4 text-cyan-200"
                />
                <Waves className={cn("h-4 w-4", voiceStatus === "live" ? "animate-pulse text-amber-300" : "text-cyan-200/70")} />
                {voiceStatus === "connecting" ? "Conectando voz…" : voiceStatus === "live" ? "No ar — pode falar" : "Voz encerrada"}
              </div>
              <button type="button" onClick={stopVoice} className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
                <Square className="h-3 w-3" /> Encerrar
              </button>
            </div>
          )}

          {/* Composer */}
          <div className="relative z-10 shrink-0 p-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-1.5 backdrop-blur">
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  rows={1}
                  placeholder="Conte sobre você que eu preencho…"
                  disabled={busy}
                  className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-cyan-100/40 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || busy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-maritime-blue text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

              {/* Botão de voz (tempo real) */}
              <button
                type="button"
                onClick={() => (mode === "voice" ? stopVoice() : startVoice())}
                disabled={busy}
                title="Conversar por voz (tempo real)"
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105",
                  mode === "voice"
                    ? "bg-red-500 text-white shadow-red-500/30"
                    : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-orange-500/30",
                )}
              >
                {mode === "voice" ? <Square className="h-5 w-5" /> : <Waves className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-1.5 px-1 text-center text-[10px] text-cyan-100/40">
              O copiloto preenche seu cadastro. Confira os dados na etapa de revisão.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
