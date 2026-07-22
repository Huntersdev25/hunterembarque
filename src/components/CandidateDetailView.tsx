import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, Calendar, DollarSign, User, FileText, Download, Languages, Award, CheckCircle2, AlertCircle, UserPlus, Eye, ExternalLink, Trash2, Paperclip } from "lucide-react";
import { ProfilePDFExport } from "@/components/ProfilePDFExport";
import { AssignCandidateToClient } from "@/components/AssignCandidateToClient";

import { CandidateDocumentsDrawer } from "@/components/CandidateDocumentsDrawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

interface Language {
  name?: string;
  language?: string;
  level: string;
}

interface Document {
  id: string;
  name: string;
  path: string;
  url: string;
  uploaded_at: string;
}

interface Certification {
  [key: string]: boolean | string | null;
}

interface CandidateDetailViewProps {
  candidate: Candidate | null;
}

interface ClientCandidateRecord {
  id: string;
  client_id: string;
  client_name: string;
  job_title: string | null;
}

export function CandidateDetailView({ candidate }: CandidateDetailViewProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [certifications, setCertifications] = useState<Certification>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const { userRole } = useAuth();
  
  // Documents drawer state
  const [clientCandidateRecords, setClientCandidateRecords] = useState<ClientCandidateRecord[]>([]);
  const [selectedClientCandidateId, setSelectedClientCandidateId] = useState<string>("");
  const [documentsDrawerOpen, setDocumentsDrawerOpen] = useState(false);

  useEffect(() => {
    if (candidate) {
      fetchCandidateDetails();
      fetchClientCandidateRecords();
    }
  }, [candidate]);

  const fetchClientCandidateRecords = async () => {
    if (!candidate) return;
    try {
      const { data, error } = await supabase
        .from('client_candidates')
        .select(`
          id,
          client_id,
          clients (company_name),
          jobs (title)
        `)
        .eq('candidate_id', candidate.user_id);

      if (error) {
        console.error('Erro ao buscar client_candidates:', error);
        return;
      }

      const records: ClientCandidateRecord[] = (data || []).map((r: any) => ({
        id: r.id,
        client_id: r.client_id,
        client_name: r.clients?.company_name || 'Cliente',
        job_title: r.jobs?.title || null,
      }));
      setClientCandidateRecords(records);
      if (records.length === 1) {
        setSelectedClientCandidateId(records[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar registros client_candidate:', err);
    }
  };

  const handleOpenDocumentsDrawer = () => {
    if (clientCandidateRecords.length === 0) {
      toast.error("Este candidato não está atribuído a nenhum cliente.");
      return;
    }
    if (clientCandidateRecords.length === 1) {
      setSelectedClientCandidateId(clientCandidateRecords[0].id);
    }
    setDocumentsDrawerOpen(true);
  };

  const fetchCandidateDetails = async () => {
    if (!candidate) return;

    try {
      // Parse languages
      if (candidate.languages) {
        try {
          const parsedLanguages = JSON.parse(candidate.languages);
          setLanguages(Array.isArray(parsedLanguages) ? parsedLanguages : []);
        } catch {
          setLanguages([]);
        }
      }

      // Buscar certificações
      const { data: certData, error: certError } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', candidate.user_id)
        .single();

      if (certError && certError.code !== 'PGRST116') {
        console.error('Erro ao buscar certificações:', certError);
      } else if (certData) {
        setCertifications(certData);
      }

      // Buscar documentos do storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('feed-documents')
        .list(candidate.user_id);

      if (storageError) {
        console.error('Erro ao buscar documentos:', storageError);
      } else if (storageFiles) {
        const formattedDocs = storageFiles
          .filter((file) => !!file.id) // Ignora pastas
          .map(file => ({
            id: file.id || file.name,
            name: file.name,
            path: `${candidate.user_id}/${file.name}`,
            url: '',
            uploaded_at: file.updated_at || file.created_at
          }));
        setDocuments(formattedDocs);
      }

      // Buscar candidaturas
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          rejection_reason,
          applied_at,
          jobs (
            id,
            title,
            function_name
          )
        `)
        .eq('candidate_id', candidate.user_id);

      if (appsError) {
        console.error('Erro ao buscar candidaturas:', appsError);
      } else {
        setApplications(appsData || []);
      }

    } catch (error) {
      console.error('Erro ao carregar detalhes do candidato:', error);
    }
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(doc.path);

      if (error) {
        toast.error('Erro ao visualizar documento');
        console.error(error);
        return;
      }

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      toast.error('Erro ao visualizar documento');
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(doc.path);

      if (error) {
        toast.error('Erro ao baixar documento');
        console.error(error);
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast.error('Erro ao baixar documento');
    }
  };

  const handleDownloadCertification = async (certId: string) => {
    try {
      const filePath = certifications[`${certId}_file_path`] as string;
      const fileName = certifications[`${certId}_file_name`] as string;
      
      if (!filePath) {
        toast.error('Documento não encontrado');
        return;
      }

      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(filePath);

      if (error) {
        toast.error('Erro ao baixar certificado');
        console.error(error);
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `${certId}_certificate.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Download do certificado iniciado');
    } catch (error) {
      console.error('Erro ao baixar certificado:', error);
      toast.error('Erro ao baixar certificado');
    }
  };

  const handleDeleteCertificationFile = async (certId: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo de certificação?')) return;

    try {
      const filePath = certifications[`${certId}_file_path`] as string;
      
      if (!filePath) {
        toast.error('Arquivo não encontrado');
        return;
      }

      // Remove do storage
      const { error: storageError } = await supabase.storage
        .from('feed-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        throw storageError;
      }

      // Atualiza no banco de dados
      const { error: dbError } = await supabase
        .from('certifications')
        .update({
          [`${certId}_file_path`]: null,
          [`${certId}_file_name`]: null
        })
        .eq('user_id', candidate?.user_id);

      if (dbError) throw dbError;

      // Atualiza estado local
      setCertifications(prev => ({
        ...prev,
        [`${certId}_file_path`]: null,
        [`${certId}_file_name`]: null
      }));

      toast.success('Arquivo de certificação excluído com sucesso');
    } catch (error: any) {
      console.error('Delete certification file error:', error);
      toast.error('Erro ao excluir arquivo: ' + error.message);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      const { error } = await supabase.storage
        .from('feed-documents')
        .remove([doc.path]);

      if (error) {
        console.error('Delete document error:', error);
        throw error;
      }

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Documento excluído com sucesso');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir documento: ' + error.message);
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
      // mutate local view
      candidate.cv_file_path = undefined;
      candidate.cv_file_name = undefined;
      toast.success('Currículo excluído com sucesso');
    } catch (error: any) {
      console.error('Delete CV error:', error);
      toast.error('Erro ao excluir currículo: ' + error.message);
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

  const getLevelLabel = (level: string) => {
    const levels = {
      basic: 'Básico',
      intermediate: 'Intermediário', 
      advanced: 'Avançado',
      fluent: 'Fluente',
      native: 'Nativo'
    };
    return levels[level] || level;
  };

  const isValidityExpired = (validityDate: string): boolean => {
    if (!validityDate) return false;
    return new Date(validityDate) < new Date();
  };

  const isValidityExpiringSoon = (validityDate: string): boolean => {
    if (!validityDate) return false;
    const validity = new Date(validityDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return validity <= thirtyDaysFromNow && validity >= new Date();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      lista_espera: { label: 'Lista de Espera', variant: 'secondary' as const },
      em_analise: { label: 'Em Análise', variant: 'default' as const },
      aprovado: { label: 'Aprovado', variant: 'default' as const },
      reprovado: { label: 'Reprovado', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const CERTIFICATIONS_LIST = [
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
    { id: 'dp', name: 'DP – Dynamic Positioning – Nível Básico, Nível Avançado, Ilimitado (DP Full)' },
    { id: 'alph', name: 'ALPH – Curso de Manobra e Combate a Incêndio de Aviação' },
    { id: 'cpso', name: 'CPSO – Curso de Primeiros Socorros' },
    { id: 'cipn', name: 'CIPN – Curso Intermediário de Proteção de Navio' },
    { id: 'ticb', name: 'TICB – Treinamento Intermediário para Condutores de Baleeiras' },
    { id: 'epoe', name: 'EPOE – Especial de Operador em ECDIS – PREPOM' },
    { id: 'epor', name: 'EPOR – Especial Prático de Operador Radar' },
    { id: 'gmdss', name: 'GMDSS – Rádio Comunicação' },
    { id: 'cns014', name: 'CNS 14 – Rádio Operador' },
    { id: 'lpn', name: 'LPNA – Licença de Pessoal de Navegação Aérea' },
    { id: 'cft', name: 'CFT – Certificação de Familiarização Técnica' }
  ];

  if (!candidate) {
    return <div>Nenhum candidato selecionado</div>;
  }

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      {/* Foto de Perfil e Informações Principais */}
      <div className="flex items-start gap-6 pb-4">
        <Avatar className="h-24 w-24 border-2 border-primary">
          <AvatarImage 
            src={candidate.avatar_url || undefined} 
            alt={candidate.full_name}
          />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {candidate.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-2xl font-bold">{candidate.full_name}</h3>
          <p className="text-muted-foreground">{candidate.desired_function || 'Função não informada'}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={candidate.profile_complete ? "default" : "secondary"}>
              {candidate.profile_complete ? "Perfil Completo" : "Perfil Incompleto"}
            </Badge>
            {(userRole === 'admin' || userRole === 'ti') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenDocumentsDrawer}
                className="gap-1"
              >
                <Paperclip className="h-4 w-4" />
                Anexar Documentos
                {clientCandidateRecords.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                    {clientCandidateRecords.length}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Informações Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">E-mail:</span>
            <span className="text-sm">{candidate.email}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Telefone:</span>
            <span className="text-sm">{candidate.phone}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">CPF:</span>
            <span className="text-sm">{candidate.cpf || 'Não informado'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">RG:</span>
            <span className="text-sm">{candidate.rg || 'Não informado'}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Data de Nascimento:</span>
            <span className="text-sm">{formatDate(candidate.birth_date)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Expectativa Salarial:</span>
            <span className="text-sm">{formatCurrency(candidate.salary_expectation)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Gênero:</span>
            <span className="text-sm">{candidate.gender || 'Não informado'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tipo de Embarcação:</span>
            <span className="text-sm">{candidate.vessel_type || 'Não informado'}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Endereço */}
      <div>
        <h4 className="font-medium mb-3 flex items-center">
          <MapPin className="h-4 w-4 mr-2" />
          Endereço
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium">CEP:</span> {candidate.cep || 'Não informado'}
          </div>
          <div>
            <span className="font-medium">Cidade:</span> {candidate.city || 'Não informado'}
          </div>
          <div>
            <span className="font-medium">Rua:</span> {candidate.street || 'Não informado'}
          </div>
          <div>
            <span className="font-medium">Bairro:</span> {candidate.neighborhood || 'Não informado'}
          </div>
          <div>
            <span className="font-medium">Estado:</span> {candidate.state || 'Não informado'}
          </div>
          <div>
            <span className="font-medium">Número:</span> {candidate.address_number || 'Não informado'}
          </div>
          {candidate.address_complement && (
            <div className="md:col-span-2">
              <span className="font-medium">Complemento:</span> {candidate.address_complement}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Disponibilidade */}
      <div>
        <h4 className="font-medium mb-3">Disponibilidade</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">De:</span> {formatDate(candidate.available_from)}
          </div>
          <div>
            <span className="font-medium">Até:</span> {formatDate(candidate.available_until)}
          </div>
        </div>
      </div>

      {/* Função */}
      <div>
        <h4 className="font-medium mb-2">Função Desejada</h4>
        <p className="text-sm">{candidate.desired_function || 'Não informado'}</p>
      </div>

      {/* Experiência Profissional */}
      {candidate.professional_experience && (
        <div>
          <h4 className="font-medium mb-2 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Experiência Profissional
          </h4>
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{candidate.professional_experience}</p>
          </div>
        </div>
      )}

      {/* Idiomas */}
      {languages.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Languages className="h-4 w-4 mr-2" />
            Idiomas
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {languages.map((lang, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                <span className="font-medium text-sm">{lang.name || lang.language} - {getLevelLabel(lang.level)}</span>
                <Badge variant="outline" className="text-xs">{getLevelLabel(lang.level)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificações */}
      <div>
        <h4 className="font-medium mb-3 flex items-center">
          <Award className="h-4 w-4 mr-2" />
          Certificações
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CERTIFICATIONS_LIST.filter(cert => certifications[cert.id]).map((cert) => {
            const issueDate = certifications[`${cert.id}_issue_date`] as string;
            const validityDate = certifications[`${cert.id}_validity`] as string;
            const isExpired = isValidityExpired(validityDate);
            const isExpiringSoon = isValidityExpiringSoon(validityDate);
            const filePath = certifications[`${cert.id}_file_path`] as string;
            const fileName = certifications[`${cert.id}_file_name`] as string;

            return (
              <div key={cert.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-sm">{cert.name}</h5>
                  {isExpired && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Vencida
                    </Badge>
                  )}
                  {isExpiringSoon && !isExpired && (
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Vence em breve
                    </Badge>
                  )}
                  {!isExpired && !isExpiringSoon && validityDate && (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Válida
                    </Badge>
                  )}
                </div>
                {issueDate && (
                  <p className="text-xs text-muted-foreground">
                    Emissão: {formatDate(issueDate)}
                  </p>
                )}
                {validityDate && (
                  <p className="text-xs text-muted-foreground">
                    Validade: {formatDate(validityDate)}
                  </p>
                )}
                {filePath && fileName && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs flex-1 justify-center">
                      <Paperclip className="h-3 w-3 mr-1" />
                      Anexo disponível
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDownloadCertification(cert.id)}
                        className="h-7 w-7"
                        title="Baixar arquivo"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDeleteCertificationFile(cert.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir arquivo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {CERTIFICATIONS_LIST.filter(cert => certifications[cert.id]).length === 0 && (
            <p className="text-muted-foreground text-sm col-span-2">Nenhuma certificação informada</p>
          )}
        </div>
      </div>

      {/* Currículo (CV) */}
      {candidate.cv_file_path && candidate.cv_file_name && (
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Currículo (CV)
          </h4>
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-sm">{candidate.cv_file_name}</p>
                <p className="text-xs text-muted-foreground">Documento PDF</p>
              </div>
            </div>
            {(userRole === 'admin' || userRole === 'ti') && (
              <Button
                size="icon"
                variant="outline"
                onClick={handleDeleteCV}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Excluir currículo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Documentos */}
      {documents.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Documentos Anexados
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Enviado em: {formatDate(doc.uploaded_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleViewDocument(doc)}
                    className="h-8 w-8"
                    title="Visualizar"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleDownloadDocument(doc)}
                    className="h-8 w-8"
                    title="Baixar"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleDeleteDocument(doc)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidaturas */}
      {applications.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Histórico de Candidaturas</h4>
          <div className="space-y-2">
            {applications.map((app) => (
              <div key={app.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm">{app.jobs?.title}</h5>
                  <Badge variant={app.status === 'aprovado' ? 'default' : app.status === 'reprovado' ? 'destructive' : 'secondary'}>
                    {app.status === 'aprovado' ? 'Aprovado' : app.status === 'reprovado' ? 'Reprovado' : 'Lista de Espera'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  Candidatura em: {formatDate(app.applied_at)}
                </p>
                {app.rejection_reason && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground">Motivo da reprovação:</p>
                    <p className="text-xs text-red-600">{app.rejection_reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status do Perfil */}
      <div className="flex items-center gap-2">
        <span className="font-medium">Status do Perfil:</span>
        <Badge variant={candidate.profile_complete ? "default" : "secondary"}>
          {candidate.profile_complete ? "Completo" : "Incompleto"}
        </Badge>
      </div>


      {/* Exportar PDF */}
      <div className="pt-4 border-t">
        <ProfilePDFExport 
          profileData={candidate} 
          certifications={certifications}
        />
      </div>

      {/* Documents Drawer */}
      {clientCandidateRecords.length > 1 && documentsDrawerOpen && !selectedClientCandidateId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDocumentsDrawerOpen(false)}>
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Selecione o vínculo</h3>
            <p className="text-sm text-muted-foreground">Este candidato está atribuído a mais de um cliente. Selecione para qual vínculo deseja anexar documentos:</p>
            <Select onValueChange={(val) => setSelectedClientCandidateId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vínculo..." />
              </SelectTrigger>
              <SelectContent>
                {clientCandidateRecords.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.client_name}{r.job_title ? ` - ${r.job_title}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <CandidateDocumentsDrawer
        isOpen={documentsDrawerOpen && !!selectedClientCandidateId}
        onClose={() => {
          setDocumentsDrawerOpen(false);
          setSelectedClientCandidateId(clientCandidateRecords.length === 1 ? clientCandidateRecords[0].id : "");
        }}
        clientCandidateId={selectedClientCandidateId}
        candidateName={candidate.full_name}
      />
    </div>
  );

}
