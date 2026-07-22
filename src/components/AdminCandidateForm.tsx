import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { JobFunctionSelector } from "@/components/JobFunctionSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CertificationUpload } from "@/components/CertificationUpload";
import { fetchCepData, formatCep, isValidCep } from "@/lib/viaCep";
import { formatPhoneBR } from "@/lib/phoneFormat";
import { isValidCPF, formatCPF, isValidRG, formatRG } from "@/lib/validators";

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

interface AdminCandidateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: Candidate | null;
  onSuccess: () => void;
}

export function AdminCandidateForm({ open, onOpenChange, candidate, onSuccess }: AdminCandidateFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [certifications, setCertifications] = useState<any>({});

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

  // Carregar dados do candidato quando estiver editando
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

      // Carregar dados adicionais se estiver editando
      if (candidate.user_id) {
        loadAdditionalData(candidate.user_id);
      }
    } else if (!candidate && open) {
      // Resetar formulário para novo candidato
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
      setLanguages([]);
      setCertifications({});
    }
  }, [candidate, open]);

  // Feedback em tempo real (só acusa quando há dígitos suficientes)
  const cpfInvalid = (formData.cpf || "").replace(/\D/g, "").length === 11 && !isValidCPF(formData.cpf || "");
  const rgInvalid = (formData.rg || "").trim().length >= 7 && !isValidRG(formData.rg || "");

  const loadAdditionalData = async (userId: string) => {
    try {
      // Carregar idiomas do perfil
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

      // Carregar certificações
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.full_name || !formData.email || !formData.phone) {
      toast({
        title: "Erro",
        description: "Nome, email e telefone são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (formData.cpf && !isValidCPF(formData.cpf)) {
      toast({
        title: "Erro",
        description: "CPF inválido — verifique os dígitos.",
        variant: "destructive"
      });
      return;
    }

    if (formData.rg && !isValidRG(formData.rg)) {
      toast({
        title: "Erro",
        description: "RG inválido — verifique o número.",
        variant: "destructive"
      });
      return;
    }

    if (formData.cep && !isValidCep(formData.cep)) {
      toast({
        title: "Erro",
        description: "CEP inválido — informe os 8 dígitos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (candidate && candidate.user_id) {
        // Editar candidato existente
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

        // Salvar certificações se houver alterações
        if (Object.keys(certifications).length > 0) {
          const certUpdateData = { ...certifications, user_id: candidate.user_id };
          
          const { error: certError } = await supabase
            .from('certifications')
            .upsert(certUpdateData, {
              onConflict: 'user_id'
            });

          if (certError) {
            console.error('Erro ao salvar certificações:', certError);
          }
        }

        // Salvar certificações se houver alterações
        if (Object.keys(certifications).length > 0) {
          const certUpdateData = { ...certifications };
          
          const { error: certError } = await supabase
            .from('certifications')
            .upsert(certUpdateData)
            .eq('user_id', candidate.user_id);

          if (certError) {
            console.error('Erro ao salvar certificações:', certError);
          }
        }

        toast({
          title: "Sucesso",
          description: "Candidato atualizado com sucesso"
        });
      } else {
        // Criar novo candidato usando edge function específica
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
          // Tentar extrair mensagem de erro do contexto
          const errorMessage = error.message || 'Erro ao criar candidato';
          // Verificar se há dados de erro no contexto
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
    } catch (error) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {candidate ? 'Editar Candidato' : 'Adicionar Novo Candidato'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="address">Endereço</TabsTrigger>
              <TabsTrigger value="professional">Profissional</TabsTrigger>
              <TabsTrigger value="languages">Idiomas</TabsTrigger>
              <TabsTrigger value="certifications">Certificações</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Nome Completo *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        disabled={!!candidate} // Não permitir editar email
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        placeholder="+55 11 98765-4321"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: formatPhoneBR(e.target.value)})}
                        required
                      />
                    </div>
                    <div>
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
                      {cpfInvalid && <p className="text-xs text-destructive mt-1">CPF inválido</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        value={formData.rg}
                        onChange={(e) => setFormData({...formData, rg: formatRG(e.target.value)})}
                        aria-invalid={rgInvalid}
                        className={rgInvalid ? "border-destructive focus-visible:ring-destructive" : undefined}
                      />
                      {rgInvalid && <p className="text-xs text-destructive mt-1">RG inválido</p>}
                    </div>
                    <div>
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input
                        id="birth_date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                    <div>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
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
                      {cepError && <p className="text-xs text-destructive mt-1">CEP inválido ou não encontrado</p>}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="street">Logradouro</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({...formData, street: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="address_number">Número</Label>
                      <Input
                        id="address_number"
                        value={formData.address_number}
                        onChange={(e) => setFormData({...formData, address_number: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address_complement">Complemento</Label>
                      <Input
                        id="address_complement"
                        value={formData.address_complement}
                        onChange={(e) => setFormData({...formData, address_complement: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="residence_location">Local de Residência</Label>
                      <Input
                        id="residence_location"
                        value={formData.residence_location}
                        onChange={(e) => setFormData({...formData, residence_location: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="professional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Profissionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="desired_function">Função Desejada</Label>
                    <JobFunctionSelector
                      value={formData.desired_function || ''}
                      onChange={(value) => setFormData({...formData, desired_function: value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="salary_expectation">Expectativa Salarial (R$)</Label>
                      <Input
                        id="salary_expectation"
                        type="number"
                        value={formData.salary_expectation || ''}
                        onChange={(e) => setFormData({...formData, salary_expectation: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vessel_type">Tipo de Embarcação</Label>
                      <Input
                        id="vessel_type"
                        value={formData.vessel_type}
                        onChange={(e) => setFormData({...formData, vessel_type: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="available_from">Disponível a partir de</Label>
                      <Input
                        id="available_from"
                        value={formData.available_from}
                        onChange={(e) => setFormData({...formData, available_from: e.target.value})}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                    <div>
                      <Label htmlFor="available_until">Disponível até</Label>
                      <Input
                        id="available_until"
                        value={formData.available_until}
                        onChange={(e) => setFormData({...formData, available_until: e.target.value})}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="professional_experience">Experiência Profissional</Label>
                    <Textarea
                      id="professional_experience"
                      value={formData.professional_experience}
                      onChange={(e) => setFormData({...formData, professional_experience: e.target.value})}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="languages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Idiomas</CardTitle>
                </CardHeader>
                <CardContent>
                  <LanguageSelector
                    languages={languages}
                    onLanguagesChange={setLanguages}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Certificações</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate?.user_id ? (
                    <CertificationUpload
                      certifications={certifications}
                      onCertificationsChange={setCertifications}
                      onSave={async () => {}} // Função vazia já que o save será feito no form principal
                      userId={candidate.user_id}
                    />
                  ) : (
                    <div className="text-muted-foreground text-center py-4">
                      As certificações podem ser adicionadas após salvar o candidato
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}