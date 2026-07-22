/**
 * Modal de Completamento Rápido de Perfil
 * 
 * Permite que o usuário complete certificações e informações pessoais diretamente
 * durante o processo de candidatura, sem sair da página da vaga
 */
import { useState, useEffect } from 'react';
import * as React from 'react';
import { 
  MobileDialog as Dialog, 
  MobileDialogContent as DialogContent, 
  MobileDialogDescription as DialogDescription, 
  MobileDialogHeader as DialogHeader, 
  MobileDialogTitle as DialogTitle, 
  MobileDialogFooter as DialogFooter 
} from '@/components/ui/mobile-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatPhoneBR } from '@/lib/phoneFormat';
import { isValidCPF, formatCPF } from '@/lib/validators';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { STCWRules } from '@/components/STCWRules';
import { JobFunctionSelector } from '@/components/JobFunctionSelector';

const CERTIFICATION_LABELS = {
  cir: 'CIR – Carteira de Inscrição e Registro',
  stcw: 'STCW – Convenção Internacional sobre Padrões de Treinamento',
  caaq: 'CAAQ – Curso de Adaptação para Aquaviários',
  tbs1: 'TBS1 – Treinamento Básico de Segurança',
  espe: 'ESPE – Especial básico de Sobrevivência Pessoal',
  esrs: 'ESRS – Especial básico de Responsabilidade Social',
  ebps: 'EBPS – Especial básico de Primeiros Socorros',
  ecin: 'ECIN – Especial básico de Combate a Incêndio',
  ecia_caci: 'ECIA/CACI – Especial Avançado de Combate a Incêndio',
  eopn: 'EOPN – Especial para Oficiais de Proteção de Navio',
  ebcp: 'EBCP – Especial Básico de Conscientização Sobre Proteção',
  epsm: 'EPSM – Especial Avançado Primeiros Socorros',
  thuet: 'THUET – Treinamento em Escape de Helicópteros Submersos',
  cbsp: 'CBSP – Curso Básico de Segurança de Plataforma',
  cess: 'CESS – Curso Especial de Embarcações de Sobrevivência',
  cerr: 'CERR – Curso Especial de Embarcação Rápida de Resgate',
  efnt: 'EFNT – Especial de Familiarização de Navios Tanques',
  ebpq: 'EBPQ – Especial Básico de Navios Tanques Petroleiros',
  ebgl: 'EBGL – Especial Básico de Navio Tanque para Gás Liquefeito',
  esop: 'ESOP – Especial de Segurança em Operações de Carga',
  alph: 'ALPH – Curso de Manobra e Combate a Incêndio de Aviação',
  cns014: 'CNS 14 – Rádio Operador',
  lpn: 'LPN – Licença de Pessoal de Navegação',
  gmdss: 'GMDSS – Rádio Comunicação',
  cft: 'CFT – Certificação de Familiarização Técnica',
  dp: 'DP – Dynamic Positioning'
};

interface QuickProfileCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  jobId: string; // Adicionar jobId para candidatura direta
  missingCertifications: string[];
  missingProfileFields: string[];
  onComplete: () => Promise<void> | void;
  onProfileUpdate?: () => Promise<void> | void; // Callback to refresh parent data
  onApply?: (jobId: string) => Promise<void>; // Função de candidatura direta
  userId: string;
}

