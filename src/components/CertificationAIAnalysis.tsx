import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, RefreshCw, AlertTriangle, Volume2, VolumeX, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CertificationData {
  name: string;
  label: string;
  validity: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isIndeterminate?: boolean;
}

interface CertificationAIAnalysisProps {
  certifications: CertificationData[];
  profileName?: string;
}

export function CertificationAIAnalysis({ certifications, profileName }: CertificationAIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const certData = certifications.map(c => ({
        nome: c.label,
        validade: c.validity || "Não informada",
        vencida: c.isExpired,
        vencendo_em_30_dias: c.isExpiringSoon,
        indeterminada: c.isIndeterminate || false,
      }));

      const { data, error: fnError } = await supabase.functions.invoke('analyze-certifications', {
        body: { certifications: certData, profileName },
      });

      if (fnError) throw fnError;

      if (!data?.success || data?.error) {
        setError(data?.error || "Erro ao gerar análise.");
      } else {
        setAnalysis(data.analysis);
      }
    } catch (err: any) {
      console.error("AI analysis error:", err);
      setError(err.message || "Erro ao gerar análise. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!analysis) return;

    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoadingAudio(true);

    try {
      // Clean text: remove emojis and markdown for cleaner TTS
      const cleanText = analysis
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim();

      const { data, error: fnError } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text: cleanText },
      });

      if (fnError) throw fnError;

      if (!data?.success || !data?.audioContent) {
        toast({
          title: "Erro ao gerar áudio",
          description: data?.error || "Não foi possível gerar o áudio.",
          variant: "destructive",
        });
        return;
      }

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast({
          title: "Erro de reprodução",
          description: "Não foi possível reproduzir o áudio.",
          variant: "destructive",
        });
      };

      await audio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.error("TTS error:", err);
      toast({
        title: "Erro",
        description: "Falha ao gerar voz. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-violet-600" />
          </div>
          Assistente de Certificações
          <Sparkles className="h-4 w-4 text-violet-500" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!analysis && !loading && !error && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              A IA pode analisar suas certificações e informar quais estão vencidas, prestes a vencer, ou em dia.
            </p>
            <Button
              onClick={handleAnalyze}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Analisar Certificações
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6 gap-3">
            <RefreshCw className="h-5 w-5 text-violet-600 animate-spin" />
            <span className="text-sm text-muted-foreground">Analisando suas certificações...</span>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="ghost" size="sm" onClick={handleAnalyze} className="mt-2 text-xs">
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {analysis && (
          <div className="space-y-3">
            <div className={cn(
              "prose prose-sm max-w-none text-foreground",
              "dark:prose-invert",
              "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2",
              "[&_strong]:text-foreground",
            )}>
              {analysis.split('\n').map((paragraph, i) => (
                paragraph.trim() ? <p key={i}>{paragraph}</p> : null
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayAudio}
                disabled={isLoadingAudio}
                className={cn(
                  "text-xs gap-1.5",
                  isPlaying 
                    ? "text-violet-700 bg-violet-100 hover:bg-violet-200 dark:text-violet-300 dark:bg-violet-900/40" 
                    : "text-violet-600 hover:text-violet-700"
                )}
              >
                {isLoadingAudio ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isPlaying ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                {isLoadingAudio ? "Gerando voz..." : isPlaying ? "Parar" : "Ouvir análise"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleAnalyze} className="text-xs text-violet-600 hover:text-violet-700">
                <RefreshCw className="h-3 w-3 mr-1" />
                Atualizar análise
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
