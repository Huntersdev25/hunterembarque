/**
 * Componente de Botão de Candidatura Inteligente
 * 
 * Funcionalidades:
 * - Valida automaticamente se o candidato pode se candidatar à vaga
 * - Exibe alertas informativos sobre impedimentos
 * - Gerencia estado de carregamento durante candidatura
 * - Verifica certificações obrigatórias da vaga
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useProfileValidation } from '@/hooks/useProfileValidation';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QuickProfileCompletionModal } from './QuickProfileCompletionModal';

// Mapeamento das certificações com nomes atualizados
const CERTIFICATION_LABELS = {
  cir: 'CIR – Carteira de Inscrição e Registro',
  stcw: 'STCW – International Convention on Standards of Training, Certification and Watchkeeping for Seafarers',
  caaq: 'CAAQ – Curso de Adaptação para Aquaviários',
  tbs1: 'TBS1 – Treinamento Básico de Segurança e Instrução',
  espe: 'ESPE – Especial básico de sobrevivência Pessoal',
  esrs: 'ESRS – Especial básico de Responsabilidade Social',
  ebps: 'EBPS – Especial básico de primeiros socorros',
  ecin: 'ECIN – Especial básico de Combate a Incêndio',
  ecia_caci: 'ECIA/CACI – Especial Avançado de Combate a Incêndio',
  eopn: 'EOPN – Especial para Oficiais de Proteção de Navio',
  ebcp: 'EBCP – Especial Básico de Conscientização Sobre Proteção de Navio',
  epsm: 'ESPM – Especial Avançado Primeiros Socorros',
  thuet: 'THUET – Treinamento em Escape de Helicópteros Submersos em Águas Tropicais',
  cbsp: 'CBSP – Curso Básico de Segurança de Plataforma',
  cess: 'CESS – Curso Especial de Embarcações de Sobrevivência e Salvamento',
  cerr: 'CERR – Curso Especial de Embarcação Rápida de Resgate',
  efnt: 'EFNT – Especial de Familiarização de Navios Tanques',
  ebpq: 'EBPQ – Especial Básico de Navios Tanques Petroleiros e para Produtos Químicos',
  ebgl: 'EBGL – Especial Básico de Navio Tanque para Gás Liquefeito',
  esop: 'ESOP – Especial de Segurança em Operações de Carga',
  bco: 'BCO – Curso de Operador de Controle de Lastro',
  dp: 'DP – Dynamic Positioning (Nível Básico, Nível Avançado, Ilimitado)',
  alph: 'ALPH – Curso de Manobra e Combate a Incêndio de Aviação',
  cpso: 'CPSO – Curso de Primeiros Socorros',
  cipn: 'CIPN – Curso Intermediário de Proteção de Navio',
  ticb: 'TICB – Treinamento Intermediário para Condutores de Baleeiras',
  epoe: 'EPOE – Especial de Operador em ECDIS',
  epor: 'EPOR – Especial Prático de Operador Radar',
  gmdss: 'GMDSS – Rádio Comunicação',
  cns014: 'CNS 14 – Rádio Operador',
  lpna: 'LPNA – Licença de Pessoal de Navegação Aérea',
  ht: 'HT – Habilitação Técnica',
  cft: 'CFT – Certificação de Familiarização Técnica'
};

interface JobApplicationButtonProps {
  jobId: string;
  jobTitle: string;
  jobFunctionName: string;
  requiredCertifications?: string[];
  profile: any;
  certifications: any;
  hasApplied: boolean;
  onApply: (jobId: string) => Promise<void>;
  disabled?: boolean;
  userId: string;
  fetchUserProfile?: () => Promise<void>;
  fetchUserCertifications?: () => Promise<void>;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "maritime";
}

/**
 * Componente principal do botão de candidatura
 * Integra validação de perfil e certificações para permitir/bloquear candidaturas
 */
