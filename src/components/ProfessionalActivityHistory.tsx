import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Ship,
  UserCheck,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  candidateUserId: string;
}

type EventTone = "emerald" | "blue" | "amber" | "red" | "violet" | "slate";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string | null;
  category: "application" | "assignment" | "interview" | "boarding" | "system";
  icon: React.ElementType;
  tone: EventTone;
  badge?: string;
  meta?: Record<string, any>;
}

const TONE_CLASSES: Record<EventTone, { dot: string; bg: string; text: string; ring: string }> = {
  emerald: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  blue: {
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/20",
  },
  amber: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
  red: {
    dot: "bg-red-500",
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-500/20",
  },
  violet: {
    dot: "bg-violet-500",
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
  slate: {
    dot: "bg-slate-500",
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/20",
  },
};

const CATEGORIES = [
  { id: "all", label: "Tudo", icon: Activity },
  { id: "application", label: "Candidaturas", icon: Send },
  { id: "assignment", label: "Atribuições", icon: Building2 },
  { id: "interview", label: "Entrevistas", icon: UserCheck },
  { id: "boarding", label: "Embarques", icon: Ship },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

function mapTimelineEvent(ev: any): TimelineEvent {
  const type = ev.event_type as string;
  const map: Record<string, { icon: React.ElementType; tone: EventTone; category: TimelineEvent["category"] }> = {
    application_received: { icon: Send, tone: "blue", category: "application" },
    candidate_approved: { icon: CheckCircle2, tone: "emerald", category: "interview" },
    candidate_rejected: { icon: XCircle, tone: "red", category: "interview" },
    candidate_assigned: { icon: Building2, tone: "violet", category: "assignment" },
    candidate_released: { icon: Sparkles, tone: "emerald", category: "boarding" },
    interview_scheduled: { icon: CalendarCheck, tone: "amber", category: "interview" },
    note_added: { icon: FileText, tone: "slate", category: "system" },
  };
  const cfg = map[type] || { icon: Activity, tone: "slate" as EventTone, category: "system" as const };
  return {
    id: ev.id,
    date: ev.created_at,
    title: ev.title,
    description: ev.description,
    category: cfg.category,
    icon: cfg.icon,
    tone: cfg.tone,
    meta: ev.metadata,
  };
}

export function ProfessionalActivityHistory({ candidateUserId }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryId>("all");

  useEffect(() => {
    if (!candidateUserId) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateUserId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { data: timelineData },
        { data: applications },
        { data: assignments },
        { data: boarding },
      ] = await Promise.all([
        supabase
          .from("candidate_onboarding_timeline")
          .select("*")
          .eq("candidate_id", candidateUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("applications")
          .select("id, applied_at, status, contact_made, contact_date, contact_notes, rejection_reason, interview_stage, job_id, jobs:job_id (title, function_name, clients:client_id (company_name))")
          .eq("candidate_id", candidateUserId)
          .order("applied_at", { ascending: false }),
        supabase
          .from("client_candidates")
          .select("id, assigned_at, interview_status, interview_date, interview_time, interview_evaluated_at, rejection_reason, period_start, period_end, vessel_name, aso_status, notes, clients:client_id (company_name), jobs:job_id (title)")
          .eq("candidate_id", candidateUserId)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("professional_boarding_history")
          .select("id, embarked_at, disembarked_at, company_name, vessel_name, vessel_type, position, notes, is_internal, created_at")
          .eq("profile_id", candidateUserId)
          .order("embarked_at", { ascending: false }),
      ]);

      const collected: TimelineEvent[] = [];

      // 1) Timeline oficial — oculta eventos técnicos de webhook/IA para o admin
      const HIDDEN_EVENT_TYPES = new Set([
        "ai_webhook_failed",
        "ai_webhook_sent",
        "ai_webhook_success",
        "webhook_triggered",
      ]);
      (timelineData || [])
        .filter((ev: any) => !HIDDEN_EVENT_TYPES.has(ev.event_type))
        .forEach((ev) => collected.push(mapTimelineEvent(ev)));

      // 2) Candidaturas
      (applications || []).forEach((a: any) => {
        const job = a.jobs;
        const company = job?.clients?.company_name;
        collected.push({
          id: `app-${a.id}`,
          date: a.applied_at,
          title: `Candidatura: ${job?.title || "Vaga"}`,
          description: company ? `Cliente: ${company}` : job?.function_name || undefined,
          category: "application",
          icon: Send,
          tone: "blue",
          badge: statusLabel(a.status),
        });
        if (a.contact_made && a.contact_date) {
          collected.push({
            id: `app-contact-${a.id}`,
            date: a.contact_date,
            title: "Contato realizado",
            description: a.contact_notes || `Vaga: ${job?.title || "—"}`,
            category: "application",
            icon: UserCheck,
            tone: "amber",
          });
        }
        if (a.rejection_reason) {
          collected.push({
            id: `app-reject-${a.id}`,
            date: a.contact_date || a.applied_at,
            title: "Candidatura recusada",
            description: a.rejection_reason,
            category: "application",
            icon: XCircle,
            tone: "red",
          });
        }
      });

      // 3) Atribuições e entrevistas
      (assignments || []).forEach((c: any) => {
        const company = c.clients?.company_name || "Cliente";
        const jobTitle = c.jobs?.title;
        collected.push({
          id: `assign-${c.id}`,
          date: c.assigned_at,
          title: `Atribuído a ${company}`,
          description: jobTitle ? `Vaga: ${jobTitle}` : c.notes || undefined,
          category: "assignment",
          icon: Building2,
          tone: "violet",
        });

        if (c.interview_date) {
          collected.push({
            id: `interview-sched-${c.id}`,
            date: `${c.interview_date}T${c.interview_time || "00:00:00"}`,
            title: `Entrevista agendada — ${company}`,
            description: jobTitle ? `Vaga: ${jobTitle}` : undefined,
            category: "interview",
            icon: CalendarCheck,
            tone: "amber",
          });
        }

        if (c.interview_status && c.interview_evaluated_at) {
          const approved = c.interview_status === "approved" || c.interview_status === "completed";
          collected.push({
            id: `interview-result-${c.id}`,
            date: c.interview_evaluated_at,
            title: approved
              ? `Aprovado por ${company}`
              : `Reprovado por ${company}`,
            description:
              !approved && c.rejection_reason
                ? `Motivo: ${c.rejection_reason}`
                : jobTitle
                ? `Vaga: ${jobTitle}`
                : undefined,
            category: "interview",
            icon: approved ? CheckCircle2 : XCircle,
            tone: approved ? "emerald" : "red",
          });
        }

        if (c.period_start) {
          collected.push({
            id: `period-${c.id}`,
            date: c.period_start,
            title: `Período de embarque definido — ${company}`,
            description: `${formatDate(c.period_start)}${c.period_end ? ` até ${formatDate(c.period_end)}` : ""}${c.vessel_name ? ` • Embarcação: ${c.vessel_name}` : ""}`,
            category: "boarding",
            icon: Ship,
            tone: "blue",
          });
        }
      });

      // 4) Histórico de embarque
      (boarding || []).forEach((b: any) => {
        collected.push({
          id: `board-${b.id}`,
          date: b.embarked_at,
          title: `Embarque: ${b.position}`,
          description: `${b.company_name}${b.vessel_name ? ` • ${b.vessel_name}` : ""}${b.vessel_type ? ` (${b.vessel_type})` : ""}`,
          category: "boarding",
          icon: Ship,
          tone: b.is_internal ? "violet" : "slate",
          badge: b.is_internal ? "Interno" : "Externo",
        });
        if (b.disembarked_at) {
          collected.push({
            id: `disboard-${b.id}`,
            date: b.disembarked_at,
            title: `Desembarque: ${b.position}`,
            description: `${b.company_name}${b.vessel_name ? ` • ${b.vessel_name}` : ""}`,
            category: "boarding",
            icon: Sparkles,
            tone: "emerald",
          });
        }
      });

      collected.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(collected);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.category === filter);
  }, [events, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    events.forEach((e) => (c[e.category] = (c[e.category] || 0) + 1));
    return c;
  }, [events]);

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Histórico de Atividades</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Linha do tempo completa do profissional na plataforma
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-3">
          {CATEGORIES.map((cat) => {
            const active = filter === cat.id;
            const Icon = cat.icon;
            const count = counts[cat.id] || 0;
            return (
              <Button
                key={cat.id}
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(cat.id)}
                className="h-8 gap-1.5 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
                <span
                  className={cn(
                    "ml-1 px-1.5 py-0 text-[10px] rounded-full",
                    active ? "bg-primary-foreground/20" : "bg-muted"
                  )}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum registro de atividade encontrado.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[min(70vh,640px)] sm:h-[min(65vh,560px)] pr-2 sm:pr-3">
            <div className="relative pl-2">
              <div className="absolute left-[22px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {filtered.map((ev) => {
                  const Icon = ev.icon;
                  const tone = TONE_CLASSES[ev.tone];
                  return (
                    <div key={ev.id} className="relative flex gap-3 group">
                      <div
                        className={cn(
                          "relative z-10 h-9 w-9 rounded-full flex items-center justify-center shrink-0 ring-4 ring-background",
                          tone.bg
                        )}
                      >
                        <Icon className={cn("h-4 w-4", tone.text)} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground leading-tight">
                            {ev.title}
                          </p>
                          {ev.badge && (
                            <Badge variant="outline" className={cn("text-[10px] h-5", tone.text)}>
                              {ev.badge}
                            </Badge>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {ev.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(ev.date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(d?: string | null) {
  if (!d) return "";
  try {
    return format(new Date(d.includes("T") ? d : `${d}T00:00:00`), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
}

function formatDateTime(d?: string | null) {
  if (!d) return "";
  try {
    return format(new Date(d.includes("T") ? d : `${d}T00:00:00`), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  } catch {
    return d;
  }
}

function statusLabel(status?: string | null) {
  if (!status) return "—";
  const map: Record<string, string> = {
    lista_espera: "Lista de espera",
    em_analise: "Em análise",
    aprovado: "Aprovado",
    rejeitado: "Rejeitado",
    contratado: "Contratado",
  };
  return map[status] || status;
}
