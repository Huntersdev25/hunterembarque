import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Save, User, ChevronLeft, ChevronRight, Check, MapPin, Briefcase, Languages, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { JobFunctionSelector } from "@/components/JobFunctionSelector";
import { MultiFunctionSelector } from "@/components/MultiFunctionSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CertificationUpload } from "@/components/CertificationUpload";
import { fetchCepData, formatCep, isValidCep } from "@/lib/viaCep";
import { formatPhoneBR } from "@/lib/phoneFormat";
import { isValidCPF, formatCPF, isValidRG, formatRG } from "@/lib/validators";
import { cn } from "@/lib/utils";

interface Candidate {
  id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
  gender?: "masculino" | "feminino" | "outro";
  residence_location?: string;
  desired_function?: string;
  functions?: string[];
  professional_experience?: string;
  salary_expectation?: number;
  vessel_type?: string;
  available_from?: string;
  available_until?: string;
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address_number?: string;
  address_complement?: string;
  profile_complete?: boolean;
}

interface Language {
  name: string;
  level: string;
}

interface AdminCandidateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: Candidate | null;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, name: "Dados Básicos", icon: User, required: true },
  { id: 2, name: "Endereço", icon: MapPin, required: false },
  { id: 3, name: "Profissional", icon: Briefcase, required: false },
  { id: 4, name: "Idiomas", icon: Languages, required: false },
  { id: 5, name: "Certificações", icon: Award, required: false },
];

