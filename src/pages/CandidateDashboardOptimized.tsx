/**
 * Dashboard do Candidato - Versão Otimizada
 * 
 * Melhorias implementadas:
 * - Validação rigorosa de perfil antes da candidatura
 * - Verificação de certificações obrigatórias por vaga
 * - Interface responsiva melhorada
 * - Performance otimizada com lazy loading e memoização
 * - Filtros avançados de pesquisa
 * - Alertas informativos sobre impedimentos
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfileValidation } from '@/hooks/useProfileValidation';
import { JobApplicationButton } from '@/components/JobApplicationButton';
import { ProfileIncompleteModal } from '@/components/ProfileIncompleteModal';
import { Search, Filter, Briefcase, MapPin, Calendar, DollarSign, Users, AlertCircle, CheckCircle2, Clock, X, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

// Util para evitar crash com datas inválidas em mobile
const safeFormatDate = (dateInput: any) => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '';
  }
};

// Interfaces para tipagem
interface Job {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  cover_image_url?: string;
  requirements: string;
  function_name: string;
  is_active: boolean;
  created_at: string;
  required_certifications_list: string[];
  created_by: string;
}

interface Application {
  id: string;
  job_id: string;
  status: 'lista_espera' | 'aprovado' | 'rejeitado' | 'contato_realizado' | 'finalizado';
  applied_at: string;
  rejection_reason?: string;
  job: Job;
}

interface Profile {
  full_name?: string;
  cpf?: string;
  birth_date?: string;
  cep?: string;
  street?: string;
  city?: string;
  state?: string;
  desired_function?: string;
  profile_complete?: boolean;
}

interface Certification {
  [key: string]: boolean | string | null;
}

/**
 * Componente principal do Dashboard do Candidato
 * Gerencia visualização de vagas, candidaturas e validações
 */
