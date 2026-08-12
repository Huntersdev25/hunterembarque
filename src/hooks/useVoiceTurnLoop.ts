/**
 * Conversa por voz em turnos (fallback quando a Realtime API não está disponível).
 *
 * grava (MediaRecorder) → detecta silêncio (Web Audio) → transcreve
 * (openai-transcribe) → `respond()` → fala a resposta (TTS) → volta a gravar.
 *
 * Diferente da Realtime API não há interrupção no meio da fala, e o timbre é o
 * do TTS e não o da voz-para-voz; em compensação a conversa é contínua e
 * hands-free, com o mesmo agente e as mesmas tools.
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { falar } from "@/lib/speak";
import { rmsDe } from "@/lib/audioLevel";

export type VoiceLoopStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

const SILENCE_MS = 1200;     // silêncio que fecha o turno
const SPEECH_RMS = 0.02;     // limiar de "está falando"
const MIN_SPEECH_MS = 350;   // ignora estalos e ruídos curtos

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

interface Options {
  /** Recebe o que o usuário falou e devolve o texto que a IA deve falar de volta. */
  respond: (userText: string) => Promise<string>;
  onUserText?: (text: string) => void;
  onError?: (message: string) => void;
}

export function useVoiceTurnLoop({ respond, onUserText, onError }: Options) {
  const [status, setStatus] = useState<VoiceLoopStatus>("idle");
  const statusRef = useRef<VoiceLoopStatus>("idle");
  const setBoth = (s: VoiceLoopStatus) => { statusRef.current = s; setStatus(s); };

  const aliveRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef("");
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const respondRef = useRef(respond);
  respondRef.current = respond;

  /* refs para as funções mutuamente recursivas (listen → handle → listen) */
  const listenRef = useRef<() => void>(() => {});

  const monitor = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (statusRef.current !== "listening" || stoppingRef.current) return;
      analyser.getByteTimeDomainData(buf);
      const rms = rmsDe(buf);
      const now = performance.now();

      if (rms > SPEECH_RMS) {
        if (speechStartRef.current === null) speechStartRef.current = now;
        silenceStartRef.current = null;
      } else if (speechStartRef.current !== null) {
        if (silenceStartRef.current === null) silenceStartRef.current = now;
        else if (now - silenceStartRef.current > SILENCE_MS && now - speechStartRef.current > MIN_SPEECH_MS) {
          stoppingRef.current = true;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          try { if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop(); } catch { /* noop */ }
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleRecorded = useCallback(async () => {
    if (!aliveRef.current) return;
    const hadSpeech = speechStartRef.current !== null;
    const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
    if (!hadSpeech || blob.size < 1200) { listenRef.current(); return; }

    setBoth("thinking");
    try {
      const audioBase64 = await blobToBase64(blob);
      const { data: tr } = await supabase.functions.invoke("openai-transcribe", {
        body: { audioBase64, mimeType: blob.type },
      });
      const text: string = (tr?.text || "").trim();
      if (!tr?.success || !text) { if (aliveRef.current) listenRef.current(); return; }
      onUserText?.(text);

      const answer = await respondRef.current(text);
      if (!aliveRef.current) return;

      if (answer) {
        setBoth("speaking");
        // Best-effort: sem áudio a resposta ainda aparece escrita no chat.
        await falar(answer, (audio) => { audioRef.current = audio; });
        audioRef.current = null;
      }
    } catch (e: any) {
      onError?.(e?.message || "Não consegui responder agora.");
      setBoth("error");
      return;
    }
    if (aliveRef.current) listenRef.current();
  }, [onUserText, onError]);

  const listen = useCallback(() => {
    if (!streamRef.current || !aliveRef.current) return;
    stoppingRef.current = false;
    speechStartRef.current = null;
    silenceStartRef.current = null;
    chunksRef.current = [];

    const rec = new MediaRecorder(streamRef.current, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => { void handleRecorded(); };
    rec.start();
    setBoth("listening");
    monitor();
  }, [handleRecorded, monitor]);
  listenRef.current = listen;

  const stop = useCallback(() => {
    aliveRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    streamRef.current = null; recorderRef.current = null; analyserRef.current = null; ctxRef.current = null;
    setBoth("idle");
  }, []);

  const start = useCallback(async () => {
    aliveRef.current = true;
    setBoth("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mimeRef.current = pickMimeType();

      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      listen();
      return true;
    } catch (e: any) {
      onError?.(e?.name === "NotAllowedError"
        ? "Permita o acesso ao microfone para conversar por voz."
        : (e?.message || "Não foi possível iniciar o modo de voz."));
      setBoth("error");
      aliveRef.current = false;
      return false;
    }
  }, [listen, onError]);

  /** Encerra o turno na hora, sem esperar o silêncio. */
  const submitNow = useCallback(() => {
    if (statusRef.current !== "listening" || stoppingRef.current) return;
    stoppingRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop(); } catch { /* noop */ }
  }, []);

  /** Stream do microfone, para quem quiser medir a amplitude (orbe da voz). */
  const micStream = useCallback(() => streamRef.current, []);

  return { status, start, stop, submitNow, micStream };
}
