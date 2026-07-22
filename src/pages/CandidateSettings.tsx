/**
 * Página de Configurações do Candidato
 * Permite ao usuário editar seu perfil completo, certificações e idiomas
 */
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CertificationUpload } from "@/components/CertificationUpload";
import { formatPhoneBR } from "@/lib/phoneFormat";
import { useNavigate } from "react-router-dom";

import { ProfilePDFExport } from "@/components/ProfilePDFExport";
import { JobFunctionSelector } from "@/components/JobFunctionSelector";
import { AvatarUpload } from "@/components/AvatarUpload";
import { fetchCepData, formatCep, isValidCep } from "@/lib/viaCep";
import { isValidCPF, formatCPF, isValidRG, formatRG } from "@/lib/validators";
import { 
  Save, 
  User, 
  FileText, 
  Award, 
  Upload,
  ChevronDown,
  MapPin,
  Briefcase,
  Languages,
  Paperclip,
  ArrowLeft,
  Download,
  Mic
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VoiceAssistantModal } from "@/components/VoiceAssistantModal";

interface Language {
  name: string;
  level: string;
}

interface STCWRules {
  nautica_ii1: boolean;
  nautica_ii2: boolean;
  maquinas_iii1: boolean;
  maquinas_iii2: boolean;
}

export default function CandidateSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Estados do formulário principal
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    cpf: "",
    rg: "",
    birth_date: "",
    gender: "",
    residence_location: "",
    desired_function: "",
    professional_experience: "",
    salary_expectation: "",
    vessel_type: "",
    available_from: "",
    available_until: "",
    cep: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    address_number: "",
    address_complement: "",
    cv_file_path: "",
    cv_file_name: "",
    avatar_url: "",
    profile_complete: false,
  });

  // Estados para idiomas e certificações
  const [languages, setLanguages] = useState<Language[]>([]);

  const [stcwRules, setStcwRules] = useState<STCWRules>({
    nautica_ii1: false,
    nautica_ii2: false,
    maquinas_iii1: false,
    maquinas_iii2: false,
  });

  const [certifications, setCertifications] = useState<any>({});

  // Lista atualizada de certificações
  const CERTIFICATION_TYPES = [
    { id: 'cir', name: 'CIR – Carteira de Inscrição e Registro' },
    { id: 'stcw', name: 'STCW – International Convention on Standards of Training, Certification and Watchkeeping for Seafarers' },
    { id: 'caaq', name: 'CAAQ – Curso de Adaptação para Aquaviários' },
    { id: 'tbs1', name: 'TBS1 – Treinamento Básico de Segurança e Instrução' },
    { id: 'espe', name: 'ESPE – Especial básico de sobrevivência Pessoal' },
    { id: 'esrs', name: 'ESRS – Especial básico de Responsabilidade Social' },
    { id: 'ebps', name: 'EBPS – Especial básico de primeiros socorros' },
    { id: 'ecin', name: 'ECIN – Especial básico de Combate a Incêndio' },
    { id: 'ecia_caci', name: 'ECIA/CACI – Especial Avançado de Combate a Incêndio' },
    { id: 'eopn', name: 'EOPN – Especial para Oficiais de Proteção de Navio' },
    { id: 'ebcp', name: 'EBCP – Especial Básico de Conscientização Sobre Proteção de Navio' },
    { id: 'epsm', name: 'ESPM – Especial Avançado Primeiros Socorros' },
    { id: 'thuet', name: 'THUET – Treinamento em Escape de Helicópteros Submersos em Águas Tropicais' },
    { id: 'cbsp', name: 'CBSP – Curso Básico de Segurança de Plataforma' },
    { id: 'cess', name: 'CESS – Curso Especial de Embarcações de Sobrevivência e Salvamento' },
    { id: 'cerr', name: 'CERR – Curso Especial de Embarcação Rápida de Resgate' },
    { id: 'efnt', name: 'EFNT – Especial de Familiarização de Navios Tanques' },
    { id: 'ebpq', name: 'EBPQ – Especial Básico de Navios Tanques Petroleiros e para Produtos Químicos' },
    { id: 'ebgl', name: 'EBGL – Especial Básico de Navio Tanque para Gás Liquefeito' },
    { id: 'esop', name: 'ESOP – Especial de Segurança em Operações de Carga' },
    { id: 'bco', name: 'BCO – Curso de Operador de Controle de Lastro' },
    { id: 'dp', name: 'DP – Dynamic Positioning – Nível Básico, Nível Avançado, Ilimitado (DP Full)' },
    { id: 'alph', name: 'MCIA – Curso de Manobra e Combate a Incêndio de Aviação – ALPH' },
    { id: 'cpso', name: 'CPSO – Curso de Primeiros Socorros' },
    { id: 'cipn', name: 'CIPN – Curso Intermediário de Proteção de Navio' },
    { id: 'ticb', name: 'TICB – Treinamento Intermediário para Condutores de Baleeiras' },
    { id: 'epoe', name: 'EPOE – Especial de Operador em ECDIS – PREPOM' },
    { id: 'epor', name: 'EPOR – Especial Prático de Operador Radar' },
    { id: 'gmdss', name: 'GMDSS – Rádio Comunicação' },
    { id: 'cns014', name: 'CNS 14 – Rádio Operador' },
    { id: 'lpna', name: 'LPNA – Licença de Pessoal de Navegação Aérea' },
    { id: 'ht', name: 'HT – Habilitação Técnica' }
  ];
  
  // Estados de loading
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCertifications, setSavingCertifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState(false);

  // Collapsible states
  const [dadosBasicosOpen, setDadosBasicosOpen] = useState(true);
  const [documentosPessoaisOpen, setDocumentosPessoaisOpen] = useState(false);
  const [enderecoOpen, setEnderecoOpen] = useState(false);
  const [idiomasOpen, setIdiomasOpen] = useState(false);
  const [certificacoesOpen, setCertificacoesOpen] = useState(false);
  const [anexosOpen, setAnexosOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  // Campos para preenchimento por voz
  const voiceFields = [
    { key: 'full_name', label: 'Nome Completo', placeholder: 'Diga seu nome completo', type: 'text' as const, currentValue: profileForm.full_name },
    { key: 'phone', label: 'Telefone', placeholder: 'Diga seu número de telefone com DDD', type: 'phone' as const, currentValue: profileForm.phone },
    { key: 'cpf', label: 'CPF', placeholder: 'Diga os 11 dígitos do seu CPF', type: 'cpf' as const, currentValue: profileForm.cpf },
    { key: 'rg', label: 'RG', placeholder: 'Diga o número do seu RG', type: 'text' as const, currentValue: profileForm.rg },
    { key: 'birth_date', label: 'Data de Nascimento', placeholder: 'Diga sua data de nascimento. Exemplo: 15 de janeiro de 1990', type: 'date' as const, currentValue: profileForm.birth_date },
    { key: 'cep', label: 'CEP', placeholder: 'Diga os 8 dígitos do seu CEP', type: 'text' as const, currentValue: profileForm.cep },
    { key: 'address_number', label: 'Número do Endereço', placeholder: 'Diga o número da sua residência', type: 'text' as const, currentValue: profileForm.address_number },
    { key: 'address_complement', label: 'Complemento', placeholder: 'Diga o complemento do endereço, como apartamento ou bloco', type: 'text' as const, currentValue: profileForm.address_complement },
    { key: 'residence_location', label: 'Localização de Residência', placeholder: 'Diga sua cidade e estado de residência', type: 'text' as const, currentValue: profileForm.residence_location },
    { key: 'desired_function', label: 'Função Desejada', placeholder: 'Diga a função que deseja exercer a bordo', type: 'text' as const, currentValue: profileForm.desired_function },
    { key: 'professional_experience', label: 'Experiência Profissional', placeholder: 'Descreva brevemente sua experiência profissional', type: 'text' as const, currentValue: profileForm.professional_experience },
    { key: 'salary_expectation', label: 'Pretensão Salarial', placeholder: 'Diga o valor da sua pretensão salarial', type: 'currency' as const, currentValue: profileForm.salary_expectation },
    { key: 'vessel_type', label: 'Tipo de Embarcação', placeholder: 'Diga o tipo de embarcação que tem experiência', type: 'text' as const, currentValue: profileForm.vessel_type },
  ];

  const handleVoiceFieldUpdate = (key: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [key]: value }));
    
    // Se atualizou o CEP, tentar buscar endereço
    if (key === 'cep') {
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        handleCepBlur();
      }
    }
  };

  const handleVoiceComplete = () => {
    toast({
      title: "Preenchimento por voz concluído",
      description: "Revise os dados e clique em Salvar Perfil para confirmar.",
    });
  };

  /**
   * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
   */
  const isoToBR = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    // Se já está em formato BR, retorna como está
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
    // Se está em formato ISO, converte
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = dateStr.substring(0, 10).split('-');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  /**
   * Carrega dados do perfil do usuário
   */
  const loadProfile = async () => {
    if (!user) return;

    try {
      // Buscar dados do perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfileForm({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          email: profileData.email || "",
          cpf: profileData.cpf || "",
          rg: profileData.rg || "",
          birth_date: isoToBR(profileData.birth_date),
          gender: profileData.gender || "",
          residence_location: profileData.residence_location || "",
          desired_function: profileData.desired_function || "",
          professional_experience: profileData.professional_experience || "",
          salary_expectation: profileData.salary_expectation ? formatCurrency(profileData.salary_expectation) : "",
          vessel_type: profileData.vessel_type || "",
          available_from: isoToBR(profileData.available_from),
          available_until: isoToBR(profileData.available_until),
          cep: profileData.cep || "",
          street: profileData.street || "",
          neighborhood: profileData.neighborhood || "",
          city: profileData.city || "",
          state: profileData.state || "",
          address_number: profileData.address_number || "",
          address_complement: profileData.address_complement || "",
          cv_file_path: profileData.cv_file_path || "",
          cv_file_name: profileData.cv_file_name || "",
          avatar_url: (profileData as any).avatar_url || "",
          profile_complete: profileData.profile_complete || false,
        });

        // Parse idiomas se existir
        if (profileData.languages) {
          try {
            const parsedLanguages = typeof profileData.languages === 'string' 
              ? JSON.parse(profileData.languages) 
              : profileData.languages;
            setLanguages(Array.isArray(parsedLanguages) ? parsedLanguages : []);
          } catch (error) {
            console.error('Erro ao fazer parse dos idiomas:', error);
            setLanguages([]);
          }
        }
      }

      // Buscar certificações
      const { data: certData, error: certError } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!certError && certData) {
        // Converter datas ISO para formato BR nas certificações
        const convertedCertData = { ...certData };
        Object.keys(convertedCertData).forEach(key => {
          if ((key.endsWith('_issue_date') || key.endsWith('_validity')) && convertedCertData[key]) {
            convertedCertData[key] = isoToBR(convertedCertData[key]);
          }
        });
        setCertifications(convertedCertData);
        
        // Parse STCW rules se existir
        if (certData.stcw_rules) {
          try {
            const parsedRules = typeof certData.stcw_rules === 'string' 
              ? JSON.parse(certData.stcw_rules) 
              : certData.stcw_rules;
            setStcwRules(parsedRules);
          } catch (error) {
            console.error('Erro ao fazer parse das regras STCW:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Validadores/formatadores unificados (fonte única em @/lib/validators).
  const validateCpf = (cpf: string): boolean => isValidCPF(cpf);
  const validateRg = (rg: string): boolean => isValidRG(rg);
  const formatCpf = (cpf: string): string => formatCPF(cpf);

  /**
   * Busca dados do endereço através do CEP e valida sua existência via ViaCEP.
   */
  const handleCepBlur = async () => {
    setCepError(false);
    if (!profileForm.cep) return;
    if (!isValidCep(profileForm.cep)) {
      setCepError(true);
      return;
    }

    setLoadingCep(true);
    try {
      const cepData = await fetchCepData(profileForm.cep);

      if (cepData) {
        setProfileForm(prev => ({
          ...prev,
          street: cepData.logradouro || prev.street,
          neighborhood: cepData.bairro || prev.neighborhood,
          city: cepData.localidade || prev.city,
          state: cepData.uf || prev.state,
          cep: formatCep(cepData.cep || prev.cep)
        }));

        toast({
          title: "Sucesso",
          description: "Endereço preenchido automaticamente",
        });
      } else {
        setCepError(true);
        toast({
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro",
        description: "Erro ao consultar CEP",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  /**
   * Formata valor monetário
   */
  const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return numValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  };

  /**
   * Converte valor monetário formatado para número
   */
  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  };

  /**
   * Valida idade mínima de 18 anos
   */
  const validateAge = (birthDate: string): boolean => {
    if (!birthDate) return true; // Campo opcional
    
    // Se for formato DD/MM/YYYY, converter para Date
    let birth: Date;
    if (birthDate.includes('/')) {
      const [day, month, year] = birthDate.split('/').map(Number);
      birth = new Date(year, month - 1, day);
    } else {
      birth = new Date(birthDate);
    }
    
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return (age - 1) >= 18;
    }
    
    return age >= 18;
  };

  /**
   * Valida formato de data DD/MM/YYYY e idade
   */
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

  /**
   * Manipula mudança da data de nascimento
   */
  const handleBirthDateChange = (value: string) => {
    // Permitir digitação livre, validar apenas quando campo está completo
    if (value.length === 10 && !validateDateFormat(value)) {
      toast({
        title: "Formato de data inválido",
        description: "Use o formato DD/MM/YYYY",
        variant: "destructive",
      });
      return;
    }
    
    setProfileForm({...profileForm, birth_date: value});
  };

  /**
   * Manipula mudança das datas de disponibilidade
   */
  const handleAvailabilityDateChange = (field: 'available_from' | 'available_until', value: string) => {
    // Permitir digitação livre, validar apenas quando campo está completo
    if (value.length === 10 && !validateDateFormat(value)) {
      toast({
        title: "Formato de data inválido",
        description: "Use o formato DD/MM/YYYY",
        variant: "destructive",
      });
      return;
    }
    
    setProfileForm({...profileForm, [field]: value});
  };

  /**
   * Valida datas de certificação
   */
  const validateCertificationDates = (issueDate: string, validityDate: string): boolean => {
    if (!issueDate || !validityDate) return true;

    const parseDate = (dateStr: string) => {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }

      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const issue = parseDate(issueDate);
    const validity = parseDate(validityDate);

    return validity >= issue;
  };

  const getActiveCertifications = () => {
    const activeCerts: string[] = [];
    const certNames: {[key: string]: string} = {
      cir: "CIR",
      stcw: "STCW", 
      tbs1: "TBS-1",
      cbsp: "CBSP",
      thuet: "THUET",
      caaq: "CAAQ",
      espe: "ESPE",
      esrs: "ESRS",
      ebps: "EBPS",
      ecin: "ECIN",
      ecia_caci: "ECIA/CACI",
      eopn: "EOPN",
      ebcp: "EBCP",
      epsm: "EPSM",
      cess: "CESS",
      cerr: "CERR",
      efnt: "EFNT",
      ebpq: "EBPQ",
      ebgl: "EBGL",
      esop: "ESOP",
      gmdss: "GMDSS",
      cns014: "CNS-014",
      lpn: "LPN",
      alph: "ALPH",
      dp: "DP"
    };

    Object.keys(certNames).forEach(key => {
      if (certifications[key] === true) {
        activeCerts.push(certNames[key]);
      }
    });

    return activeCerts;
  };

  /**
   * Salva dados do perfil
   */
  const handleSaveProfile = async (
    e?: React.FormEvent | React.MouseEvent,
    options?: { showToast?: boolean }
  ): Promise<boolean> => {
    e?.preventDefault?.();
    const showToast = options?.showToast ?? true;
    if (!user) return false;

    // Validações
    if (!validateAge(profileForm.birth_date)) {
      toast({
        title: "Erro de validação",
        description: "Você deve ter pelo menos 18 anos para se cadastrar.",
        variant: "destructive",
      });
      return false;
    }

    // Validar CPF se informado
    if (profileForm.cpf && !validateCpf(profileForm.cpf)) {
      toast({
        title: "Erro de validação",
        description: "CPF inválido. Verifique os números informados.",
        variant: "destructive",
      });
      return false;
    }

    // Validar RG se informado
    if (profileForm.rg && !validateRg(profileForm.rg)) {
      toast({
        title: "Erro de validação",
        description: "RG deve ter entre 7 e 12 dígitos.",
        variant: "destructive",
      });
      return false;
    }

    // Validar datas de disponibilidade se informadas
    if (profileForm.available_from && profileForm.available_until) {
      const parseDate = (dateStr: string) => {
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/').map(Number);
          return new Date(year, month - 1, day);
        }
        return new Date(dateStr);
      };
      
      const from = parseDate(profileForm.available_from);
      const until = parseDate(profileForm.available_until);
      
      if (until <= from) {
        toast({
          title: "Erro de validação",
          description: "A data de disponibilidade final deve ser posterior à inicial.",
          variant: "destructive",
        });
        return false;
      }
    }

    setSavingProfile(true);
    try {
      const updateData = {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        cpf: profileForm.cpf,
        rg: profileForm.rg,
        birth_date: profileForm.birth_date ? (() => {
          // Converter DD/MM/YYYY para YYYY-MM-DD se necessário
          if (profileForm.birth_date.includes('/')) {
            const [day, month, year] = profileForm.birth_date.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return profileForm.birth_date;
        })() : null,
        gender: (profileForm.gender as "masculino" | "feminino" | "outro") || null,
        residence_location: profileForm.residence_location,
        desired_function: profileForm.desired_function,
        professional_experience: profileForm.professional_experience,
        salary_expectation: profileForm.salary_expectation ? parseCurrency(profileForm.salary_expectation) : null,
        languages: JSON.stringify(languages),
        vessel_type: profileForm.vessel_type,
        available_from: profileForm.available_from ? (() => {
          // Converter DD/MM/YYYY para YYYY-MM-DD se necessário
          if (profileForm.available_from.includes('/')) {
            const [day, month, year] = profileForm.available_from.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return profileForm.available_from;
        })() : null,
        available_until: profileForm.available_until ? (() => {
          // Converter DD/MM/YYYY para YYYY-MM-DD se necessário
          if (profileForm.available_until.includes('/')) {
            const [day, month, year] = profileForm.available_until.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return profileForm.available_until;
        })() : null,
        cep: profileForm.cep,
        street: profileForm.street,
        neighborhood: profileForm.neighborhood,
        city: profileForm.city,
        state: profileForm.state,
        address_number: profileForm.address_number,
        address_complement: profileForm.address_complement,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update email in auth if changed
      if (profileForm.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profileForm.email
        });
        
        if (authError) {
          console.error('Erro ao atualizar email:', authError);
          toast({
            title: "Aviso",
            description: "Perfil salvo, mas houve erro ao atualizar o email. Tente novamente.",
            variant: "destructive",
          });
        }
      }

      if (showToast) {
        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso!",
        });
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar perfil",
        variant: "destructive",
      });
      return false;
    } finally {
      setSavingProfile(false);
    }
  };

  /**
   * Salva certificações e regras STCW
   */
  const handleSaveCertifications = async (
    certificationsPayload?: any,
    options?: { showToast?: boolean }
  ): Promise<boolean> => {
    if (!user) return false;
    const showToast = options?.showToast ?? true;

    // Função para converter data DD/MM/YYYY para YYYY-MM-DD
    const convertDateToDB = (dateStr: string | null): string | null => {
      if (!dateStr) return null;
      
      // Se já está no formato YYYY-MM-DD, retorna como está
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }
      
      // Se está no formato DD/MM/YYYY, converte
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return dateStr;
    };

    // Validar datas das certificações
    const sourceCertifications = certificationsPayload ?? certifications;
    const certificationFields = [
      { issue: sourceCertifications.stcw_issue_date, validity: sourceCertifications.stcw_validity, name: 'STCW' },
      { issue: sourceCertifications.cir_issue_date, validity: sourceCertifications.cir_validity, name: 'CIR' },
      { issue: sourceCertifications.tbs1_issue_date, validity: sourceCertifications.tbs1_validity, name: 'TBS1' },
    ];

    for (const cert of certificationFields) {
      if (!validateCertificationDates(cert.issue, cert.validity)) {
        toast({
          title: "Erro de validação",
          description: `A data de validade da certificação ${cert.name} deve ser posterior à data de emissão.`,
          variant: "destructive",
        });
        return false;
      }
    }

    setSavingCertifications(true);
    try {
      const sourceCerts = certificationsPayload ?? certifications;
      const convertedCertifications: Record<string, any> = {};
      
      // Only include keys that are valid DB columns
      const validPrefixes = [
        'stcw', 'cerr', 'efnt', 'ebpq', 'ebgl', 'esop', 'cns014', 'lpn', 'gmdss', 'cft',
        'caaq', 'cbsp', 'tbs1', 'cir', 'thuet', 'alph', 'espe', 'esrs', 'ebps', 'ecin',
        'ecia_caci', 'ebcp', 'eopn', 'epsm', 'cess', 'dp'
      ];
      const validSuffixes = ['', '_issue_date', '_validity', '_indeterminate', '_file_path', '_file_name'];
      const dpExtras = ['dp_dp_basico', 'dp_dp_avancado', 'dp_dp_ilimitado'];
      
      const validKeys = new Set<string>();
      validPrefixes.forEach(prefix => {
        validSuffixes.forEach(suffix => validKeys.add(prefix + suffix));
      });
      dpExtras.forEach(k => validKeys.add(k));
      validKeys.add('stcw_rules');

      Object.keys(sourceCerts).forEach(key => {
        if (validKeys.has(key)) {
          let value = sourceCerts[key];
          if (key.endsWith('_issue_date') || key.endsWith('_validity')) {
            value = convertDateToDB(value);
          }
          convertedCertifications[key] = value;
        }
      });

      // Ensure stcw_rules is stringified
      if (convertedCertifications.stcw_rules && typeof convertedCertifications.stcw_rules !== 'string') {
        convertedCertifications.stcw_rules = JSON.stringify(convertedCertifications.stcw_rules);
      } else if (!convertedCertifications.stcw_rules) {
        convertedCertifications.stcw_rules = JSON.stringify(stcwRules);
      }

      const payload = {
        user_id: user.id,
        ...convertedCertifications,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Salvando certificações, payload keys:', Object.keys(payload));

      const { data: existingCertification, error: existingError } = await supabase
        .from('certifications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      const { error } = existingCertification
        ? await supabase
            .from('certifications')
            .update(payload)
            .eq('user_id', user.id)
        : await supabase
            .from('certifications')
            .insert(payload);

      if (error) throw error;

      await loadProfile();

      if (showToast) {
        toast({
          title: "Sucesso",
          description: "Certificações atualizadas com sucesso!",
        });
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao salvar certificações:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar certificações",
        variant: "destructive",
      });
      return false;
    } finally {
      setSavingCertifications(false);
    }
  };

  const handleSaveAll = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();

    const profileSaved = await handleSaveProfile(undefined, { showToast: false });
    if (!profileSaved) return;

    const certificationsSaved = await handleSaveCertifications(undefined, { showToast: false });
    if (!certificationsSaved) return;

    toast({
      title: "Sucesso",
      description: "Cadastro atualizado com sucesso!",
    });
  };

  const calculateProfileProgress = () => {
    let filled = 0;
    let total = 10;
    
    if (profileForm.full_name) filled++;
    if (profileForm.email) filled++;
    if (profileForm.phone) filled++;
    if (profileForm.cpf) filled++;
    if (profileForm.birth_date) filled++;
    if (profileForm.desired_function) filled++;
    if (profileForm.city && profileForm.state) filled++;
    if (profileForm.professional_experience) filled++;
    if (getActiveCertifications().length > 0) filled++;
    if (profileForm.avatar_url) filled++;
    
    return Math.round((filled / total) * 100);
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout userType="candidate">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const profileProgress = calculateProfileProgress();
  const activeCertifications = getActiveCertifications();

  return (
    <DashboardLayout userType="candidate">
      <div className="min-h-screen bg-muted/30 pb-32 sm:pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cadastro de Profissional</h1>
            <p className="text-sm text-muted-foreground">Edição do colaborador</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              type="button"
              variant="outline" 
              className="bg-primary/10 border-primary text-primary hover:bg-primary/20"
              onClick={() => setVoiceModalOpen(true)}
            >
              <Mic className="h-4 w-4 mr-2" />
              Preencher por Voz
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar
            </Button>
            <ProfilePDFExport 
              profileData={profileForm}
              certifications={certifications}
            />
          </div>
        </div>

        {/* Voice Assistant Modal */}
        <VoiceAssistantModal
          open={voiceModalOpen}
          onOpenChange={setVoiceModalOpen}
          fields={voiceFields}
          onFieldUpdate={handleVoiceFieldUpdate}
          onComplete={handleVoiceComplete}
        />

        <form onSubmit={handleSaveAll}>
          {/* Main Content - Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Profile Photo Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <AvatarUpload 
                      userId={user?.id || ''}
                      currentAvatarUrl={profileForm.avatar_url}
                      onAvatarChange={(url) => setProfileForm({...profileForm, avatar_url: url || ''})}
                    />
                    <p className="text-sm text-muted-foreground mt-3">Foto do Perfil</p>
                    <Badge 
                      variant={profileForm.profile_complete ? "default" : "secondary"} 
                      className={`mt-2 ${profileForm.profile_complete ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                    >
                      {profileForm.profile_complete ? 'Perfil Completo' : 'Perfil Incompleto'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Dados Básicos */}
              <Collapsible open={dadosBasicosOpen} onOpenChange={setDadosBasicosOpen}>
                <Card className="border-0 shadow-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base font-medium">
                          <User className="h-5 w-5 mr-3 text-muted-foreground" />
                          Dados Básicos
                        </CardTitle>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${dadosBasicosOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="full_name">Nome Completo *</Label>
                          <Input
                            id="full_name"
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone *</Label>
                          <Input
                            id="phone"
                            placeholder="+55 11 98765-4321"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({...profileForm, phone: formatPhoneBR(e.target.value)})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="birth_date">Data de Nascimento</Label>
                          <Input
                            id="birth_date"
                            type="text"
                            value={profileForm.birth_date}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 3 && value.length <= 4) {
                                value = value.slice(0, 2) + '/' + value.slice(2);
                              } else if (value.length > 4) {
                                value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                              }
                              handleBirthDateChange(value);
                            }}
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                          />
                          {profileForm.birth_date && !validateAge(profileForm.birth_date) && (
                            <p className="text-sm text-destructive">Você deve ter pelo menos 18 anos</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gênero</Label>
                          <Select value={profileForm.gender} onValueChange={(value) => setProfileForm({...profileForm, gender: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Documentos Pessoais */}
              <Collapsible open={documentosPessoaisOpen} onOpenChange={setDocumentosPessoaisOpen}>
                <Card className="border-0 shadow-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base font-medium">
                          <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                          Documentos Pessoais
                        </CardTitle>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${documentosPessoaisOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            value={profileForm.cpf}
                            onChange={(e) => {
                              const formatted = formatCpf(e.target.value);
                              setProfileForm({...profileForm, cpf: formatted});
                            }}
                            placeholder="123.456.789-01"
                            maxLength={14}
                          />
                          {profileForm.cpf && !validateCpf(profileForm.cpf) && (
                            <p className="text-sm text-destructive">CPF inválido</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rg">RG</Label>
                          <Input
                            id="rg"
                            value={profileForm.rg}
                            onChange={(e) => setProfileForm({...profileForm, rg: formatRG(e.target.value)})}
                            placeholder="Somente números"
                            maxLength={14}
                          />
                          {profileForm.rg && !validateRg(profileForm.rg) && (
                            <p className="text-sm text-destructive">RG inválido</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Endereço */}
              <Collapsible open={enderecoOpen} onOpenChange={setEnderecoOpen}>
                <Card className="border-0 shadow-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base font-medium">
                          <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                          Endereço
                        </CardTitle>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${enderecoOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP</Label>
                          <Input
                            id="cep"
                            value={profileForm.cep}
                            onChange={(e) => { setCepError(false); setProfileForm({...profileForm, cep: formatCep(e.target.value)}); }}
                            onBlur={handleCepBlur}
                            placeholder="12345-678"
                            inputMode="numeric"
                            maxLength={9}
                            disabled={loadingCep}
                            aria-invalid={cepError}
                            className={cepError ? "border-destructive focus-visible:ring-destructive" : undefined}
                          />
                          {loadingCep && <p className="text-xs text-muted-foreground">Buscando...</p>}
                          {cepError && !loadingCep && <p className="text-sm text-destructive">CEP inválido ou não encontrado</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="street">Rua</Label>
                          <Input
                            id="street"
                            value={profileForm.street}
                            onChange={(e) => setProfileForm({...profileForm, street: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address_number">Número</Label>
                          <Input
                            id="address_number"
                            value={profileForm.address_number}
                            onChange={(e) => setProfileForm({...profileForm, address_number: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="neighborhood">Bairro</Label>
                          <Input
                            id="neighborhood"
                            value={profileForm.neighborhood}
                            onChange={(e) => setProfileForm({...profileForm, neighborhood: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Cidade</Label>
                          <Input
                            id="city"
                            value={profileForm.city}
                            onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">Estado</Label>
                          <Input
                            id="state"
                            value={profileForm.state}
                            onChange={(e) => setProfileForm({...profileForm, state: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="address_complement">Complemento</Label>
                          <Input
                            id="address_complement"
                            value={profileForm.address_complement}
                            onChange={(e) => setProfileForm({...profileForm, address_complement: e.target.value})}
                            placeholder="Apartamento, bloco, etc."
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Idiomas */}
              <Collapsible open={idiomasOpen} onOpenChange={setIdiomasOpen}>
                <Card className="border-0 shadow-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base font-medium">
                          <Languages className="h-5 w-5 mr-3 text-muted-foreground" />
                          Idiomas
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {languages.length} idiomas
                          </Badge>
                          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${idiomasOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <LanguageSelector
                        languages={languages}
                        onLanguagesChange={setLanguages}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Informações Profissionais */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base font-medium">
                    <Briefcase className="h-5 w-5 mr-3 text-muted-foreground" />
                    Informações Profissionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <JobFunctionSelector
                    value={profileForm.desired_function}
                    onChange={(value) => setProfileForm({...profileForm, desired_function: value})}
                    label="Função Desejada"
                    placeholder="Selecione sua função"
                    required
                  />
                  
                  <div className="space-y-2">
                    <Label htmlFor="vessel_type">Tipo de Embarcação</Label>
                    <Input
                      id="vessel_type"
                      value={profileForm.vessel_type}
                      onChange={(e) => setProfileForm({...profileForm, vessel_type: e.target.value})}
                      placeholder="Ex: Plataforma, Navio, AHTS, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="available_from">Disponível de</Label>
                      <Input
                        id="available_from"
                        type="text"
                        value={profileForm.available_from}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 3 && value.length <= 4) {
                            value = value.slice(0, 2) + '/' + value.slice(2);
                          } else if (value.length > 4) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                          }
                          handleAvailabilityDateChange('available_from', value);
                        }}
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="available_until">Até</Label>
                      <Input
                        id="available_until"
                        type="text"
                        value={profileForm.available_until}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 3 && value.length <= 4) {
                            value = value.slice(0, 2) + '/' + value.slice(2);
                          } else if (value.length > 4) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                          }
                          handleAvailabilityDateChange('available_until', value);
                        }}
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary_expectation">Expectativa Salarial</Label>
                    <Input
                      id="salary_expectation"
                      value={profileForm.salary_expectation}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = formatCurrency(parseFloat(value) / 100);
                        setProfileForm({...profileForm, salary_expectation: formatted});
                      }}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="professional_experience">Experiência Profissional</Label>
                    <Textarea
                      id="professional_experience"
                      value={profileForm.professional_experience}
                      onChange={(e) => setProfileForm({...profileForm, professional_experience: e.target.value})}
                      placeholder="Descreva sua experiência profissional..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Certificados & Cursos */}
              <Collapsible open={certificacoesOpen} onOpenChange={setCertificacoesOpen}>
                <Card className="border-0 shadow-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base font-medium">
                          <Award className="h-5 w-5 mr-3 text-muted-foreground" />
                          Certificados & Cursos
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {activeCertifications.length} certificações
                          </Badge>
                          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${certificacoesOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <CertificationUpload
                        certifications={certifications}
                        onCertificationsChange={setCertifications}
                        onSave={handleSaveCertifications}
                        userId={user?.id || ''}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Anexos / CV */}
              <Collapsible open={anexosOpen} onOpenChange={setAnexosOpen}>
                <Card className="border-0 shadow-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base font-medium">
                          <Paperclip className="h-5 w-5 mr-3 text-muted-foreground" />
                          Anexos
                        </CardTitle>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${anexosOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <Label>Currículo (PDF)</Label>
                        {profileForm.cv_file_name ? (
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-red-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{profileForm.cv_file_name}</p>
                                <p className="text-xs text-muted-foreground">Currículo</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (profileForm.cv_file_path) {
                                    supabase.storage
                                      .from('feed-documents')
                                      .download(profileForm.cv_file_path)
                                      .then(({ data, error }) => {
                                        if (error) throw error;
                                        const url = URL.createObjectURL(data);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = profileForm.cv_file_name;
                                        document.body.appendChild(link);
                                        link.click();
                                        URL.revokeObjectURL(url);
                                        document.body.removeChild(link);
                                        toast({
                                          title: "Sucesso",
                                          description: "Download do currículo iniciado",
                                        });
                                      })
                                      .catch((error) => {
                                        console.error('Download error:', error);
                                        toast({
                                          title: "Erro",
                                          description: "Erro ao fazer download do currículo",
                                          variant: "destructive",
                                        });
                                      });
                                  }
                                }}
                                className="h-8 w-8"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    if (profileForm.cv_file_path) {
                                      await supabase.storage
                                        .from('feed-documents')
                                        .remove([profileForm.cv_file_path]);
                                    }

                                    await supabase
                                      .from('profiles')
                                      .update({
                                        cv_file_path: null,
                                        cv_file_name: null
                                      })
                                      .eq('user_id', user?.id);

                                    setProfileForm(prev => ({
                                      ...prev,
                                      cv_file_path: "",
                                      cv_file_name: ""
                                    }));

                                    toast({
                                      title: "Sucesso",
                                      description: "Currículo removido com sucesso!",
                                    });
                                  } catch (error: any) {
                                    console.error('Erro ao remover CV:', error);
                                    toast({
                                      title: "Erro",
                                      description: "Falha ao remover currículo.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className="block">
                            <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors cursor-pointer">
                              <div className="text-center">
                                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm font-medium mb-1">
                                  Clique para enviar seu currículo
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Apenas PDF, máximo 10MB
                                </p>
                              </div>
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  // Validação mais flexível para PDFs (aceita variações de MIME type)
                                  const validPdfTypes = [
                                    'application/pdf',
                                    'application/x-pdf',
                                    'application/acrobat',
                                    'applications/vnd.pdf',
                                    'text/pdf',
                                    'text/x-pdf'
                                  ];
                                  const isPdf = validPdfTypes.includes(file.type) || 
                                               file.name.toLowerCase().endsWith('.pdf');

                                  if (!isPdf) {
                                    toast({
                                      title: "Erro",
                                      description: "Apenas arquivos PDF são aceitos. Tipo detectado: " + (file.type || "desconhecido"),
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({
                                      title: "Erro",
                                      description: "Arquivo deve ter no máximo 10MB",
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  try {
                                    toast({
                                      title: "Enviando...",
                                      description: "Fazendo upload do currículo",
                                    });

                                    const timestamp = Date.now();
                                    const fileName = `curriculo_${timestamp}.pdf`;
                                    const filePath = `${user?.id}/cv/${fileName}`;

                                    const { error: uploadError } = await supabase.storage
                                      .from('feed-documents')
                                      .upload(filePath, file);

                                    if (uploadError) throw uploadError;

                                    setProfileForm(prev => ({
                                      ...prev,
                                      cv_file_path: filePath,
                                      cv_file_name: fileName
                                    }));

                                    await supabase
                                      .from('profiles')
                                      .update({
                                        cv_file_path: filePath,
                                        cv_file_name: fileName
                                      })
                                      .eq('user_id', user?.id);

                                    toast({
                                      title: "Sucesso",
                                      description: "Currículo enviado com sucesso!",
                                    });

                                  } catch (error: any) {
                                    console.error('Upload error:', error);
                                    toast({
                                      title: "Erro",
                                      description: "Erro ao enviar currículo: " + error.message,
                                      variant: "destructive",
                                    });
                                  }

                                  e.target.value = '';
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </div>
                          </label>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </form>

        {/* Footer - Fixed at bottom - Responsivo */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 sm:p-4 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Progresso - Oculto em mobile para dar espaço aos botões */}
            <div className="hidden sm:flex items-center gap-4 flex-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Progresso do Cadastro</span>
              <Progress value={profileProgress} className="flex-1 max-w-md h-2" />
              <span className="text-sm font-medium">{profileProgress}%</span>
            </div>
            
            {/* Progresso simplificado para mobile */}
            <div className="flex sm:hidden items-center gap-2 w-full">
              <Progress value={profileProgress} className="flex-1 h-2" />
              <span className="text-xs font-medium text-muted-foreground">{profileProgress}%</span>
            </div>
            
            {/* Botões - Stack em mobile, inline em desktop */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="flex-1 sm:flex-none h-11 sm:h-10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Voltar para Lista</span>
                <span className="sm:hidden">Voltar</span>
              </Button>
              <Button 
                type="button"
                onClick={handleSaveAll}
                disabled={savingProfile || savingCertifications}
                className="flex-1 sm:flex-none h-11 sm:h-10 bg-primary hover:bg-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingProfile || savingCertifications ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
