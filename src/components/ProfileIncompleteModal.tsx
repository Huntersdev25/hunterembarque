/**
 * Modal Detalhado de Perfil Incompleto
 * 
 * Exibe informações específicas sobre o que está impedindo
 * o candidato de se candidatar às vagas, incluindo:
 * - Campos obrigatórios do perfil faltantes
 * - Certificações obrigatórias não preenchidas
 * - Certificações vencidas
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useProfileValidation } from '@/hooks/useProfileValidation';
import { AlertCircle, XCircle, Clock, User, FileText, Award, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileIncompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  certifications: any;
  availableJobs?: Array<{
    id: string;
    title: string;
    required_certifications_list: string[];
  }>;
}

/**
 * Componente principal do modal de perfil incompleto
 * Mostra detalhes específicos sobre impedimentos para candidatura
 */
export const ProfileIncompleteModal = ({
  open,
  onOpenChange,
  profile,
  certifications,
  availableJobs = []
}: ProfileIncompleteModalProps) => {
  const navigate = useNavigate();
  const { validateForJobApplication, basicValidation } = useProfileValidation({
    profile,
    certifications
  });

  /**
   * Coleta todas as certificações obrigatórias de todas as vagas ativas
   * Remove duplicatas para mostrar uma lista única
   */
  const getAllRequiredCertifications = () => {
    const allRequiredCerts = new Set<string>();
    
    availableJobs.forEach(job => {
      if (job.required_certifications_list) {
        job.required_certifications_list.forEach(cert => {
          allRequiredCerts.add(cert);
        });
      }
    });
    
    return Array.from(allRequiredCerts);
  };

  /**
   * Valida certificações considerando todas as vagas disponíveis
   */
  const getGlobalCertificationValidation = () => {
    const allRequiredCerts = getAllRequiredCertifications();
    return validateForJobApplication(allRequiredCerts);
  };

  const globalValidation = getGlobalCertificationValidation();

  /**
   * Navega para a página de configurações e fecha o modal
   */
  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate('/settings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            Perfil Incompleto
          </DialogTitle>
          <DialogDescription className="text-base">
            Para se candidatar às vagas disponíveis, você precisa completar as informações abaixo:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Geral */}
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <strong>Candidatura bloqueada:</strong> Seu perfil possui informações pendentes que impedem a candidatura.
            </AlertDescription>
          </Alert>

          {/* Campos do Perfil Faltantes */}
          {basicValidation.missingFields.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Informações Pessoais Pendentes</h3>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  Complete os seguintes campos obrigatórios em seu perfil:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {basicValidation.missingFields.map((field, index) => (
                    <Badge key={index} variant="outline" className="justify-start">
                      <XCircle className="h-3 w-3 mr-1 text-red-500" />
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Certificações Faltantes */}
          {globalValidation.missingCertifications.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Certificações Obrigatórias Faltantes</h3>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 mb-3">
                  As seguintes certificações são exigidas por uma ou mais vagas ativas:
                </p>
                <div className="space-y-2">
                  {globalValidation.missingCertifications.map((cert, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-amber-300">
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-amber-900">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Certificações Vencidas */}
          {/* Nota: Esta funcionalidade seria implementada expandindo a validação para incluir certificações vencidas globalmente */}

          {/* Impacto nas Vagas */}
          {availableJobs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Impacto nas Vagas Disponíveis</h3>
              </div>
              <div className="space-y-3">
                {availableJobs.slice(0, 5).map((job) => {
                  const jobValidation = validateForJobApplication(job.required_certifications_list || []);
                  return (
                    <div key={job.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{job.title}</h4>
                        <Badge variant={jobValidation.canApplyToJob ? "default" : "secondary"}>
                          {jobValidation.canApplyToJob ? "Elegível" : "Bloqueado"}
                        </Badge>
                      </div>
                      {!jobValidation.canApplyToJob && (
                        <p className="text-xs text-muted-foreground">
                          {jobValidation.validationMessage}
                        </p>
                      )}
                    </div>
                  );
                })}
                {availableJobs.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    ... e mais {availableJobs.length - 5} vaga(s)
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleGoToSettings} 
              className="flex-1"
              size="lg"
            >
              <User className="h-4 w-4 mr-2" />
              Completar Perfil
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Fechar
            </Button>
          </div>

          {/* Dica de Navegação */}
          <Alert className="border-blue-200 bg-blue-50">
            <ExternalLink className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Dica:</strong> Acesse "Configurações" no menu para completar seu perfil e certificações.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};