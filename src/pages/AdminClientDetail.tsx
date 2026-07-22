import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { formatDateBR } from "@/lib/utils";
import {
  ArrowLeft, Building2, Users, CheckCircle2, Clock, XCircle,
  Eye, Phone, Mail, MapPin, Calendar, RotateCcw,
  UserPlus, Ship, ClipboardCheck, Briefcase, Anchor, Trash2
} from "lucide-react";

const STAGES = [
  { key: "pending", label: "Aguardando", count_label: "aguardando", accent: "hsl(var(--warning))" },
  { key: "interview", label: "Entrevista", count_label: "em entrevista", accent: "hsl(var(--primary))" },
  { key: "aso", label: "Exame ASO", count_label: "em ASO", accent: "hsl(262 83% 58%)" },
  { key: "completed", label: "Embarcado", count_label: "embarcados", accent: "hsl(var(--success))" },
] as const;

export default function AdminClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [interviewDialog, setInterviewDialog] = useState<{ open: boolean; assignmentId: string | null; name: string }>({ open: false, assignmentId: null, name: "" });
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; assignmentId: string | null; name: string; reason: string }>({ open: false, assignmentId: null, name: "", reason: "" });
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; assignmentId: string | null; name: string }>({ open: false, assignmentId: null, name: "" });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  useRealtimeSync({ table: "client_candidates", queryKey: ["admin-client-detail", clientId || ""], enabled: !!clientId });

  const { data: client } = useQuery({
    queryKey: ["client-detail", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["admin-client-detail", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_candidates")
        .select(`
          id, candidate_id, assigned_at, notes, interview_status, interview_date, interview_time,
          aso_status, job_id, rejection_reason, interview_evaluated_at, period_start, period_end, vessel_name,
          candidate:candidate_id ( user_id, full_name, email, phone, desired_function, avatar_url, city, state ),
          job:job_id ( id, title, function_name )
        `)
        .eq("client_id", clientId!)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        candidate: Array.isArray(a.candidate) ? a.candidate[0] : a.candidate,
        job: Array.isArray(a.job) ? a.job[0] : a.job,
      }));
    },
    enabled: !!clientId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase
        .from("client_candidates")
        .update({ interview_status: status, interview_evaluated_at: new Date().toISOString(), ...extra })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-detail", clientId] });
      toast({ title: "Status atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-detail", clientId] });
      toast({ title: "Profissional removido do cliente" });
      setRemoveDialog({ open: false, assignmentId: null, name: "" });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  const grouped = useMemo(() => {
    if (!candidates) return { pending: [], interview: [], aso: [], completed: [], rejected: [] };
    const r: Record<string, any[]> = { pending: [], interview: [], aso: [], completed: [], rejected: [] };
    candidates.forEach((c: any) => { const s = c.interview_status || "pending"; (r[s] || r.pending).push(c); });
    return r;
  }, [candidates]);

  const total = candidates?.length || 0;

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent, key: string) => { e.preventDefault(); setDragOverStage(key); };
  const handleDragLeave = () => setDragOverStage(null);
  const handleDrop = (e: React.DragEvent, target: string) => {
    e.preventDefault(); setDragOverStage(null);
    if (!draggedId) return;
    const c = candidates?.find((x: any) => x.id === draggedId);
    if (!c || (c.interview_status || "pending") === target) { setDraggedId(null); return; }
    if (target === "interview") setInterviewDialog({ open: true, assignmentId: draggedId, name: c.candidate?.full_name || "" });
    else if (target === "pending") updateStatusMutation.mutate({ id: draggedId, status: "pending", extra: { interview_date: null, interview_time: null, rejection_reason: null } });
    else updateStatusMutation.mutate({ id: draggedId, status: target });
    setDraggedId(null);
  };

  const handleScheduleInterview = () => {
    if (!interviewDialog.assignmentId || !interviewDate || !interviewTime) { toast({ title: "Preencha data e horário", variant: "destructive" }); return; }
    updateStatusMutation.mutate({ id: interviewDialog.assignmentId, status: "interview", extra: { interview_date: interviewDate, interview_time: interviewTime } });
    setInterviewDialog({ open: false, assignmentId: null, name: "" }); setInterviewDate(""); setInterviewTime("");
  };

  const handleReject = () => {
    if (!rejectDialog.assignmentId || !rejectDialog.reason.trim()) { toast({ title: "Informe o motivo", variant: "destructive" }); return; }
    updateStatusMutation.mutate({ id: rejectDialog.assignmentId, status: "rejected", extra: { rejection_reason: rejectDialog.reason.trim() } });
    setRejectDialog({ open: false, assignmentId: null, name: "", reason: "" });
  };

  const initials = (n: string) => n?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const stageOf = (s: string | null) => { const i = STAGES.findIndex(x => x.key === (s || "pending")); return i >= 0 ? i : 0; };

  return (
    <DashboardLayout userType="admin">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ── HEADER ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg self-start" onClick={() => navigate("/a/empresas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight truncate">{client?.company_name || "..."}</h1>
              {client?.client_type && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {client.client_type === "hunting" ? "Hunting" : "Mão de Obra"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{client?.contact_name}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {client?.phone && (
              <a href={`tel:${client.phone}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {client.phone}
              </a>
            )}
            {client?.email && (
              <a href={`mailto:${client.email}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 ml-3">
                <Mail className="h-3 w-3" /> {client.email}
              </a>
            )}
            <Button size="sm" className="ml-2 gap-1.5 h-8 text-xs" onClick={() => navigate(`/a/profissionais`)}>
              <UserPlus className="h-3.5 w-3.5" /> Atribuir
            </Button>
          </div>
        </header>

        {/* ── FUNNEL SUMMARY ── */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
          {STAGES.map((s, i) => {
            const count = (grouped[s.key] || []).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={s.key} className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-card transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.accent }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">{s.label}</p>
                  <p className="text-lg font-bold leading-tight mt-0.5">{count}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 font-medium">{pct}%</span>
              </div>
            );
          })}
          {grouped.rejected.length > 0 && (
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-card transition-colors">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-destructive" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground leading-none">Reprovados</p>
                <p className="text-lg font-bold leading-tight mt-0.5">{grouped.rejected.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── KANBAN ── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-60">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {STAGES.map((stage) => {
              const items = grouped[stage.key] || [];
              const isOver = dragOverStage === stage.key;
              return (
                <section
                  key={stage.key}
                  className={`rounded-xl border transition-all duration-150 flex flex-col min-h-[340px] ${
                    isOver ? "border-primary/40 bg-primary/[0.03] shadow-sm" : "border-border/50 bg-card/50"
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.key)}
                >
                  {/* Col header */}
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-border/40">
                    <div className="w-1.5 h-5 rounded-full" style={{ background: stage.accent }} />
                    <span className="text-[13px] font-semibold flex-1">{stage.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 overflow-y-auto space-y-2 max-h-[560px]">
                    {items.length === 0 ? (
                      <div className={`flex items-center justify-center h-28 rounded-lg border border-dashed transition-colors ${isOver ? "border-primary/30" : "border-border/30"}`}>
                        <p className="text-[11px] text-muted-foreground/40">Arraste profissionais aqui</p>
                      </div>
                    ) : items.map((c: any) => {
                      const si = stageOf(c.interview_status);
                      return (
                        <article
                          key={c.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          className="group rounded-lg border border-border/50 bg-card p-3 hover:shadow-md hover:border-border transition-all cursor-grab active:cursor-grabbing active:opacity-75"
                        >
                          {/* Person */}
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarImage src={c.candidate?.avatar_url} />
                              <AvatarFallback className="text-[11px] font-semibold bg-muted text-muted-foreground">
                                {initials(c.candidate?.full_name || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold leading-tight truncate">{c.candidate?.full_name || "—"}</p>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.candidate?.desired_function || "Sem função"}</p>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="mt-2.5 space-y-1.5">
                            {c.job && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Anchor className="h-3 w-3 text-primary flex-shrink-0" />
                                <span className="text-foreground font-medium truncate">{c.job.title}</span>
                              </div>
                            )}
                            {c.candidate?.city && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{c.candidate.city}{c.candidate.state ? `/${c.candidate.state}` : ""}</span>
                              </div>
                            )}
                            {c.interview_date && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{formatDateBR(c.interview_date)}{c.interview_time ? ` às ${c.interview_time.slice(0,5)}` : ""}</span>
                              </div>
                            )}
                            {c.vessel_name && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Ship className="h-3 w-3 flex-shrink-0" />
                                <span className="font-medium truncate">{c.vessel_name}</span>
                              </div>
                            )}
                            {c.interview_evaluated_at && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-1">
                                <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                                <span>Atualizado: {formatDateBR(c.interview_evaluated_at)}</span>
                              </div>
                            )}
                          </div>

                          {/* Progress dots */}
                          <div className="mt-3 flex items-center gap-1">
                            {STAGES.map((st, idx) => (
                              <div
                                key={st.key}
                                className="h-1 flex-1 rounded-full transition-colors"
                                style={{ background: idx <= si ? stage.accent : "hsl(var(--muted))" }}
                              />
                            ))}
                          </div>

                          {/* ASO selector */}
                          {(c.interview_status === "aso" || c.interview_status === "completed") && (
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={c.aso_status || "pendente"}
                                onValueChange={(val) => {
                                  supabase.from("client_candidates").update({ aso_status: val }).eq("id", c.id).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ["admin-client-detail", clientId] });
                                  });
                                }}
                              >
                                <SelectTrigger className="h-7 text-[11px] w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">ASO Pendente</SelectItem>
                                  <SelectItem value="marcado">ASO Marcado</SelectItem>
                                  <SelectItem value="finalizado">ASO Finalizado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-0.5">
                              {c.candidate?.phone && (
                                <a href={`tel:${c.candidate.phone}`} className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                              {c.candidate?.email && (
                                <a href={`mailto:${c.candidate.email}`} className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                </a>
                              )}
                            </div>
                            <div className="flex gap-0.5">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors" onClick={() => navigate(`/a/profissionais/${c.candidate?.user_id}`)}>
                                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">Ver perfil</TooltipContent>
                                </Tooltip>

                                {(!c.interview_status || c.interview_status === "pending") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-success" onClick={() => setInterviewDialog({ open: true, assignmentId: c.id, name: c.candidate?.full_name || "" })}>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Agendar entrevista</TooltipContent>
                                  </Tooltip>
                                )}

                                {c.interview_status && c.interview_status !== "pending" && c.interview_status !== "rejected" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-warning" onClick={() => updateStatusMutation.mutate({ id: c.id, status: "pending", extra: { interview_date: null, interview_time: null, rejection_reason: null } })}>
                                        <RotateCcw className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Reverter</TooltipContent>
                                  </Tooltip>
                                )}

                                {c.interview_status !== "rejected" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-destructive" onClick={() => setRejectDialog({ open: true, assignmentId: c.id, name: c.candidate?.full_name || "", reason: "" })}>
                                        <XCircle className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Reprovar</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors text-destructive" onClick={() => setRemoveDialog({ open: true, assignmentId: c.id, name: c.candidate?.full_name || "" })}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">Remover do cliente</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ── REJECTED ── */}
        {grouped.rejected.length > 0 && (
          <section className="rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2 bg-muted/30 border-b border-border/40">
              <div className="w-1.5 h-5 rounded-full bg-destructive" />
              <span className="text-[13px] font-semibold flex-1">Reprovados</span>
              <span className="text-xs text-muted-foreground">{grouped.rejected.length}</span>
            </div>
            <div className="divide-y divide-border/40">
              {grouped.rejected.map((c: any) => (
                <details key={c.id} className="group/rej">
                  <summary className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={c.candidate?.avatar_url} />
                      <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">{initials(c.candidate?.full_name || "")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{c.candidate?.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.candidate?.desired_function}</p>
                    </div>
                    <p className="hidden sm:block text-[11px] text-destructive/80 max-w-[220px] truncate group-open/rej:hidden">{c.rejection_reason || "Sem motivo"}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-warning flex-shrink-0" onClick={(e) => { e.preventDefault(); updateStatusMutation.mutate({ id: c.id, status: "pending", extra: { rejection_reason: null } }); }}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={(e) => { e.preventDefault(); setRemoveDialog({ open: true, assignmentId: c.id, name: c.candidate?.full_name || "" }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </summary>
                  <div className="px-4 pb-3 pl-[60px]">
                    <p className="text-[12px] text-destructive/90 leading-relaxed bg-destructive/5 rounded-lg px-3 py-2">{c.rejection_reason || "Sem motivo informado"}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={interviewDialog.open} onOpenChange={(v) => !v && setInterviewDialog({ open: false, assignmentId: null, name: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Entrevista</DialogTitle>
            <DialogDescription>Defina data e horário para {interviewDialog.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Data</Label><Input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Horário</Label><Input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={handleScheduleInterview} disabled={updateStatusMutation.isPending}>Agendar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog.open} onOpenChange={(v) => !v && setRejectDialog({ open: false, assignmentId: null, name: "", reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Candidato</DialogTitle>
            <DialogDescription>Informe o motivo da reprovação de {rejectDialog.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4"><Textarea placeholder="Motivo da reprovação..." value={rejectDialog.reason} onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))} rows={3} /></div>
          <DialogFooter><Button variant="destructive" onClick={handleReject} disabled={updateStatusMutation.isPending}>Reprovar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeDialog.open} onOpenChange={(v) => !v && setRemoveDialog({ open: false, assignmentId: null, name: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover profissional</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{removeDialog.name}</strong> deste cliente? Esta ação não pode ser desfeita e o profissional deixará de aparecer no funil.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveDialog({ open: false, assignmentId: null, name: "" })}>Cancelar</Button>
            <Button variant="destructive" onClick={() => removeDialog.assignmentId && removeMutation.mutate(removeDialog.assignmentId)} disabled={removeMutation.isPending}>
              {removeMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
