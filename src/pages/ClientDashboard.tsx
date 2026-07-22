import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, Users, Briefcase, FileCheck, Send, CalendarDays, 
  Stethoscope, Clock, CheckCircle2, XCircle, AlertTriangle,
  TrendingUp, ArrowRight, Activity
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateBR } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [companyUserInfo, setCompanyUserInfo] = useState<any>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (clientData) {
        setClientInfo(clientData);
        setIsCompanyAdmin(true);
        return;
      }

      const { data: companyUserData } = await supabase
        .from("company_users")
        .select(`*, client:client_id (id, company_name, contact_name, email, phone)`)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (companyUserData) {
        setCompanyUserInfo(companyUserData);
        const client = Array.isArray(companyUserData.client) ? companyUserData.client[0] : companyUserData.client;
        setClientInfo(client);
        setIsCompanyAdmin(companyUserData.role === 'company_admin');
      }
    };

    fetchUserInfo();
  }, [user]);

  // Fetch candidates with all details
  const { data: candidates } = useQuery({
    queryKey: ["client-dashboard-candidates", clientInfo?.id],
    queryFn: async () => {
      if (!clientInfo?.id) return [];
      const { data, error } = await supabase
        .from("client_candidates")
        .select(`
          id, candidate_id, interview_status, interview_date, interview_time,
          aso_status, assigned_at, rejection_reason,
          candidate:candidate_id (full_name, desired_function, avatar_url),
          job:job_id (title)
        `)
        .eq("client_id", clientInfo.id)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((a: any) => ({
        ...a,
        candidate: Array.isArray(a.candidate) ? a.candidate[0] : a.candidate,
        job: Array.isArray(a.job) ? a.job[0] : a.job,
      }));
    },
    enabled: !!clientInfo?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["client-stats", clientInfo?.id],
    queryFn: async () => {
      if (!clientInfo?.id) return { totalCandidates: 0, activeJobs: 0, pendingRequests: 0 };
      const { count: candidatesCount } = await supabase
        .from("client_candidates").select("*", { count: "exact", head: true }).eq("client_id", clientInfo.id);
      const { count: activeJobsCount } = await supabase
        .from("jobs").select("*", { count: "exact", head: true }).eq("client_id", clientInfo.id).eq("is_active", true);
      const { count: pendingRequestsCount } = await supabase
        .from("professional_requests").select("*", { count: "exact", head: true }).eq("client_id", clientInfo.id).eq("status", "pendente");
      return { totalCandidates: candidatesCount || 0, activeJobs: activeJobsCount || 0, pendingRequests: pendingRequestsCount || 0 };
    },
    enabled: !!clientInfo?.id,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["client-requests", clientInfo?.id, companyUserInfo?.id],
    queryFn: async () => {
      if (!clientInfo?.id) return [];
      let query = supabase
        .from("professional_requests")
        .select(`*, company_users!professional_requests_company_user_id_fkey (full_name, email)`)
        .eq("client_id", clientInfo.id);
      if (!isCompanyAdmin && companyUserInfo?.id) {
        query = query.eq("company_user_id", companyUserInfo.id);
      }
      const { data, error } = await query.order("requested_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientInfo?.id,
  });

  // Compute ASO metrics
  const asoMetrics = (() => {
    if (!candidates) return { pendente: 0, marcado: 0, finalizado: 0, total: 0 };
    const active = candidates.filter((c: any) => c.interview_status !== 'rejected');
    return {
      pendente: active.filter((c: any) => !c.aso_status || c.aso_status === 'pendente').length,
      marcado: active.filter((c: any) => c.aso_status === 'marcado').length,
      finalizado: active.filter((c: any) => c.aso_status === 'finalizado').length,
      total: active.length,
    };
  })();

  // Compute status metrics
  const statusMetrics = (() => {
    if (!candidates) return { pending: 0, interview: 0, aso: 0, completed: 0, rejected: 0 };
    return {
      pending: candidates.filter((c: any) => !c.interview_status || c.interview_status === 'pending').length,
      interview: candidates.filter((c: any) => c.interview_status === 'interview').length,
      aso: candidates.filter((c: any) => c.interview_status === 'aso').length,
      completed: candidates.filter((c: any) => c.interview_status === 'completed' || c.interview_status === 'approved').length,
      rejected: candidates.filter((c: any) => c.interview_status === 'rejected').length,
    };
  })();

  // Upcoming interviews (next 14 days)
  const upcomingInterviews = (() => {
    if (!candidates) return [];
    const now = new Date();
    const limit = addDays(now, 14);
    return candidates
      .filter((c: any) => {
        if (!c.interview_date) return false;
        const d = new Date(c.interview_date + 'T00:00:00');
        return isAfter(d, addDays(now, -1)) && isBefore(d, limit);
      })
      .sort((a: any, b: any) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime())
      .slice(0, 6);
  })();

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendente: { label: "Pendente", variant: "outline" },
      em_andamento: { label: "Em Andamento", variant: "secondary" },
      concluida: { label: "Concluída", variant: "default" },
      cancelada: { label: "Cancelada", variant: "destructive" },
    };
    const c = config[status] || config['pendente'];
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      baixa: { label: "Baixa", variant: "secondary" },
      media: { label: "Média", variant: "default" },
      alta: { label: "Alta", variant: "destructive" },
    };
    const c = config[urgency] || config['media'];
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <DashboardLayout userType="client">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-maritime shadow-maritime flex-shrink-0">
              <Building2 className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                {isCompanyAdmin ? clientInfo?.company_name : companyUserInfo?.full_name || "Usuário"}
              </h1>
              <p className="text-[11px] sm:text-sm text-muted-foreground truncate">
                {isCompanyAdmin ? "Painel Executivo" : "Seu painel de acompanhamento"}
              </p>
            </div>
          </div>
          {!isCompanyAdmin && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 w-fit max-w-full truncate">
              <span className="truncate">
                {companyUserInfo?.role === 'company_admin' ? 'Administrador' : 'Usuário'} • {clientInfo?.company_name}
              </span>
            </Badge>
          )}
        </div>

        <Tabs defaultValue="dashboard" className="space-y-5 sm:space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-full sm:w-auto grid grid-cols-2 sm:inline-grid sm:grid-cols-none sm:flex">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm">
              Solicitações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              {/* Total Candidatos */}
              <Card className="border-none shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group" onClick={() => navigate('/c/aprovados')}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.totalCandidates || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Profissionais</p>
                </CardContent>
              </Card>

              {/* Vagas Ativas */}
              <Card className="border-none shadow-card hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-accent/10">
                      <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.activeJobs || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Vagas Ativas</p>
                </CardContent>
              </Card>

              {/* Pendentes */}
              <Card className="border-none shadow-card hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-warning/10">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.pendingRequests || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Solicitações Pendentes</p>
                </CardContent>
              </Card>

              {/* Concluídos */}
              <Card className="border-none shadow-card hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-success/10">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{statusMetrics.completed}</div>
                  <p className="text-xs text-muted-foreground mt-1">Processos Concluídos</p>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline + ASO Row */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Pipeline Status */}
              <Card className="border-none shadow-card overflow-hidden">
                <div className="h-1 bg-gradient-maritime" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Pipeline de Recrutamento
                  </CardTitle>
                  <CardDescription className="text-xs">Status dos profissionais no processo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Aguardando Avaliação", value: statusMetrics.pending, color: "bg-muted-foreground/20", textColor: "text-muted-foreground", icon: Clock },
                    { label: "Em Entrevista", value: statusMetrics.interview, color: "bg-primary/20", textColor: "text-primary", icon: CalendarDays },
                    { label: "Realizando ASO", value: statusMetrics.aso, color: "bg-purple-500/20", textColor: "text-purple-600", icon: Stethoscope },
                    { label: "Concluído", value: statusMetrics.completed, color: "bg-success/20", textColor: "text-success", icon: CheckCircle2 },
                    { label: "Reprovado", value: statusMetrics.rejected, color: "bg-destructive/20", textColor: "text-destructive", icon: XCircle },
                  ].map((item) => {
                    const total = (candidates?.length || 1);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.label} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <item.icon className={`h-3.5 w-3.5 ${item.textColor}`} />
                            <span className="text-xs sm:text-sm font-medium text-foreground">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${item.textColor}`}>{item.value}</span>
                            <span className="text-xs text-muted-foreground">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* ASO Status */}
              <Card className="border-none shadow-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    Status ASO
                  </CardTitle>
                  <CardDescription className="text-xs">Atestado de Saúde Ocupacional dos profissionais ativos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="text-center p-3 sm:p-4 rounded-xl bg-warning/5 border border-warning/10">
                      <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-warning mx-auto mb-1.5" />
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{asoMetrics.pendente}</div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Pendente</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary mx-auto mb-1.5" />
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{asoMetrics.marcado}</div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Marcado</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-xl bg-success/5 border border-success/10">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success mx-auto mb-1.5" />
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{asoMetrics.finalizado}</div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Finalizado</p>
                    </div>
                  </div>
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso geral</span>
                      <span>{asoMetrics.total > 0 ? Math.round((asoMetrics.finalizado / asoMetrics.total) * 100) : 0}% concluído</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                      {asoMetrics.total > 0 && (
                        <>
                          <div className="h-full bg-success/60 transition-all" style={{ width: `${(asoMetrics.finalizado / asoMetrics.total) * 100}%` }} />
                          <div className="h-full bg-primary/40 transition-all" style={{ width: `${(asoMetrics.marcado / asoMetrics.total) * 100}%` }} />
                          <div className="h-full bg-warning/30 transition-all" style={{ width: `${(asoMetrics.pendente / asoMetrics.total) * 100}%` }} />
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success/60" /> Finalizado</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40" /> Marcado</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning/30" /> Pendente</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Interviews */}
            <Card className="border-none shadow-card overflow-hidden">
              <div className="h-1 bg-gradient-primary" />
              <CardHeader className="pb-3">
                <div className="flex items-start sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Próximas Entrevistas</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Agenda dos próximos 14 dias</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-primary flex-shrink-0 px-2" onClick={() => navigate('/c/aprovados')}>
                    <span className="hidden sm:inline">Ver todos</span>
                    <ArrowRight className="h-3 w-3 sm:ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingInterviews.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma entrevista agendada</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingInterviews.map((item: any) => {
                      const interviewDate = new Date(item.interview_date + 'T00:00:00');
                      const isToday = format(interviewDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      return (
                        <div 
                          key={item.id} 
                          className={`p-3 sm:p-4 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${
                            isToday ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                          }`}
                          onClick={() => item.candidate?.user_id && navigate(`/c/aprovados/${item.candidate.user_id}`)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold ${
                                isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}>
                                {format(interviewDate, 'dd')}
                              </div>
                              <div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">
                                  {format(interviewDate, 'MMM', { locale: ptBR })}
                                </p>
                                {isToday && <Badge className="text-[9px] px-1 py-0 bg-primary/80">HOJE</Badge>}
                              </div>
                            </div>
                            {item.interview_time && (
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                {item.interview_time?.slice(0, 5)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {item.candidate?.full_name || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.candidate?.desired_function || item.job?.title || "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Info (compact) */}
            {isCompanyAdmin && (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                <Card className="border-none shadow-card overflow-hidden">
                  <div className="h-1 bg-gradient-maritime" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Informações da Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      {[
                        { label: "Empresa", value: clientInfo?.company_name },
                        { label: "Contato", value: clientInfo?.contact_name },
                        { label: "Email", value: clientInfo?.email },
                        { label: "Telefone", value: clientInfo?.phone },
                      ].map((f) => (
                        <div key={f.label} className="space-y-0.5 min-w-0">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{f.label}</p>
                          <p className="text-sm font-medium text-foreground truncate">{f.value || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-card overflow-hidden">
                  <div className="h-1 bg-gradient-primary" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      Ações Rápidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "Ver Candidatos", desc: "Gerenciar profissionais", icon: Users, path: '/c/aprovados' },
                      { label: "Nova Solicitação", desc: "Requisitar profissionais", icon: Send, path: '/c/aprovados' },
                      { label: "Candidatos por Usuário", desc: "Visão por responsável", icon: Briefcase, path: '/c/por-usuario' },
                    ].map((action) => (
                      <button
                        key={action.label}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                        onClick={() => navigate(action.path)}
                      >
                        <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                          <action.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Card className="border-none shadow-card overflow-hidden">
              <div className="h-1 bg-gradient-maritime" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  {isCompanyAdmin ? "Todas as Solicitações" : "Minhas Solicitações"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isCompanyAdmin ? "Solicitações de todos os usuários" : "Suas requisições de profissionais"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {requestsLoading ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  </div>
                ) : !requests || requests.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-border">
                      {requests.map((request: any) => (
                        <div key={request.id} className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">{request.job_function}</p>
                              <p className="text-[11px] text-muted-foreground">{formatDateBR(request.requested_at)}</p>
                            </div>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex-shrink-0">
                              {request.quantity}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {getStatusBadge(request.status || "pendente")}
                            {getUrgencyBadge(request.urgency || "media")}
                          </div>
                          {(request.company_users?.full_name || request.period_start) && (
                            <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
                              {request.company_users?.full_name && (
                                <p className="truncate">Solicitante: {request.company_users.full_name}</p>
                              )}
                              {request.period_start && request.period_end && (
                                <p>Período: {formatDateBR(request.period_start)} - {formatDateBR(request.period_end)}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="font-semibold">Data</TableHead>
                            <TableHead className="font-semibold">Função</TableHead>
                            <TableHead className="font-semibold">Qtd.</TableHead>
                            <TableHead className="font-semibold">Urgência</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold hidden lg:table-cell">Solicitante</TableHead>
                            <TableHead className="font-semibold hidden lg:table-cell">Período</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map((request: any) => (
                            <TableRow key={request.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium text-sm">
                                {formatDateBR(request.requested_at)}
                              </TableCell>
                              <TableCell className="font-medium text-sm">{request.job_function}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                  {request.quantity}
                                </span>
                              </TableCell>
                              <TableCell>{getUrgencyBadge(request.urgency || "media")}</TableCell>
                              <TableCell>{getStatusBadge(request.status || "pendente")}</TableCell>
                              <TableCell className="text-sm hidden lg:table-cell">{request.company_users?.full_name || "Admin"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                                {request.period_start && request.period_end
                                  ? `${formatDateBR(request.period_start)} - ${formatDateBR(request.period_end)}`
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}