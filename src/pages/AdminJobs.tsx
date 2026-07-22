import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, User, ArrowLeft, Share, UserPlus, FileText, FileDown, MessageSquareText, Paperclip, Building2, Activity, Send, CheckCircle2 } from "lucide-react";
import { CandidateProfileTimelineDrawer } from "@/components/CandidateProfileTimelineDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AssignCandidateToClient } from "@/components/AssignCandidateToClient";
import { CandidateDetailView } from "@/components/CandidateDetailView";
import { JobCandidatesReportExport } from "@/components/JobCandidatesReportExport";
import { JobCandidatesFilters, CandidateFilters, applyFiltersToCandidate } from "@/components/JobCandidatesFilters";
import { GenericTableReportExport } from "@/components/GenericTableReportExport";
import { CandidateDocumentsDrawer } from "@/components/CandidateDocumentsDrawer";

interface Job {
  id: string;
  title: string;
  function_name: string;
  description: string;
  short_description?: string;
  cover_image_url?: string;
  requirements: string;
  required_certifications_list?: string[];
  is_active: boolean;
  created_at: string;
  client_id?: string | null;
  client?: { company_name: string } | null;
  applications?: { count: number }[];
}

interface ClientOption {
  id: string;
  company_name: string;
}

interface JobFunction {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface Certification {
  id: string;
  name: string;
}

interface Candidate {
  id: string;
  candidate_id: string;
  status: 'lista_espera' | 'contato_realizado' | 'finalizado' | 'aprovado' | 'rejeitado';
  applied_at: string;
  contact_notes?: string | null;
  contact_made?: boolean;
  contact_date?: string | null;
  profiles: {
    full_name: string;
    cpf: string;
    phone: string;
    email: string;
  } | null;
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateCertifications, setCandidateCertifications] = useState<Record<string, any>>({});
  const [releasedCandidateIds, setReleasedCandidateIds] = useState<Set<string>>(new Set());
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [isInterviewNotesDialogOpen, setIsInterviewNotesDialogOpen] = useState(false);
  const [selectedApplicationForNotes, setSelectedApplicationForNotes] = useState<Candidate | null>(null);
  const [interviewNotes, setInterviewNotes] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{ applicationId: string; status: string } | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [documentsDrawer, setDocumentsDrawer] = useState<{ open: boolean; clientCandidateId: string; candidateName: string }>({
    open: false, clientCandidateId: "", candidateName: ""
  });
  const [timelineDrawer, setTimelineDrawer] = useState<{ open: boolean; jobId: string; candidateId: string; applicationId?: string; candidateName?: string; jobTitle?: string }>({
    open: false, jobId: "", candidateId: ""
  });
  const [candidateFilters, setCandidateFilters] = useState<CandidateFilters>({
    name: '',
    status: 'all',
    state: 'all',
    city: '',
    ddd: 'all',
    certifications: [],
    availableFrom: '',
    availableTo: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Lista atualizada de certificações disponíveis
  const AVAILABLE_CERTIFICATIONS = [
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

  const [formData, setFormData] = useState({
    title: "",
    function_name: "",
    description: "",
    short_description: "",
    cover_image_url: "",
    requirements: "",
    required_certifications_list: [] as string[],
    is_active: true,
    client_id: "" as string,
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");

  useEffect(() => {
    fetchJobs();
    fetchJobFunctions();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('is_active', true)
        .order('company_name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  // Memoized filtered candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => 
      applyFiltersToCandidate(
        candidate, 
        candidateFilters, 
        candidateCertifications[candidate.candidate_id]
      )
    );
  }, [candidates, candidateFilters, candidateCertifications]);

  const handleFiltersChange = useCallback((filters: CandidateFilters) => {
    setCandidateFilters(filters);
  }, []);

  const fetchJobFunctions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_functions')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setJobFunctions(data || []);
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          applications(count),
          client:client_id(company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformar os dados para corresponder ao tipo esperado
      const transformedJobs = (data || []).map(job => ({
        ...job,
        client: Array.isArray(job.client) ? job.client[0] : job.client,
        required_certifications_list: (() => {
          try {
            if (Array.isArray(job.required_certifications_list)) {
              return job.required_certifications_list;
            }
            if (typeof job.required_certifications_list === 'string') {
              return JSON.parse(job.required_certifications_list);
            }
            return [];
          } catch {
            return [];
          }
        })()
      }));
      
      setJobs(transformedJobs);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar vagas"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidatesByJob = async (jobId: string) => {
    setLoadingCandidates(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          candidate_id,
          status,
          applied_at,
          contact_notes,
          contact_made,
          contact_date
        `)
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles and certifications separately and merge the data
      const candidatesWithProfiles = await Promise.all(
        (data || []).map(async (application) => {
          const [profileResult, certResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, cpf, phone, email, city, state, residence_location, available_from, available_until')
              .eq('user_id', application.candidate_id)
              .single(),
            supabase
              .from('certifications')
              .select('*')
              .eq('user_id', application.candidate_id)
              .single()
          ]);

          return {
            ...application,
            profiles: profileResult.data,
            certifications: certResult.data
          };
        })
      );

      setCandidates(candidatesWithProfiles as Candidate[]);
      
      // Store certifications separately for filtering
      const certsMap: Record<string, any> = {};
      candidatesWithProfiles.forEach((c: any) => {
        if (c.certifications) {
          certsMap[c.candidate_id] = c.certifications;
        }
      });
      setCandidateCertifications(certsMap);

      // Buscar candidatos já liberados para o cliente desta vaga
      const job = jobs.find(j => j.id === jobId);
      if (job?.client_id) {
        const { data: released } = await supabase
          .from('client_candidates')
          .select('candidate_id')
          .eq('client_id', job.client_id)
          .eq('job_id', jobId);
        setReleasedCandidateIds(new Set((released || []).map((r: any) => r.candidate_id)));
      } else {
        setReleasedCandidateIds(new Set());
      }
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar candidatos"
      });
    } finally {
      setLoadingCandidates(false);
    }
  };

  const releaseCandidateToClient = async (candidate: Candidate) => {
    if (!selectedJob?.client_id) {
      toast({
        variant: "destructive",
        title: "Vaga sem cliente",
        description: "Esta vaga não está vinculada a um cliente. Edite a vaga e vincule um cliente primeiro."
      });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Verificar se já existe atribuição
      const { data: existing } = await supabase
        .from('client_candidates')
        .select('id')
        .eq('client_id', selectedJob.client_id)
        .eq('candidate_id', candidate.candidate_id)
        .eq('job_id', selectedJob.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "Já liberado", description: "Este candidato já foi liberado para o cliente." });
        setReleasedCandidateIds(prev => new Set(prev).add(candidate.candidate_id));
        return;
      }

      const { error } = await supabase
        .from('client_candidates')
        .insert({
          client_id: selectedJob.client_id,
          candidate_id: candidate.candidate_id,
          job_id: selectedJob.id,
          assigned_by: user.id,
        });

      if (error) throw error;

      // Registrar evento na timeline
      await supabase.from('candidate_onboarding_timeline').insert({
        job_id: selectedJob.id,
        candidate_id: candidate.candidate_id,
        application_id: candidate.id,
        event_type: 'released_to_client',
        title: 'Candidato liberado para o cliente',
        description: `Liberado para ${selectedJob.client?.company_name ?? 'o cliente'}`,
        source: 'admin',
        created_by: user.id,
      });

      setReleasedCandidateIds(prev => new Set(prev).add(candidate.candidate_id));
      toast({
        title: "Liberado",
        description: `${candidate.profiles?.full_name ?? 'Candidato'} agora está visível para o cliente nesta vaga.`,
      });
    } catch (error: any) {
      console.error('Erro ao liberar candidato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message ?? "Erro ao liberar candidato"
      });
    }
  };

  const unreleaseCandidateFromClient = async (candidate: Candidate) => {
    if (!selectedJob?.client_id) return;
    if (!confirm(`Remover ${candidate.profiles?.full_name ?? 'este candidato'} da visualização do cliente?`)) return;
    try {
      const { error } = await supabase
        .from('client_candidates')
        .delete()
        .eq('client_id', selectedJob.client_id)
        .eq('candidate_id', candidate.candidate_id)
        .eq('job_id', selectedJob.id);
      if (error) throw error;
      setReleasedCandidateIds(prev => {
        const next = new Set(prev);
        next.delete(candidate.candidate_id);
        return next;
      });
      toast({ title: "Removido", description: "Candidato não está mais visível para o cliente." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    fetchCandidatesByJob(job.id);
  };

  const handleBackToList = () => {
    setSelectedJob(null);
    setCandidates([]);
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: 'aprovado' | 'rejeitado' | 'lista_espera' | 'contato_realizado' | 'finalizado', rejectionReason?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'rejeitado' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status da candidatura atualizado"
      });

      // Registrar evento na timeline de onboarding
      try {
        const cand = candidates.find(c => c.id === applicationId);
        if (cand && selectedJob) {
          const statusLabels: Record<string, string> = {
            aprovado: 'Aprovado',
            rejeitado: 'Reprovado',
            lista_espera: 'Em análise',
            contato_realizado: 'Contato realizado',
            finalizado: 'Finalizado',
          };
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('candidate_onboarding_timeline').insert({
            job_id: selectedJob.id,
            candidate_id: cand.candidate_id,
            application_id: applicationId,
            event_type: 'status_change',
            title: `Status alterado para "${statusLabels[newStatus] ?? newStatus}"`,
            description: rejectionReason ? `Motivo: ${rejectionReason}` : null,
            source: 'admin',
            metadata: { new_status: newStatus, rejection_reason: rejectionReason ?? null },
            created_by: user?.id ?? null,
          });
        }
      } catch (e) {
        console.warn('Falha ao registrar timeline:', e);
      }

      // Atualizar apenas o candidato específico no estado local
      setCandidates(prevCandidates => 
        prevCandidates.map(candidate => 
          candidate.id === applicationId 
            ? { ...candidate, status: newStatus }
            : candidate
        )
      );

    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar status da candidatura"
      });
    }
  };

  const removeCandidate = async (applicationId: string, candidateName: string) => {
    if (!confirm(`Tem certeza que deseja remover ${candidateName} desta vaga?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Candidato removido da vaga"
      });

      // Remover o candidato da lista local sem recarregar
      setCandidates(prevCandidates => 
        prevCandidates.filter(candidate => candidate.id !== applicationId)
      );

    } catch (error) {
      console.error('Erro ao remover candidato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao remover candidato da vaga"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge variant="success">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Reprovado</Badge>;
      case 'lista_espera':
        return <Badge variant="warning">Em Análise</Badge>;
      case 'contato_realizado':
        return <Badge variant="default" className="bg-blue-600 text-white hover:bg-blue-700">Contato</Badge>;
      case 'finalizado':
        return <Badge variant="outline">Finalizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'lista_espera':
        return 'Em Análise';
      case 'contato_realizado':
        return 'Contato';
      case 'finalizado':
        return 'Finalizado';
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Reprovado';
      default:
        return status;
    }
  };

  const viewCandidateProfile = (candidateId: string) => {
    navigate(`/a/profissionais/${candidateId}`);
  };

  const openInterviewNotesDialog = (candidate: Candidate, forStatusChange?: { applicationId: string; status: string }) => {
    setSelectedApplicationForNotes(candidate);
    setInterviewNotes(candidate.contact_notes || "");
    setPendingStatusChange(forStatusChange || null);
    setIsInterviewNotesDialogOpen(true);
  };

  const saveInterviewNotes = async () => {
    if (!selectedApplicationForNotes) return;

    // Validar que o parecer foi preenchido se estiver mudando para contato_realizado
    if (pendingStatusChange?.status === 'contato_realizado' && !interviewNotes.trim()) {
      toast({
        variant: "destructive",
        title: "Parecer obrigatório",
        description: "É necessário informar o parecer do contato antes de alterar o status."
      });
      return;
    }

    try {
      const updateData: any = {
        contact_notes: interviewNotes,
        contact_made: true,
        contact_date: new Date().toISOString()
      };

      // Se há uma mudança de status pendente, incluir no update
      if (pendingStatusChange) {
        updateData.status = pendingStatusChange.status;
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', selectedApplicationForNotes.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: pendingStatusChange 
          ? "Status atualizado e parecer salvo com sucesso"
          : "Parecer de entrevista salvo com sucesso"
      });

      setIsInterviewNotesDialogOpen(false);
      setInterviewNotes("");
      setSelectedApplicationForNotes(null);
      setPendingStatusChange(null);
      
      if (selectedJob) {
        fetchCandidatesByJob(selectedJob.id);
      }
    } catch (error) {
      console.error('Erro ao salvar parecer:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar parecer de entrevista",
        variant: "destructive"
      });
    }
  };

  const handleCloseInterviewNotesDialog = () => {
    setIsInterviewNotesDialogOpen(false);
    setInterviewNotes("");
    setSelectedApplicationForNotes(null);
    setPendingStatusChange(null);
  };

  const handleShareJob = async (jobId: string) => {
    const jobUrl = `${window.location.origin}/vagas/${jobId}`;
    
    try {
      await navigator.clipboard.writeText(jobUrl);
      toast({
        title: "Link copiado!",
        description: "O link da vaga foi copiado para a área de transferência"
      });
    } catch (error) {
      // Fallback para browsers que não suportam clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = jobUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Link copiado!",
        description: "O link da vaga foi copiado para a área de transferência"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let coverImageUrl = formData.cover_image_url;

      // Upload da imagem de capa se houver uma nova
      if (coverImageFile) {
        const fileExt = coverImageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('job-covers')
          .upload(filePath, coverImageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('job-covers')
          .getPublicUrl(filePath);

        coverImageUrl = publicUrl;
      }

      const jobData = {
        ...formData,
        cover_image_url: coverImageUrl,
        client_id: formData.client_id || null,
      };

      if (editingJob) {
        const { error } = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', editingJob.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Vaga atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('jobs')
          .insert({
            ...jobData,
            created_by: user.id
          });
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Vaga criada com sucesso"
        });
      }

      setIsDialogOpen(false);
      setEditingJob(null);
      resetForm();
      fetchJobs();
    } catch (error) {
      console.error('Erro ao salvar vaga:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar vaga"
      });
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Vaga excluída com sucesso"
      });
      
