import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  User, 
  FileText, 
  Download, 
  Award, 
  ChevronDown, 
  MapPin, 
  Briefcase,
  Paperclip,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Lock,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CandidateVideoSection } from "@/components/CandidateVideoSection";
import { CandidateDocumentsDrawer } from "@/components/CandidateDocumentsDrawer";

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  birth_date: string;
  gender: string;
  residence_location: string;
  desired_function: string;
  professional_experience: string;
  salary_expectation: number;
  vessel_type: string;
  available_from: string;
  available_until: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  address_number: string;
  address_complement: string;
  languages: string;
  avatar_url: string;
  profile_complete: boolean;
  cv_file_path?: string;
  cv_file_name?: string;
}

interface Language {
  name?: string;
  language?: string;
  level: string;
}

interface Certification {
  [key: string]: boolean | string | null;
}

interface Document {
  id: string;
  name: string;
  path: string;
  uploaded_at: string;
  size?: number;
  source?: 'storage' | 'admin';
}

interface VisibilitySettings {
  show_availability: boolean;
  show_salary_expectation: boolean;
  show_certifications: boolean;
  show_documents: boolean;
  show_personal_documents: boolean;
  show_address: boolean;
  show_professional_experience: boolean;
  show_contact_info: boolean;
}

export default function ClientCandidateView() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { candidateId } = useParams();
  const { user, userRole } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [certifications, setCertifications] = useState<Certification>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<VisibilitySettings | null>(null);
  const [clientCandidateId, setClientCandidateId] = useState<string>("");
  const [documentsDrawerOpen, setDocumentsDrawerOpen] = useState(false);
  
  // Collapsible states
  const [dadosBasicosOpen, setDadosBasicosOpen] = useState(true);
  const [documentosPessoaisOpen, setDocumentosPessoaisOpen] = useState(false);
  const [enderecoOpen, setEnderecoOpen] = useState(false);

  useEffect(() => {
    if (candidateId) {
      fetchProfileData();
    }
  }, [candidateId]);

  const fetchProfileData = async () => {
    if (!candidateId || !user) return;

    try {
      setLoading(true);

      // Buscar o client_candidate_id para este candidato/usuário
      // Primeiro, buscar o client do usuário logado
      let clientId: string | null = null;
      let resolvedCcId: string | null = null;

      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clientData) {
        clientId = clientData.id;
      } else {
        const { data: companyUserData } = await supabase
          .from("company_users")
          .select("client_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (companyUserData) {
          clientId = companyUserData.client_id;
        }
      }

      if (clientId) {
        // Buscar o client_candidate para obter as configurações de visibilidade
        const { data: clientCandidateData } = await supabase
          .from("client_candidates")
          .select("id")
          .eq("client_id", clientId)
          .eq("candidate_id", candidateId)
          .maybeSingle();

        if (clientCandidateData) {
          resolvedCcId = clientCandidateData.id;
          setClientCandidateId(clientCandidateData.id);
          // Buscar configurações de visibilidade
          const { data: visibilityData } = await supabase
            .from("client_candidate_visibility")
            .select("*")
            .eq("client_candidate_id", clientCandidateData.id)
            .maybeSingle();

          if (visibilityData) {
            setVisibility(visibilityData as VisibilitySettings);
          } else {
            // Se não houver registro, mostrar tudo (fallback para clientes antigos)
            setVisibility({
              show_availability: true,
              show_salary_expectation: true,
              show_certifications: true,
              show_documents: true,
              show_personal_documents: true,
              show_address: true,
              show_professional_experience: true,
              show_contact_info: true,
            });
          }
        }
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', candidateId)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      if (profileData.languages) {
        try {
          const parsedLanguages = JSON.parse(profileData.languages);
          setLanguages(Array.isArray(parsedLanguages) ? parsedLanguages : []);
        } catch {
          setLanguages([]);
        }
      }

      const { data: certData, error: certError } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', candidateId)
        .single();

      if (certError && certError.code !== 'PGRST116') {
        console.error('Erro ao buscar certificações:', certError);
      } else if (certData) {
        setCertifications(certData);
      }

      // Fetch storage documents
      const allDocs: Document[] = [];
      
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('feed-documents')
        .list(candidateId);

      if (storageError) {
        console.error('Erro ao buscar documentos:', storageError);
      } else if (storageFiles) {
        const formattedDocs = storageFiles
          .filter(file => !!file.id)
          .map(file => ({
            id: file.id || file.name,
            name: file.name,
            path: `${candidateId}/${file.name}`,
            uploaded_at: file.updated_at || file.created_at,
            size: file.metadata?.size || 0,
            source: 'storage' as const,
          }));
        allDocs.push(...formattedDocs);
      }

      // Fetch admin-attached documents from client_candidate_documents
      if (resolvedCcId) {
        const { data: adminDocs, error: adminDocsError } = await supabase
          .from('client_candidate_documents')
          .select('*')
          .eq('client_candidate_id', resolvedCcId)
          .order('created_at', { ascending: false });

        if (adminDocsError) {
          console.error('Erro ao buscar documentos do admin:', adminDocsError);
        } else if (adminDocs) {
          const formattedAdminDocs = adminDocs.map(doc => ({
            id: doc.id,
            name: doc.file_name,
            path: doc.file_path,
            uploaded_at: doc.created_at,
            size: 0,
            source: 'admin' as const,
          }));
          allDocs.push(...formattedAdminDocs);
        }
      }

      setDocuments(allDocs);

    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar informações do candidato",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    if (!value) return 'Não informado';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0.1 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getUserInitials = (fullName?: string) => {
    if (!fullName) return 'U';
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return fullName[0].toUpperCase();
  };

  const getLevelLabel = (level: string) => {
    const levels: Record<string, string> = {
      basic: 'Básico',
      intermediate: 'Intermediário',
      advanced: 'Avançado',
      fluent: 'Fluente',
      native: 'Nativo'
    };
    return levels[level] || level;
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      // Try direct download first, fall back to signed URL
      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(filePath);

      if (error) {
        // Fallback: try creating a signed URL
        const { data: signedData, error: signedError } = await supabase.storage
          .from('feed-documents')
          .createSignedUrl(filePath, 3600);

        if (signedError) throw signedError;
        if (!signedData?.signedUrl) throw new Error('URL não gerada');

        // Download via signed URL
        const response = await fetch(signedData.signedUrl);
        if (!response.ok) throw new Error('Erro ao baixar arquivo');
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      } else {
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }

      toast({
        title: "Sucesso",
        description: "Download iniciado",
      });

    } catch (error: any) {
      console.error('Erro no download:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer download do arquivo: " + (error.message || 'Erro desconhecido'),
        variant: "destructive",
      });
    }
  };

  const handleCertificationDownload = async (certId: string) => {
    const filePath = certifications[`${certId}_file_path`] as string;
    const fileName = (certifications[`${certId}_file_name`] as string) || `${certId}_certificate`;
    
    if (!filePath || typeof filePath !== 'string') {
      toast({
        title: "Erro",
        description: "Arquivo não encontrado",
        variant: "destructive",
      });
      return;
    }
    
    await handleDownload(filePath, fileName);
  };

  const handleDocumentDownload = async (document: Document) => {
    await handleDownload(document.path, document.name);
  };

  const CERTIFICATIONS_LIST = [
    { id: 'stcw', name: 'STCW' },
    { id: 'cerr', name: 'CERR' },
    { id: 'efnt', name: 'EFNT' },
    { id: 'ebpq', name: 'EBPQ' },
    { id: 'ebgl', name: 'EBGL' },
    { id: 'esop', name: 'ESOP' },
    { id: 'cns014', name: 'CNS-014' },
    { id: 'lpn', name: 'LPN' },
    { id: 'gmdss', name: 'GMDSS' },
    { id: 'cft', name: 'CFT' },
    { id: 'caaq', name: 'CAAQ' },
    { id: 'cbsp', name: 'CBSP' },
    { id: 'tbs1', name: 'TBS-1' },
    { id: 'cir', name: 'CIR' },
    { id: 'thuet', name: 'THUET' },
    { id: 'alph', name: 'ALPH' },
    { id: 'espe', name: 'ESPE' },
    { id: 'esrs', name: 'ESRS' },
    { id: 'ebps', name: 'EBPS' },
    { id: 'ecin', name: 'ECIN' },
    { id: 'ecia_caci', name: 'ECIA/CACI' },
    { id: 'ebcp', name: 'EBCP' },
    { id: 'eopn', name: 'EOPN' },
    { id: 'epsm', name: 'EPSM' },
    { id: 'cess', name: 'CESS' }
  ];

  const activeCertifications = CERTIFICATIONS_LIST.filter(cert => certifications[cert.id]);

  // Componente para bloco bloqueado
  const BlockedContent = ({ label }: { label: string }) => (
    <Alert className="bg-muted/50 border-dashed">
      <Lock className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-2">
        <EyeOff className="h-4 w-4" />
        {label} não disponível para visualização
      </AlertDescription>
    </Alert>
  );

  if (loading) {
    return (
      <DashboardLayout userType="client">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout userType="client">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-primary">Candidato</h1>
          <Card>
            <CardContent className="flex items-center justify-center h-64 text-center">
              <p className="text-muted-foreground">Candidato não encontrado</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="client">
      <div className="min-h-screen bg-muted/30 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Informações do Candidato</h1>
            <p className="text-sm text-muted-foreground">Visualização do profissional</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/c/aprovados')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Profile Photo Card - Sempre visível */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {getUserInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold mt-4">{profile.full_name}</h2>
                  <p className="text-muted-foreground">{profile.desired_function || 'Função não informada'}</p>
                  <Badge 
                    variant={profile.profile_complete ? "default" : "secondary"} 
                    className={`mt-2 ${profile.profile_complete ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                  >
                    {profile.profile_complete ? 'Perfil Completo' : 'Perfil Incompleto'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Vídeo de Apresentação */}
            <CandidateVideoSection candidateId={candidateId!} canDelete={userRole === 'admin' || userRole === 'ti'} />

            {/* Dados Básicos - Sempre visível (nome, função, contato condicionado) */}
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
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome Completo</p>
                        <p className="text-sm font-medium">{profile.full_name}</p>
                      </div>
                      
                      {visibility?.show_contact_info ? (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> E-mail
                            </p>
                            <p className="text-sm font-medium">{profile.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> Telefone
                            </p>
                            <p className="text-sm font-medium">{profile.phone}</p>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2">
                          <BlockedContent label="Informações de contato" />
                        </div>
                      )}
                      
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Data de Nascimento
                        </p>
                        <p className="text-sm font-medium">{formatDate(profile.birth_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gênero</p>
                        <p className="text-sm font-medium capitalize">{profile.gender || 'Não informado'}</p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Documentos Pessoais - Condicionado */}
            {visibility?.show_personal_documents && (
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
                    <CardContent className="pt-0 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">CPF</p>
                          <p className="text-sm font-medium">{profile.cpf || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">RG</p>
                          <p className="text-sm font-medium">{profile.rg || 'Não informado'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Endereço - Condicionado */}
            {visibility?.show_address && (
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
                    <CardContent className="pt-0 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">CEP</p>
                          <p className="text-sm font-medium">{profile.cep || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rua</p>
                          <p className="text-sm font-medium">{profile.street || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Número</p>
                          <p className="text-sm font-medium">{profile.address_number || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bairro</p>
                          <p className="text-sm font-medium">{profile.neighborhood || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cidade</p>
                          <p className="text-sm font-medium">{profile.city || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Estado</p>
                          <p className="text-sm font-medium">{profile.state || 'Não informado'}</p>
                        </div>
                        {profile.address_complement && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Complemento</p>
                            <p className="text-sm font-medium">{profile.address_complement}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Idiomas */}
            {languages.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base font-medium">
                    Idiomas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang, index) => (
                      <Badge key={index} variant="secondary">
                        {lang.name || lang.language} - {getLevelLabel(lang.level)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Currículo do Candidato */}
            {visibility?.show_documents && profile.cv_file_path && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base font-medium">
                    <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                    Currículo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded flex items-center justify-center bg-red-100">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{profile.cv_file_name || 'Currículo'}</p>
                        <p className="text-xs text-muted-foreground">PDF</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(profile.cv_file_path!, profile.cv_file_name || 'curriculo.pdf')}
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações Profissionais */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-base font-medium">
                  <Briefcase className="h-5 w-5 mr-3 text-muted-foreground" />
                  Informações Profissionais
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Função Desejada</p>
                  <p className="text-sm font-medium">{profile.desired_function || 'Não informado'}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Embarcação</p>
                  <p className="text-sm font-medium">{profile.vessel_type || 'Não informado'}</p>
                </div>

                {/* Disponibilidade - Condicionado */}
                {visibility?.show_availability ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Disponível de</p>
                      <p className="text-sm font-medium">{profile.available_from ? formatDate(profile.available_from) : 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Até</p>
                      <p className="text-sm font-medium">{profile.available_until ? formatDate(profile.available_until) : 'Não informado'}</p>
                    </div>
                  </div>
                ) : null}

                {/* Expectativa Salarial - Condicionado */}
                {visibility?.show_salary_expectation ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Expectativa Salarial</p>
                    <p className="text-sm font-medium">{formatCurrency(profile.salary_expectation)}</p>
                  </div>
                ) : null}

                {/* Experiência Profissional - Condicionado e só mostra se tiver conteúdo */}
                {visibility?.show_professional_experience && profile.professional_experience && profile.professional_experience.trim() ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Experiência Profissional</p>
                    <div className="mt-1 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">
                        {profile.professional_experience}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Certificados & Cursos - Condicionado */}
            {visibility?.show_certifications ? (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-base font-medium">
                      <Award className="h-5 w-5 mr-3 text-muted-foreground" />
                      Certificados & Cursos
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {activeCertifications.length} certificações
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {activeCertifications.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeCertifications.map((cert) => (
                        <Badge 
                          key={cert.id} 
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => {
                            if (certifications[`${cert.id}_file_path`]) {
                              handleCertificationDownload(cert.id);
                            }
                          }}
                        >
                          {cert.name}
                          {certifications[`${cert.id}_file_path`] && (
                            <Download className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma certificação cadastrada
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base font-medium">
                    <Award className="h-5 w-5 mr-3 text-muted-foreground" />
                    Certificados & Cursos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <BlockedContent label="Certificações" />
                </CardContent>
              </Card>
            )}

            {/* Anexos - Condicionado */}
            {visibility?.show_documents ? (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base font-medium">
                    <Paperclip className="h-5 w-5 mr-3 text-muted-foreground" />
                   Anexos
                    <Badge variant="outline" className="ml-2 text-xs">{documents.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded flex items-center justify-center ${doc.source === 'admin' ? 'bg-blue-100' : 'bg-red-100'}`}>
                              <FileText className={`h-5 w-5 ${doc.source === 'admin' ? 'text-blue-600' : 'text-red-600'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[200px]">{doc.name}</p>
                              <div className="flex items-center gap-2">
                                {doc.size ? (
                                  <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
                                ) : null}
                                {doc.source === 'admin' && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Anexado pelo Admin</Badge>
                                )}
                                {doc.uploaded_at && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDocumentDownload(doc)}
                            className="h-8 w-8"
                          >
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum anexo encontrado
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base font-medium">
                    <Paperclip className="h-5 w-5 mr-3 text-muted-foreground" />
                    Anexos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <BlockedContent label="Documentos anexados" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <CandidateDocumentsDrawer
        isOpen={documentsDrawerOpen}
        onClose={() => setDocumentsDrawerOpen(false)}
        clientCandidateId={clientCandidateId}
        candidateName={profile?.full_name || ""}
      />
    </DashboardLayout>
  );
}
