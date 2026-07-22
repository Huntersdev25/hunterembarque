/**
 * Hook personalizado para validação de perfil de candidato
 * Centraliza toda a lógica de validação necessária para candidaturas
 * 
 * Funcionalidades:
 * - Valida se o perfil está completo com todos os campos obrigatórios
 * - Verifica certificações obrigatórias para vagas específicas
 * - Retorna informações detalhadas sobre campos faltantes
 */
import { useCallback, useMemo } from 'react';

interface Profile {
  full_name?: string;
  phone?: string;
  city?: string;
  cpf?: string;
  desired_function?: string;
  profile_complete?: boolean;
}

interface Certification {
  [key: string]: boolean | string | null;
}

interface ProfileValidationResult {
  isComplete: boolean;
  missingFields: string[];
  missingCertifications: string[];
  canApplyToJob: boolean;
  validationMessage: string;
}

interface UseProfileValidationProps {
  profile: Profile | null;
  certifications: Certification;
}

const REQUIRED_PROFILE_FIELDS = [
  { key: 'full_name', label: 'Nome completo' },
  { key: 'phone', label: 'Telefone' },
  { key: 'city', label: 'Cidade' },
  { key: 'cpf', label: 'CPF' },
  { key: 'desired_function', label: 'Função desejada' }
];

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

export const useProfileValidation = ({ profile, certifications }: UseProfileValidationProps) => {
  
  /**
   * Valida se o perfil básico está completo
   * Verifica todos os campos obrigatórios definidos em REQUIRED_PROFILE_FIELDS
   */
  const validateBasicProfile = useCallback((): { isComplete: boolean; missingFields: string[] } => {
    if (!profile) {
      return {
        isComplete: false,
        missingFields: REQUIRED_PROFILE_FIELDS.map(field => field.label)
      };
    }

    const missingFields: string[] = [];

    REQUIRED_PROFILE_FIELDS.forEach(field => {
      const value = profile[field.key as keyof Profile];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field.label);
      }
    });

    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  }, [profile]);

  /**
   * Valida certificações obrigatórias para uma vaga específica
   * Verifica se o candidato possui todas as certificações exigidas e se estão válidas
   */
  const validateJobCertifications = useCallback((requiredCertifications: string[] = []): {
    hasCertifications: boolean;
    missingCertifications: string[];
    expiredCertifications: string[];
  } => {
    if (!requiredCertifications.length) {
      return {
        hasCertifications: true,
        missingCertifications: [],
        expiredCertifications: []
      };
    }

    const missingCertifications: string[] = [];
    const expiredCertifications: string[] = [];
    const today = new Date();

    requiredCertifications.forEach(certKey => {
      const hasCertification = certifications && certifications[certKey] === true;
      const validityDate = certifications && certifications[`${certKey}_validity`] as string;
      
      if (!hasCertification) {
        const certLabel = CERTIFICATION_LABELS[certKey as keyof typeof CERTIFICATION_LABELS] || certKey.toUpperCase();
        missingCertifications.push(certLabel);
      } else if (validityDate) {
        const validity = new Date(validityDate);
        if (validity < today) {
          const certLabel = CERTIFICATION_LABELS[certKey as keyof typeof CERTIFICATION_LABELS] || certKey.toUpperCase();
          expiredCertifications.push(certLabel);
        }
      }
    });

    return {
      hasCertifications: missingCertifications.length === 0 && expiredCertifications.length === 0,
      missingCertifications,
      expiredCertifications
    };
  }, [certifications]);

  /**
   * Validação completa para candidatura a uma vaga
   * Combina validação de perfil e certificações
   */
  const validateForJobApplication = useCallback((requiredCertifications: string[] = []): ProfileValidationResult => {
    const profileValidation = validateBasicProfile();
    const certificationValidation = validateJobCertifications(requiredCertifications);

    const allMissingFields = [
      ...profileValidation.missingFields,
      ...certificationValidation.missingCertifications,
      ...certificationValidation.expiredCertifications.map(cert => `${cert} (vencida)`)
    ];

    const canApply = profileValidation.isComplete && certificationValidation.hasCertifications;

    let validationMessage = '';
    if (!canApply) {
      if (profileValidation.missingFields.length > 0) {
        validationMessage += `Campos obrigatórios pendentes: ${profileValidation.missingFields.join(', ')}. `;
      }
      if (certificationValidation.missingCertifications.length > 0) {
        validationMessage += `Certificações obrigatórias faltantes: ${certificationValidation.missingCertifications.join(', ')}. `;
      }
      if (certificationValidation.expiredCertifications.length > 0) {
        validationMessage += `Certificações vencidas: ${certificationValidation.expiredCertifications.join(', ')}. `;
      }
      validationMessage += 'Complete seu perfil para se candidatar.';
    } else {
      validationMessage = 'Perfil completo! Você pode se candidatar a esta vaga.';
    }

    return {
      isComplete: profileValidation.isComplete,
      missingFields: profileValidation.missingFields,
      missingCertifications: certificationValidation.missingCertifications,
      canApplyToJob: canApply,
      validationMessage: validationMessage.trim()
    };
  }, [validateBasicProfile, validateJobCertifications]);

  /**
   * Memoiza o resultado da validação básica do perfil
   * Evita recálculos desnecessários quando os dados não mudaram
   */
  const basicValidation = useMemo(() => validateBasicProfile(), [validateBasicProfile]);

  return {
    validateBasicProfile,
    validateJobCertifications,
    validateForJobApplication,
    basicValidation,
    isProfileComplete: basicValidation.isComplete,
    missingProfileFields: basicValidation.missingFields
  };
};