import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TILayout } from "@/components/ti/TILayout";
import { StatsCard } from "@/components/ti/StatsCard";
import { SystemHealthCard } from "@/components/ti/SystemHealthCard";
import { RecentActivityCard } from "@/components/ti/RecentActivityCard";
import { QuickActionsCard } from "@/components/ti/QuickActionsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  Briefcase, 
  Activity,
  Server,
  Shield,
  FileText,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TIDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ti-dashboard-stats'],
    queryFn: async () => {
      const [
        { count: tiUsers },
        { count: admins },
        { count: clients },
        { count: activeClients },
        { count: profiles },
        { count: completeProfiles },
        { count: jobs },
        { count: activeJobs },
        { count: applications },
        { count: pendingApplications },
        { count: clientCandidates }
      ] = await Promise.all([
        supabase.from('ti_users').select('*', { count: 'exact', head: true }),
        supabase.from('administrators').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('profile_complete', true),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'lista_espera'),
        supabase.from('client_candidates').select('*', { count: 'exact', head: true })
      ]);

      return {
        tiUsers: tiUsers || 0,
        admins: admins || 0,
        clients: clients || 0,
        activeClients: activeClients || 0,
        profiles: profiles || 0,
        completeProfiles: completeProfiles || 0,
        jobs: jobs || 0,
        activeJobs: activeJobs || 0,
        applications: applications || 0,
        pendingApplications: pendingApplications || 0,
        clientCandidates: clientCandidates || 0,
        profileCompletionRate: profiles ? Math.round((completeProfiles || 0) / profiles * 100) : 0,
        clientActiveRate: clients ? Math.round((activeClients || 0) / clients * 100) : 0
      };
    }
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['ti-recent-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, created_at, profile_complete')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const { data: recentJobs } = useQuery({
    queryKey: ['ti-recent-jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('title, function_name, created_at, is_active')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  return (
    <TILayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard T.I</h1>
            <p className="text-muted-foreground">Controle total do sistema Hunters Embarque</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Sistema Online
            </Badge>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {new Date().toLocaleDateString('pt-BR')}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Usuários T.I"
            value={stats?.tiUsers || 0}
            description="Acesso total ao sistema"
            icon={Server}
            iconClassName="bg-purple-100 dark:bg-purple-950/30 text-purple-600"
          />
          <StatsCard
            title="Administradores"
            value={stats?.admins || 0}
            description="Gestores do sistema"
            icon={Shield}
            iconClassName="bg-blue-100 dark:bg-blue-950/30 text-blue-600"
          />
          <StatsCard
            title="Clientes"
            value={`${stats?.activeClients || 0}/${stats?.clients || 0}`}
            description={`${stats?.clientActiveRate || 0}% ativos`}
            icon={Building2}
            iconClassName="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600"
          />
          <StatsCard
            title="Profissionais"
            value={stats?.profiles || 0}
            description={`${stats?.completeProfiles || 0} perfis completos`}
            icon={Users}
            iconClassName="bg-amber-100 dark:bg-amber-950/30 text-amber-600"
            trend={{ value: stats?.profileCompletionRate || 0, isPositive: true }}
          />
        </div>

        {/* Second Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Vagas"
            value={stats?.activeJobs || 0}
            description={`de ${stats?.jobs || 0} total`}
            icon={Briefcase}
          />
          <StatsCard
            title="Candidaturas"
            value={stats?.applications || 0}
            description={`${stats?.pendingApplications || 0} pendentes`}
            icon={FileText}
          />
          <StatsCard
            title="Atribuições"
            value={stats?.clientCandidates || 0}
            description="Profissionais em clientes"
            icon={Activity}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs for different views */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="users">Usuários Recentes</TabsTrigger>
                <TabsTrigger value="jobs">Vagas Recentes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Profile Completion Progress */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">Métricas de Qualidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Perfis Completos</span>
                        <span className="text-sm font-medium">{stats?.profileCompletionRate || 0}%</span>
                      </div>
                      <Progress value={stats?.profileCompletionRate || 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Clientes Ativos</span>
                        <span className="text-sm font-medium">{stats?.clientActiveRate || 0}%</span>
                      </div>
                      <Progress value={stats?.clientActiveRate || 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Vagas Ativas</span>
                        <span className="text-sm font-medium">
                          {stats?.jobs ? Math.round((stats.activeJobs / stats.jobs) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stats?.jobs ? (stats.activeJobs / stats.jobs) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts/Warnings */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Alertas do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats?.pendingApplications && stats.pendingApplications > 0 ? (
                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm">{stats.pendingApplications} candidaturas pendentes</span>
                          </div>
                          <Link to="/s/usuarios">
                            <Button size="sm" variant="ghost">
                              Ver <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-400">
                            Nenhum alerta pendente
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Últimos Usuários</CardTitle>
                      <Link to="/s/usuarios">
                        <Button variant="ghost" size="sm">
                          Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentUsers?.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={user.profile_complete ? "default" : "secondary"} className="text-xs">
                              {user.profile_complete ? 'Completo' : 'Incompleto'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">Últimas Vagas</CardTitle>
                      <Link to="/s/vagas">
                        <Button variant="ghost" size="sm">
                          Ver todas <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentJobs?.map((job, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{job.title}</p>
                            <p className="text-xs text-muted-foreground">{job.function_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={job.is_active ? "default" : "secondary"} className="text-xs">
                              {job.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            <SystemHealthCard />
            <QuickActionsCard />
            <RecentActivityCard />
          </div>
        </div>
      </div>
    </TILayout>
  );
}
