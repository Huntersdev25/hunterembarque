/**
 * Página de Candidaturas do Usuário - Design Moderno
 * Exibe candidaturas com cards, filtros avançados e match score
 */
import { useState, useEffect, useMemo } from "react";
import { parseDateLocal } from "@/lib/utils";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { CertificateAlertsPanel } from "@/components/CertificateAlertsPanel";
import { BoardingHistoryPanel } from "@/components/BoardingHistoryPanel";
import { 
  FileText, 
  Calendar, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronDown,
  Building2,
  Briefcase,
  MapPin,
  TrendingUp,
  Sparkles,
  Ship,
  Bell
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Application {
  id: string;
  status: 'lista_espera' | 'contato_realizado' | 'finalizado' | 'aprovado' | 'rejeitado';
  applied_at: string;
  contact_made: boolean;
  contact_date: string | null;
  contact_notes: string | null;
  interview_stage: string | null;
  jobs: {
    id: string;
    title: string;
    function_name: string;
    description: string;
    short_description: string | null;
    cover_image_url: string | null;
  };
}

interface ProfileData {
  id: string;
  full_name: string;
}

type SortOption = 'date_desc' | 'date_asc' | 'status';
type StatusFilter = 'all' | 'lista_espera' | 'contato_realizado' | 'aprovado' | 'rejeitado' | 'finalizado';

export default function CandidateApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingApplication, setCancellingApplication] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  // Filters and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [showFilters, setShowFilters] = useState(false);

  // Stats
  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === 'lista_espera').length,
    inProgress: applications.filter(a => a.status === 'contato_realizado').length,
    approved: applications.filter(a => a.status === 'aprovado').length,
    rejected: applications.filter(a => a.status === 'rejeitado').length,
  }), [applications]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchApplications();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("user_id", user?.id)
      .single();
    
    if (data) setProfile(data);
  };

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          contact_made,
          contact_date,
          contact_notes,
          interview_stage,
          jobs (
            id,
            title,
            function_name,
            description,
            short_description,
            cover_image_url
          )
        `)
        .eq('candidate_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Erro ao carregar candidaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar suas candidaturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('applications-changes-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `candidate_id=eq.${user?.id}`
        },
        () => fetchApplications()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleCancelApplication = async (applicationId: string) => {
    setCancellingApplication(applicationId);
    
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      setApplications(prev => prev.filter(app => app.id !== applicationId));
      toast({ title: "Sucesso", description: "Candidatura cancelada com sucesso" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar candidatura",
        variant: "destructive",
      });
    } finally {
      setCancellingApplication(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'aprovado':
        return { 
          icon: CheckCircle2, 
          label: 'Aprovado', 
          color: 'bg-green-500',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-700'
        };
      case 'rejeitado':
        return { 
          icon: XCircle, 
          label: 'Reprovado', 
          color: 'bg-destructive',
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-700'
        };
      case 'lista_espera':
        return { 
          icon: Clock, 
          label: 'Em Análise', 
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-700'
        };
      case 'contato_realizado':
        return { 
          icon: MessageSquare, 
          label: 'Em Contato', 
          color: 'bg-amber-500',
          bgColor: 'bg-amber-50 border-amber-200',
          textColor: 'text-amber-700'
        };
      case 'finalizado':
        return { 
          icon: CheckCircle2, 
          label: 'Finalizado', 
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-700'
        };
      default:
        return { 
          icon: Clock, 
          label: status, 
          color: 'bg-gray-500',
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-700'
        };
    }
  };

  const canCancelApplication = (status: string) => {
    return ['lista_espera', 'contato_realizado'].includes(status);
  };

  // Filtered and sorted applications
  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(app => 
        app.jobs.title.toLowerCase().includes(search) ||
        app.jobs.function_name.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(app => app.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
        case 'date_desc':
          return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
        case 'status':
          const statusOrder = { aprovado: 0, contato_realizado: 1, lista_espera: 2, rejeitado: 3, finalizado: 4 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 5) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 5);
        default:
          return 0;
      }
    });

    return result;
  }, [applications, searchTerm, statusFilter, sortBy]);

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Minhas Candidaturas
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe o progresso das suas aplicações
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="maritime" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Explorar Vagas
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Análise</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Contato</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reprovados</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Applications List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por vaga ou função..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="w-[160px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="lista_espera">Em Análise</SelectItem>
                        <SelectItem value="contato_realizado">Em Contato</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="rejeitado">Reprovado</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                      <SelectTrigger className="w-[160px]">
                        {sortBy === 'date_desc' ? <SortDesc className="h-4 w-4 mr-2" /> : <SortAsc className="h-4 w-4 mr-2" />}
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date_desc">Mais Recentes</SelectItem>
                        <SelectItem value="date_asc">Mais Antigos</SelectItem>
                        <SelectItem value="status">Por Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applications Grid */}
            {filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {applications.length === 0 
                      ? "Nenhuma candidatura ainda" 
                      : "Nenhum resultado encontrado"
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {applications.length === 0 
                      ? "Explore as oportunidades disponíveis!" 
                      : "Tente ajustar os filtros"
                    }
                  </p>
                  {applications.length === 0 && (
                    <Link to="/dashboard">
                      <Button variant="maritime">Ver Vagas Disponíveis</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((application) => {
                  const statusConfig = getStatusConfig(application.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Card 
                      key={application.id} 
                      className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${statusConfig.bgColor}`}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Image */}
                          {application.jobs.cover_image_url && (
                            <div className="md:w-48 h-32 md:h-auto">
                              <img 
                                src={application.jobs.cover_image_url} 
                                alt={application.jobs.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`${statusConfig.textColor} border-current`}
                                  >
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig.label}
                                  </Badge>
                                  {profile && (
                                    <MatchScoreBadge 
                                      profileId={profile.id} 
                                      jobId={application.jobs.id}
                                      compact
                                    />
                                  )}
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {application.jobs.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-4 w-4" />
                                    {application.jobs.function_name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 whitespace-pre-wrap">
                              {application.jobs.description}
                            </p>

                            {/* Timeline */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Aplicado {formatDistanceToNow(new Date(application.applied_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                              {application.contact_date && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Contato em {format(parseDateLocal(application.contact_date), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              )}
                            </div>

                            {/* Contact notes */}
                            {application.contact_notes && (
                              <div className="p-2 bg-muted/50 rounded text-sm mb-3">
                                <p className="text-muted-foreground italic">"{application.contact_notes}"</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Link to={`/vagas/${application.jobs.id}`}>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Eye className="h-4 w-4" />
                                  Ver Vaga
                                </Button>
                              </Link>
                              
                              {canCancelApplication(application.status) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      disabled={cancellingApplication === application.id}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      {cancellingApplication === application.id ? "Cancelando..." : "Cancelar"}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancelar Candidatura</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja cancelar sua candidatura para "{application.jobs.title}"? 
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Não, manter</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleCancelApplication(application.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Sim, cancelar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Certificate Alerts */}
            <CertificateAlertsPanel compact />

            {/* Boarding History */}
            <BoardingHistoryPanel isEditable compact />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