export function AdminCandidateDrawer({ open, onOpenChange, candidate, onSuccess }: AdminCandidateDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [certifications, setCertifications] = useState<any>({});
  const [profFunctions, setProfFunctions] = useState<string[]>([]);

  const [formData, setFormData] = useState<Candidate>({
    full_name: "",
    email: "",
    phone: "",
    cpf: "",
    rg: "",
    birth_date: "",
    gender: undefined,
    residence_location: "",
    desired_function: "",
    professional_experience: "",
    salary_expectation: 0,
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
    profile_complete: false,
  });

  // Reset step when opening
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open]);

  // Load candidate data when editing
  useEffect(() => {
    if (candidate && open) {
      setFormData({
        id: candidate.id,
        user_id: candidate.user_id,
        full_name: candidate.full_name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        cpf: candidate.cpf || "",
        rg: candidate.rg || "",
        birth_date: candidate.birth_date || "",
        gender: candidate.gender,
        residence_location: candidate.residence_location || "",
        desired_function: candidate.desired_function || "",
        professional_experience: candidate.professional_experience || "",
        salary_expectation: candidate.salary_expectation || 0,
        vessel_type: candidate.vessel_type || "",
        available_from: candidate.available_from || "",
        available_until: candidate.available_until || "",
        cep: candidate.cep || "",
        street: candidate.street || "",
        neighborhood: candidate.neighborhood || "",
        city: candidate.city || "",
        state: candidate.state || "",
        address_number: candidate.address_number || "",
        address_complement: candidate.address_complement || "",
        profile_complete: candidate.profile_complete || false,
      });
      setProfFunctions(Array.isArray(candidate.functions) ? candidate.functions : []);

      if (candidate.user_id) {
        loadAdditionalData(candidate.user_id);
      }
    } else if (!candidate && open) {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        cpf: "",
        rg: "",
        birth_date: "",
        gender: undefined,
        residence_location: "",
        desired_function: "",
        professional_experience: "",
        salary_expectation: 0,
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
        profile_complete: false,
      });
      setProfFunctions([]);
      setLanguages([]);
      setCertifications({});
    }
  }, [candidate, open]);

  const loadAdditionalData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('languages')
        .eq('user_id', userId)
        .single();

      if (profileData?.languages) {
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

      const { data: certData } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (certData) {
        setCertifications(certData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados adicionais:', error);
    }
  };

  // Feedback em tempo real (só acusa quando há dígitos suficientes)
  const cpfInvalid = (formData.cpf || "").replace(/\D/g, "").length === 11 && !isValidCPF(formData.cpf || "");
  const rgInvalid = (formData.rg || "").trim().length >= 7 && !isValidRG(formData.rg || "");

  const handleCepBlur = async () => {
    setCepError(false);
    if (!formData.cep) return;
    if (!isValidCep(formData.cep)) {
      setCepError(true);
      return;
    }

    setLoadingCep(true);
    try {
      const cepData = await fetchCepData(formData.cep);

      if (cepData) {
        setFormData(prev => ({
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
          description: "Verifique o CEP informado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setLoadingCep(false);
    }
  };

  const validateStep1 = (): boolean => {
    if (!formData.full_name || !formData.email || !formData.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, email e telefone são obrigatórios",
        variant: "destructive"
      });
      return false;
    }

    if (formData.cpf && !isValidCPF(formData.cpf)) {
      toast({
        title: "Erro",
        description: "CPF inválido — verifique os dígitos.",
        variant: "destructive"
      });
      return false;
    }

    if (formData.rg && !isValidRG(formData.rg)) {
      toast({
        title: "Erro",
        description: "RG inválido — verifique o número.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) {
      return;
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    try {
      if (candidate && candidate.user_id) {
        const updateData = {
          ...formData,
          languages: languages.length > 0 ? JSON.stringify(languages) : null,
          salary_expectation: formData.salary_expectation || null,
          birth_date: formData.birth_date ? (() => {
            if (formData.birth_date.includes('/')) {
              const [day, month, year] = formData.birth_date.split('/');
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return formData.birth_date;
          })() : null,
          available_from: formData.available_from ? (() => {
            if (formData.available_from.includes('/')) {
              const [day, month, year] = formData.available_from.split('/');
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return formData.available_from;
          })() : null,
          available_until: formData.available_until ? (() => {
            if (formData.available_until.includes('/')) {
              const [day, month, year] = formData.available_until.split('/');
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return formData.available_until;
          })() : null,
        };

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', candidate.user_id);

        if (error) throw error;

        // Salva as funções do profissional em chamada isolada — se a coluna
        // `functions` ainda não tiver sido migrada, não derruba o resto do save.
        const { error: fnError } = await supabase
          .from('profiles')
          .update({ functions: profFunctions } as any)
          .eq('user_id', candidate.user_id);
        if (fnError) console.warn('Não foi possível salvar as funções (rode a migração do catálogo):', fnError.message);

        if (Object.keys(certifications).length > 0) {
          // Build clean certification data, converting DD/MM/YYYY dates to YYYY-MM-DD
          const certUpdateData: Record<string, any> = { user_id: candidate.user_id };
          
          const convertDateToISO = (dateStr: string | null | undefined): string | null => {
            if (!dateStr) return null;
            // Already in ISO format (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            // Convert DD/MM/YYYY to YYYY-MM-DD
            const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) return `${match[3]}-${match[2]}-${match[1]}`;
            return null;
          };

          // Copy only valid certification columns, skip system fields
          const skipFields = ['id', 'created_at', 'updated_at'];
          for (const [key, value] of Object.entries(certifications)) {
            if (skipFields.includes(key)) continue;
            // Convert date fields
            if (key.endsWith('_issue_date') || key.endsWith('_validity') || key === 'stcw_validity_date') {
              certUpdateData[key] = convertDateToISO(value as string);
            } else {
              certUpdateData[key] = value;
            }
          }
          
          const { error: certError } = await supabase
            .from('certifications')
            .upsert(certUpdateData as any, {
              onConflict: 'user_id'
            });

          if (certError) {
            console.error('Erro ao salvar certificações:', certError);
            toast({
              title: "Aviso",
              description: "Erro ao salvar certificações: " + certError.message,
              variant: "destructive"
            });
          }
        }

        toast({
          title: "Sucesso",
          description: "Candidato atualizado com sucesso"
        });
      } else {
        const candidateData = {
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone,
          cpf: formData.cpf || undefined,
          rg: formData.rg || undefined,
          birth_date: formData.birth_date ? (() => {
            if (formData.birth_date.includes('/')) {
              const [day, month, year] = formData.birth_date.split('/');
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return formData.birth_date;
          })() : undefined,
          gender: formData.gender || undefined,
          residence_location: formData.residence_location || undefined,
          desired_function: formData.desired_function || undefined,
          professional_experience: formData.professional_experience || undefined,
          salary_expectation: formData.salary_expectation || undefined,
          vessel_type: formData.vessel_type || undefined,
          available_from: formData.available_from ? (() => {
            if (formData.available_from.includes('/')) {
              const [day, month, year] = formData.available_from.split('/');
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return formData.available_from;
          })() : undefined,
          available_until: formData.available_until ? (() => {
            if (formData.available_until.includes('/')) {
              const [day, month, year] = formData.available_until.split('/');
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            return formData.available_until;
          })() : undefined,
          cep: formData.cep || undefined,
          street: formData.street || undefined,
          neighborhood: formData.neighborhood || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          address_number: formData.address_number || undefined,
          address_complement: formData.address_complement || undefined,
          languages: languages.length > 0 ? JSON.stringify(languages) : undefined,
        };

        const { data, error } = await supabase.functions.invoke('create-candidate', {
          body: candidateData
        });

        if (error) {
          const errorMessage = error.message || 'Erro ao criar candidato';
          if (error.context?.body) {
            try {
              const errorBody = JSON.parse(error.context.body);
              throw new Error(errorBody.error || errorMessage);
            } catch (parseError) {
              throw new Error(errorMessage);
            }
          }
          throw new Error(errorMessage);
        }
        
        if (data && !data.success) throw new Error(data.error || 'Erro desconhecido');

        toast({
          title: "Sucesso",
          description: "Candidato criado com sucesso! O candidato receberá as instruções de acesso."
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar candidato:', error);
      toast({
        title: "Erro",
        description: `Erro ao salvar candidato: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="Digite o nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@exemplo.com"
                required
                disabled={!!candidate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                placeholder="+55 11 98765-4321"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: formatPhoneBR(e.target.value)})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  aria-invalid={cpfInvalid}
                  className={cpfInvalid ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
                {cpfInvalid && <p className="text-xs text-destructive">CPF inválido</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg}
                  onChange={(e) => setFormData({...formData, rg: formatRG(e.target.value)})}
                  aria-invalid={rgInvalid}
                  className={rgInvalid ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
                {rgInvalid && <p className="text-xs text-destructive">RG inválido</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gênero</Label>
                <Select value={formData.gender || ""} onValueChange={(value) => setFormData({...formData, gender: value as "masculino" | "feminino" | "outro"})}>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => { setCepError(false); setFormData({...formData, cep: formatCep(e.target.value)}); }}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                  disabled={loadingCep}
                  aria-invalid={cepError}
                  className={cepError ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
                {cepError && <p className="text-xs text-destructive">CEP inválido ou não encontrado</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Logradouro</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({...formData, street: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_number">Número</Label>
                <Input
                  id="address_number"
                  value={formData.address_number}
                  onChange={(e) => setFormData({...formData, address_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_complement">Complemento</Label>
                <Input
                  id="address_complement"
                  value={formData.address_complement}
                  onChange={(e) => setFormData({...formData, address_complement: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="residence_location">Local de Residência</Label>
              <Input
                id="residence_location"
                value={formData.residence_location}
                onChange={(e) => setFormData({...formData, residence_location: e.target.value})}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <JobFunctionSelector
                value={formData.desired_function || ''}
                onChange={(value) => setFormData({...formData, desired_function: value})}
                label="Função Desejada"
              />
            </div>

            <div className="space-y-2">
              <MultiFunctionSelector value={profFunctions} onChange={setProfFunctions} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_expectation">Expectativa Salarial (R$)</Label>
                <Input
                  id="salary_expectation"
                  type="number"
                  value={formData.salary_expectation || ''}
                  onChange={(e) => setFormData({...formData, salary_expectation: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vessel_type">Tipo de Embarcação</Label>
                <Input
                  id="vessel_type"
                  value={formData.vessel_type}
                  onChange={(e) => setFormData({...formData, vessel_type: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="available_from">Disponível a partir de</Label>
                <Input
                  id="available_from"
                  value={formData.available_from}
                  onChange={(e) => setFormData({...formData, available_from: e.target.value})}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="available_until">Disponível até</Label>
                <Input
                  id="available_until"
                  value={formData.available_until}
                  onChange={(e) => setFormData({...formData, available_until: e.target.value})}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="professional_experience">Experiência Profissional</Label>
              <Textarea
                id="professional_experience"
                value={formData.professional_experience}
                onChange={(e) => setFormData({...formData, professional_experience: e.target.value})}
                rows={4}
                placeholder="Descreva a experiência profissional..."
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <LanguageSelector
              languages={languages}
              onLanguagesChange={setLanguages}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {candidate?.user_id ? (
              <CertificationUpload
                certifications={certifications}
                onCertificationsChange={setCertifications}
                onSave={async () => { await handleSubmit(); }}
                userId={candidate.user_id}
              />
            ) : (
              <div className="text-muted-foreground text-center py-8">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>As certificações podem ser adicionadas após salvar o candidato</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {candidate ? 'Editar Candidato' : 'Novo Candidato'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Formulário para {candidate ? 'editar' : 'cadastrar'} candidato em múltiplas etapas
          </SheetDescription>
          
          {/* Progress */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Etapa {currentStep} de {STEPS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </SheetHeader>

        {/* Step Indicators */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex justify-between">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id < currentStep || (step.id === 1) || (currentStep === 1 && validateStep1())) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-colors",
                    isActive && "text-primary",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.name}</span>
                  {step.required && <span className="text-[10px] text-destructive hidden sm:block">*</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-background mt-auto">
          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
              className="flex-1"
            >
              {currentStep === 1 ? (
                'Cancelar'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Voltar
                </>
              )}
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} className="flex-1">
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
          
          {/* Quick save option */}
          {currentStep > 1 && currentStep < STEPS.length && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-2 text-muted-foreground"
            >
              {loading ? 'Salvando...' : 'Salvar agora (pular etapas opcionais)'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
