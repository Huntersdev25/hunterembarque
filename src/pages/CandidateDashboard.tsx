import { useState, useEffect, useMemo, useCallback } from "react";
import { formatDateBR } from "@/lib/utils";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
  User, 
  Shield, 
  Calendar, 
  ChevronRight,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Anchor,
  Navigation,
  Ship,
  Waves,
  Briefcase,
  Search,
  Send,
  Eye,
  X,
  Users,
  Paperclip,
  Trash2,
  Download
} from "lucide-react";
import { StatusHero } from "@/components/dashboard/StatusHero";
import { PriorityActions } from "@/components/dashboard/PriorityActions";
import { JobCompatibilityCard } from "@/components/dashboard/JobCompatibilityCard";
import { DocumentsSummaryCard } from "@/components/dashboard/DocumentsSummaryCard";
import { ActivePipeline } from "@/components/dashboard/ActivePipeline";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  desired_function: string | null;
  available_from: string | null;
  available_until: string | null;
  profile_complete: boolean | null;
  city: string | null;
  state: string | null;
  professional_experience: string | null;
  cpf: string | null;
  birth_date: string | null;
  cep: string | null;
  street: string | null;
}

interface CertificationStatus {
  name: string;
  label: string;
  fullName?: string;
  hasIt: boolean;
  validity: string | null;
  isIndeterminate?: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  hasAttachment: boolean;
  filePath?: string | null;
  fileName?: string | null;
}

interface Job {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  function_name: string;
  is_active: boolean;
  created_at: string;
  required_certifications_list: string[];
}

interface Application {
  id: string;
  job_id: string;
  status: 'lista_espera' | 'aprovado' | 'rejeitado' | 'contato_realizado' | 'finalizado';
  applied_at: string;
  rejection_reason?: string;
  job: Job;
}

