import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bot, User as UserIcon, Cog, MessageSquarePlus, AlertCircle, CheckCircle2, RefreshCw,
  Mail, Phone, MapPin, Briefcase, Calendar, ExternalLink, Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  source: "system" | "ai" | "admin";
  metadata: Record<string, any>;
  created_at: string;
}

interface CandidateBasic {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  state: string | null;
  desired_function: string | null;
  avatar_url: string | null;
  available_from: string | null;
  available_until: string | null;
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

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

export function CandidateProfileTimelineDrawer({
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
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [profile, setProfile] = useState<CandidateBasic | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = async () => {
    if (!jobId || !candidateId) return;
    setLoading(true);
    const [{ data: events, error }, { data: prof }] = await Promise.all([
      supabase
        .from("candidate_onboarding_timeline")
        .select("*")
        .eq("job_id", jobId)
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, cpf, city, state, desired_function, avatar_url, available_from, available_until")
        .eq("user_id", candidateId)
        .maybeSingle(),
    ]);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      setEvents((events || []) as TimelineEvent[]);
    }
    setProfile(prof as CandidateBasic | null);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId, candidateId]);

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
      const { error } = await supabase.functions.invoke("trigger-recruitment-ai", {
        body: {
          application_id: applicationId,
          job_id: jobId,
          candidate_id: candidateId,
          candidate_name: profile?.full_name,
          candidate_phone: profile?.phone,
          job_title: jobTitle,
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

  const displayName = profile?.full_name || candidateName || "Candidato";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{displayName}</SheetTitle>
              <SheetDescription className="mt-1">
                {jobTitle && <span className="block text-xs">Vaga: {jobTitle}</span>}
                {profile?.desired_function && (
                  <Badge variant="outline" className="mt-2 gap-1">
                    <Briefcase className="h-3 w-3" />
                    {profile.desired_function}
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>

          {profile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs">
              {profile.email && (
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profile.phone}</span>
                </div>
              )}
              {(profile.city || profile.state) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{[profile.city, profile.state].filter(Boolean).join(" / ")}</span>
                </div>
              )}
              {(profile.available_from || profile.available_until) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {profile.available_from ? format(new Date(profile.available_from), "dd/MM/yy") : "?"}
                    {" → "}
                    {profile.available_until ? format(new Date(profile.available_until), "dd/MM/yy") : "?"}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                onOpenChange(false);
                navigate(`/a/profissionais/${candidateId}`);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Perfil completo
            </Button>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={retryAiContact} disabled={retrying}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${retrying ? "animate-spin" : ""}`} />
                Reenviar IA
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={load}>
              Atualizar
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 pt-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Timeline de Onboarding
          </h3>
          <ScrollArea className="flex-1 pr-3 -mr-3">
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
        </div>

        {!readOnly && (
          <div className="border-t px-6 py-3 space-y-2 bg-muted/30">
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
