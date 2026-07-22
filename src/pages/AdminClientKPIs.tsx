import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, Users, Briefcase, TrendingUp, Clock, CheckCircle2, 
  XCircle, AlertTriangle, BarChart3, Activity, Target, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

export default function AdminClientKPIs() {
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [period, setPeriod] = useState<string>("30");

  // Fetch clients
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["kpi-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, client_type, is_active")
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch client_candidates with relations
  const { data: clientCandidates, isLoading: loadingCC } = useQuery({
    queryKey: ["kpi-client-candidates", selectedClientId, period],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      let query = supabase
        .from("client_candidates")
        .select(`
          id, candidate_id, client_id, assigned_at, interview_status, 
          aso_status, notes, rejection_reason, vessel_name, period_start, period_end,
          job:job_id (id, title, function_name),
          client:client_id (id, company_name, client_type)
        `)
        .gte("assigned_at", daysAgo.toISOString());

      if (selectedClientId !== "all") {
        query = query.eq("client_id", selectedClientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch jobs
  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ["kpi-jobs", selectedClientId],
    queryFn: async () => {
      let query = supabase.from("jobs").select("id, title, function_name, client_id, is_active, created_at");
      if (selectedClientId !== "all") {
        query = query.eq("client_id", selectedClientId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch applications
  const { data: applications, isLoading: loadingApps } = useQuery({
    queryKey: ["kpi-applications", selectedClientId, period],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      const jobIds = jobs?.map(j => j.id) || [];
      if (selectedClientId !== "all" && jobIds.length === 0) return [];

      let query = supabase
        .from("applications")
        .select("id, status, applied_at, job_id, candidate_id, interview_stage")
        .gte("applied_at", daysAgo.toISOString());

      if (selectedClientId !== "all" && jobIds.length > 0) {
        query = query.in("job_id", jobIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !loadingJobs,
  });

  // Computed metrics
  const metrics = useMemo(() => {
    const cc = clientCandidates || [];
    const apps = applications || [];
    const jbs = jobs || [];

    const totalAssigned = cc.length;
    const pending = cc.filter(c => !c.interview_status || c.interview_status === "lista_espera").length;
    const interviewing = cc.filter(c => c.interview_status === "contato_realizado").length;
    const approved = cc.filter(c => c.interview_status === "aprovado").length;
    const rejected = cc.filter(c => c.interview_status === "rejeitado").length;

    const asoCompleted = cc.filter(c => c.aso_status === "finalizado").length;
    const asoPending = cc.filter(c => !c.aso_status || c.aso_status === "pendente").length;
    const asoScheduled = cc.filter(c => c.aso_status === "marcado").length;

    const activeJobs = jbs.filter(j => j.is_active).length;
    const totalApplications = apps.length;
    const approvedApps = apps.filter(a => a.status === "aprovado").length;
    const conversionRate = totalApplications > 0 ? ((approvedApps / totalApplications) * 100).toFixed(1) : "0";

    return {
      totalAssigned, pending, interviewing, approved, rejected,
      asoCompleted, asoPending, asoScheduled,
      activeJobs, totalApplications, approvedApps, conversionRate,
    };
  }, [clientCandidates, applications, jobs]);

  // Chart: status distribution
  const statusDistribution = useMemo(() => {
    const cc = clientCandidates || [];
    const statusMap: Record<string, number> = {};
    cc.forEach(c => {
      const status = c.interview_status || "pending";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({
      name: statusLabel(name),
      value,
    }));
  }, [clientCandidates]);

  // Chart: candidates per client
  const candidatesPerClient = useMemo(() => {
    const cc = clientCandidates || [];
    const map: Record<string, { name: string; count: number }> = {};
    cc.forEach(c => {
      const client = c.client as any;
      const name = client?.company_name || "Desconhecido";
      const id = c.client_id;
      if (!map[id]) map[id] = { name, count: 0 };
      map[id].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [clientCandidates]);

  // Chart: ASO pipeline
  const asoPipeline = useMemo(() => [
    { name: "Pendente", value: metrics.asoPending, fill: CHART_COLORS[2] },
    { name: "Marcado", value: metrics.asoScheduled, fill: CHART_COLORS[0] },
    { name: "Finalizado", value: metrics.asoCompleted, fill: CHART_COLORS[1] },
  ], [metrics]);

  // Chart: timeline (assigned per week)
  const timeline = useMemo(() => {
    const cc = clientCandidates || [];
    const weekMap: Record<string, number> = {};
    cc.forEach(c => {
      const d = new Date(c.assigned_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weekMap[key] = (weekMap[key] || 0) + 1;
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        candidatos: count,
      }));
  }, [clientCandidates]);

  // Chart: functions distribution
  const functionDistribution = useMemo(() => {
    const cc = clientCandidates || [];
    const map: Record<string, number> = {};
    cc.forEach(c => {
      const job = c.job as any;
      const fn = job?.function_name || "Não especificado";
      map[fn] = (map[fn] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [clientCandidates]);

  const isLoading = loadingClients || loadingCC || loadingJobs || loadingApps;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userType="admin" />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-7 w-7 text-primary" />
                  KPIs de Clientes
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Controle absoluto do fluxo operacional por cliente
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients?.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* KPI Cards */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Candidatos Enviados"
                  value={metrics.totalAssigned}
                  icon={Users}
                  trend={metrics.totalAssigned > 0 ? "up" : "neutral"}
                  color="primary"
                />
                <KPICard
                  title="Vagas Ativas"
                  value={metrics.activeJobs}
                  icon={Briefcase}
                  trend="neutral"
                  color="primary"
                />
                <KPICard
                  title="Candidaturas"
                  value={metrics.totalApplications}
                  icon={Activity}
                  trend={metrics.totalApplications > 0 ? "up" : "neutral"}
                  color="primary"
                />
                <KPICard
                  title="Taxa de Conversão"
                  value={`${metrics.conversionRate}%`}
                  icon={Target}
                  trend={parseFloat(metrics.conversionRate) > 20 ? "up" : "down"}
                  color="primary"
                />
                <KPICard
                  title="Pendentes"
                  value={metrics.pending}
                  icon={Clock}
                  trend="neutral"
                  subtitle="Aguardando análise"
                  color="muted"
                />
                <KPICard
                  title="Em Entrevista"
                  value={metrics.interviewing}
                  icon={TrendingUp}
                  trend="up"
                  subtitle="Em processo"
                  color="primary"
                />
                <KPICard
                  title="Aprovados"
                  value={metrics.approved}
                  icon={CheckCircle2}
                  trend="up"
                  subtitle="Prontos para embarque"
                  color="primary"
                />
                <KPICard
                  title="Rejeitados"
                  value={metrics.rejected}
                  icon={XCircle}
                  trend={metrics.rejected > 0 ? "down" : "neutral"}
                  subtitle="Reprovados"
                  color="destructive"
                />
              </div>
            )}

            {/* ASO Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {asoPipeline.map(item => (
                <Card key={item.name} className="border-border/50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.fill}20` }}>
                      <AlertTriangle className="h-6 w-6" style={{ color: item.fill }} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ASO {item.name}</p>
                      <p className="text-2xl font-bold text-foreground">{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Candidatos Enviados — Linha do Tempo</CardTitle>
                </CardHeader>
                <CardContent>
                  {timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={timeline}>
                        <defs>
                          <linearGradient id="colorCandidatos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                        <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Area type="monotone" dataKey="candidatos" stroke="hsl(var(--primary))" fill="url(#colorCandidatos)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados no período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Pie */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusDistribution.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados no período
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Candidates per Client */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Candidatos por Cliente (Top 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidatesPerClient.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={candidatesPerClient} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                        <YAxis dataKey="name" type="category" width={130} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Candidatos" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Functions Distribution */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Distribuição por Função</CardTitle>
                </CardHeader>
                <CardContent>
                  {functionDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={functionDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" angle={-20} textAnchor="end" height={60} />
                        <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} name="Candidatos" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Professionals by Function Table */}
            {functionDistribution.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Profissionais Enviados por Função</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground w-12">#</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Função</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Qtd. Profissionais</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">% do Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {functionDistribution.map((fn, idx) => {
                          const total = functionDistribution.reduce((s, f) => s + f.value, 0);
                          const pct = total > 0 ? ((fn.value / total) * 100).toFixed(1) : "0";
                          return (
                            <tr key={fn.name} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-2 text-muted-foreground font-mono">{idx + 1}</td>
                              <td className="py-3 px-2 font-medium text-foreground">{fn.name}</td>
                              <td className="py-3 px-2 text-center font-semibold text-foreground">{fn.value}</td>
                              <td className="py-3 px-2 text-right text-muted-foreground">{pct}%</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/30 font-semibold">
                          <td className="py-3 px-2" />
                          <td className="py-3 px-2 text-foreground">Total</td>
                          <td className="py-3 px-2 text-center text-foreground">{functionDistribution.reduce((s, f) => s + f.value, 0)}</td>
                          <td className="py-3 px-2 text-right text-muted-foreground">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Summary Table */}
            {selectedClientId === "all" && clients && clients.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Resumo por Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Empresa</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tipo</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Enviados</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Pendentes</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Aprovados</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Rejeitados</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map(client => {
                          const cc = (clientCandidates || []).filter(c => c.client_id === client.id);
                          const sent = cc.length;
                          const pend = cc.filter(c => !c.interview_status || c.interview_status === "pending").length;
                          const appr = cc.filter(c => c.interview_status === "approved").length;
                          const rej = cc.filter(c => c.interview_status === "rejected").length;
                          if (sent === 0) return null;
                          return (
                            <tr key={client.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-2 font-medium text-foreground">{client.company_name}</td>
                              <td className="py-3 px-2">
                                <Badge variant="secondary" className="text-xs">
                                  {client.client_type === "hunting" ? "Hunting" : "Fornecimento"}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-center font-semibold text-foreground">{sent}</td>
                              <td className="py-3 px-2 text-center text-muted-foreground">{pend}</td>
                              <td className="py-3 px-2 text-center text-primary font-medium">{appr}</td>
                              <td className="py-3 px-2 text-center text-destructive font-medium">{rej}</td>
                              <td className="py-3 px-2 text-center">
                                <Badge variant={client.is_active ? "default" : "secondary"} className="text-xs">
                                  {client.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

// Helper components
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    interview: "Entrevista",
    hired: "Contratado",
    aso: "ASO",
  };
  return map[status] || status;
}

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  subtitle?: string;
  color: "primary" | "destructive" | "muted";
}

function KPICard({ title, value, icon: Icon, trend, subtitle, color }: KPICardProps) {
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold ${color === "destructive" ? "text-destructive" : "text-foreground"}`}>
              {value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            color === "destructive" ? "bg-destructive/10" : "bg-primary/10"
          }`}>
            <Icon className={`h-5 w-5 ${color === "destructive" ? "text-destructive" : "text-primary"}`} />
          </div>
        </div>
        {trend !== "neutral" && (
          <div className="mt-2 flex items-center gap-1">
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3 text-primary" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-destructive" />
            )}
            <span className={`text-xs ${trend === "up" ? "text-primary" : "text-destructive"}`}>
              {trend === "up" ? "Em alta" : "Atenção"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
