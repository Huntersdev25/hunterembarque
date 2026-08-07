/**
 * Modo de voz do assistente do profissional (estilo ChatGPT) — 100% OpenAI.
 *
 * Fluxo hands-free:
 *   grava (MediaRecorder) → detecta silêncio (Web Audio) → transcreve (OpenAI Whisper)
 *   → IA (profile-chat) → fala a resposta (OpenAI TTS) → volta a gravar.
 *
 * Edge functions: `openai-transcribe` e `openai-tts` (ambas leem o secret OPENAI_API).
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { falar, calar } from "@/lib/speak";
import { cn } from "@/lib/utils";
import { Mic, X, Loader2, Volume2, AlertCircle, Send } from "lucide-react";

export interface VoiceMsg { role: "user" | "assistant"; content: string }

interface Props {
  open: boolean;
  onClose: () => void;
  getHistory: () => VoiceMsg[];
  onExchange: (userText: string, aiText: string) => void;
  askAI: (msgs: VoiceMsg[]) => Promise<string>;
}

type Status = "connecting" | "listening" | "thinking" | "speaking" | "error";

const SILENCE_MS = 1300;      // silêncio que fecha o turno
const SPEECH_RMS = 0.02;      // limiar de "está falando"
const MIN_SPEECH_MS = 350;    // ignora ruídos muito curtos

function pickMimeType(): string {
  const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of cands) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function VoiceConversation({ open, onClose, getHistory, onExchange, askAI }: Props) {
  const [status, setStatus] = useState<Status>("connecting");
  const [reply, setReply] = useState("");
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<Status>("connecting");
  const setStatusBoth = (s: Status) => { statusRef.current = s; setStatus(s); };

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const aliveRef = useRef(true);

  /* ---- captura de um turno ---- */
  const startListening = () => {
    if (!streamRef.current || !aliveRef.current) return;
    stoppingRef.current = false;
    speechStartRef.current = null;
    silenceStartRef.current = null;
    chunksRef.current = [];
    setHeard("");

    const rec = new MediaRecorder(streamRef.current, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => { void handleRecorded(); };
    rec.start();
    setStatusBoth("listening");
    monitor();
  };

  const stopListening = () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch { /* noop */ }
  };

  /* ---- loop de detecção de fala/silêncio ---- */
  const monitor = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (statusRef.current !== "listening" || stoppingRef.current) return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();

      if (rms > SPEECH_RMS) {
        if (speechStartRef.current === null) speechStartRef.current = now;
        silenceStartRef.current = null;
      } else if (speechStartRef.current !== null) {
        if (silenceStartRef.current === null) silenceStartRef.current = now;
        else if (now - silenceStartRef.current > SILENCE_MS && now - speechStartRef.current > MIN_SPEECH_MS) {
          stopListening();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  /* ---- áudio gravado → transcreve → IA → fala ---- */
  const handleRecorded = async () => {
    if (!aliveRef.current) return;
    const hadSpeech = speechStartRef.current !== null;
    const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
    if (!hadSpeech || blob.size < 1200) { startListening(); return; } // nada dito

    setStatusBoth("thinking");
    try {
      const audioBase64 = await blobToBase64(blob);
      const { data: tr } = await supabase.functions.invoke("openai-transcribe", {
        body: { audioBase64, mimeType: blob.type },
      });
      const text: string = (tr?.text || "").trim();
      if (!tr?.success || !text) { if (aliveRef.current) startListening(); return; }
      setHeard(text);

      const ai = await askAI([...getHistory(), { role: "user", content: text }]);
      onExchange(text, ai);
      setReply(ai);

      setStatusBoth("speaking");
      // Cascata de provedores + voz do navegador como último recurso: antes isso
      // dependia só da openai-tts e, com ela fora do ar, a resposta vinha muda.
      await falar(ai, (audio) => { audioRef.current = audio; });
      audioRef.current = null;
    } catch (e: any) {
      setError(e?.message || "Não consegui responder agora.");
      setStatusBoth("error");
      return;
    }
    if (aliveRef.current) startListening();
  };

  /* ---- abertura / limpeza ---- */
  useEffect(() => {
    if (!open) return;
    aliveRef.current = true;
    (async () => {
      try {
        setStatusBoth("connecting");
        setError(null); setReply(""); setHeard("");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        mimeRef.current = pickMimeType();

        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;

        startListening();
      } catch (e: any) {
        setError(e?.name === "NotAllowedError"
          ? "Permita o acesso ao microfone para conversar por voz."
          : (e?.message || "Não foi possível iniciar o modo de voz."));
        setStatusBoth("error");
      }
    })();

    return () => {
      aliveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch { /* noop */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      calar(audioRef.current);
      audioRef.current = null;
      streamRef.current = null; recorderRef.current = null; analyserRef.current = null; audioCtxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const label: Record<Status, string> = {
    connecting: "Conectando ao microfone…",
    listening: "Ouvindo… pode falar",
    thinking: "Pensando…",
    speaking: "Respondendo…",
    error: "Ops, algo deu errado",
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-br from-maritime-blue via-maritime-navy to-slate-900 p-6 text-white">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-medium text-white/70">Assistente por voz</span>
        <button onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <span className={cn("absolute inset-0 rounded-full bg-white/10",
            (status === "listening" || status === "speaking") && "animate-ping")} />
          <span className={cn("absolute inset-4 rounded-full bg-white/10", status === "speaking" && "animate-pulse")} />
          <div className={cn(
            "relative flex h-28 w-28 items-center justify-center rounded-full shadow-2xl transition-colors",
            status === "error" ? "bg-red-500/80" : "bg-white/15 backdrop-blur",
          )}>
            {status === "thinking" ? <Loader2 className="h-12 w-12 animate-spin text-white" />
              : status === "speaking" ? <Volume2 className="h-12 w-12 text-white" />
              : status === "error" ? <AlertCircle className="h-12 w-12 text-white" />
              : <Mic className="h-12 w-12 text-white" />}
          </div>
        </div>

        <p className="text-lg font-medium text-white/90">{label[status]}</p>

        <div className="min-h-[3rem] max-w-md text-center">
          {error ? (
            <p className="text-sm text-red-200">{error}</p>
          ) : status === "speaking" && reply ? (
            <p className="line-clamp-4 text-sm text-white/80">{reply}</p>
          ) : heard ? (
            <p className="text-base text-white">{heard}</p>
          ) : (
            <p className="text-sm text-white/50">{status === "listening" ? "Ex.: “Quais vagas combinam comigo?”" : ""}</p>
          )}
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-3">
        {status === "listening" && (
          <button
            onClick={stopListening}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-maritime-blue shadow-lg transition-transform hover:scale-105"
          >
            <Send className="h-4 w-4" /> Enviar agora
          </button>
        )}
        {status === "error" && (
          <button
            onClick={() => { setError(null); startListening(); }}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-maritime-blue shadow-lg hover:scale-105"
          >
            <Mic className="h-4 w-4" /> Tentar de novo
          </button>
        )}
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <X className="h-4 w-4" /> Encerrar conversa
        </button>
      </div>
    </div>
  );
}
