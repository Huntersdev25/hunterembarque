import { useState, useEffect } from "react";
import { formatDateBR, parseDateLocal } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Save, 
  User, 
  FileText, 
  Heart, 
  MapPin, 
  Building2,
  Award,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Trash2,
  Upload,
  Briefcase,
  Calendar,
  Phone,
  Mail,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfilePDFExport } from "@/components/ProfilePDFExport";
import { ProfessionalDocumentsDrawer } from "@/components/ProfessionalDocumentsDrawer";
import { AdminCandidateDrawer } from "@/components/AdminCandidateDrawer";
import { AssignCandidateToJob } from "@/components/AssignCandidateToJob";
import { AssignCandidateToClient } from "@/components/AssignCandidateToClient";
import { ProfessionalActivityHistory } from "@/components/ProfessionalActivityHistory";

interface Candidate {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
  gender?: string;
  residence_location?: string;
  desired_function?: string;
  functions?: string[];
  professional_experience?: string;
  salary_expectation?: number;
  vessel_type?: string;
  available_from?: string;
  available_until?: string;
  profile_complete: boolean;
  created_at: string;
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address_number?: string;
  address_complement?: string;
  languages?: string;
  cv_file_path?: string;
  cv_file_name?: string;
  avatar_url?: string;
}

interface Certification {
  [key: string]: boolean | string | null;
}

interface Document {
  id: string;
  name: string;
  path: string;
  size?: string;
  uploaded_at: string;
}

const CERTIFICATIONS_LIST = [
  { id: 'cir', name: 'CIR – Carteira de Inscrição e Registro' },
  { id: 'stcw', name: 'STCW – International Convention on Standards' },
  { id: 'caaq', name: 'CAAQ – Curso de Adaptação para Aquaviários' },
  { id: 'tbs1', name: 'TBS1 – Treinamento Básico de Segurança' },
  { id: 'espe', name: 'ESPE – Especial básico de sobrevivência' },
  { id: 'esrs', name: 'ESRS – Especial básico de Responsabilidade Social' },
  { id: 'ebps', name: 'EBPS – Especial básico de primeiros socorros' },
  { id: 'ecin', name: 'ECIN – Especial básico de Combate a Incêndio' },
  { id: 'ecia_caci', name: 'ECIA/CACI – Especial Avançado de Combate a Incêndio' },
  { id: 'eopn', name: 'EOPN – Especial para Oficiais de Proteção de Navio' },
  { id: 'ebcp', name: 'EBCP – Especial Básico de Conscientização' },
  { id: 'thuet', name: 'THUET – Treinamento em Escape de Helicópteros' },
  { id: 'cbsp', name: 'CBSP – Curso Básico de Segurança de Plataforma' },
  { id: 'cess', name: 'CESS – Curso Especial de Embarcações de Sobrevivência' },
  { id: 'cerr', name: 'CERR – Curso Especial de Embarcação Rápida de Resgate' },
  { id: 'efnt', name: 'EFNT – Especial de Familiarização de Navios Tanques' },
  { id: 'ebpq', name: 'EBPQ – Especial Básico de Navios Tanques Petroleiros' },
  { id: 'ebgl', name: 'EBGL – Especial Básico de Navio Tanque para Gás' },
  { id: 'esop', name: 'ESOP – Especial de Segurança em Operações de Carga' },
  { id: 'dp', name: 'DP – Dynamic Positioning' },
  { id: 'gmdss', name: 'GMDSS – Rádio Comunicação' },
  { id: 'cns014', name: 'CNS 14 – Rádio Operador' },
];