export const QuickProfileCompletionModal = ({
  open,
  onOpenChange,
  jobTitle,
  jobId,
  missingCertifications,
  missingProfileFields,
  onComplete,
  onProfileUpdate,
  onApply,
  userId
}: QuickProfileCompletionModalProps) => {
  const [certificationStates, setCertificationStates] = useState<Record<string, boolean>>({});
  const [validityDates, setValidityDates] = useState<Record<string, string>>({});
  const [issueDates, setIssueDates] = useState<Record<string, string>>({});
  const [indeterminateCerts, setIndeterminateCerts] = useState<Record<string, boolean>>({});
  const [dpLevels, setDpLevels] = useState<Record<string, { basico: boolean; avancado: boolean; ilimitado: boolean }>>({});
  const [stcwRules, setStcwRules] = useState<string[]>([]);
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '',
    phone: '',
    city: '',
    cpf: '',
    desired_function: ''
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Carregar dados atuais do usuário
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId || !open) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, city, cpf, desired_function')
          .eq('user_id', userId)
          .single();

        if (profile) {
          setPersonalInfo({
            full_name: profile.full_name || '',
            phone: profile.phone || '',
            city: profile.city || '',
            cpf: profile.cpf || '',
            desired_function: profile.desired_function || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserData();
  }, [userId, open]);

  const handleCertificationChange = (cert: string, checked: boolean) => {
    setCertificationStates(prev => ({
      ...prev,
      [cert]: checked
    }));
    
    // Se desmarcou, remove a data de validade
    if (!checked) {
      setValidityDates(prev => {
        const newDates = { ...prev };
        delete newDates[cert];
        return newDates;
      });
    }
  };

  const handleValidityDateChange = (cert: string, dateString: string) => {
    // Permitir digitação livre, validar apenas quando campo está completo
    if (dateString.length === 10 && !validateDateFormat(dateString)) {
      toast({
        variant: "destructive",
        title: "Formato de data inválido",
        description: "Use o formato DD/MM/YYYY"
      });
      return;
    }
    
    // Validação adicional para datas de validade não serem anteriores às de emissão
    if (dateString.length === 10) {
      const issueDate = issueDates[cert];
      if (issueDate && issueDate.length === 10 && !validateDateRange(issueDate, dateString)) {
        toast({
          variant: "destructive",
          title: "Data inválida",
          description: "A data de validade não pode ser anterior à data de emissão"
        });
        return;
      }
    }
    
    setValidityDates(prev => ({
      ...prev,
      [cert]: dateString
    }));
  };

  const handleIssueDateChange = (cert: string, dateString: string) => {
    // Permitir digitação livre, validar apenas quando campo está completo
    if (dateString.length === 10 && !validateDateFormat(dateString)) {
      toast({
        variant: "destructive", 
        title: "Formato de data inválido",
        description: "Use o formato DD/MM/YYYY"
      });
      return;
    }
    
    setIssueDates(prev => ({
      ...prev,
      [cert]: dateString
    }));
  };

  const validateDateFormat = (dateString: string): boolean => {
    if (!dateString) return true; // Empty is valid
    
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Verificar se é uma data válida
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day &&
           day >= 1 && day <= 31 &&
           month >= 1 && month <= 12;
  };

  const validateDateRange = (issueDateStr: string, validityDateStr: string): boolean => {
    if (!issueDateStr || !validityDateStr) return true;
    
    const parseDate = (dateStr: string) => {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    };
    
    const issueDate = parseDate(issueDateStr);
    const validityDate = parseDate(validityDateStr);
    
    return validityDate >= issueDate;
  };

  const handlePersonalInfoChange = (field: string, value: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSTCWRulesChange = (rules: string[]) => {
    setStcwRules(rules);
  };

  const handleDpLevelChange = (certCode: string, level: 'basico' | 'avancado' | 'ilimitado', checked: boolean) => {
    setDpLevels(prev => ({
      ...prev,
      [certCode]: {
        ...prev[certCode],
        [level]: checked
      }
    }));
  };

  const handleIndeterminateChange = (certCode: string, isIndeterminate: boolean) => {
    setIndeterminateCerts(prev => ({
      ...prev,
      [certCode]: isIndeterminate
    }));
    
    // Se for indeterminada, limpar a data de validade
    if (isIndeterminate) {
      setValidityDates(prev => {
        const newDates = { ...prev };
        delete newDates[certCode];
        return newDates;
      });
    }
  };

  const handleSave = async (event?: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    // Prevenir duplicação de eventos no mobile
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('🚀 [MOBILE DEBUG] handleSave iniciado', {
      userAgent: navigator.userAgent,
      touchSupport: 'ontouchstart' in window,
      canProceed,
      saving,
      timestamp: new Date().toISOString()
    });
    
    if (saving) {
      console.log('⚠️ [MOBILE DEBUG] Salvamento já em andamento, ignorando');
      return;
    }
    
    if (!canProceed) {
      console.log('⚠️ [MOBILE DEBUG] canProceed é false, validando razões:', {
        personalInfoComplete,
        certificationsComplete,
        missingProfileFields,
        missingCertifications
      });
      return;
    }
    
    setSaving(true);
    try {
      // Validar campos obrigatórios de informações pessoais - essenciais para candidatura
      const missingPersonalFields = [];
      const requiredPersonalFields = [
        { key: 'full_name', label: 'Nome completo' },
        { key: 'phone', label: 'Telefone' },
        { key: 'city', label: 'Cidade' },
        { key: 'cpf', label: 'CPF' },
        { key: 'desired_function', label: 'Função desejada' }
      ];

      // Se não há campos pessoais em missing, mas alguns estão vazios, é um novo usuário - validar os essenciais
      const isNewUser = !personalInfo.full_name && !personalInfo.phone && !personalInfo.city && !personalInfo.cpf && !personalInfo.desired_function;
      
      requiredPersonalFields.forEach(field => {
        const value = personalInfo[field.key as keyof typeof personalInfo];
        const isMissing = missingProfileFields.includes(field.label);

        if ((isMissing || isNewUser) && (!value || !value.trim())) {
          missingPersonalFields.push(field.label);
        }
      });

      // Validar dígitos do CPF quando preenchido
      if (personalInfo.cpf && personalInfo.cpf.trim() && !isValidCPF(personalInfo.cpf)) {
        missingPersonalFields.push('CPF inválido');
      }

      // Validar certificações obrigatórias
      const missingCertData = [];
      const dateValidationErrors = [];
      
      // Converter nomes completos das certificações para códigos - mapeamento robusto
      const certificationCodeMap: Record<string, string> = {};
      Object.entries(CERTIFICATION_LABELS).forEach(([code, label]) => {
        // Adicionar mapeamento com label exato
        certificationCodeMap[label] = code;
        // Adicionar mapeamento case-insensitive  
        certificationCodeMap[label.toLowerCase()] = code;
        // Adicionar mapeamento apenas com o código em maiúsculo (ex: "CIR")
        certificationCodeMap[code.toUpperCase()] = code;
      });

      console.log('🔍 Missing certifications received:', missingCertifications);
      console.log('🗺️ Certification code map:', certificationCodeMap);

      // Validar certificações baseado nos códigos
      missingCertifications.forEach(certName => {
        const certCode = certificationCodeMap[certName] || 
                        certificationCodeMap[certName.toLowerCase()] || 
                        certName.toLowerCase().split(' ')[0]; // pega primeira palavra como último recurso
        
        console.log(`🔄 Mapping "${certName}" to code "${certCode}"`);
        const isChecked = certificationStates[certCode];
        
        if (isChecked) {
          const issueDate = issueDates[certCode];
          const validityDate = validityDates[certCode];
          
          if (!issueDate) {
            missingCertData.push(`Data de emissão para ${certName}`);
          }
          // Só exigir data de validade se não for indeterminada
          if (!validityDate && !indeterminateCerts[certCode]) {
            missingCertData.push(`Data de validade para ${certName}`);
          }
          
            // Validar se data de validade não é anterior à de emissão - apenas se ambas estão preenchidas
            if (issueDate && validityDate) {
              const parseDate = (dateStr: string) => {
                const [day, month, year] = dateStr.split('/').map(Number);
                return new Date(year, month - 1, day);
              };
              
              const issue = parseDate(issueDate);
              const validity = parseDate(validityDate);
              
              if (validity < issue) {
                dateValidationErrors.push(`A data de validade não pode ser anterior à data de emissão para ${certName}`);
              }
            }
          
          if (certCode === 'stcw' && stcwRules.length === 0) {
            missingCertData.push('Regras STCW para certificação STCW');
          }
        }
      });

      // Verificar se há algum erro de validação
      if (missingPersonalFields.length > 0 || missingCertData.length > 0 || dateValidationErrors.length > 0) {
        const allErrors = [...missingPersonalFields, ...missingCertData, ...dateValidationErrors];
        toast({
          variant: "destructive",
          title: "Campos obrigatórios ou erros de validação",
          description: allErrors.join('. '),
        });
        return;
      }

      // Preparar dados das certificações usando códigos corretos
      const certificationData: Record<string, any> = {};
      
      Object.entries(certificationStates).forEach(([certCode, checked]) => {
        certificationData[certCode] = checked;
        
        // Adicionar data de emissão se existe
        if (checked && issueDates[certCode]) {
          // Converter DD/MM/YYYY para YYYY-MM-DD
          const [day, month, year] = issueDates[certCode].split('/');
          certificationData[`${certCode}_issue_date`] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Adicionar data de validade se existe e não é indeterminada
        if (checked && validityDates[certCode] && !indeterminateCerts[certCode]) {
          // Converter DD/MM/YYYY para YYYY-MM-DD
          const [day, month, year] = validityDates[certCode].split('/');
          certificationData[`${certCode}_validity`] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        
        // Adicionar níveis DP se for certificação DP
        if (checked && certCode === 'dp' && dpLevels[certCode]) {
          certificationData[`${certCode}_dp_basico`] = dpLevels[certCode].basico;
          certificationData[`${certCode}_dp_avancado`] = dpLevels[certCode].avancado;
          certificationData[`${certCode}_dp_ilimitado`] = dpLevels[certCode].ilimitado;
        }
      });

      // Adicionar regras STCW se marcadas
      if (certificationStates.stcw && stcwRules.length > 0) {
        certificationData.stcw_rules = stcwRules.join(', ');
      }

      // Preparar dados do perfil - apenas salvar campos que foram alterados ou são obrigatórios
      const profileData: Record<string, any> = {};
      requiredPersonalFields.forEach(({ key, label }) => {
        const value = personalInfo[key as keyof typeof personalInfo];
        const isMissing = missingProfileFields.includes(label);
        
        if ((isMissing || isNewUser || value) && value && value.trim()) {
          profileData[key] = value.trim();
        }
      });

      // Se necessário, marcar perfil como completo se todos os campos básicos foram preenchidos
      if (Object.keys(profileData).length > 0) {
        // Verificar se agora temos todos os campos básicos
        const hasAllBasicFields = requiredPersonalFields.every(({ key }) => {
          const value = personalInfo[key as keyof typeof personalInfo];
          return value && value.trim();
        });
        
        if (hasAllBasicFields) {
          profileData.profile_complete = true;
        }
      }

      // Salvar certificações primeiro
      if (Object.keys(certificationData).length > 0) {
        console.log('💾 [MOBILE DEBUG] Salvando certificações:', {
          data: certificationData,
          userId,
          timestamp: new Date().toISOString()
        });
        
        const { data: certResult, error: certError } = await supabase
          .from('certifications')
          .upsert({ user_id: userId, ...certificationData }, { onConflict: 'user_id' });

        console.log('📊 [MOBILE DEBUG] Resultado salvamento certificações:', {
          data: certResult,
          error: certError,
          timestamp: new Date().toISOString()
        });

        if (certError) {
          console.error('❌ [MOBILE DEBUG] Erro detalhado ao salvar certificações:', {
            error: certError,
            code: certError.code,
            message: certError.message,
            details: certError.details,
            hint: certError.hint
          });
          throw new Error(`Erro ao salvar certificações: ${certError.message} (Código: ${certError.code})`);
        }
        console.log('✅ [MOBILE DEBUG] Certificações salvas com sucesso');
      }

      // Salvar dados do perfil
      if (Object.keys(profileData).length > 0) {
        console.log('💾 [MOBILE DEBUG] Salvando perfil:', {
          data: profileData,
          userId,
          timestamp: new Date().toISOString()
        });
        
        const { data: profileResult, error: profileError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', userId);

        console.log('📊 [MOBILE DEBUG] Resultado salvamento perfil:', {
          data: profileResult,
          error: profileError,
          timestamp: new Date().toISOString()
        });

        if (profileError) {
          console.error('❌ [MOBILE DEBUG] Erro detalhado ao salvar perfil:', {
            error: profileError,
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          throw new Error(`Erro ao salvar perfil: ${profileError.message} (Código: ${profileError.code})`);
        }
        console.log('✅ [MOBILE DEBUG] Perfil salvo com sucesso');
      }

      // Atualizar dados do perfil no componente pai ANTES de fechar o modal
      if (onProfileUpdate) {
        await onProfileUpdate();
      }
      
      // Aguardar um momento para garantir que o estado seja atualizado
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Fechar o modal
      onOpenChange(false);
      
      // Executar candidatura automaticamente
      console.log('🔄 Iniciando candidatura automática...', { 
        hasOnApply: !!onApply, 
        jobId, 
        hasOnComplete: !!onComplete 
      });
      
      if (onApply && jobId) {
        console.log('🎯 Executando candidatura via onApply...');
        await onApply(jobId);
        toast({
          title: "Perfil completado e candidatura enviada!",
          description: `Suas informações foram salvas e sua candidatura para "${jobTitle}" foi enviada com sucesso.`,
        });
      } else if (onComplete) {
        console.log('🎯 Executando candidatura via onComplete...');
        await onComplete();
        toast({
          title: "Perfil completado e candidatura enviada!",
          description: `Suas informações foram salvas e sua candidatura para "${jobTitle}" foi enviada com sucesso.`,
        });
      } else {
        console.log('❌ Nenhuma função de candidatura disponível!');
        toast({
          title: "Perfil salvo!",
          description: "Suas informações foram salvas com sucesso.",
        });
      }


    } catch (error: any) {
      console.error('❌ [MOBILE DEBUG] Erro completo ao salvar dados:', {
        error,
        message: error?.message,
        stack: error?.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
      // Determinar tipo de erro para melhor feedback
      let errorMessage = "Houve um erro ao salvar suas informações. Tente novamente.";
      let errorDetails = "";
      
      if (error?.message) {
        if (error.message.includes('certificações')) {
          errorMessage = "Erro ao salvar certificações.";
          errorDetails = error.message;
        } else if (error.message.includes('perfil')) {
          errorMessage = "Erro ao salvar perfil.";
          errorDetails = error.message;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Erro de conexão. Verifique sua internet.";
        } else if (error.message.includes('authentication') || error.message.includes('auth')) {
          errorMessage = "Erro de autenticação. Faça login novamente.";
        }
      }
      
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: `${errorMessage} ${errorDetails ? `Detalhes: ${errorDetails}` : ''}`,
      });
    } finally {
      console.log('🏁 [MOBILE DEBUG] handleSave finalizado, definindo saving como false');
      setSaving(false);
    }
  };

  // Verificar se pode prosseguir - considerando usuários completamente novos
  const isNewUser = !personalInfo.full_name && !personalInfo.phone && !personalInfo.city && !personalInfo.cpf && !personalInfo.desired_function;
  const requiredPersonalFields = [
    { key: 'full_name', label: 'Nome completo' },
    { key: 'phone', label: 'Telefone' },
    { key: 'city', label: 'Cidade' },
    { key: 'cpf', label: 'CPF' },
    { key: 'desired_function', label: 'Função desejada' }
  ];

  const personalInfoComplete = requiredPersonalFields.every(({ key, label }) => {
    const value = personalInfo[key as keyof typeof personalInfo];
    const isMissing = missingProfileFields.includes(label);
    
    if (isMissing || isNewUser) {
      return value && value.trim();
    }
    return true; // Se não está em missing e não é novo usuário, considera ok
  });

  // Debug para mobile - Log do estado de personalInfoComplete
  React.useEffect(() => {
    console.log('🔍 [MOBILE DEBUG] Estado personalInfoComplete:', {
      personalInfoComplete,
      isNewUser,
      personalInfo,
      missingProfileFields,
      requiredPersonalFields: requiredPersonalFields.map(({ key, label }) => ({
        key,
        label,
        value: personalInfo[key as keyof typeof personalInfo],
        isMissing: missingProfileFields.includes(label),
        hasValue: !!(personalInfo[key as keyof typeof personalInfo] && personalInfo[key as keyof typeof personalInfo].trim())
      }))
    });
  }, [personalInfoComplete, isNewUser, personalInfo, missingProfileFields]);

  // Converter nomes completos das certificações para códigos para verificação - mesmo mapeamento robusto
  const certificationCodeMapCheck: Record<string, string> = {};
  Object.entries(CERTIFICATION_LABELS).forEach(([code, label]) => {
    certificationCodeMapCheck[label] = code;
    certificationCodeMapCheck[label.toLowerCase()] = code;
    certificationCodeMapCheck[code.toUpperCase()] = code;
  });

  const certificationsComplete = missingCertifications.every(certName => {
    const certCode = certificationCodeMapCheck[certName] || 
                    certificationCodeMapCheck[certName.toLowerCase()] || 
                    certName.toLowerCase().split(' ')[0];
    const isChecked = certificationStates[certCode] === true;
    const hasIssueDate = issueDates[certCode];
    const hasValidityDate = validityDates[certCode] || indeterminateCerts[certCode]; // Se for indeterminada, não precisa de data
    const stcwRulesOk = certCode !== 'stcw' || stcwRules.length > 0;
    
    return isChecked && hasIssueDate && hasValidityDate && stcwRulesOk;
  });

  const canProceed = personalInfoComplete && certificationsComplete;
  
  // Debug para mobile - Log do estado final
  React.useEffect(() => {
    console.log('🎯 [MOBILE DEBUG] Estado canProceed:', {
      canProceed,
      personalInfoComplete,
      certificationsComplete,
      saving,
      missingCertifications,
      certificationStates,
      timestamp: new Date().toISOString()
    });
  }, [canProceed, personalInfoComplete, certificationsComplete, saving]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Complete seu perfil para se candidatar
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Para se candidatar à vaga <strong>"{jobTitle}"</strong>, você precisa preencher as seguintes informações:
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 pr-2 -mr-2">
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Preenchimento rápido:</strong> Complete as informações necessárias aqui. 
                Todos os dados serão salvos em seu perfil permanentemente.
              </AlertDescription>
            </Alert>

            {/* Sempre mostrar campos pessoais para usuários sem dados completos */}
            {(missingProfileFields.length > 0 || isNewUser) && (
              <div className="space-y-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {((missingProfileFields.includes('Nome completo') || isNewUser) && (
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome completo *</Label>
                      <Input
                        id="full_name"
                        value={personalInfo.full_name}
                        onChange={(e) => handlePersonalInfoChange('full_name', e.target.value)}
                        placeholder="Digite seu nome completo"
                      />
                    </div>
                  ))}
                  
                  {((missingProfileFields.includes('Telefone') || isNewUser) && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        value={personalInfo.phone}
                        onChange={(e) => handlePersonalInfoChange('phone', formatPhoneBR(e.target.value))}
                        placeholder="+55 11 98765-4321"
                      />
                    </div>
                  ))}
                  
                  {((missingProfileFields.includes('Cidade') || isNewUser) && (
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={personalInfo.city}
                        onChange={(e) => handlePersonalInfoChange('city', e.target.value)}
                        placeholder="Digite sua cidade"
                      />
                    </div>
                  ))}
                  
                  {((missingProfileFields.includes('CPF') || isNewUser) && (
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={personalInfo.cpf}
                        onChange={(e) => handlePersonalInfoChange('cpf', formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        aria-invalid={personalInfo.cpf.replace(/\D/g, '').length === 11 && !isValidCPF(personalInfo.cpf)}
                      />
                      {personalInfo.cpf.replace(/\D/g, '').length === 11 && !isValidCPF(personalInfo.cpf) && (
                        <p className="text-xs text-destructive">CPF inválido</p>
                      )}
                    </div>
                  ))}
                  
                   {((missingProfileFields.includes('Função desejada') || isNewUser) && (
                     <JobFunctionSelector
                       value={personalInfo.desired_function}
                       onChange={(value) => handlePersonalInfoChange('desired_function', value)}
                       label="Função"
                       placeholder="Selecione uma função"
                       required={true}
                     />
                   ))}
                </div>
              </div>
            )}

            {missingCertifications.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Certificações Obrigatórias</h3>
              
              {missingCertifications.map((certName) => {
                // Converter nome completo para código da certificação
                const certCode = certificationCodeMapCheck[certName] || 
                                certificationCodeMapCheck[certName.toLowerCase()] || 
                                certName.toLowerCase().split(' ')[0];
                const isChecked = certificationStates[certCode] || false;
                const certLabel = certName;
                
                return (
                  <div key={certCode} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={certCode}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleCertificationChange(certCode, checked as boolean)}
                      />
                      <Label htmlFor={certCode} className="flex-1 font-medium">
                        {certLabel}
                      </Label>
                      <Badge variant={isChecked ? "default" : "secondary"}>
                        {isChecked ? "Possui" : "Não possui"}
                      </Badge>
                    </div>

                     {isChecked && (
                        <div className="ml-6 space-y-3">
                          {/* Níveis DP para certificação Dynamic Positioning */}
                          {certCode === 'dp' && (
                            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                              <Label className="text-sm font-medium">Níveis de DP (Dynamic Positioning)</Label>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${certCode}_dp_basico`}
                                    checked={dpLevels[certCode]?.basico || false}
                                    onCheckedChange={(checked) => 
                                      handleDpLevelChange(certCode, 'basico', checked as boolean)
                                    }
                                  />
                                  <Label htmlFor={`${certCode}_dp_basico`} className="text-sm">
                                    Nível Básico
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${certCode}_dp_avancado`}
                                    checked={dpLevels[certCode]?.avancado || false}
                                    onCheckedChange={(checked) => 
                                      handleDpLevelChange(certCode, 'avancado', checked as boolean)
                                    }
                                  />
                                  <Label htmlFor={`${certCode}_dp_avancado`} className="text-sm">
                                    Nível Avançado
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${certCode}_dp_ilimitado`}
                                    checked={dpLevels[certCode]?.ilimitado || false}
                                    onCheckedChange={(checked) => 
                                      handleDpLevelChange(certCode, 'ilimitado', checked as boolean)
                                    }
                                  />
                                  <Label htmlFor={`${certCode}_dp_ilimitado`} className="text-sm">
                                    Ilimitado
                                  </Label>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm">Data de emissão (DD/MM/YYYY) *</Label>
                              <Input
                                type="text"
                                value={issueDates[certCode] || ''}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                                  if (value.length >= 3 && value.length <= 4) {
                                    value = value.slice(0, 2) + '/' + value.slice(2);
                                  } else if (value.length > 4) {
                                    value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                                  }
                                  handleIssueDateChange(certCode, value);
                                }}
                                placeholder="DD/MM/YYYY"
                                maxLength={10}
                              />
                            </div>

                            <div className="space-y-2">
                               <Label className="text-sm">Data de validade (DD/MM/YYYY) {!indeterminateCerts[certCode] ? '*' : ''}</Label>
                               <Input
                                 type="text"
                                 value={validityDates[certCode] || ''}
                                 onChange={(e) => {
                                   let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                                   if (value.length >= 3 && value.length <= 4) {
                                     value = value.slice(0, 2) + '/' + value.slice(2);
                                   } else if (value.length > 4) {
                                     value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                                   }
                                   handleValidityDateChange(certCode, value);
                                 }}
                                 disabled={indeterminateCerts[certCode]}
                                 placeholder={indeterminateCerts[certCode] ? "Validade indeterminada" : "DD/MM/YYYY"}
                                 maxLength={10}
                               />
                             </div>
                           </div>
                           
                           <div className="flex items-center space-x-2">
                             <Checkbox
                               id={`${certCode}_indeterminate`}
                               checked={indeterminateCerts[certCode] || false}
                               onCheckedChange={(checked) => handleIndeterminateChange(certCode, checked as boolean)}
                             />
                             <Label htmlFor={`${certCode}_indeterminate`} className="text-sm text-muted-foreground">
                               Certificação com validade indeterminada
                             </Label>
                           </div>
                          

                          {certCode === 'stcw' && (
                           <div className="space-y-2">
                             <Label className="text-sm">Regras STCW aplicáveis *</Label>
                             <STCWRules
                               rules={{
                                 nautica_ii1: stcwRules.includes('Náutica – Regras II/1'),
                                 nautica_ii2: stcwRules.includes('Náutica – Regras II/2'),
                                 maquinas_iii1: stcwRules.includes('Máquinas – Regras III/1'),
                                 maquinas_iii2: stcwRules.includes('Máquinas – Regras III/2')
                               }}
                               onChange={(newRules) => {
                                 const selectedRules = [];
                                 if (newRules.nautica_ii1) selectedRules.push('Náutica – Regras II/1');
                                 if (newRules.nautica_ii2) selectedRules.push('Náutica – Regras II/2');
                                 if (newRules.maquinas_iii1) selectedRules.push('Máquinas – Regras III/1');
                                 if (newRules.maquinas_iii2) selectedRules.push('Máquinas – Regras III/2');
                                 setStcwRules(selectedRules);
                               }}
                             />
                           </div>
                         )}
                      </div>
                    )}
                  </div>
                 );
               })}
              </div>
            )}

              {!canProceed && (
                <Alert variant="destructive" className="my-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Você precisa preencher todas as informações obrigatórias (marcadas com *) para poder se candidatar a esta vaga.
                  </AlertDescription>
                </Alert>
              )}
          </div>

           <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              onTouchStart={(e) => {
                console.log('📱 [MOBILE DEBUG] TouchStart disparado');
                // Prevenir o onClick se o touch for detectado
                e.currentTarget.setAttribute('data-touch-started', 'true');
              }}
              onPointerDown={(e) => {
                console.log('📱 [MOBILE DEBUG] PointerDown disparado:', e.pointerType);
              }}
              disabled={!canProceed || saving}
              className="w-full sm:flex-1 min-h-[48px] touch-manipulation select-none"
              size="lg"
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
            >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando e Candidatando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar e Candidatar-se
              </>
            )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};