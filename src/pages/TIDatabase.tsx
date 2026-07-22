import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, Activity, HardDrive, Users, Briefcase, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function TIDatabase() {
  const { data: stats } = useQuery({
    queryKey: ['ti-database-stats'],
    queryFn: async () => {
      const [
        { count: tiCount },
        { count: adminCount },
        { count: clientCount },
        { count: candidateCount },
        { count: completeProfileCount },
        { count: jobCount },
        { count: activeJobCount },
        { count: applicationCount },
        { count: certificationCount },
        { count: clientCandidateCount }
      ] = await Promise.all([
        supabase.from('ti_users').select('*', { count: 'exact', head: true }),
        supabase.from('administrators').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('profile_complete', true),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('certifications').select('*', { count: 'exact', head: true }),
        supabase.from('client_candidates').select('*', { count: 'exact', head: true })
      ]);

      return {
        tiUsers: tiCount || 0,
        admins: adminCount || 0,
        clients: clientCount || 0,
        candidates: candidateCount || 0,
        completeProfiles: completeProfileCount || 0,
        jobs: jobCount || 0,
        activeJobs: activeJobCount || 0,
        applications: applicationCount || 0,
        certifications: certificationCount || 0,
        clientCandidates: clientCandidateCount || 0,
        totalRecords: (tiCount || 0) + (adminCount || 0) + (clientCount || 0) + (candidateCount || 0),
        profileCompletionRate: candidateCount ? Math.round(((completeProfileCount || 0) / candidateCount) * 100) : 0
      };
    }
  });

  const tables = [
    { name: 'profiles', label: 'Perfis', count: stats?.candidates || 0, icon: Users },
    { name: 'jobs', label: 'Vagas', count: stats?.jobs || 0, icon: Briefcase },
    { name: 'applications', label: 'Candidaturas', count: stats?.applications || 0, icon: FileText },
    { name: 'certifications', label: 'Certificações', count: stats?.certifications || 0, icon: FileText },
    { name: 'clients', label: 'Clientes', count: stats?.clients || 0, icon: Users },
    { name: 'client_candidates', label: 'Atribuições', count: stats?.clientCandidates || 0, icon: Users },
  ];

  return (
    <TILayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Banco de Dados</h1>
          <p className="text-muted-foreground">Estatísticas e informações do sistema</p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRecords || 0}</div>
              <p className="text-xs text-muted-foreground">usuários no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Perfis Completos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.profileCompletionRate || 0}%</div>
              <Progress value={stats?.profileCompletionRate || 0} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Vagas Ativas</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
              <p className="text-xs text-muted-foreground">de {stats?.jobs || 0} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Operacional</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Todos os sistemas online</p>
            </CardContent>
          </Card>
        </div>

        {/* Tables Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estatísticas por Tabela
            </CardTitle>
            <CardDescription>Contagem de registros em cada tabela principal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => {
                const Icon = table.icon;
                return (
                  <div key={table.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{table.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{table.name}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg">
                      {table.count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Usuários</CardTitle>
            <CardDescription>Por tipo de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{stats?.tiUsers || 0}</p>
                <p className="text-sm text-muted-foreground">T.I</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{stats?.admins || 0}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{stats?.clients || 0}</p>
                <p className="text-sm text-muted-foreground">Clientes</p>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-3xl font-bold text-amber-600">{stats?.candidates || 0}</p>
                <p className="text-sm text-muted-foreground">Candidatos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TILayout>
  );
}
