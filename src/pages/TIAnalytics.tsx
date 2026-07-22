import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Briefcase, Building2, Calendar } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TIAnalytics() {
  // Estatísticas por tipo de usuário
  const { data: userStats } = useQuery({
    queryKey: ['ti-analytics-users'],
    queryFn: async () => {
      const [
        { count: tiUsers },
        { count: admins },
        { count: clients },
        { count: candidates },
        { count: companyUsers }
      ] = await Promise.all([
        supabase.from('ti_users').select('*', { count: 'exact', head: true }),
        supabase.from('administrators').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('company_users').select('*', { count: 'exact', head: true })
      ]);

      return [
        { name: 'T.I', value: tiUsers || 0, color: COLORS[0] },
        { name: 'Admins', value: admins || 0, color: COLORS[1] },
        { name: 'Clientes', value: clients || 0, color: COLORS[2] },
        { name: 'Candidatos', value: candidates || 0, color: COLORS[3] },
        { name: 'Usuários Empresa', value: companyUsers || 0, color: COLORS[4] },
      ];
    }
  });

  // Vagas por função
  const { data: jobsByFunction } = useQuery({
    queryKey: ['ti-analytics-jobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('function_name');
      
      const functionCounts: Record<string, number> = {};
      data?.forEach(job => {
        const fn = job.function_name || 'Não especificado';
        functionCounts[fn] = (functionCounts[fn] || 0) + 1;
      });

      return Object.entries(functionCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
  });

  // Clientes por tipo
  const { data: clientsByType } = useQuery({
    queryKey: ['ti-analytics-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('client_type, is_active');
      
      const typeCounts = {
        hunting: { active: 0, inactive: 0 },
        labor_supply: { active: 0, inactive: 0 }
      };

      data?.forEach(client => {
        const type = client.client_type as keyof typeof typeCounts;
        if (typeCounts[type]) {
          if (client.is_active) {
            typeCounts[type].active++;
          } else {
            typeCounts[type].inactive++;
          }
        }
      });

      return [
        { name: 'Hunting', ativos: typeCounts.hunting.active, inativos: typeCounts.hunting.inactive },
        { name: 'Fornecimento', ativos: typeCounts.labor_supply.active, inativos: typeCounts.labor_supply.inactive },
      ];
    }
  });

  // Candidaturas por status
  const { data: applicationsByStatus } = useQuery({
    queryKey: ['ti-analytics-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('status');
      
      const statusCounts: Record<string, number> = {};
      data?.forEach(app => {
        const status = app.status || 'lista_espera';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const statusLabels: Record<string, string> = {
        lista_espera: 'Em Espera',
        em_analise: 'Em Análise',
        aprovado: 'Aprovado',
        reprovado: 'Reprovado',
        contratado: 'Contratado'
      };

      return Object.entries(statusCounts).map(([status, value], index) => ({
        name: statusLabels[status] || status,
        value,
        color: COLORS[index % COLORS.length]
      }));
    }
  });

  // Perfis por completude
  const { data: profileStats } = useQuery({
    queryKey: ['ti-analytics-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('profile_complete, desired_function');
      
      const complete = data?.filter(p => p.profile_complete).length || 0;
      const incomplete = data?.filter(p => !p.profile_complete).length || 0;

      // Funções desejadas
      const functionCounts: Record<string, number> = {};
      data?.forEach(profile => {
        const fn = profile.desired_function || 'Não informado';
        functionCounts[fn] = (functionCounts[fn] || 0) + 1;
      });

      return {
        completion: [
          { name: 'Completos', value: complete, color: COLORS[1] },
          { name: 'Incompletos', value: incomplete, color: COLORS[3] }
        ],
        functions: Object.entries(functionCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      };
    }
  });

  return (
    <TILayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Visualização completa dos dados do sistema</p>
          </div>
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Dados em tempo real
          </Badge>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="jobs">Vagas</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="applications">Candidaturas</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição de Usuários */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Distribuição de Usuários
                  </CardTitle>
                  <CardDescription>Por tipo de acesso</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {userStats?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Funções Desejadas */}
              <Card>
                <CardHeader>
                  <CardTitle>Funções Desejadas</CardTitle>
                  <CardDescription>Preferência dos candidatos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profileStats?.functions} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Completude de Perfis */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Status dos Perfis</CardTitle>
                  <CardDescription>Perfis completos vs incompletos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={profileStats?.completion}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {profileStats?.completion.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Vagas por Função
                </CardTitle>
                <CardDescription>Top 10 funções mais requisitadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobsByFunction}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Clientes por Tipo
                </CardTitle>
                <CardDescription>Hunting vs Fornecimento de Mão de Obra</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientsByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ativos" name="Ativos" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="inativos" name="Inativos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Candidaturas por Status
                </CardTitle>
                <CardDescription>Distribuição atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={applicationsByStatus}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {applicationsByStatus?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TILayout>
  );
}
