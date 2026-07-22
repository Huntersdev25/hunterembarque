import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, XCircle, Server, Database, Globe, Shield, Activity, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ServiceMetrics {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number | null;
  icon: React.ElementType;
  lastCheck: Date;
}

interface DatabaseMetrics {
  latency: number;
  connectionStatus: 'connected' | 'slow' | 'error';
  recentErrors: number;
  queryCount: number;
}

const statusConfig = {
  operational: {
    label: "Operacional",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    icon: CheckCircle2
  },
  degraded: {
    label: "Degradado",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
    icon: AlertCircle
  },
  down: {
    label: "Fora do Ar",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    icon: XCircle
  }
};

export function SystemHealthCard() {
  const [services, setServices] = useState<ServiceMetrics[]>([
    { name: "API Principal", status: "operational", latency: null, icon: Server, lastCheck: new Date() },
    { name: "Banco de Dados", status: "operational", latency: null, icon: Database, lastCheck: new Date() },
    { name: "CDN / Storage", status: "operational", latency: null, icon: Globe, lastCheck: new Date() },
    { name: "Autenticação", status: "operational", latency: null, icon: Shield, lastCheck: new Date() },
  ]);
  
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics>({
    latency: 0,
    connectionStatus: 'connected',
    recentErrors: 0,
    queryCount: 0
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const checkDatabaseHealth = async (): Promise<{ latency: number; status: 'connected' | 'slow' | 'error' }> => {
    const start = performance.now();
    try {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const latency = Math.round(performance.now() - start);
      
      if (error) {
        return { latency, status: 'error' };
      }
      
      // Consider > 500ms as slow
      return { latency, status: latency > 500 ? 'slow' : 'connected' };
    } catch {
      return { latency: 0, status: 'error' };
    }
  };

  const checkApiHealth = async (): Promise<{ latency: number; status: 'operational' | 'degraded' | 'down' }> => {
    const start = performance.now();
    try {
      const { error } = await supabase.from('jobs').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      
      if (error) {
        return { latency, status: 'down' };
      }
      
      return { latency, status: latency > 1000 ? 'degraded' : 'operational' };
    } catch {
      return { latency: 0, status: 'down' };
    }
  };

  const checkAuthHealth = async (): Promise<{ latency: number; status: 'operational' | 'degraded' | 'down' }> => {
    const start = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - start);
      
      if (error) {
        return { latency, status: 'down' };
      }
      
      return { latency, status: latency > 800 ? 'degraded' : 'operational' };
    } catch {
      return { latency: 0, status: 'down' };
    }
  };

  const checkStorageHealth = async (): Promise<{ latency: number; status: 'operational' | 'degraded' | 'down' }> => {
    const start = performance.now();
    try {
      const { error } = await supabase.storage.listBuckets();
      const latency = Math.round(performance.now() - start);
      
      if (error) {
        return { latency, status: 'down' };
      }
      
      return { latency, status: latency > 1000 ? 'degraded' : 'operational' };
    } catch {
      return { latency: 0, status: 'down' };
    }
  };

  const runHealthChecks = async () => {
    setIsRefreshing(true);
    
    const [dbHealth, apiHealth, authHealth, storageHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkApiHealth(),
      checkAuthHealth(),
      checkStorageHealth()
    ]);

    const now = new Date();
    
    setServices([
      { 
        name: "API Principal", 
        status: apiHealth.status, 
        latency: apiHealth.latency, 
        icon: Server, 
        lastCheck: now 
      },
      { 
        name: "Banco de Dados", 
        status: dbHealth.status === 'connected' ? 'operational' : dbHealth.status === 'slow' ? 'degraded' : 'down', 
        latency: dbHealth.latency, 
        icon: Database, 
        lastCheck: now 
      },
      { 
        name: "CDN / Storage", 
        status: storageHealth.status, 
        latency: storageHealth.latency, 
        icon: Globe, 
        lastCheck: now 
      },
      { 
        name: "Autenticação", 
        status: authHealth.status, 
        latency: authHealth.latency, 
        icon: Shield, 
        lastCheck: now 
      },
    ]);

    setDbMetrics({
      latency: dbHealth.latency,
      connectionStatus: dbHealth.status,
      recentErrors: dbHealth.status === 'error' ? 1 : 0,
      queryCount: 4 // Number of health check queries
    });

    setLastRefresh(now);
    setIsRefreshing(false);
  };

  useEffect(() => {
    runHealthChecks();
    
    // Refresh every 30 seconds
    const interval = setInterval(runHealthChecks, 30000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every(s => s.status === 'operational');
  const overallStatus = allOperational ? 'operational' : 
    services.some(s => s.status === 'down') ? 'down' : 'degraded';
  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  const getLatencyColor = (latency: number | null) => {
    if (latency === null) return 'text-muted-foreground';
    if (latency < 200) return 'text-green-600';
    if (latency < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLatencyBadge = (latency: number | null) => {
    if (latency === null) return 'Verificando...';
    if (latency < 200) return 'Rápido';
    if (latency < 500) return 'Normal';
    if (latency < 1000) return 'Lento';
    return 'Muito Lento';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status do Sistema
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={runHealthChecks}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {allOperational ? "Todos Operacionais" : config.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          Última verificação: {lastRefresh.toLocaleTimeString('pt-BR')}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database Performance Summary */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Performance do Banco</span>
            <Badge variant={dbMetrics.connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {dbMetrics.latency}ms
            </Badge>
          </div>
          <Progress 
            value={Math.min(100, Math.max(0, 100 - (dbMetrics.latency / 10)))} 
            className="h-2" 
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{getLatencyBadge(dbMetrics.latency)}</span>
            <span>{dbMetrics.recentErrors > 0 ? `${dbMetrics.recentErrors} erro(s)` : 'Sem erros'}</span>
          </div>
        </div>

        {/* Individual Services */}
        {services.map((service) => {
          const Icon = service.icon;
          const serviceConfig = statusConfig[service.status];
          
          return (
            <div key={service.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${getLatencyColor(service.latency)}`}>
                    {service.latency !== null ? `${service.latency}ms` : '...'}
                  </span>
                  <div className={`h-2 w-2 rounded-full ${serviceConfig.color}`} />
                </div>
              </div>
              <Progress 
                value={service.latency !== null ? Math.min(100, Math.max(0, 100 - (service.latency / 10))) : 50} 
                className="h-1" 
              />
            </div>
          );
        })}

        {/* Average Response Time */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tempo médio de resposta</span>
            <span className="font-medium">
              {Math.round(services.reduce((acc, s) => acc + (s.latency || 0), 0) / services.length)}ms
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
