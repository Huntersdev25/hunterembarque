/**
 * Avatar com lip-sync da Hunters.IO (Simli).
 *
 * O fluxo é: a Realtime API da OpenAI devolve um track de áudio por WebRTC →
 * esse track é entregue ao Simli → o Simli devolve **vídeo e áudio já
 * sincronizados**, que é o que o profissional vê e ouve.
 *
 * Consequência que não dá para esquecer: a partir do momento em que o avatar
 * sobe, quem toca o som é o `<audio>` DAQUI. O elemento que recebe o track
 * direto da OpenAI precisa ser mutado pelo chamador, senão a mesma frase sai
 * duas vezes, defasada.
 *
 * Nada aqui é obrigatório para a conversa funcionar: qualquer falha devolve
 * `false` e a chamada segue com a orbe e o áudio direto.
 */
import { useCallback, useRef, useState } from "react";
// Só o TIPO é importado no topo — `import type` some no build. A classe entra
// por `import()` dentro do `iniciar`, porque o `simli-client` arrasta o
// `livekit-client` junto (~470 kB) e ninguém deveria baixar isso para abrir um
// chat de texto.
//
// O caminho profundo é de propósito: o `dist/index.js` publicado faz
// `require("./Client")` mas o arquivo que vem no pacote é `client.js`, em
// minúsculas. No Windows passa; no Linux da Vercel o build quebraria.
import type { SimliClient } from "simli-client/dist/client";
import { supabase } from "@/integrations/supabase/client";

export type AvatarStatus = "off" | "connecting" | "live" | "error";

/** Tempo máximo esperando o Simli subir antes de desistir e usar a orbe. */
const TIMEOUT_MS = 20000;

export function useSimliAvatar() {
  const [status, setStatus] = useState<AvatarStatus>("off");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const clientRef = useRef<SimliClient | null>(null);
  /** Motivo da falha, para aparecer no diagnóstico junto do motivo da voz. */
  const motivoRef = useRef<string | null>(null);

  const parar = useCallback(() => {
    const c = clientRef.current;
    clientRef.current = null;
    // `stop()` é async e o SimliClient não é reutilizável — não dá para esperar
    // aqui (isto roda em cleanup síncrono), então só disparamos.
    if (c) { void Promise.resolve(c.stop()).catch(() => { /* já caiu */ }); }
    setStatus("off");
  }, []);

  /** Faz o avatar calar na hora — usado quando o profissional interrompe. */
  const interromper = useCallback(() => {
    try { clientRef.current?.ClearBuffer(); } catch { /* sessão já fechada */ }
  }, []);

  /**
   * Sobe o avatar e passa a alimentá-lo com o track de áudio da OpenAI.
   * Devolve `true` só se o vídeo realmente entrou no ar.
   */
  const iniciar = useCallback(async (track: MediaStreamTrack): Promise<boolean> => {
    // `ontrack` pode disparar mais de uma vez na mesma sessão; a segunda não
    // abre outro cliente (nem outra cobrança).
    if (clientRef.current) return false;
    if (!videoRef.current || !audioRef.current) {
      motivoRef.current = "elementos de vídeo não montados";
      return false;
    }

    setStatus("connecting");
    motivoRef.current = null;

    try {
      const { data, error } = await supabase.functions.invoke("simli-token");
      const token: string | undefined = data?.token;
      if (error || !token) {
        motivoRef.current = data?.error || error?.message || "token recusado";
        console.warn("[avatar] Simli indisponível:", motivoRef.current, data?.detail ?? "");
        setStatus("error");
        return false;
      }

      const { SimliClient: Cliente } = await import("simli-client/dist/client");

      // iceServers = null porque o transporte padrão é o livekit; o modo p2p
      // exigiria servidores de ICE, que só saem com a API key em mãos.
      const client = new Cliente(token, videoRef.current, audioRef.current, null);
      clientRef.current = client;

      client.on("startup_error", (m: string) => {
        motivoRef.current = m;
        console.warn("[avatar] startup_error:", m);
      });
      client.on("error", (m: string) => console.warn("[avatar] erro:", m));

      // O `start()` do SimliClient tem retry interno e pode demorar; sem um
      // teto próprio a chamada ficaria presa em "conectando" indefinidamente.
      await Promise.race([
        client.start(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), TIMEOUT_MS)),
      ]);

      // A ordem importa: só faz sentido despejar áudio depois da sessão de pé.
      client.listenToMediastreamTrack(track);
      setStatus("live");
      return true;
    } catch (e: any) {
      motivoRef.current = motivoRef.current || e?.message || "falha ao conectar";
      console.warn("[avatar] não subiu:", motivoRef.current);
      parar();
      setStatus("error");
      return false;
    }
  }, [parar]);

  return {
    status,
    videoRef,
    audioRef,
    motivo: () => motivoRef.current,
    iniciar,
    interromper,
    parar,
  };
}