const safeFormatDate = (dateInput: any) => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '';
  }
};

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [certifications, setCertifications] = useState<CertificationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [certPage, setCertPage] = useState(0);
  const [rawCertData, setRawCertData] = useState<any>(null);
  const certsPerPage = 4;

  // States for Jobs & Applications
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [applyingToJob, setApplyingToJob] = useState<string | null>(null);

  const location = useLocation();

  // Re-fetch data whenever user navigates to this page
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, location.key]);

  // Realtime: re-fetch when admin changes application status, or data changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`candidate-dashboard:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `candidate_id=eq.${user.id}` }, () => {
        console.log('📡 Realtime: applications updated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'certifications', filter: `user_id=eq.${user.id}` }, () => {
        console.log('📡 Realtime: certifications updated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, () => {
        console.log('📡 Realtime: profile updated');
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        console.log('📡 Realtime: jobs updated');
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch all data in parallel
      const [profileResponse, certResponse, jobsResponse, applicationsResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('certifications').select('*').eq('user_id', user.id).single(),
        supabase.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('applications').select(`*, job:jobs(*)`).eq('candidate_id', user.id).order('applied_at', { ascending: false })
      ]);

      if (profileResponse.data) {
        setProfile(profileResponse.data);
        calculateProfileCompletion(profileResponse.data);
      }

      if (certResponse.data) {
        setRawCertData(certResponse.data);
        processCertifications(certResponse.data);
      }

      if (jobsResponse.data) {
        setJobs(jobsResponse.data.map(job => ({
          ...job,
          required_certifications_list: Array.isArray(job.required_certifications_list) 
            ? job.required_certifications_list 
            : job.required_certifications_list 
              ? JSON.parse(job.required_certifications_list as string) 
              : []
        })));
      }

      if (applicationsResponse.data) {
        setApplications(applicationsResponse.data.map((app: any) => {
          const job = app.job || {};
          return {
            ...app,
            job: {
              ...job,
              required_certifications_list: Array.isArray(job.required_certifications_list)
                ? job.required_certifications_list
                : job.required_certifications_list
                  ? JSON.parse(job.required_certifications_list as string)
                  : []
            }
          };
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = (data: any) => {
    const fields = [
      'full_name', 'email', 'phone', 'birth_date', 'cpf', 'rg',
      'cep', 'street', 'neighborhood', 'city', 'state',
      'desired_function', 'professional_experience', 'languages'
    ];
    
    const filled = fields.filter(field => data[field] && data[field].toString().trim() !== '').length;
    setProfileCompletion(Math.round((filled / fields.length) * 100));
  };

  const processCertifications = (data: any) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const allCerts = [
      { name: 'cir', label: 'CIR', fullName: 'Carteira de Inscrição e Registro' },
      { name: 'stcw', label: 'STCW', fullName: 'Standards of Training, Certification and Watchkeeping' },
      { name: 'caaq', label: 'CAAQ', fullName: 'Curso de Adaptação para Aquaviários' },
      { name: 'tbs1', label: 'TBS1', fullName: 'Treinamento Básico de Segurança' },
      { name: 'cbsp', label: 'CBSP', fullName: 'Curso Básico de Segurança de Plataforma' },
      { name: 'thuet', label: 'THUET', fullName: 'Tropical Helicopter Underwater Escape Training' },
      { name: 'alph', label: 'ALPH', fullName: 'Alfabetização de Plataforma e Helicóptero' },
      { name: 'espe', label: 'ESPE', fullName: 'Especial Básico de Sobrevivência Pessoal' },
      { name: 'esrs', label: 'ESRS', fullName: 'Especial Básico de Responsabilidade Social' },
      { name: 'ebps', label: 'EBPS', fullName: 'Especial Básico de Primeiros Socorros' },
      { name: 'ecin', label: 'ECIN', fullName: 'Especial de Combate a Incêndio' },
      { name: 'ecia_caci', label: 'ECIA/CACI', fullName: 'Especial Avançado de Combate a Incêndio' },
      { name: 'ebcp', label: 'EBCP', fullName: 'Especial Básico de Conscientização sobre Proteção' },
      { name: 'eopn', label: 'EOPN', fullName: 'Especial para Oficiais de Proteção de Navio' },
      { name: 'epsm', label: 'EPSM', fullName: 'Especial de Proteção e Segurança Marítima' },
      { name: 'cess', label: 'CESS', fullName: 'Curso Especial de Segurança em Espaços Confinados' },
      { name: 'cerr', label: 'CERR', fullName: 'Curso Especial de Radioperador Restrito' },
      { name: 'efnt', label: 'EFNT', fullName: 'Especial de Familiarização em Navios Tanque' },
      { name: 'ebpq', label: 'EBPQ', fullName: 'Especial Básico de Navios Tanques Petroleiros' },
      { name: 'ebgl', label: 'EBGL', fullName: 'Especial Básico de Navios Tanques de Gás Liquefeito' },
      { name: 'esop', label: 'ESOP', fullName: 'Especial de Segurança em Operações de Carga' },
      { name: 'cns014', label: 'CNS014', fullName: 'Curso de Navegação Simulada' },
      { name: 'lpn', label: 'LPN', fullName: 'Licença de Piloto de Navio' },
      { name: 'gmdss', label: 'GMDSS', fullName: 'Global Maritime Distress and Safety System' },
      { name: 'cft', label: 'CFT', fullName: 'Curso de Formação de Taifeiros' },
      { name: 'dp', label: 'DP', fullName: 'Dynamic Positioning' },
    ];

    const certList: CertificationStatus[] = allCerts
      .filter(cert => data[cert.name])
      .map(cert => {
        const validity = data[`${cert.name}_validity`];
        const isIndeterminate = data[`${cert.name}_indeterminate`];
        const filePath = data[`${cert.name}_file_path`];
        const fileName = data[`${cert.name}_file_name`];
        let isExpired = false;
        let isExpiringSoon = false;

        if (validity && !isIndeterminate) {
          const validityDate = new Date(validity);
          isExpired = validityDate < today;
          isExpiringSoon = !isExpired && validityDate <= thirtyDaysFromNow;
        }

        return {
          name: cert.name,
          label: cert.label,
          fullName: cert.fullName,
          hasIt: true,
          validity: validity,
          isIndeterminate: isIndeterminate || false,
          isExpired,
          isExpiringSoon,
          hasAttachment: !!(filePath && fileName),
          filePath,
          fileName,
        };
      });

    setCertifications(certList);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Jobs & Applications helpers
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.function_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFunction = functionFilter === 'all' || job.function_name === functionFilter;
      return matchesSearch && matchesFunction;
    });
  }, [jobs, searchTerm, functionFilter]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter(app => app.status === statusFilter);
  }, [applications, statusFilter]);

  const availableFunctions = useMemo(() => {
    const functions = [...new Set(jobs.map(job => job.function_name))].filter(Boolean);
    return functions.sort();
  }, [jobs]);

  const hasAppliedToJob = useCallback((jobId: string) => {
    return applications.some(app => app.job?.id === jobId);
  }, [applications]);

  const isProfileComplete = useMemo(() => {
    if (!profile) return false;
    return !!(profile.full_name && profile.cpf && profile.birth_date && profile.city && profile.state);
  }, [profile]);

  const handleApply = async (jobId: string) => {
    if (!user || applyingToJob) return;

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (!isProfileComplete) {
      toast({
        title: "Perfil incompleto",
        description: "Complete seu perfil antes de se candidatar.",
        variant: "destructive",
      });
      return;
    }

    setApplyingToJob(jobId);
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          candidate_id: user.id,
          job_id: jobId,
          status: 'lista_espera'
        });

      if (error) throw error;

      await fetchData();
      
      toast({
        title: "Candidatura enviada!",
        description: `Sua candidatura para "${job.title}" foi enviada com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao se candidatar:', error);
      toast({
        title: "Erro na candidatura",
        description: error.message || "Houve um erro ao enviar sua candidatura.",
        variant: "destructive",
      });
    } finally {
      setApplyingToJob(null);
    }
  };

  const handleCancelApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: "Candidatura cancelada",
        description: "Sua candidatura foi cancelada com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao cancelar candidatura:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a candidatura.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCertification = async (cert: CertificationStatus) => {
    if (!cert.filePath || !cert.fileName) {
      toast({
        title: "Arquivo não encontrado",
        description: "Este certificado não possui arquivo anexado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(cert.filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = cert.fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download iniciado",
        description: `Arquivo ${cert.fileName} baixado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Erro no download",
        description: error.message || "Erro ao baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCertificationFile = async (cert: CertificationStatus) => {
    if (!cert.filePath) {
      toast({
        title: "Arquivo não encontrado",
        description: "Este certificado não possui arquivo anexado.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o arquivo de ${cert.label}?`)) return;

    try {
      // Remove do storage
      const { error: storageError } = await supabase.storage
        .from('feed-documents')
        .remove([cert.filePath]);

      if (storageError) throw storageError;

      // Atualiza no banco de dados
      const { error: dbError } = await supabase
        .from('certifications')
        .update({
          [`${cert.name}_file_path`]: null,
          [`${cert.name}_file_name`]: null
        })
        .eq('user_id', user?.id);

      if (dbError) throw dbError;

      // Atualiza estado local
      setCertifications(prev => 
        prev.map(c => 
          c.name === cert.name 
            ? { ...c, hasAttachment: false, filePath: null, fileName: null }
            : c
        )
      );

      toast({
        title: "Arquivo excluído",
        description: `O arquivo de ${cert.label} foi removido com sucesso.`,
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Erro ao excluir o arquivo.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
      lista_espera: { label: 'Lista de Espera', variant: 'secondary', icon: Clock },
      aprovado: { label: 'Aprovado', variant: 'default', icon: CheckCircle2 },
      rejeitado: { label: 'Rejeitado', variant: 'destructive', icon: X },
      contato_realizado: { label: 'Contato Realizado', variant: 'outline', icon: CheckCircle2 },
      finalizado: { label: 'Finalizado', variant: 'default', icon: CheckCircle2 }
    };

    const config = statusConfig[status] || statusConfig.lista_espera;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const activeCerts = certifications.filter(c => c.hasIt && !c.isExpired).length;
  const expiringCerts = certifications.filter(c => c.isExpiringSoon).length;
  const expiredCerts = certifications.filter(c => c.isExpired).length;

  if (loading) {
    return (
      <DashboardLayout userType="candidate">
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-maritime-blue/20 border-t-maritime-blue"></div>
            <Anchor className="absolute inset-0 m-auto h-6 w-6 text-maritime-blue animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="candidate">
      <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden px-3 py-3 sm:px-0 sm:py-0">
        {/* Hero Section */}
        <div className="relative max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-maritime-blue via-maritime-navy to-slate-900 p-4 sm:p-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-20 overflow-hidden">
            <Waves className="absolute bottom-2 left-10 h-8 w-8 text-white/10 animate-pulse" />
            <Waves className="absolute bottom-4 left-1/3 h-6 w-6 text-white/5 animate-pulse delay-150" />
            <Waves className="absolute bottom-1 right-1/4 h-10 w-10 text-white/10 animate-pulse delay-300" />
          </div>

          <div className="relative flex min-w-0 max-w-full flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-300" />
              <Avatar className="relative h-20 w-20 sm:h-24 sm:w-24 border-4 border-white/20 shadow-2xl">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-white/10 text-white text-xl sm:text-2xl font-bold backdrop-blur-sm">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-cyan-300 text-sm font-medium mb-1">{getGreeting()}</p>
              <h1 className="mb-2 break-words text-2xl font-bold text-white sm:text-3xl">
                {profile?.full_name?.split(' ')[0] || 'Profissional'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-white/70 text-sm">
                {profile?.desired_function && (
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                    <Anchor className="h-3 w-3 mr-1" />
                    {profile.desired_function}
                  </Badge>
                )}
                {profile?.city && profile?.state && (
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                    <Navigation className="h-3 w-3 mr-1" />
                    {profile.city}, {profile.state}
                  </Badge>
                )}
              </div>
            </div>

            <Link to="/profile" className="hidden sm:block">
              <Button 
                variant="secondary" 
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              >
                <User className="h-4 w-4 mr-2" />
                Ver Perfil
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0 max-w-full overflow-hidden">
          <TabsList className="grid h-auto w-full min-w-0 grid-cols-2 p-1">
            <TabsTrigger value="dashboard" className="flex min-w-0 items-center justify-center gap-2 px-2 py-3">
              <Ship className="h-4 w-4" />
              <span className="hidden sm:inline">Painel</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex min-w-0 items-center justify-center gap-1 px-2 py-3 sm:gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Candidaturas</span>
              <Badge variant="outline" className="ml-0 text-xs sm:ml-1">{applications.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {/* 1. Hero de Status */}
            <StatusHero
              certifications={certifications}
              profileCompletion={profileCompletion}
            />

            {/* 2. Lista de ações prioritárias */}
            <PriorityActions
              certifications={certifications}
              profileCompletion={profileCompletion}
            />

            {/* 3. Vaga compatível */}
            <JobCompatibilityCard
              certifications={certifications}
              jobs={jobs}
              userFunction={profile?.desired_function || null}
              appliedJobIds={applications.map(a => a.job_id)}
              onQuickApply={handleApply}
              applyingToJob={applyingToJob}
              isProfileComplete={isProfileComplete}
            />

            {/* 4. Tabela de certificações */}
            <DocumentsSummaryCard certifications={certifications} />

            {/* 4. Candidatura ativa */}
            <ActivePipeline applications={applications} />
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-6 space-y-4">
            {/* Filter */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="lista_espera">Lista de Espera</SelectItem>
                    <SelectItem value="contato_realizado">Contato Realizado</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Applications List */}
            {filteredApplications.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Nenhuma candidatura encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    {applications.length === 0 
                      ? 'Você ainda não se candidatou a nenhuma vaga.' 
                      : 'Nenhuma candidatura com o status selecionado.'}
                  </p>
                  {applications.length === 0 && (
                    <Link to="/jobs">
                      <Button>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Ver Vagas Disponíveis
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredApplications.map((app) => (
                  <Card key={app.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg line-clamp-1">
                            {app.job?.title || 'Vaga não encontrada'}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Anchor className="h-3 w-3" />
                            {app.job?.function_name || 'Função não informada'}
                          </CardDescription>
                        </div>
                        {getStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs text-muted-foreground">
                          Aplicado em {safeFormatDate(app.applied_at)}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {app.job?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/vagas/${app.job.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          )}
                          {app.status === 'lista_espera' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelApplication(app.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                      {app.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-xs text-red-700 dark:text-red-300">
                            <strong>Motivo da rejeição:</strong> {app.rejection_reason}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
