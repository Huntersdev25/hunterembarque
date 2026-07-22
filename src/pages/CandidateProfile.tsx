import { useEffect, useState } from "react";
import { formatDateBR } from "@/lib/utils";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ProfilePDFExport } from "@/components/ProfilePDFExport";

interface Profile {
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
  url: string;
  uploaded_at: string;
  size?: number;
}

export default function CandidateProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [certifications, setCertifications] = useState<Certification>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Collapsible states
  const [dadosBasicosOpen, setDadosBasicosOpen] = useState(false);
  const [documentosPessoaisOpen, setDocumentosPessoaisOpen] = useState(false);
  const [enderecoOpen, setEnderecoOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
        .single();

      if (certError && certError.code !== 'PGRST116') {
        console.error('Erro ao buscar certificações:', certError);
      } else if (certData) {
        setCertifications(certData);
      }

      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('feed-documents')
        .list(user.id);

      if (storageError) {
        console.error('Erro ao buscar documentos:', storageError);
      } else if (storageFiles) {
        const formattedDocs = storageFiles.map(file => ({
          id: file.id || file.name,
          name: file.name,
          url: `${supabase.storage.from('feed-documents').getPublicUrl(`${user.id}/${file.name}`).data.publicUrl}`,
          uploaded_at: file.updated_at || file.created_at,
          size: file.metadata?.size || 0
        }));
        setDocuments(formattedDocs);
      }

    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar informações do perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    return formatDateBR(dateString);
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

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast({
        title: "Sucesso",
        description: "Download iniciado",
      });

    } catch (error: any) {
      console.error('Erro no download:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer download do arquivo",
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
    const filePath = `${user?.id}/${document.name}`;
    await handleDownload(filePath, document.name);
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

  const calculateProfileProgress = () => {
    if (!profile) return 0;
    let filled = 0;
    let total = 10;
    
    if (profile.full_name) filled++;
    if (profile.email) filled++;
    if (profile.phone) filled++;
    if (profile.cpf) filled++;
    if (profile.birth_date) filled++;
    if (profile.desired_function) filled++;
    if (profile.city && profile.state) filled++;
    if (profile.professional_experience) filled++;
    if (activeCertifications.length > 0) filled++;
    if (profile.avatar_url) filled++;
    
    return Math.round((filled / total) * 100);
  };

  if (loading) {
    return (
      <DashboardLayout userType="candidate">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout userType="candidate">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-primary">Meu Perfil</h1>
          <Card>
            <CardContent className="flex items-center justify-center h-64 text-center">
              <p className="text-muted-foreground">Perfil não encontrado</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const profileProgress = calculateProfileProgress();

  return (
    <DashboardLayout userType="candidate">
      <div className="min-h-screen bg-muted/30 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cadastro de Profissional</h1>
            <p className="text-sm text-muted-foreground">Visualização do colaborador</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar
            </Button>
            <ProfilePDFExport 
              profileData={profile}
              certifications={certifications}
            />
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Profile Photo Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {getUserInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-muted-foreground mt-3">Foto do Perfil</p>
                  <Badge 
                    variant={profile.profile_complete ? "default" : "secondary"} 
                    className={`mt-2 ${profile.profile_complete ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                  >
                    {profile.profile_complete ? 'Perfil Completo' : 'Perfil Incompleto'}
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
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome Completo</p>
                        <p className="text-sm font-medium">{profile.full_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <p className="text-sm font-medium">{profile.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{profile.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data de Nascimento</p>
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
                <div>
                  <p className="text-xs text-muted-foreground">Função Desejada</p>
                  <p className="text-sm font-medium">{profile.desired_function || 'Não informado'}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Embarcação</p>
                  <p className="text-sm font-medium">{profile.vessel_type || 'Não informado'}</p>
                </div>

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

                <div>
                  <p className="text-xs text-muted-foreground">Expectativa Salarial</p>
                  <p className="text-sm font-medium">{formatCurrency(profile.salary_expectation)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Experiência Profissional</p>
                  <div className="mt-1 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {profile.professional_experience || 'Nenhuma experiência informada'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificados & Cursos */}
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

            {/* Anexos */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-base font-medium">
                  <Paperclip className="h-5 w-5 mr-3 text-muted-foreground" />
                  Anexos
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
                          <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(doc.size || 0)}</p>
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
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Progresso do Cadastro</span>
              <Progress value={profileProgress} className="flex-1 max-w-md h-2" />
              <span className="text-sm font-medium">{profileProgress}%</span>
            </div>
            <Button 
              variant="default" 
              onClick={() => navigate('/dashboard')}
              className="bg-primary hover:bg-primary/90"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Lista
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
