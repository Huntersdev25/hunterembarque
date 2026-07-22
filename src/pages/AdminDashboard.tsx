import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight, 
  UserCheck, 
  FileText, 
  Activity,
  ChevronRight,
  Building2,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { AdminAIChat } from "@/components/AdminAIChat";
import { useAuth } from "@/contexts/AuthContext";
import { DailyActivityReport } from "@/components/DailyActivityReport";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ProfessionalsByFunction } from "@/components/dashboard/ProfessionalsByFunction";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalCandidates: number;
  activeJobs: number;
  totalApplications: number;
  inProcessApplications: number;
}

interface Job {
  id: string;
  title: string;
  function_name: string;
  is_active: boolean;
  created_at: string;
  applications?: { count: number }[];
}

interface Candidate {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  desired_function: string;
  profile_complete: boolean;
  created_at: string;
}

// Mock data for the chart - in production, this would come from the database
const chartData = [
  { name: "Jan", candidatos: 45, aplicacoes: 23 },
  { name: "Fev", candidatos: 52, aplicacoes: 31 },
  { name: "Mar", candidatos: 61, aplicacoes: 42 },
  { name: "Abr", candidatos: 58, aplicacoes: 38 },
  { name: "Mai", candidatos: 73, aplicacoes: 52 },
  { name: "Jun", candidatos: 89, aplicacoes: 67 },
  { name: "Jul", candidatos: 95, aplicacoes: 78 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCandidates: 0,
    activeJobs: 0,
    totalApplications: 0,
    inProcessApplications: 0
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"1M" | "3M" | "6M" | "1A">("6M");
  const [adminName, setAdminName] = useState<string>("Administrador");
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    fetchAdminName();
  }, [user]);

  const fetchAdminName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('administrators')
      .select('full_name')
      .eq('user_id', user.id)
      .single();
    if (data?.full_name) {
      setAdminName(data.full_name.split(' ')[0]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        const stat = statsData[0];
        setStats({
          totalCandidates: Number(stat.total_candidates),
          activeJobs: Number(stat.active_jobs),
          totalApplications: Number(stat.total_applications),
          inProcessApplications: Number(stat.pending_applications)
        });
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*, applications(count)')
        .limit(4)
        .order('created_at', { ascending: false });
      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'candidate')
        .limit(5)
        .order('created_at', { ascending: false });
      if (candidatesError) throw candidatesError;
      setCandidates(candidatesData || []);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados do dashboard"
      });
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6 animate-fade-in p-4 sm:p-0">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Bem-vindo, <span className="text-maritime-blue">{adminName}</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Aqui está o resumo das atividades do sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReport(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Relatório Diário
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/a/profissionais">
                <Users className="h-4 w-4 mr-2" />
                Candidatos
              </Link>
            </Button>
            <Button className="bg-maritime-blue hover:bg-maritime-blue/90" size="sm" asChild>
              <Link to="/a/vagas">
                <Briefcase className="h-4 w-4 mr-2" />
                Vagas
              </Link>
            </Button>
          </div>
        </div>

        {/* Top Row - Main Stats & Portfolio Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Total Candidates Card - Main Stat */}
          <Card className="lg:col-span-4 bg-card border-border/50 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground font-medium">Total de Candidatos</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-maritime-blue/10 text-maritime-blue border-maritime-blue/20">
                    6M
                  </Badge>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-foreground">{stats.totalCandidates.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-emerald-500 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12%</span>
                </div>
                <span className="text-xs text-muted-foreground">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Cards */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { 
                label: "Vagas Ativas", 
                value: stats.activeJobs, 
                change: "+3", 
                positive: true,
                icon: Briefcase,
                bgColor: "bg-emerald-500/10",
                textColor: "text-emerald-500"
              },
              { 
                label: "Candidaturas", 
                value: stats.totalApplications, 
                change: "+28%", 
                positive: true,
                icon: FileText,
                bgColor: "bg-blue-500/10",
                textColor: "text-blue-500"
              },
              { 
                label: "Em Processo", 
                value: stats.inProcessApplications, 
                change: "5", 
                positive: false,
                icon: Clock,
                bgColor: "bg-amber-500/10",
                textColor: "text-amber-500"
              },
              { 
                label: "Clientes", 
                value: "12", 
                change: "+2", 
                positive: true,
                icon: Building2,
                bgColor: "bg-violet-500/10",
                textColor: "text-violet-500"
              },
            ].map((stat, index) => (
              <Card key={index} className="bg-card border-border/50 hover:border-maritime-blue/30 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.textColor}`} />
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${stat.positive ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {stat.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Performance Chart */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-maritime-blue" />
                Performance do Sistema
              </CardTitle>
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                {(["1M", "3M", "6M", "1A"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      chartPeriod === period
                        ? "bg-maritime-blue text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCandidatos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F4C81" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0F4C81" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAplicacoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="candidatos"
                    stroke="#0F4C81"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCandidatos)"
                    name="Candidatos"
                  />
                  <Area
                    type="monotone"
                    dataKey="aplicacoes"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAplicacoes)"
                    name="Aplicações"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-maritime-blue" />
                <span className="text-sm text-muted-foreground">Candidatos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Aplicações</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profissionais por Função */}
        <ProfessionalsByFunction />

        {/* Live Activity Feed */}
        <RecentActivityFeed />

        {/* Bottom Section - Jobs & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Jobs */}
          <Card className="lg:col-span-2 bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-maritime-blue" />
                  Vagas Recentes
                </CardTitle>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/a/vagas" className="flex items-center gap-1">
                    Ver todas
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maritime-blue" />
                </div>
              ) : jobs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-2">Vaga</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 px-2 hidden md:table-cell">Função</th>
                        <th className="text-center text-xs font-medium text-muted-foreground py-3 px-2">Candidatos</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job, index) => (
                        <tr 
                          key={job.id} 
                          className={`hover:bg-muted/30 transition-colors ${
                            index !== jobs.length - 1 ? 'border-b border-border/30' : ''
                          }`}
                        >
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-maritime-blue/10 flex items-center justify-center flex-shrink-0">
                                <Briefcase className="h-5 w-5 text-maritime-blue" />
                              </div>
                              <span className="font-medium text-sm text-foreground truncate max-w-[150px]">
                                {job.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{job.function_name}</span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="text-sm font-semibold text-foreground">
                              {job.applications?.[0]?.count || 0}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Badge 
                              variant={job.is_active ? "default" : "secondary"}
                              className={job.is_active 
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" 
                                : "bg-muted text-muted-foreground"
                              }
                            >
                              {job.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma vaga encontrada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Recent Candidates */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { icon: Briefcase, label: "Gerenciar Vagas", href: "/a/vagas", bgColor: "bg-maritime-blue/10", textColor: "text-maritime-blue" },
                  { icon: Users, label: "Ver Candidatos", href: "/a/profissionais", bgColor: "bg-emerald-500/10", textColor: "text-emerald-500" },
                  { icon: UserCheck, label: "Clientes", href: "/a/empresas", bgColor: "bg-amber-500/10", textColor: "text-amber-500" },
                ].map((action, index) => (
                  <Link
                    key={index}
                    to={action.href}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.bgColor}`}>
                        <action.icon className={`h-4 w-4 ${action.textColor}`} />
                      </div>
                      <span className="font-medium text-sm text-foreground">{action.label}</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Recent Candidates Mini */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-maritime-blue" />
                    Novos Cadastros
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                    <Link to="/a/profissionais">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-maritime-blue" />
                  </div>
                ) : candidates.length > 0 ? (
                  candidates.slice(0, 4).map((candidate, index) => (
                    <div
                      key={candidate.id}
                      className={`flex items-center justify-between py-2 ${
                        index !== Math.min(candidates.length - 1, 3) ? 'border-b border-border/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-maritime-blue to-maritime-light flex items-center justify-center text-white text-sm font-semibold">
                          {candidate.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                            {candidate.full_name.split(' ').slice(0, 2).join(' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {candidate.desired_function || "Não informado"}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={candidate.profile_complete ? "default" : "secondary"}
                        className={`text-xs ${
                          candidate.profile_complete 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {candidate.profile_complete ? "OK" : "Inc."}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum candidato
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* AI Chat Widget */}
      <AdminAIChat />

      {/* Daily Report Modal */}
      <DailyActivityReport open={showReport} onOpenChange={setShowReport} />
    </DashboardLayout>
  );
}
