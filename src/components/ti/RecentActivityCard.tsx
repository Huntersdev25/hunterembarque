import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { 
  UserPlus, 
  UserCheck, 
  Briefcase, 
  FileText, 
  Settings,
  Shield,
  Building2,
  RefreshCw,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

const actionIcons: Record<string, React.ElementType> = {
  INSERT: UserPlus,
  UPDATE: Settings,
  DELETE: FileText,
};

const tableIcons: Record<string, React.ElementType> = {
  profiles: UserCheck,
  jobs: Briefcase,
  clients: Building2,
  administrators: Shield,
};

export function RecentActivityCard() {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(true);

  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['ti-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: isLive ? 5000 : false, // Auto-refresh every 5s when live
  });

  // Subscribe to real-time changes
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel('realtime-activities')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ti-recent-activities'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, queryClient]);

  const getActionText = (action: string, tableName: string) => {
    const actions: Record<string, string> = {
      INSERT: 'criou',
      UPDATE: 'atualizou',
      DELETE: 'removeu',
    };
    const tables: Record<string, string> = {
      profiles: 'perfil',
      jobs: 'vaga',
      clients: 'cliente',
      administrators: 'admin',
      applications: 'candidatura',
      client_candidates: 'atribuição',
    };
    return `${actions[action] || action} ${tables[tableName] || tableName}`;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'text-emerald-400';
      case 'UPDATE': return 'text-cyan-400';
      case 'DELETE': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-zinc-100 flex items-center gap-2">
            Atividade Recente
            <button 
              onClick={() => setIsLive(!isLive)}
              className="flex items-center gap-1.5"
              title={isLive ? 'Atualização automática ativa' : 'Atualização automática pausada'}
            >
              <Circle className={cn(
                "h-2 w-2 transition-colors",
                isLive ? "fill-emerald-500 text-emerald-500 animate-pulse" : "fill-zinc-600 text-zinc-600"
              )} />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </button>
          </CardTitle>
          <button 
            onClick={() => refetch()}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading && (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          )}
          {!isLoading && activities?.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-6">
              Nenhuma atividade recente
            </p>
          )}
          {activities?.map((activity, index) => {
            const Icon = tableIcons[activity.table_name] || actionIcons[activity.action] || FileText;
            
            return (
              <div 
                key={activity.id} 
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg transition-all duration-300",
                  index === 0 && "bg-zinc-800/50 animate-in fade-in-50 slide-in-from-top-2"
                )}
              >
                <Avatar className="h-8 w-8 border border-zinc-700">
                  <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                    {activity.user_name?.slice(0, 2).toUpperCase() || 'SI'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-zinc-200">
                      {activity.user_name || 'Sistema'}
                    </span>
                    {' '}
                    <span className={getActionColor(activity.action)}>
                      {getActionText(activity.action, activity.table_name)}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
                <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
