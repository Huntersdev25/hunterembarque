/**
 * Modal de Preenchimento Assistido por Voz
 * Usa ElevenLabs Scribe v2 Realtime para transcrição precisa e estável
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mic, 
  MicOff, 
  SkipForward, 
  Check, 
  X, 
  Volume2,
  ChevronRight,
  AlertCircle,
  Loader2
} from "lucide-react";

interface VoiceField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'date' | 'currency' | 'phone' | 'cpf' | 'select';
  options?: string[];
  currentValue?: string;
}

interface VoiceAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: VoiceField[];
  onFieldUpdate: (key: string, value: string) => void;
  onComplete: () => void;
}

export function VoiceAssistantModal({
  open,
  onOpenChange,
  fields,
  onFieldUpdate,
  onComplete,
}: VoiceAssistantModalProps) {
  const { toast } = useToast();
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // ElevenLabs Scribe hook
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      console.log("Partial transcript:", data.text);
    },
    onCommittedTranscript: (data) => {
      console.log("Committed transcript:", data.text);
      setTranscript(prev => {
        const newText = prev ? prev + ' ' + data.text : data.text;
        return newText.trim();
      });
    },
  });

  // Filtrar apenas campos vazios
  const emptyFields = fields.filter(f => !f.currentValue || f.currentValue.trim() === '');
  const currentField = emptyFields[currentFieldIndex];
  const progress = emptyFields.length > 0 
    ? Math.round(((currentFieldIndex) / emptyFields.length) * 100) 
    : 100;

  // Verificar permissão do microfone
  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionGranted(false);
      setError('Permissão do microfone negada. Por favor, permita o acesso ao microfone.');
      return false;
    }
  };

  // Inicializar Speech Synthesis para instruções
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Falar instrução do campo atual
  const speakInstruction = useCallback((text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  }, []);

  // Quando mudar de campo, falar a instrução
  useEffect(() => {
    if (open && currentField && permissionGranted) {
      setTranscript("");
      
      const timer = setTimeout(() => {
        const instruction = `Diga ${currentField.label}`;
        speakInstruction(instruction);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [currentFieldIndex, open, currentField, speakInstruction, permissionGranted]);

  // Reset quando modal abre/fecha
  useEffect(() => {
    if (open) {
      checkMicrophonePermission();
    } else {
      setCurrentFieldIndex(0);
      setTranscript("");
      setError(null);
      
      // Disconnect scribe if connected
      if (scribe.isConnected) {
        scribe.disconnect();
      }
      
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    }
  }, [open]);

  const startListening = async () => {
    if (scribe.isConnected || isConnecting) return;

    // Verificar permissão primeiro
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) return;

    setTranscript("");
    setError(null);
    setIsConnecting(true);

    try {
      console.log("Fetching ElevenLabs scribe token...");
      
      // Get token from edge function
      const { data, error: fnError } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (fnError || !data?.token) {
        console.error("Token error:", fnError, data);
        throw new Error(fnError?.message || data?.error || 'Falha ao obter token de transcrição');
      }

      console.log("Token obtained, connecting to scribe...");

      // Connect to ElevenLabs Scribe
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("Connected to ElevenLabs Scribe successfully");
      
    } catch (err: any) {
      console.error("Error starting scribe:", err);
      setError(err.message || 'Erro ao conectar com serviço de transcrição');
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Falha ao iniciar reconhecimento de voz",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const stopListening = () => {
    if (scribe.isConnected) {
      scribe.disconnect();
    }
  };

  const processTranscript = (rawText: string): string => {
    let processed = rawText.trim();
    
    if (currentField?.type === 'date') {
      const months: { [key: string]: string } = {
        'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
        'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
        'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
      };
      
      const dateMatch = processed.match(/(\d{1,2})\s*(?:de\s+)?(\w+)\s*(?:de\s+)?(\d{4})/i);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const monthName = dateMatch[2].toLowerCase();
        const year = dateMatch[3];
        const month = months[monthName] || '01';
        processed = `${day}/${month}/${year}`;
      }
    } else if (currentField?.type === 'currency') {
      const numbers = processed.replace(/\D/g, '');
      if (numbers) {
        const value = parseInt(numbers);
        processed = value.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
      }
    } else if (currentField?.type === 'phone') {
      const numbers = processed.replace(/\D/g, '');
      if (numbers.length >= 10) {
        processed = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
      }
    } else if (currentField?.type === 'cpf') {
      const numbers = processed.replace(/\D/g, '');
      if (numbers.length === 11) {
        processed = `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
      }
    }
    
    return processed;
  };

  const confirmValue = () => {
    if (!currentField || !transcript.trim()) return;
    
    stopListening();
    
    const processedValue = processTranscript(transcript);
    onFieldUpdate(currentField.key, processedValue);
    
    toast({
      title: "Campo preenchido",
      description: `${currentField.label}: ${processedValue}`,
    });

    if (currentFieldIndex < emptyFields.length - 1) {
      setCurrentFieldIndex(prev => prev + 1);
      setTranscript("");
    } else {
      speakInstruction("Todos os campos foram preenchidos!");
      setTimeout(() => {
        onComplete();
        onOpenChange(false);
      }, 1500);
    }
  };

  const skipField = () => {
    stopListening();
    
    if (currentFieldIndex < emptyFields.length - 1) {
      setCurrentFieldIndex(prev => prev + 1);
      setTranscript("");
    } else {
      onComplete();
      onOpenChange(false);
    }
  };

  const clearTranscript = () => {
    setTranscript("");
  };

  // Combinar transcript do state com partialTranscript do scribe
  const displayTranscript = transcript;
  const displayPartial = scribe.partialTranscript || "";

  if (emptyFields.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Perfil Completo!
            </DialogTitle>
            <DialogDescription>
              Todos os campos do seu perfil já estão preenchidos.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Preenchimento por Voz
          </DialogTitle>
          <DialogDescription>
            Clique no microfone, fale e confirme
          </DialogDescription>
        </DialogHeader>

        {/* Erro */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Campo {currentFieldIndex + 1} de {emptyFields.length}</span>
            <span>{progress}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Campo atual */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-sm font-medium">
              {currentField?.label}
            </Badge>
            {isSpeaking && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Volume2 className="h-3 w-3 animate-pulse" />
                Falando...
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {currentField?.placeholder}
          </p>

          {/* Área de transcrição */}
          <div className="min-h-[80px] bg-background rounded-md p-4 border-2 border-dashed relative">
            {displayTranscript || displayPartial ? (
              <div>
                <p className="text-foreground text-lg">{displayTranscript}</p>
                {displayPartial && (
                  <p className="text-muted-foreground text-lg italic">{displayPartial}</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isConnecting 
                  ? "🔄 Conectando ao serviço..."
                  : scribe.isConnected 
                    ? "🎙️ Ouvindo... fale agora" 
                    : "Clique no botão do microfone para começar"}
              </p>
            )}
            
            {scribe.isConnected && (
              <div className="absolute bottom-2 right-2 flex gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-6">
          {/* Botão de pular */}
          <Button
            variant="ghost"
            size="icon"
            onClick={skipField}
            className="h-12 w-12 rounded-full"
          >
            <SkipForward className="h-5 w-5" />
          </Button>

          {/* Botão do microfone */}
          <Button
            variant={scribe.isConnected ? "destructive" : "default"}
            size="icon"
            onClick={scribe.isConnected ? stopListening : startListening}
            disabled={isConnecting}
            className={`h-16 w-16 rounded-full transition-all ${
              scribe.isConnected ? "bg-red-500 hover:bg-red-600" : ""
            }`}
          >
            {isConnecting ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : scribe.isConnected ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>

          {/* Botão de confirmar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={confirmValue}
            disabled={!transcript.trim()}
            className="h-12 w-12 rounded-full text-green-500 hover:text-green-600 hover:bg-green-50"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>

        {/* Ações adicionais */}
        <div className="flex justify-center gap-4">
          {transcript && (
            <Button variant="outline" size="sm" onClick={clearTranscript}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Dicas */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Fale claramente próximo ao microfone</p>
          <p className="flex items-center justify-center gap-1">
            <ChevronRight className="h-3 w-3" />
            Após falar, clique no ✓ para confirmar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