export default function ProfessionalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [certifications, setCertifications] = useState<Certification>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientCandidateRecords, setClientCandidateRecords] = useState<{id: string; client_name: string; job_title: string | null}[]>([]);
  const [selectedClientCandidateId, setSelectedClientCandidateId] = useState("");
  const [documentsDrawerOpen, setDocumentsDrawerOpen] = useState(false);
  const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isAssignJobOpen, setIsAssignJobOpen] = useState(false);
  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
  const [pendingDocumentsOpen, setPendingDocumentsOpen] = useState(false);
  // Collapsible states
  const [openSections, setOpenSections] = useState({
    basicData: true,
    documents: false,
    address: false,
    professional: true,
  });

  useEffect(() => {
    if (id) {
      fetchProfessionalData();
      fetchClientCandidates();
    }
  }, [id]);

  const fetchClientCandidates = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('client_candidates')
      .select('id, client_id, clients (company_name), jobs (title)')
      .eq('candidate_id', id);
    const records = (data || []).map((r: any) => ({
      id: r.id,
      client_name: r.clients?.company_name || 'Cliente',
      job_title: r.jobs?.title || null,
    }));
    setClientCandidateRecords(records);
    if (records.length === 1) setSelectedClientCandidateId(records[0].id);
  };

  const fetchProfessionalData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Buscar perfil do candidato
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();
      
      if (profileError) throw profileError;
      setCandidate(profileData);
      
      // Buscar certificações
      const { data: certData } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', id)
        .single();
      
      if (certData) {
        setCertifications(certData);
      }
      
      // Buscar documentos do storage
      const { data: storageFiles } = await supabase.storage
        .from('feed-documents')
        .list(id);
      
      if (storageFiles) {
        const formattedDocs = storageFiles
          .filter((file) => !!file.id)
          .map(file => ({
            id: file.id || file.name,
            name: file.name,
            path: `${id}/${file.name}`,
            size: file.metadata?.size ? `${(file.metadata.size / 1024 / 1024).toFixed(1)} MB` : undefined,
            uploaded_at: file.updated_at || file.created_at
          }));
        setDocuments(formattedDocs);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do profissional:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados do profissional"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return formatDateBR(dateString);
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(doc.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Download iniciado" });
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast({ variant: "destructive", title: "Erro ao baixar documento" });
    }
  };

  const handleDownloadCertification = async (certId: string) => {
    try {
      const filePath = certifications[`${certId}_file_path`] as string;
      const fileName = certifications[`${certId}_file_name`] as string;
      
      if (!filePath) {
        toast({ variant: "destructive", title: "Documento não encontrado" });
        return;
      }

      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `${certId}_certificate.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Download do certificado iniciado" });
    } catch (error) {
      console.error('Erro ao baixar certificado:', error);
      toast({ variant: "destructive", title: "Erro ao baixar certificado" });
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return;
    try {
      const { error } = await supabase.storage.from('feed-documents').remove([doc.path]);
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: "Anexo excluído com sucesso" });
    } catch (error: any) {
      console.error('Erro ao excluir anexo:', error);
      toast({ variant: "destructive", title: "Erro ao excluir anexo", description: error.message });
    }
  };

  const handleDeleteCertificationFile = async (certId: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo de certificação?')) return;
    try {
      const filePath = certifications[`${certId}_file_path`] as string;
      if (!filePath) {
        toast({ variant: "destructive", title: "Arquivo não encontrado" });
        return;
      }
      const { error: storageError } = await supabase.storage.from('feed-documents').remove([filePath]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase
        .from('certifications')
        .update({ [`${certId}_file_path`]: null, [`${certId}_file_name`]: null })
        .eq('user_id', candidate?.user_id);
      if (dbError) throw dbError;
      setCertifications(prev => ({ ...prev, [`${certId}_file_path`]: null, [`${certId}_file_name`]: null }));
      toast({ title: "Arquivo de certificação excluído" });
    } catch (error: any) {
      console.error('Erro ao excluir certificação:', error);
      toast({ variant: "destructive", title: "Erro ao excluir arquivo", description: error.message });
    }
  };

  const handleDeleteCV = async () => {
    if (!candidate?.cv_file_path) return;
    if (!confirm('Tem certeza que deseja excluir o currículo deste candidato?')) return;
    try {
      await supabase.storage.from('feed-documents').remove([candidate.cv_file_path]);
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ cv_file_path: null, cv_file_name: null })
        .eq('user_id', candidate.user_id);
      if (dbError) throw dbError;
      setCandidate({ ...candidate, cv_file_path: undefined, cv_file_name: undefined });
      toast({ title: "Currículo excluído com sucesso" });
    } catch (error: any) {
      console.error('Erro ao excluir CV:', error);
      toast({ variant: "destructive", title: "Erro ao excluir currículo", description: error.message });
    }
  };

  const calculateProfileProgress = () => {
    if (!candidate) return 0;
    const fields = [
      candidate.full_name,
      candidate.cpf,
      candidate.birth_date,
      candidate.phone,
      candidate.email,
      candidate.cep,
      candidate.city,
      candidate.state,
      candidate.desired_function
    ];
    const filled = fields.filter(f => f && String(f).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  const activeCertifications = CERTIFICATIONS_LIST.filter(cert => certifications[cert.id]);

  if (loading) {
    return (
      <DashboardLayout userType="admin">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!candidate) {
    return (
      <DashboardLayout userType="admin">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-lg">Profissional não encontrado</div>
          <Button onClick={() => navigate('/a/profissionais')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Cadastro de Profissional</h1>
            <p className="text-sm text-muted-foreground">Visualização do colaborador</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/a/profissionais')}>
              Voltar
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditDrawerOpen(true)}
              className="gap-1"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAssignJobOpen(true)}
              className="gap-1"
            >
              <Briefcase className="h-4 w-4" />
              Atribuir a Vaga
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsAssignClientOpen(true)}
              className="gap-1"
            >
              <Building2 className="h-4 w-4" />
              Atribuir a Cliente
            </Button>
            <Button
              variant="outline"
              onClick={() => setDocumentsDrawerOpen(true)}
              className="gap-1"
            >
              <Paperclip className="h-4 w-4" />
              Anexar Documentos
            </Button>
            <ProfilePDFExport 
              profileData={candidate} 
              certifications={certifications}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda */}
          <div className="space-y-4">
            {/* Foto de Perfil */}
            <Card className="border border-border/50">
              <CardContent className="p-6 flex flex-col items-center">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage 
                    src={candidate.avatar_url || undefined} 
                    alt={candidate.full_name}
                  />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {candidate.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-3 text-sm font-medium text-foreground">Foto do Perfil</p>
                <Badge variant={candidate.profile_complete ? "default" : "secondary"} className="mt-2">
                  {candidate.profile_complete ? "Perfil Completo" : "Perfil Incompleto"}
                </Badge>
              </CardContent>
            </Card>

            {/* Dados Básicos */}
            <Collapsible open={openSections.basicData} onOpenChange={() => toggleSection('basicData')}>
              <Card className="border border-border/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-medium">Dados Básicos</CardTitle>
                      </div>
                      {openSections.basicData ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Nome Completo</label>
                      <p className="text-sm font-medium border-b border-border/50 pb-2">{candidate.full_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">CPF</label>
                        <p className="text-sm font-medium border-b border-border/50 pb-2">{candidate.cpf || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Data de Nasc.</label>
                        <p className="text-sm font-medium border-b border-border/50 pb-2">{formatDate(candidate.birth_date) || 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Telefone</label>
                        <p className="text-sm font-medium border-b border-border/50 pb-2">{candidate.phone}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">E-mail</label>
                        <p className="text-sm font-medium border-b border-border/50 pb-2 truncate">{candidate.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">RG</label>
                        <p className="text-sm font-medium border-b border-border/50 pb-2">{candidate.rg || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Gênero</label>
                        <p className="text-sm font-medium border-b border-border/50 pb-2">{candidate.gender || 'Não informado'}</p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Documentos Pessoais */}
            <Collapsible open={openSections.documents} onOpenChange={() => toggleSection('documents')}>
              <Card className="border border-border/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-medium">Documentos Pessoais</CardTitle>
                      </div>
                      {openSections.documents ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">CPF</label>
                        <p className="text-sm font-medium">{candidate.cpf || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">RG</label>
                        <p className="text-sm font-medium">{candidate.rg || 'Não informado'}</p>
                      </div>
                    </div>
                    {candidate.cv_file_path && (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-destructive" />
                          <div>
                            <p className="text-sm font-medium">{candidate.cv_file_name || 'Currículo'}</p>
                            <p className="text-xs text-muted-foreground">PDF</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleDownloadDocument({ id: 'cv', name: candidate.cv_file_name || 'cv.pdf', path: candidate.cv_file_path!, uploaded_at: '' })} title="Baixar">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleDeleteCV} className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Excluir currículo">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Endereço */}
            <Collapsible open={openSections.address} onOpenChange={() => toggleSection('address')}>
              <Card className="border border-border/50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-medium">Endereço</CardTitle>
                      </div>
                      {openSections.address ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">CEP</label>
                        <p className="text-sm font-medium">{candidate.cep || 'Não informado'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Cidade</label>
                        <p className="text-sm font-medium">{candidate.city || 'Não informado'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Rua</label>
                      <p className="text-sm font-medium">{candidate.street || 'Não informado'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Número</label>
                        <p className="text-sm font-medium">{candidate.address_number || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Bairro</label>
                        <p className="text-sm font-medium">{candidate.neighborhood || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Estado</label>
                        <p className="text-sm font-medium">{candidate.state || '-'}</p>
                      </div>
                    </div>
                    {candidate.address_complement && (
                      <div>
                        <label className="text-xs text-muted-foreground">Complemento</label>
                        <p className="text-sm font-medium">{candidate.address_complement}</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-4">
            {/* Informações Profissionais */}
            <Card className="border border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-medium">Informações Profissionais</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">Função Desejada</label>
                  <p className="text-sm font-medium border-b border-border/50 pb-2">{candidate.desired_function || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Funções do Profissional</label>
                  {candidate.functions && candidate.functions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 pb-2 border-b border-border/50">
                      {candidate.functions.map((fn) => (
                        <span key={fn} className="inline-flex items-center rounded-full bg-maritime-blue/10 px-2.5 py-1 text-xs font-medium text-maritime-blue">
                          {fn}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium border-b border-border/50 pb-2">Não informado</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tipo de Embarcação</label>
                  <p className="text-sm font-medium border-b border-border/50 pb-2">{candidate.vessel_type || 'Não informado'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Disponível de</label>
                    <p className="text-sm font-medium">{formatDate(candidate.available_from) || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Até</label>
                    <p className="text-sm font-medium">{formatDate(candidate.available_until) || 'Não informado'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Expectativa Salarial</label>
                  <p className="text-sm font-medium">
                    {candidate.salary_expectation 
                      ? candidate.salary_expectation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'Não informado'}
                  </p>
                </div>
                {candidate.professional_experience && (
                  <div>
                    <label className="text-xs text-muted-foreground">Experiência Profissional</label>
                    <div className="bg-muted/30 p-3 rounded-lg mt-1">
                      <p className="text-sm whitespace-pre-wrap">{candidate.professional_experience}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certificados & Cursos */}
            <Card className="border border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-medium">Certificados & Cursos</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activeCertifications.length} certificações
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {activeCertifications.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 pb-2 border-b">
                      <div className="col-span-5">NOME DO CURSO</div>
                      <div className="col-span-3">VALIDADE</div>
                      <div className="col-span-4 text-right">AÇÕES</div>
                    </div>
                    {activeCertifications.map((cert) => {
                      const validityDate = certifications[`${cert.id}_validity`] as string;
                      const filePath = certifications[`${cert.id}_file_path`] as string;
                      const isExpired = validityDate && new Date(validityDate) < new Date();
                      
                      return (
                        <div key={cert.id} className="grid grid-cols-12 gap-2 items-center text-sm px-2 py-2 hover:bg-muted/30 rounded-lg">
                          <div className="col-span-5 truncate font-medium">{cert.name.split(' – ')[0]}</div>
                          <div className="col-span-3">
                            {validityDate ? (
                              <Badge variant={isExpired ? "destructive" : "outline"} className="text-xs">
                                {formatDate(validityDate)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                          <div className="col-span-4 flex justify-end gap-1">
                            {filePath && (
                              <>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7"
                                  onClick={() => handleDownloadCertification(cert.id)}
                                  title="Baixar"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteCertificationFile(cert.id)}
                                  title="Excluir arquivo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma certificação cadastrada
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Anexos */}
            <Card className="border border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-medium">Anexos</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[180px]">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.size || 'PDF'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleDeleteDocument(doc)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir anexo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum documento anexado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Histórico de Atividades */}
        <ProfessionalActivityHistory candidateUserId={id || ""} />

        {/* Footer com Progresso */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-4 flex-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Progresso do Cadastro</span>
            <Progress value={calculateProfileProgress()} className="flex-1 max-w-md" />
            <span className="text-sm font-medium">{calculateProfileProgress()}%</span>
          </div>
          <Button onClick={() => navigate('/a/profissionais')} className="ml-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Lista
          </Button>
        </div>
      </div>

      {/* Client Selection Dialog for Documents */}
      <Dialog open={clientSelectionOpen} onOpenChange={setClientSelectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione o contexto do documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {clientCandidateRecords.map((record) => (
              <Button
                key={record.id}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => {
                  setSelectedClientCandidateId(record.id);
                  setClientSelectionOpen(false);
                  setDocumentsDrawerOpen(true);
                }}
              >
                <div>
                  <p className="font-medium">{record.client_name}</p>
                  {record.job_title && (
                    <p className="text-sm text-muted-foreground">{record.job_title}</p>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ProfessionalDocumentsDrawer
        isOpen={documentsDrawerOpen}
        onClose={() => {
          setDocumentsDrawerOpen(false);
          fetchProfessionalData();
        }}
        candidateUserId={id || ""}
        candidateName={candidate?.full_name || ""}
      />

      {/* Edit Candidate Drawer */}
      <AdminCandidateDrawer
        open={isEditDrawerOpen}
        onOpenChange={setIsEditDrawerOpen}
        candidate={candidate ? {
          ...candidate,
          gender: candidate.gender as "masculino" | "feminino" | "outro" | undefined,
        } : null}
        onSuccess={() => {
          setIsEditDrawerOpen(false);
          fetchProfessionalData();
        }}
      />

      {/* Assign to Job */}
      {isAssignJobOpen && candidate && (
        <AssignCandidateToJob
          candidateId={candidate.user_id}
          candidateName={candidate.full_name}
          isOpen={isAssignJobOpen}
          onClose={() => setIsAssignJobOpen(false)}
        />
      )}

      {/* Assign to Client */}
      {isAssignClientOpen && candidate && (
        <AssignCandidateToClient
          candidateId={candidate.user_id}
          candidateName={candidate.full_name}
          isOpen={isAssignClientOpen}
          onClose={async () => {
            setIsAssignClientOpen(false);
            if (pendingDocumentsOpen) {
              setPendingDocumentsOpen(false);
              await fetchClientCandidates();
              // Re-check after fetch
              const { data } = await supabase
                .from('client_candidates')
                .select('id, client_id, clients (company_name), jobs (title)')
                .eq('candidate_id', candidate.user_id);
              const records = (data || []).map((r: any) => ({
                id: r.id,
                client_name: r.clients?.company_name || 'Cliente',
                job_title: r.jobs?.title || null,
              }));
              if (records.length >= 1) {
                setSelectedClientCandidateId(records[0].id);
                setDocumentsDrawerOpen(true);
              }
            }
          }}
        />
      )}
    </DashboardLayout>
  );
}