export const JobApplicationButton = ({
  jobId,
  jobTitle,
  jobFunctionName,
  requiredCertifications = [],
  profile,
  certifications,
  hasApplied,
  onApply,
  disabled = false,
  userId,
  fetchUserProfile,
  fetchUserCertifications,
  className = "",
  variant = "default"
}: JobApplicationButtonProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const [showQuickCompletion, setShowQuickCompletion] = useState(false);
  const { toast } = useToast();
  
  // Hook personalizado para validação de perfil e certificações
  const { validateForJobApplication } = useProfileValidation({
    profile,
    certifications
  });

  // Verifica se a função corresponde
  const jobFunctionMatches = profile?.desired_function && 
    profile.desired_function.toLowerCase().trim() === jobFunctionName.toLowerCase().trim();

  // Executa validação completa para esta vaga específica
  const validation = validateForJobApplication(requiredCertifications);
  
  // Combina validação de função com validação de perfil/certificações
  const canApply = jobFunctionMatches && validation.canApplyToJob;

  /**
   * Manipula o processo de candidatura
   * Se o perfil estiver incompleto, abre modal de completamento rápido
   */
  const handleApply = async () => {
    // Verifica se a função corresponde
    if (!jobFunctionMatches) {
      toast({
        title: "Função incompatível",
        description: `Esta vaga é para ${jobFunctionName}, mas sua função desejada é ${profile?.desired_function || 'não definida'}. Você não pode se candidatar a esta vaga.`,
        variant: "destructive",
      });
      return;
    }
    
    if (!canApply) {
      // Se há certificações OU campos pessoais faltando, abre modal de completamento
      if (validation.missingCertifications.length > 0 || validation.missingFields.length > 0) {
        setShowQuickCompletion(true);
        return;
      }
      
      // Se há algum outro problema, mostra erro
      toast({
        title: "Candidatura não permitida",
        description: validation.validationMessage,
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      await onApply(jobId);
      // Disparar webhook n8n (não bloqueia o fluxo se falhar)
      supabase.functions.invoke('notify-job-application', {
        body: { job_id: jobId, candidate_id: userId },
      }).catch((err) => console.warn('Webhook notify-job-application falhou:', err));
      toast({
        title: "Candidatura enviada!",
        description: `Sua candidatura para ${jobTitle} foi enviada com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao se candidatar:', error);
      toast({
        title: "Erro na candidatura",
        description: "Houve um erro ao enviar sua candidatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * Manipula a conclusão do completamento rápido
   * Automaticamente executa a candidatura após salvar
   */
  const handleQuickCompletionComplete = async () => {
    // Aguardar um momento para garantir que o perfil seja atualizado no cache
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Após salvar as informações, executar a candidatura automaticamente
    setIsApplying(true);
    try {
      await onApply(jobId);
      // Disparar webhook n8n (não bloqueia o fluxo se falhar)
      supabase.functions.invoke('notify-job-application', {
        body: { job_id: jobId, candidate_id: userId },
      }).catch((err) => console.warn('Webhook notify-job-application falhou:', err));
      // Note: o onApply já deve incluir o refresh dos dados no JobDetails
    } catch (error) {
      console.error('Erro ao se candidatar após completar perfil:', error);
      toast({
        title: "Perfil salvo, mas erro na candidatura",
        description: "Suas informações foram salvas, mas houve um erro ao enviar a candidatura. Tente se candidatar novamente.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * Renderiza o status da candidatura
   * Mostra diferentes badges baseados no estado atual
   */
  const renderApplicationStatus = () => {
    if (hasApplied) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Candidatura enviada
        </Badge>
      );
    }

    if (!validation.canApplyToJob) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Perfil incompleto
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Apto para candidatura
      </Badge>
    );
  };

  /**
   * Renderiza o conteúdo do alerta de validação
   * Mostra detalhes sobre campos faltantes ou certificações pendentes
   */
  const renderValidationAlert = () => {
    if (validation.canApplyToJob) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {validation.validationMessage}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Para se candidatar, você precisa:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {validation.missingFields.map((field, index) => (
                <li key={index}>Preencher: {field}</li>
              ))}
              {validation.missingCertifications.map((cert, index) => (
                <li key={index}>Obter certificação: {cert}</li>
              ))}
            </ul>
            <p className="text-sm mt-2">
              Complete seu perfil na aba "Configurações" antes de se candidatar.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // Se já se candidatou, mostra apenas o botão desativado
  if (hasApplied) {
    return (
      <Button 
        className={`w-full ${className}`}
        variant="outline"
        disabled
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Candidatura enviada
      </Button>
    );
  }

  // Sempre mostra o botão disponível - lógica de completamento é interna
  if (!validation.canApplyToJob) {
    return (
      <div className="w-full"
>
        
        <Button 
          className={`w-full ${className}`}
          variant={variant}
          onClick={handleApply}
          disabled={disabled || isApplying}
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando candidatura...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Candidatar-se
            </>
          )}
        </Button>

        <QuickProfileCompletionModal
          open={showQuickCompletion}
          onOpenChange={setShowQuickCompletion}
          jobTitle={jobTitle}
          jobId={jobId}
          missingCertifications={validation.missingCertifications}
          missingProfileFields={validation.missingFields}
          onComplete={handleQuickCompletionComplete}
          onApply={onApply} // Passar função de candidatura direta
          onProfileUpdate={async () => {
            // Refresh profile and certifications to update validation status
            if (fetchUserProfile) await fetchUserProfile();
            if (fetchUserCertifications) await fetchUserCertifications();
          }}
          userId={userId}
        />
      </div>
    );
  }

  // Se pode se candidatar, mostra botão ativo com confirmação
  return (
    <div className="w-full"
>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            className={`w-full ${className}`}
            variant={variant}
            disabled={disabled || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando candidatura...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Candidatar-se
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Candidatura</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Você está prestes a se candidatar para a vaga:
                  <strong className="block mt-1">{jobTitle}</strong>
                </p>
                
                {renderValidationAlert()}
                
                {requiredCertifications.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      Certificações obrigatórias para esta vaga:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {requiredCertifications.map((cert, index) => {
                        const hasValid = certifications[cert] === true;
                        const validityDate = certifications[`${cert}_validity`];
                        const isExpired = validityDate ? new Date(validityDate) < new Date() : false;
                        
                         const certLabel = CERTIFICATION_LABELS[cert as keyof typeof CERTIFICATION_LABELS] || cert.toUpperCase();
                         
                         return (
                           <Badge 
                             key={index}
                             variant={hasValid && !isExpired ? "default" : "secondary"}
                             className={hasValid && !isExpired ? "bg-green-100 text-green-800" : ""}
                             title={certLabel}
                           >
                             {cert.toUpperCase()}
                             {hasValid && !isExpired && <CheckCircle2 className="h-3 w-3 ml-1" />}
                           </Badge>
                         );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleApply} disabled={isApplying}>
              {isApplying ? "Enviando..." : "Confirmar Candidatura"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};