      fetchJobs();
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir vaga"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      function_name: "",
      description: "",
      short_description: "",
      cover_image_url: "",
      requirements: "",
      required_certifications_list: [],
      is_active: true,
      client_id: "",
    });
    setCoverImageFile(null);
    setCoverImagePreview("");
  };

  const openEditDialog = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      function_name: job.function_name,
      description: job.description,
      short_description: job.short_description || "",
      cover_image_url: job.cover_image_url || "",
      requirements: job.requirements || "",
      required_certifications_list: job.required_certifications_list || [],
      is_active: job.is_active,
      client_id: job.client_id || "",
    });
    setCoverImagePreview(job.cover_image_url || "");
    setCoverImageFile(null);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingJob(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout userType="admin">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-maritime-blue">Gestão de Vagas</h1>
          <p className="text-muted-foreground mt-2">
            {selectedJob ? 'Detalhes da vaga e candidatos' : 'Crie, edite e gerencie as vagas disponíveis'}
          </p>
        </div>

        {selectedJob ? (
          <>
            {/* Botão Voltar e Detalhes da Vaga */}
            <div className="space-y-4">
              <Button variant="outline" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Lista
              </Button>
              
               <Card className="shadow-card">
                 <CardHeader>
                   <div className="flex justify-between items-center">
                     <div>
                       <CardTitle className="text-xl">{selectedJob.title}</CardTitle>
                       <CardDescription>Detalhes completos da vaga</CardDescription>
                     </div>
                     <div className="flex gap-2">
                       <Button variant="outline" onClick={() => handleShareJob(selectedJob.id)}>
                         <Share className="h-4 w-4 mr-2" />
                         Compartilhar
                       </Button>
                       <Button variant="outline" onClick={() => openEditDialog(selectedJob)}>
                         <Edit className="h-4 w-4 mr-2" />
                         Editar Vaga
                       </Button>
                     </div>
                   </div>
                 </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {selectedJob.client && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Cliente</h4>
                          <Badge variant="outline">
                            <Building2 className="h-3 w-3 mr-1" />
                            {selectedJob.client.company_name}
                          </Badge>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Área de Atuação</h4>
                        <p className="text-sm">{selectedJob.function_name}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                        <Badge variant={selectedJob.is_active ? "success" : "secondary"}>
                          {selectedJob.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Data de Publicação</h4>
                        <p className="text-sm">{new Date(selectedJob.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Descrição</h4>
                        <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
                      </div>
                      {selectedJob.requirements && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Requisitos</h4>
                          <p className="text-sm text-muted-foreground">{selectedJob.requirements}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros de Candidatos */}
            <JobCandidatesFilters
              onFiltersChange={setCandidateFilters}
              totalCandidates={candidates.length}
              filteredCount={filteredCandidates.length}
            />

            {/* Tabela de Candidatos */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Candidatos ({filteredCandidates.length} de {candidates.length})
                    </CardTitle>
                    <CardDescription>Lista de candidatos que se inscreveram para esta vaga</CardDescription>
                  </div>
                  <JobCandidatesReportExport jobId={selectedJob.id} jobTitle={selectedJob.title} />
                </div>
              </CardHeader>
              <CardContent>
                {loadingCandidates ? (
                  <div className="flex justify-center py-8">
                    <div className="text-lg">Carregando candidatos...</div>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {candidates.length === 0 
                      ? "Nenhum candidato se inscreveu para esta vaga ainda."
                      : "Nenhum candidato encontrado com os filtros aplicados."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Completo</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data de Candidatura</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCandidates.map((candidate) => (
                        <TableRow 
                          key={candidate.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setTimelineDrawer({
                            open: true,
                            jobId: selectedJob!.id,
                            candidateId: candidate.candidate_id,
                            applicationId: candidate.id,
                            candidateName: candidate.profiles?.full_name ?? undefined,
                            jobTitle: selectedJob?.title,
                          })}
                          title="Clique para ver perfil básico e timeline"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {candidate.profiles?.full_name || 'Nome não informado'}
                              {candidate.contact_notes && (
                                <span title={`Parecer: ${candidate.contact_notes.substring(0, 100)}${candidate.contact_notes.length > 100 ? '...' : ''}`}>
                                  <MessageSquareText className="h-4 w-4 text-green-600" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{candidate.profiles?.phone || 'Telefone não informado'}</TableCell>
                          <TableCell>{candidate.profiles?.email || 'E-mail não informado'}</TableCell>
                          <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                          <TableCell>
                            {selectedJob?.client_id ? (
                              releasedCandidateIds.has(candidate.candidate_id) ? (
                                <Badge variant="success" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Liberado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">Não liberado</Badge>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                           <TableCell>
                             {new Date(candidate.applied_at).toLocaleDateString('pt-BR')}
                           </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={candidate.status}
                                  onValueChange={(value) => {
                                    if (value === 'rejeitado') {
                                      const reason = prompt('Motivo da reprovação (obrigatório):');
                                      if (reason && reason.trim()) {
                                        updateApplicationStatus(candidate.id, value as 'rejeitado', reason.trim());
                                      }
                                    } else if (value === 'contato_realizado') {
                                      // Abrir modal de parecer obrigatório
                                      openInterviewNotesDialog(candidate, { applicationId: candidate.id, status: value });
                                    } else {
                                      updateApplicationStatus(candidate.id, value as 'aprovado' | 'lista_espera' | 'finalizado');
                                    }
                                  }}
                                >
                                 <SelectTrigger className="w-[140px]">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="lista_espera" className="text-yellow-600">
                                     <div className="flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                       Em Análise
                                     </div>
                                   </SelectItem>
                                   <SelectItem value="contato_realizado" className="text-blue-600">
                                     <div className="flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                       Contato
                                     </div>
                                   </SelectItem>
                                   <SelectItem value="finalizado" className="text-gray-600">
                                     <div className="flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                       Finalizado
                                     </div>
                                   </SelectItem>
                                   <SelectItem value="aprovado" className="text-green-600">
                                     <div className="flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                       Aprovado
                                     </div>
                                   </SelectItem>
                                   <SelectItem value="rejeitado" className="text-red-600">
                                     <div className="flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                       Reprovado
                                     </div>
                                   </SelectItem>
                                 </SelectContent>
                               </Select>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => viewCandidateProfile(candidate.candidate_id)}
                                   title="Ver perfil completo"
                                 >
                                   <User className="h-4 w-4" />
                                 </Button>
                                  <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => openInterviewNotesDialog(candidate)}
                                   title={candidate.contact_notes ? "Editar parecer de entrevista" : "Adicionar parecer de entrevista"}
                                   className={candidate.contact_notes ? "border-green-500" : ""}
                                 >
                                   <FileText className="h-4 w-4" />
                                  </Button>
                                   {selectedJob?.client_id && (
                                     releasedCandidateIds.has(candidate.candidate_id) ? (
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => unreleaseCandidateFromClient(candidate)}
                                         title="Remover liberação para o cliente"
                                         className="border-success text-success hover:bg-success/10"
                                       >
                                         <CheckCircle2 className="h-4 w-4" />
                                       </Button>
                                     ) : (
                                       <Button
                                         variant="default"
                                         size="sm"
                                         onClick={() => releaseCandidateToClient(candidate)}
                                         title="Liberar candidato para o cliente"
                                       >
                                         <Send className="h-4 w-4" />
                                       </Button>
                                     )
                                   )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      // Find or inform about client_candidate for document attachment
                                      if (!selectedJob?.client_id) {
                                        // No client linked, open documents using application id as reference
                                        const { data: cc } = await supabase
                                          .from('client_candidates')
                                          .select('id')
                                          .eq('candidate_id', candidate.candidate_id)
                                          .maybeSingle();
                                        
                                        if (cc) {
                                          setDocumentsDrawer({ open: true, clientCandidateId: cc.id, candidateName: candidate.profiles?.full_name || 'Candidato' });
                                        } else {
                                          toast({ title: "Aviso", description: "Atribua este candidato a um cliente antes de anexar documentos." });
                                        }
                                        return;
                                      }
                                      
                                      // Find client_candidate for this candidate + client
                                      const { data: cc } = await supabase
                                        .from('client_candidates')
                                        .select('id')
                                        .eq('candidate_id', candidate.candidate_id)
                                        .eq('client_id', selectedJob.client_id)
                                        .maybeSingle();
                                      
                                      if (cc) {
                                        setDocumentsDrawer({ open: true, clientCandidateId: cc.id, candidateName: candidate.profiles?.full_name || 'Candidato' });
                                      } else {
                                        toast({ title: "Aviso", description: "Este candidato ainda não foi atribuído ao cliente desta vaga. Atribua primeiro." });
                                      }
                                    }}
                                    title="Anexar documentos"
                                  >
                                    <Paperclip className="h-4 w-4" />
                                  </Button>
                                  {candidate.status === 'rejeitado' && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeCandidate(candidate.id, candidate.profiles?.full_name || 'Candidato')}
                                      title="Remover candidato da vaga"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                             </div>
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Vagas Cadastradas</CardTitle>
                  <CardDescription>Lista de todas as vagas do sistema</CardDescription>
                </div>
                <div className="flex gap-2">
                  <GenericTableReportExport
                    title="Relatório de Vagas"
                    subtitle="Gestão de Vagas"
                    data={jobs}
                    columns={[
                      { key: 'title', label: 'Título' },
                      { key: 'function_name', label: 'Função' },
                      { key: 'is_active', label: 'Status', format: (v) => v ? 'Ativa' : 'Inativa' },
                      { key: 'applications', label: 'Candidatos', format: (v) => v?.[0]?.count?.toString() || '0' },
                      { key: 'created_at', label: 'Criada em', format: (v) => new Date(v).toLocaleDateString('pt-BR') },
                    ]}
                    filters={[
                      { key: 'title', label: 'Título', type: 'text' },
                      { key: 'function_name', label: 'Função', type: 'text' },
                      { key: 'is_active', label: 'Status', type: 'select', options: [
                        { value: 'true', label: 'Ativas' },
                        { value: 'false', label: 'Inativas' },
                      ], filterFn: (row, val) => String(row.is_active) === val },
                    ]}
                    fileName="vagas"
                  />
                  <Button variant="maritime" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Vaga
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>Título</TableHead>
                     <TableHead>Cliente</TableHead>
                     <TableHead>Função</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Candidatos</TableHead>
                     <TableHead>Criada em</TableHead>
                     <TableHead>Ações</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {jobs.map((job) => (
                     <TableRow 
                       key={job.id}
                       className="cursor-pointer hover:bg-muted/50"
                       onClick={() => handleJobSelect(job)}
                     >
                       <TableCell className="font-medium">{job.title}</TableCell>
                       <TableCell>
                         {job.client ? (
                           <Badge variant="outline" className="text-xs">
                             <Building2 className="h-3 w-3 mr-1" />
                             {job.client.company_name}
                           </Badge>
                         ) : (
                           <span className="text-xs text-muted-foreground">Geral</span>
                         )}
                       </TableCell>
                       <TableCell>{job.function_name}</TableCell>
                       <TableCell>
                         <Badge variant={job.is_active ? "success" : "secondary"}>
                           {job.is_active ? "Ativa" : "Inativa"}
                         </Badge>
                       </TableCell>
                       <TableCell>{job.applications?.[0]?.count || 0}</TableCell>
                       <TableCell>{new Date(job.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleJobSelect(job)} title="Ver detalhes">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(job)} title="Editar vaga">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleShareJob(job.id)} title="Compartilhar vaga">
                              <Share className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(job.id)} title="Excluir vaga">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editingJob ? "Editar Vaga" : "Nova Vaga"}
              </DialogTitle>
              <DialogDescription>
                {editingJob ? "Edite as informações da vaga" : "Preencha as informações para criar uma nova vaga"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Vaga</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="function_name">Função</Label>
                  <Select
                    value={formData.function_name}
                    onValueChange={(value) => setFormData({ ...formData, function_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobFunctions.map((func) => (
                        <SelectItem key={func.id} value={func.name}>
                          {func.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>

                {/* Seletor de Cliente */}
                <div className="space-y-2">
                  <Label htmlFor="client_id">Cliente (opcional)</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (Vaga Geral)</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Vincule a vaga a um cliente para separar candidatos por empresa.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover_image">Imagem de Capa do Card</Label>
                  <Input
                    id="cover_image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCoverImageFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCoverImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {coverImagePreview && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                      <img 
                        src={coverImagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Imagem que aparecerá como fundo do card da vaga (recomendado: 800x400px)
                  </p>
                </div>

                {/* Descrição Breve */}
                <div className="space-y-2">
                  <Label htmlFor="short_description">Descrição Breve (para o card)</Label>
                  <Textarea
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    rows={2}
                    className="resize-none"
                    placeholder="Descrição curta que aparece no card (máx. 150 caracteres)"
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.short_description.length}/150 caracteres
                  </p>
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Completa da Vaga</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    required
                    className="resize-none"
                  />
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requisitos</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Certificações Obrigatórias */}
                <div className="space-y-2">
                  <Label>Certificações Obrigatórias</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {AVAILABLE_CERTIFICATIONS.map((cert) => (
                        <div key={cert.id} className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id={`cert_${cert.id}`}
                            checked={formData.required_certifications_list.includes(cert.id)}
                            onChange={(e) => {
                              const updatedCerts = e.target.checked
                                ? [...formData.required_certifications_list, cert.id]
                                : formData.required_certifications_list.filter(id => id !== cert.id);
                              setFormData({ ...formData, required_certifications_list: updatedCerts });
                            }}
                            className="rounded mt-1 flex-shrink-0"
                          />
                          <Label htmlFor={`cert_${cert.id}`} className="text-xs sm:text-sm font-normal leading-tight cursor-pointer">
                            {cert.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione as certificações que são obrigatórias para esta vaga. 
                    Apenas candidatos com todas essas certificações válidas poderão se candidatar.
                  </p>
                </div>
              
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.is_active.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativa</SelectItem>
                      <SelectItem value="false">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="maritime">
                  {editingJob ? "Atualizar" : "Criar"} Vaga
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Profile dialog removed - now navigates to /admin/candidates/:id */}

        {/* Dialog de Parecer de Entrevista */}
        <Dialog open={isInterviewNotesDialogOpen} onOpenChange={handleCloseInterviewNotesDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {pendingStatusChange ? 'Parecer do Contato (Obrigatório)' : 'Parecer de Entrevista'}
              </DialogTitle>
              <DialogDescription>
                {selectedApplicationForNotes?.profiles?.full_name && (
                  <span className="font-semibold">
                    Candidato: {selectedApplicationForNotes.profiles.full_name}
                  </span>
                )}
                {pendingStatusChange && (
                  <p className="mt-2 text-orange-600 font-medium">
                    Para alterar o status para "Contato Realizado", é obrigatório informar o parecer do contato.
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interview-notes">
                  {pendingStatusChange ? 'Parecer do contato realizado *' : 'O que foi conversado na entrevista?'}
                </Label>
                <Textarea
                  id="interview-notes"
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="Digite aqui todas as informações relevantes da entrevista, como: impressões do candidato, habilidades demonstradas, expectativas salariais discutidas, disponibilidade, etc."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Este parecer ficará registrado e poderá ser consultado posteriormente.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCloseInterviewNotesDialog}
              >
                Cancelar
              </Button>
              <Button 
                onClick={saveInterviewNotes}
                disabled={pendingStatusChange && !interviewNotes.trim()}
              >
                {pendingStatusChange ? 'Salvar e Atualizar Status' : 'Salvar Parecer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Drawer de Documentos do Candidato */}
        <CandidateDocumentsDrawer
          isOpen={documentsDrawer.open}
          onClose={() => setDocumentsDrawer({ open: false, clientCandidateId: "", candidateName: "" })}
          clientCandidateId={documentsDrawer.clientCandidateId}
          candidateName={documentsDrawer.candidateName}
        />

        <CandidateProfileTimelineDrawer
          open={timelineDrawer.open}
          onOpenChange={(open) => setTimelineDrawer((prev) => ({ ...prev, open }))}
          jobId={timelineDrawer.jobId}
          candidateId={timelineDrawer.candidateId}
          applicationId={timelineDrawer.applicationId}
          candidateName={timelineDrawer.candidateName}
          jobTitle={timelineDrawer.jobTitle}
        />
      </div>
    </DashboardLayout>
  );
}