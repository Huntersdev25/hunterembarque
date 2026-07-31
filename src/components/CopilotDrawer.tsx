/**
 * Copiloto de Cadastro — drawer lateral global do profissional.
 *
 * Texto: loop de agente (edge fn onboarding-copilot) que executa TOOLS para
 *        preencher o cadastro ao vivo (via copilotTools).
 * Voz:   OpenAI Realtime API (WebRTC), em tempo real, com as MESMAS tools.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  openAITools, realtimeTools, runCopilotTool, certCatalogText,
} from "@/lib/copilotTools";
import {
  Sparkles, Send, X, Mic, Loader2, User, Wand2, Radio, Square,
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

const INSTRUCTIONS = `Você é o Copiloto de Cadastro da Hunters Manpower (recrutamento marítimo/offshore).
Ajude o profissional a preencher o cadastro com o mínimo de esforço, usando as ferramentas para preencher os campos.
Comece consultando o cadastro atual. Preencha o que o profissional informar e pergunte, de forma curta, só o que faltar.
Datas em YYYY-MM-DD. gender: masculino|feminino|outro. Uma chamada de definir_certificacao por certificação.
Anexos (currículo/PDF) você não envia — oriente o profissional a anexar. Fale português brasileiro, seja breve e amigável.
Códigos de certificação: ${certCatalogText()}.`;

export function CopilotDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");

  const [display, setDisplay] = useState<Display[]>([
    { role: "assistant", content: "Oi! Eu preencho seu cadastro pra você. É só me contar sobre você — por exemplo: “Sou marinheiro de convés, moro em Niterói, tenho STCW válido até 2027.”" },
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
          continue; // deixa o modelo seguir com o resultado das tools
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

      // áudio remoto (voz da IA)
      if (!audioElRef.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        audioElRef.current = el;
      }
      pc.ontrack = (e) => { if (audioElRef.current) audioElRef.current.srcObject = e.streams[0]; };

      // microfone
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      // canal de eventos (tools + transcrições)
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

    // a IA pediu uma tool
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
    // transcrições (para mostrar no chat)
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

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-maritime-blue px-5 text-white shadow-xl transition-transform hover:scale-105"
        >
          <Wand2 className="h-5 w-5" />
          <span className="text-sm font-semibold">Copiloto</span>
        </button>
      )}

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-50 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-md flex-col border-l bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-maritime-blue p-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Copiloto de Cadastro</p>
              <p className="text-xs text-white/70">Eu preencho pra você</p>
            </div>
          </div>
          <button type="button" onClick={() => { stopVoice(); setOpen(false); }} className="rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
          {display.map((m, i) =>
            m.role === "action" ? (
              <div key={i} className="mx-auto flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Wand2 className="h-3 w-3" /> {m.content}
              </div>
            ) : (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-maritime-blue/10">
                    <Sparkles className="h-3.5 w-3.5 text-maritime-blue" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                  m.role === "user" ? "rounded-br-md bg-maritime-blue text-white" : "rounded-bl-md border bg-card shadow-sm",
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> preenchendo…
            </div>
          )}
        </div>

        {/* Barra de voz em tempo real */}
        {mode === "voice" && (
          <div className="flex items-center justify-between gap-3 border-t bg-maritime-blue/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Radio className={cn("h-4 w-4", voiceStatus === "live" ? "animate-pulse text-red-500" : "text-muted-foreground")} />
              {voiceStatus === "connecting" ? "Conectando voz…" : voiceStatus === "live" ? "No ar — pode falar" : "Voz encerrada"}
            </div>
            <button type="button" onClick={stopVoice} className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
              <Square className="h-3 w-3" /> Encerrar
            </button>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t bg-card p-3">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => (mode === "voice" ? stopVoice() : startVoice())}
              disabled={busy}
              title="Conversar por voz (tempo real)"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                mode === "voice" ? "border-red-300 bg-red-50 text-red-600 dark:bg-red-950/30" : "border-maritime-blue/30 text-maritime-blue hover:bg-maritime-blue/10",
              )}
            >
              <Mic className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Conte sobre você que eu preencho…"
              disabled={busy}
              className="max-h-32 flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-maritime-blue/50 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || busy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-maritime-blue text-white hover:bg-maritime-navy disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
