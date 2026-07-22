import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User as UserIcon, Cog, MessageSquarePlus, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  source: "system" | "ai" | "admin";
  metadata: Record<string, any>;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  candidateId: string;
  applicationId?: string;
  candidateName?: string;
  jobTitle?: string;
  readOnly?: boolean;
}

const sourceConfig = {
  ai: { label: "IA", icon: Bot, color: "bg-primary/10 text-primary border-primary/20" },
  admin: { label: "Admin", icon: UserIcon, color: "bg-accent/10 text-accent-foreground border-accent/20" },
  system: { label: "Sistema", icon: Cog, color: "bg-muted text-muted-foreground border-border" },
};

function eventIcon(type: string) {
  if (type.includes("failed")) return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (type === "ai_webhook_dispatched" || type === "ai_update") return <Bot className="h-4 w-4 text-primary" />;
  if (type === "application_received") return <CheckCircle2 className="h-4 w-4 text-success" />;
  return <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />;
}

export function CandidateTimelineDrawer({
  open,
  onOpenChange,
  jobId,
  candidateId,
  applicationId,
  candidateName,
  jobTitle,
  readOnly = false,
}: Props) {
  const { toast } = useToast();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = async () => {
    if (!jobId || !candidateId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("candidate_onboarding_timeline")
      .select("*")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      setEvents((data || []) as TimelineEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId, candidateId]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel(`timeline-${jobId}-${candidateId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "candidate_onboarding_timeline",
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          const ev = payload.new as TimelineEvent & { job_id: string };
          if (ev.job_id === jobId) {
            setEvents((prev) => [ev, ...prev]);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open, jobId, candidateId]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("candidate_onboarding_timeline").insert({
      job_id: jobId,
      candidate_id: candidateId,
      application_id: applicationId ?? null,
      event_type: "admin_note",
      title: "Nota do administrador",
      description: note.trim(),
      source: "admin",
      created_by: user?.id ?? null,
    });
    setSavingNote(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      setNote("");
      toast({ title: "Nota adicionada à timeline" });
    }
  };

  const retryAiContact = async () => {
    if (!applicationId) {
      toast({ variant: "destructive", title: "Sem candidatura", description: "Não há application_id vinculado." });
      return;
    }
    setRetrying(true);
    try {
      const { data: app } = await supabase
        .from("applications")
        .select("id, job_id, candidate_id")
        .eq("id", applicationId)
        .maybeSingle();
      if (!app) throw new Error("Candidatura não encontrada");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", app.candidate_id)
        .maybeSingle();

      const { data: job } = await supabase
        .from("jobs")
        .select("title, function_name")
        .eq("id", app.job_id)
        .maybeSingle();

      const { error } = await supabase.functions.invoke("trigger-recruitment-ai", {
        body: {
          application_id: app.id,
          job_id: app.job_id,
          candidate_id: app.candidate_id,
          candidate_name: profile?.full_name,
          candidate_phone: profile?.phone,
          job_title: job?.title,
          function_name: job?.function_name,
        },
      });
      if (error) throw error;
      toast({ title: "Contato com IA reenviado" });
      setTimeout(load, 800);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: e instanceof Error ? e.message : "Falha" });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>Timeline de Onboarding</SheetTitle>
          <SheetDescription>
            {candidateName && <span className="font-medium text-foreground">{candidateName}</span>}
            {candidateName && jobTitle && " · "}
            {jobTitle}
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 mt-4">
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={retryAiContact} disabled={retrying}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${retrying ? "animate-spin" : ""}`} />
              Reenviar contato IA
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={load}>
            Atualizar
          </Button>
        </div>

        <ScrollArea className="flex-1 mt-4 pr-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento ainda.</p>
          ) : (
            <ol className="relative border-l border-border ml-3 space-y-4 pb-4">
              {events.map((ev) => {
                const cfg = sourceConfig[ev.source] ?? sourceConfig.system;
                const SourceIcon = cfg.icon;
                return (
                  <li key={ev.id} className="ml-6">
                    <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border">
                      {eventIcon(ev.event_type)}
                    </span>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium leading-tight">{ev.title}</h4>
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                          <SourceIcon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{ev.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {format(new Date(ev.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>

        {!readOnly && (
          <div className="mt-4 border-t pt-3 space-y-2">
            <Textarea
              placeholder="Adicionar nota manual..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <Button onClick={addNote} disabled={!note.trim() || savingNote} className="w-full" size="sm">
              <MessageSquarePlus className="h-4 w-4 mr-1.5" />
              {savingNote ? "Salvando..." : "Adicionar nota"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