export default function CandidateDashboardOptimized() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Autoplay plugin for carousel (desabilita no mobile para evitar crash)
  const isMobile = useIsMobile();
  const plugin = useRef<any>(null);
  useEffect(() => {
    if (!isMobile) {
      plugin.current = Autoplay({ delay: 4000, stopOnInteraction: true });
    } else {
      plugin.current = null;
    }
  }, [isMobile]);

  // Estados principais
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [certifications, setCertifications] = useState<Certification>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState('available-jobs');

  // Estados de UI e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [applyingToJob, setApplyingToJob] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Hook de validação personalizado
  const { validateForJobApplication, isProfileComplete } = useProfileValidation({
    profile,
    certifications
  });

  /**
   * Carrega dados do perfil do usuário
   * Otimizado para fazer apenas uma consulta quando necessário
   */
  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    try {
      // Buscar perfil e certificações em paralelo para melhor performance
      const [profileResponse, certificationsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('certifications')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      if (!profileResponse.error && profileResponse.data) {
        setProfile(profileResponse.data);
      }

      if (!certificationsResponse.error && certificationsResponse.data) {
        setCertifications(certificationsResponse.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus dados de perfil.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  /**
   * Carrega vagas ativas do sistema
   * Implementa cache local para melhor performance
   */
  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs((data || []).map(job => ({
        ...job,
        required_certifications_list: Array.isArray(job.required_certifications_list) 
          ? job.required_certifications_list 
          : job.required_certifications_list 
            ? JSON.parse(job.required_certifications_list as string) 
            : []
      })));
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as vagas disponíveis.",
        variant: "destructive",
      });
    }
  }, [toast]);

  /**
   * Carrega candidaturas do usuário
   * Inclui informações detalhadas das vagas relacionadas
   */
  const fetchApplications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(*)
        `)
        .eq('candidate_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []).map(app => {
        const job: any = (app as any).job || {};
        const requiredList = Array.isArray(job.required_certifications_list)
          ? job.required_certifications_list
          : job.required_certifications_list
            ? JSON.parse(job.required_certifications_list as string)
            : [];
        return {
          ...app,
          job: {
            ...job,
            required_certifications_list: requiredList,
          },
        } as any;
      }));
    } catch (error) {
      console.error('Erro ao carregar candidaturas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas candidaturas.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  /**
   * Processa candidatura para uma vaga
   * Inclui validações de perfil e certificações
   */
  const handleApply = useCallback(async (jobId: string) => {
    if (!user || applyingToJob) return;

    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    // Validar se pode se candidatar
    const validation = validateForJobApplication(job.required_certifications_list || []);
    if (!validation.canApplyToJob) {
      toast({
        title: "Candidatura não permitida",
        description: validation.validationMessage,
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

      // Atualizar lista de candidaturas
      await fetchApplications();
      
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
  }, [user, jobs, validateForJobApplication, fetchApplications, toast, applyingToJob]);

  /**
   * Remove candidatura (cancelar)
   * Implementado conforme correção solicitada
   */
  const handleCancelApplication = useCallback(async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)
        .eq('candidate_id', user?.id); // Segurança adicional

      if (error) throw error;

      // Atualizar lista de candidaturas
      await fetchApplications();
      
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
  }, [user, fetchApplications, toast]);

  /**
   * Filtra vagas baseado nos critérios de pesquisa
   * Memoizado para melhor performance
   */
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.function_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFunction = functionFilter === 'all' || job.function_name === functionFilter;

      return matchesSearch && matchesFunction;
    });
  }, [jobs, searchTerm, functionFilter]);

  /**
   * Filtra candidaturas baseado no status
   * Memoizado para melhor performance
   */
  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter(app => app.status === statusFilter);
  }, [applications, statusFilter]);

  /**
   * Obtém lista única de funções disponíveis
   * Para popular o filtro de funções
   */
  const availableFunctions = useMemo(() => {
    const functions = [...new Set(jobs.map(job => job.function_name))].filter(Boolean);
    return functions.sort();
  }, [jobs]);

  /**
   * Verifica se usuário já se candidatou a uma vaga
   */
  const hasAppliedToJob = useCallback((jobId: string) => {
    return applications.some(app => app.job.id === jobId);
  }, [applications]);

  /**
   * Retorna badge de status da candidatura
   */
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      lista_espera: { label: 'Lista de Espera', variant: 'secondary', icon: Clock },
      aprovado: { label: 'Aprovado', variant: 'default', icon: CheckCircle2 },
      rejeitado: { label: 'Rejeitado', variant: 'destructive', icon: X },
      contato_realizado: { label: 'Contato Realizado', variant: 'outline', icon: CheckCircle2 },
      finalizado: { label: 'Finalizado', variant: 'default', icon: CheckCircle2 }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.lista_espera;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  /**
   * Inicialização dos dados
   * Carrega dados necessários e configura subscriptions para atualizações em tempo real
   */
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfileData(),
        fetchJobs(),
        fetchApplications()
      ]);
      setLoading(false);
    };

    if (user) {
      initializeData();
    }
  }, [user, fetchProfileData, fetchJobs, fetchApplications]);

  /**
   * Configura subscriptions para atualizações em tempo real
   * Otimizado para minimizar re-renders desnecessários
   */
  useEffect(() => {
    if (!user) return;

    const jobsSubscription = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchJobs();
      })
      .subscribe();

    const applicationsSubscription = supabase
      .channel('applications-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'applications',
        filter: `candidate_id=eq.${user.id}`
      }, () => {
        fetchApplications();
      })
      .subscribe();

    return () => {
      jobsSubscription.unsubscribe();
      applicationsSubscription.unsubscribe();
    };
  }, [user, fetchJobs, fetchApplications]);

  // Loading state
  if (loading) {
    return (
      <DashboardLayout userType="candidate">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="candidate">
      <div className="space-y-3 sm:space-y-6 pb-4 sm:pb-8 w-full overflow-hidden px-2 sm:px-0">
        {/* Header with welcome message and profile status */}
        <div className="flex flex-col gap-2 sm:gap-4 w-full max-w-[280px] sm:max-w-none mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              Bem-vindo, {profile?.full_name || 'Candidato'}!
            </h1>
            <p className="text-sm sm:text-sm text-muted-foreground mt-1">
              Encontre as melhores oportunidades para sua carreira marítima
            </p>
          </div>
          
          {/* Profile completion status */}
          <div className="flex flex-col gap-2">
            {!isProfileComplete && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 sm:h-4 sm:w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs sm:text-xs">
                  Complete seu perfil para se candidatar às vagas.
                </AlertDescription>
              </Alert>
            )}
            {isProfileComplete && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 sm:h-4 sm:w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-xs sm:text-xs">
                  Perfil completo! Você pode se candidatar às vagas.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Main content tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col items-center sm:items-start">
          <div className="w-full max-w-[280px] sm:max-w-none">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 h-auto sm:h-10 gap-2 sm:gap-0 p-1">
              <TabsTrigger value="available-jobs" className="flex items-center justify-center gap-1 text-xs sm:text-sm px-2 h-10 sm:h-auto">
                <Briefcase className="h-4 w-4 sm:h-4 sm:w-4" />
                <span>Vagas Disponíveis</span>
                <Badge variant="outline" className="ml-0.5 sm:ml-1 text-[9px] sm:text-xs px-1 h-4">
                  {filteredJobs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="my-applications" className="flex items-center justify-center gap-1 text-xs sm:text-sm px-2 h-10 sm:h-auto">
                <Users className="h-4 w-4 sm:h-4 sm:w-4" />
                <span>Minhas Candidaturas</span>
                <Badge variant="outline" className="ml-0.5 sm:ml-1 text-[9px] sm:text-xs px-1 h-4">
                  {applications.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Available Jobs Tab */}
          <TabsContent value="available-jobs" className="space-y-6">
            {/* Search and filters */}
            <div className="w-full max-w-[280px] sm:max-w-none">
              <Card className="w-full overflow-hidden">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-col gap-2">
                    <div className="w-full">
                      <Input
                        placeholder="Buscar vaga..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 text-sm sm:text-sm"
                      />
                    </div>
                    <div className="w-full">
                      {isMobile ? (
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm min-h-[40px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={functionFilter}
                          onChange={(e) => setFunctionFilter(e.target.value)}
                        >
                          <option value="all">Todas as funções</option>
                          {availableFunctions.map((func) => (
                            <option key={func} value={func}>{func}</option>
                          ))}
                        </select>
                      ) : (
                        <Select value={functionFilter} onValueChange={setFunctionFilter}>
                          <SelectTrigger className="w-full">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Todas as funções" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="all">Todas as funções</SelectItem>
                            {availableFunctions.map((func) => (
                              <SelectItem key={func} value={func}>
                                {func}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                
                  {(searchTerm || functionFilter !== 'all') && (
                    <div className="mt-2 text-xs sm:text-xs text-muted-foreground">
                      {filteredJobs.length} vaga(s) encontrada(s)
                      {searchTerm && ` para "${searchTerm}"`}
                      {functionFilter !== 'all' && ` na função "${functionFilter}"`}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Jobs grid */}
            {filteredJobs.length === 0 ? (
              <div className="w-full max-w-[280px] sm:max-w-none mx-auto">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Nenhuma vaga encontrada
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {searchTerm || functionFilter !== 'all' 
                        ? 'Tente ajustar os filtros de busca para encontrar mais vagas.'
                        : 'Não há vagas disponíveis no momento. Volte em breve para conferir novas oportunidades!'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="w-full max-w-[280px] sm:max-w-none mx-auto sm:mx-0 overflow-visible">
                <Carousel
                  opts={{
                    align: "center",
                    loop: true,
                    duration: 30,
                  }}
                  plugins={plugin.current ? [plugin.current] : []}
                  className="w-full max-w-full"
                  onMouseEnter={() => plugin.current?.stop?.()}
                  onMouseLeave={() => plugin.current?.reset?.()}
                >
                  <CarouselContent className="ml-0 sm:-ml-4">
                    {filteredJobs.map((job) => (
                        <CarouselItem key={job.id} className="pl-2 sm:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 min-w-0">
                      <Link 
                        to={`/vagas/${job.id}`}
                        className="block h-full"
                      >
                        <Card className="group relative overflow-hidden rounded-lg sm:rounded-xl shadow-md hover:shadow-xl transition-all duration-500 ease-out h-[300px] sm:h-[400px] lg:h-[420px] cursor-pointer w-full hover:scale-[1.02] hover:-translate-y-1">
                           {/* Background Image with Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-maritime-blue via-maritime-navy to-maritime-dark transition-all duration-500">
                            {job.cover_image_url ? (
                              <div 
                                className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-80 transition-opacity duration-500 group-hover:scale-110"
                                style={{ backgroundImage: `url(${job.cover_image_url})` }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1578836537282-3171d77f8632?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-50 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-110" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          </div>

                          {/* Content */}
                          <div className="relative h-full flex flex-col justify-between p-2 sm:p-4">
                            {/* Top Badge */}
                            <div className="flex justify-end">
                              <Badge className="bg-white/20 text-white backdrop-blur-sm border-white/30 text-[9px] sm:text-xs px-1.5 py-0.5 transition-all duration-300 group-hover:bg-white/30">
                                {job.function_name}
                              </Badge>
                            </div>

                            {/* Bottom Content */}
                             <div className="space-y-1 sm:space-y-2">
                                <div className="space-y-0.5">
                                  <h3 className="text-sm sm:text-sm lg:text-base font-bold text-white leading-tight line-clamp-2">
                                    {job.title}
                                  </h3>
                                  {job.short_description && (
                                    <p className="text-white/90 text-xs sm:text-xs line-clamp-2 leading-snug">
                                      {job.short_description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between gap-0.5 flex-wrap">
                                    <div className="flex items-center text-xs sm:text-xs text-white/70">
                                      <Calendar className="h-3 w-3 mr-0.5 flex-shrink-0" />
                                      <span className="truncate text-xs">
                                        {safeFormatDate(job.created_at)}
                                      </span>
                                    </div>
                                  
                                  {/* Application Status Badge */}
                                  {(() => {
                                    const application = applications.find(app => app.job_id === job.id);
                                    
                                    // Se já se candidatou
                                       if (application) {
                                          return (
                                            <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-green-500/20 border border-green-500/50">
                                              <CheckCircle2 className="h-2.5 w-2.5 sm:h-2.5 sm:w-2.5 text-green-400" />
                                              <span className="text-green-300 text-[8px] sm:text-[9px] font-medium whitespace-nowrap">Enviada</span>
                                            </div>
                                         );
                                      }
                                    
                                    // Validar se a função desejada corresponde à função da vaga
                                    const jobFunctionMatches = profile?.desired_function && 
                                      profile.desired_function.toLowerCase().trim() === job.function_name.toLowerCase().trim();
                                    
                                    // Validar perfil básico e certificações para esta vaga
                                    const validation = validateForJobApplication(job.required_certifications_list || []);
                                    
                                      // Se a função não corresponde OU se faltam campos/certificações
                                         if (!jobFunctionMatches || !validation.canApplyToJob) {
                                          return (
                                            <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-red-500/20 border border-red-500/50">
                                              <AlertCircle className="h-2.5 w-2.5 sm:h-2.5 sm:w-2.5 text-red-400" />
                                              <span className="text-red-300 text-[8px] sm:text-[9px] font-medium whitespace-nowrap">
                                                {!jobFunctionMatches ? 'Função' : 'Não apto'}
                                              </span>
                                            </div>
                                          );
                                       }
                                      
                                       // Se tudo está OK
                                        return (
                                          <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-green-500/20 border border-green-500/50">
                                            <CheckCircle2 className="h-2.5 w-2.5 sm:h-2.5 sm:w-2.5 text-green-400" />
                                            <span className="text-green-300 text-[8px] sm:text-[9px] font-medium whitespace-nowrap">Apto</span>
                                          </div>
                                        );
                                    })()}
                                  </div>
                                </div>

                              {/* Buttons - Stacked vertically for better alignment */}
                               <div className="flex flex-col gap-0.5 w-full">
                                 <Button 
                                   variant="outline" 
                                   size="sm" 
                                   className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm hover:border-white/50 text-xs sm:text-xs h-7 sm:h-8 px-1 transition-all duration-300"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                   }}
                                   asChild
                                 >
                                   <span className="flex items-center justify-center">
                                     <Eye className="h-3 w-3 sm:h-3 sm:w-3 mr-0.5" />
                                     Detalhes
                                   </span>
                                 </Button>
                                <div 
                                  className="w-full"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <JobApplicationButton
                                    jobId={job.id}
                                    jobTitle={job.title}
                                    jobFunctionName={job.function_name}
                                    requiredCertifications={job.required_certifications_list || []}
                                    profile={profile}
                                    certifications={certifications}
                                    hasApplied={hasAppliedToJob(job.id)}
                                    onApply={async (jobId: string) => {
                                      console.log('🎯 Executando candidatura direta para job (dashboard):', jobId);
                                      
                                      if (!user) {
                                        console.error('❌ Usuário não encontrado para candidatura');
                                        return;
                                      }
                                      
                                      try {
                                        const { error } = await supabase
                                          .from('applications')
                                          .insert({
                                            job_id: jobId,
                                            candidate_id: user.id,
                                            status: 'lista_espera'
                                          });

                                        if (error) {
                                          console.error('❌ Erro ao inserir candidatura:', error);
                                          throw error;
                                        }

                                        console.log('✅ Candidatura inserida com sucesso');
                                        
                                         await fetchProfileData();
                                         await fetchApplications();
                                       } catch (error) {
                                         console.error('❌ Erro ao se candidatar:', error);
                                         throw error;
                                       }
                                    }}
                                    disabled={applyingToJob === job.id}
                                     userId={user?.id || ''}
                                      fetchUserProfile={fetchProfileData}
                                      fetchUserCertifications={fetchProfileData}
                                      className="bg-white text-maritime-blue hover:bg-white/90 font-semibold text-xs sm:text-xs h-7 sm:h-8 px-1 transition-all duration-300"
                                     variant="default"
                                   />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="hidden sm:block">
                    <CarouselPrevious className="-left-12 lg:-left-14" />
                    <CarouselNext className="-right-12 lg:-right-14" />
                  </div>
                </Carousel>
              </div>
            )}
          </TabsContent>

          {/* My Applications Tab */}
          <TabsContent value="my-applications" className="space-y-3 sm:space-y-6">
            {/* Applications filter */}
            <div className="w-full max-w-[280px] sm:max-w-none mx-auto">
              <Card className="w-full overflow-hidden">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base lg:text-lg">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                    Minhas Candidaturas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {isMobile ? (
                    <select
                      className="w-full flex h-9 rounded-md border border-input bg-background px-2 py-1.5 text-xs min-h-[36px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Todos os status</option>
                      <option value="lista_espera">Lista de Espera</option>
                      <option value="aprovado">Aprovados</option>
                      <option value="rejeitado">Rejeitados</option>
                      <option value="contato_realizado">Contato Realizado</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  ) : (
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="lista_espera">Lista de Espera</SelectItem>
                        <SelectItem value="aprovado">Aprovados</SelectItem>
                        <SelectItem value="rejeitado">Rejeitados</SelectItem>
                        <SelectItem value="contato_realizado">Contato Realizado</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Applications list */}
            {filteredApplications.length === 0 ? (
              <div className="w-full max-w-[280px] sm:max-w-none mx-auto">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center p-4">
                    <Users className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                    <h3 className="text-sm sm:text-base font-medium text-muted-foreground mb-1 sm:mb-2">
                      {statusFilter === 'all' ? 'Nenhuma candidatura encontrada' : 'Nenhuma candidatura com este status'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                      {statusFilter === 'all' 
                        ? 'Você ainda não se candidatou a nenhuma vaga. Explore as vagas disponíveis!'
                        : 'Você não possui candidaturas com este status.'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 w-full max-w-[280px] sm:max-w-none mx-auto">
                {filteredApplications.map((application) => (
                  <Card key={application.id} className="hover:shadow-md transition-all duration-300 hover:scale-[1.01]">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-sm sm:text-base">{application.job.title}</h3>
                            {getStatusBadge(application.status)}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="truncate">{application.job.function_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="truncate">Candidatura em {safeFormatDate(application.applied_at)}</span>
                            </div>
                          </div>

                          {application.rejection_reason && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              <AlertDescription className="text-xs sm:text-sm">
                                <strong>Motivo da rejeição:</strong> {application.rejection_reason}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>

                        {application.status === 'lista_espera' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelApplication(application.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto text-xs h-8"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de Perfil Incompleto */}
        <ProfileIncompleteModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          profile={profile}
          certifications={certifications}
          availableJobs={jobs}
        />
      </div>
    </DashboardLayout>
  );
}