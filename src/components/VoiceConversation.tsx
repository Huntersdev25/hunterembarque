/**
 * Modo de voz do assistente do profissional (estilo ChatGPT).
 *
 * Fluxo hands-free: escuta (ElevenLabs Scribe / STT) → detecta silêncio →
 * envia à IA (profile-chat) → fala a resposta (ElevenLabs TTS) → volta a escutar.
 *
 * Reaproveita a infra existente: `useScribe`, edge functions
 * `elevenlabs-scribe-token` e `elevenlabs-tts`.
 */
import { useEffect, useRef, useState } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Mic, X, Loader2, Volume2, AlertCircle, Send } from "lucide-react";

export interface VoiceMsg { role: "user" | "assistant"; content: string }

interface Props {
  open: boolean;
  onClose: () => void;
  /** Histórico atual (para dar memória à IA). */
  getHistory: () => VoiceMsg[];
  /** Registra a troca no chat de texto também. */
  onExchange: (userText: string, aiText: string) => void;
  /** Envia mensagens à IA e devolve o texto completo da resposta. */
  askAI: (msgs: VoiceMsg[]) => Promise<string>;
}

type Status = "connecting" | "listening" | "thinking" | "speaking" | "error";

const SILENCE_MS = 1500;

export function VoiceConversation({ open, onClose, getHistory, onExchange, askAI }: Props) {
  const [status, setStatus] = useState<Status>("connecting");
  const [partial, setPartial] = useState("");
  const [committed, setCommitted] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutedRef = useRef(false);          // ignora captura enquanto pensa/fala
  const committedRef = useRef("");
  const partialRef = useRef("");
  const lastActivityRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const submitRef = useRef<() => void>(() => {});
  const statusRef = useRef<Status>("connecting");

  const setStatusBoth = (s: Status) => { statusRef.current = s; setStatus(s); };

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (d: any) => {
      if (mutedRef.current) return;
      partialRef.current = d.text || "";
      setPartial(partialRef.current);
      lastActivityRef.current = Date.now();
    },
    onCommittedTranscript: (d: any) => {
      if (mutedRef.current) return;
      committedRef.current = (committedRef.current ? committedRef.current + " " : "") + (d.text || "");
      committedRef.current = committedRef.current.trim();
      setCommitted(committedRef.current);
      partialRef.current = "";
      setPartial("");
      lastActivityRef.current = Date.now();
    },
  });

  /* ---- envia o turno atual à IA + fala a resposta ---- */
  const submitTurn = async () => {
    const text = (committedRef.current || partialRef.current).trim();
    if (!text || mutedRef.current) return;
    mutedRef.current = true;
    committedRef.current = "";
    partialRef.current = "";
    setCommitted("");
    setPartial("");
    setStatusBoth("thinking");

    try {
      const msgs = [...getHistory(), { role: "user", content: text } as VoiceMsg];
      const ai = await askAI(msgs);
      onExchange(text, ai);
      setReply(ai);

      setStatusBoth("speaking");
      try {
        const { data } = await supabase.functions.invoke("elevenlabs-tts", { body: { text: ai } });
        if (data?.success && data.audioContent) {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
          audioRef.current = audio;
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve()); // iOS pode bloquear autoplay
          });
        }
      } catch { /* TTS best-effort */ }
    } catch (e: any) {
      setError(e?.message || "Não consegui responder agora.");
    } finally {
      audioRef.current = null;
      mutedRef.current = false;
      lastActivityRef.current = Date.now();
      if (statusRef.current !== "error") setStatusBoth("listening");
    }
  };
  submitRef.current = submitTurn;

  /* ---- conexão ao abrir ---- */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        setStatusBoth("connecting");
        setError(null);
        setReply("");
        committedRef.current = ""; partialRef.current = "";
        setCommitted(""); setPartial("");
        mutedRef.current = false;

        await navigator.mediaDevices.getUserMedia({ audio: true });
        const { data, error: fnErr } = await supabase.functions.invoke("elevenlabs-scribe-token");
        if (fnErr || !data?.token) throw new Error(data?.error || fnErr?.message || "Falha ao obter acesso ao microfone.");
        if (cancelled) return;

        await scribe.connect({
          token: data.token,
          microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) return;
        lastActivityRef.current = Date.now();
        setStatusBoth("listening");
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || "Não foi possível iniciar o modo de voz."); setStatusBoth("error"); }
      }
    })();

    // detector de silêncio: fecha o turno quando o usuário para de falar
    const interval = setInterval(() => {
      if (mutedRef.current || statusRef.current !== "listening") return;
      if (committedRef.current && Date.now() - lastActivityRef.current > SILENCE_MS) {
        submitRef.current();
      }
    }, 250);

    return () => {
      cancelled = true;
      clearInterval(interval);
      try { if (scribe.isConnected) scribe.disconnect(); } catch { /* noop */ }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
  const liveText = partial || committed;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-br from-maritime-blue via-maritime-navy to-slate-900 p-6 text-white">
      {/* topo */}
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-medium text-white/70">Assistente por voz</span>
        <button onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* centro: orbe animada */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="relative flex h-44 w-44 items-center justify-center">
          <span className={cn(
            "absolute inset-0 rounded-full bg-white/10",
            (status === "listening" || status === "speaking") && "animate-ping",
          )} />
          <span className={cn(
            "absolute inset-4 rounded-full bg-white/10",
            status === "speaking" && "animate-pulse",
          )} />
          <div className={cn(
            "relative flex h-28 w-28 items-center justify-center rounded-full shadow-2xl transition-colors",
            status === "error" ? "bg-red-500/80" : "bg-white/15 backdrop-blur",
          )}>
            {status === "thinking" ? (
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            ) : status === "speaking" ? (
              <Volume2 className="h-12 w-12 text-white" />
            ) : status === "error" ? (
              <AlertCircle className="h-12 w-12 text-white" />
            ) : (
              <Mic className="h-12 w-12 text-white" />
            )}
          </div>
        </div>

        <p className="text-lg font-medium text-white/90">{label[status]}</p>

        {/* transcrição / resposta */}
        <div className="min-h-[3rem] max-w-md text-center">
          {error ? (
            <p className="text-sm text-red-200">{error}</p>
          ) : status === "speaking" && reply ? (
            <p className="line-clamp-4 text-sm text-white/80">{reply}</p>
          ) : liveText ? (
            <p className="text-base text-white">{liveText}</p>
          ) : (
            <p className="text-sm text-white/50">
              {status === "listening" ? "Ex.: “Quais vagas combinam comigo?”" : ""}
            </p>
          )}
        </div>
      </div>

      {/* rodapé: ações */}
      <div className="flex w-full items-center justify-center gap-3">
        {status === "listening" && committed && (
          <button
            onClick={() => submitRef.current()}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-maritime-blue shadow-lg transition-transform hover:scale-105"
          >
            <Send className="h-4 w-4" /> Enviar agora
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
