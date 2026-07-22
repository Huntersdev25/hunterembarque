import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, ListTodo, CheckCircle2, Clock, Users, Briefcase,
  Building2, FileText, RefreshCw, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string | null;
  user_role: string;
  action_type: string;
  action_description: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_title: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: typeof FileText; tone: string }> = {
  task_created: { label: "Tarefa criada", icon: ListTodo, tone: "text-sky-500 bg-sky-500/10" },
  task_updated: { label: "Tarefa atualizada", icon: ListTodo, tone: "text-amber-500 bg-amber-500/10" },
  task_completed: { label: "Tarefa concluída", icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10" },
  task_status_changed: { label: "Status alterado", icon: Clock, tone: "text-violet-500 bg-violet-500/10" },
  candidate_added: { label: "Candidato adicionado", icon: Users, tone: "text-sky-500 bg-sky-500/10" },
  candidate_assigned: { label: "Candidato atribuído", icon: Users, tone: "text-indigo-500 bg-indigo-500/10" },
  candidate_released: { label: "Candidato liberado", icon: Sparkles, tone: "text-emerald-500 bg-emerald-500/10" },
  job_created: { label: "Vaga criada", icon: Briefcase, tone: "text-emerald-500 bg-emerald-500/10" },
  job_updated: { label: "Vaga atualizada", icon: Briefcase, tone: "text-amber-500 bg-amber-500/10" },
  client_added: { label: "Cliente adicionado", icon: Building2, tone: "text-violet-500 bg-violet-500/10" },
  application_received: { label: "Candidatura recebida", icon: FileText, tone: "text-sky-500 bg-sky-500/10" },
  report_generated: { label: "Relatório gerado", icon: FileText, tone: "text-emerald-500 bg-emerald-500/10" },
};

const FILTERS = [
  { id: "all", label: "Tudo" },
  { id: "candidate", label: "Candidatos", types: ["candidate_added", "candidate_assigned", "candidate_released", "application_received"] },
  { id: "job", label: "Vagas", types: ["job_created", "job_updated"] },
  { id: "client", label: "Clientes", types: ["client_added"] },
  { id: "task", label: "Tarefas", types: ["task_created", "task_updated", "task_completed", "task_status_changed"] },
] as const;

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

export function RecentActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("daily_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data || []) as ActivityLog[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dashboard-activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_activity_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as ActivityLog, ...prev].slice(0, 50));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const activeFilter = FILTERS.find((f) => f.id === filter) as { id: string; label: string; types?: string[] } | undefined;
  const filtered = filter === "all"
    ? logs
    : logs.filter((l) => activeFilter?.types?.includes(l.action_type));

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-maritime-blue" />
              Atividades Recentes
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Últimas ações em clientes, vagas, candidatos e tarefas
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="mt-2">
          <TabsList className="grid grid-cols-5 h-9 bg-muted/50">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[420px] pr-3">
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </div>
          ) : (
            <ol className="relative border-l border-border/60 ml-4 space-y-4 py-2">
              {filtered.map((log) => {
                const meta = ACTION_META[log.action_type] ?? {
                  label: log.action_type, icon: Activity, tone: "text-muted-foreground bg-muted",
                };
                const Icon = meta.icon;
                return (
                  <li key={log.id} className="ml-6">
                    <span className={`absolute -left-[14px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {initials(log.user_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {log.user_name || "Usuário"}
                            </p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {log.user_role}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground/90 leading-snug break-words">
                        {log.action_description}
                      </p>
                      {log.entity_title && log.entity_title !== log.action_description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {log.entity_title}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
