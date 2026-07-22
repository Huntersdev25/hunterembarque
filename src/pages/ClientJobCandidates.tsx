import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Briefcase,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Activity,
  Eye,
  Users,
  Mail,
  Phone,
  Clock,
  Layers,
  MapPin,
  Hourglass,
  Search,
  Filter,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CandidateTimelineDrawer } from "@/components/CandidateTimelineDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateBR } from "@/lib/utils";

type StatusKey = "pending" | "interview" | "approved" | "rejected";

const COLUMN_META: Record<
  StatusKey,
  {
    label: string;
    description: string;
    accent: string; // top-bar gradient
    icon: any;
    iconBg: string;
    iconColor: string;
    count: string; // badge text color
    countBg: string;
  }
> = {
  pending: {
    label: "Aguardando avaliação",
    description: "Sem candidatos pendentes",
    accent: "bg-gradient-to-r from-amber-400 to-amber-500",
    icon: Hourglass,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    count: "text-amber-700 dark:text-amber-300",
    countBg: "bg-amber-500/15",
  },
  interview: {
    label: "Em entrevista",
    description: "Sem entrevistas agendadas",
    accent: "bg-gradient-to-r from-sky-400 to-blue-500",
    icon: CalendarIcon,
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    count: "text-sky-700 dark:text-sky-300",
    countBg: "bg-sky-500/15",
  },
  approved: {
    label: "Aprovados",
    description: "Sem aprovados",
    accent: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    count: "text-emerald-700 dark:text-emerald-300",
    countBg: "bg-emerald-500/15",
  },
  rejected: {
    label: "Reprovados",
    description: "Sem reprovados",
    accent: "bg-gradient-to-r from-rose-400 to-rose-500",
    icon: XCircle,
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
    count: "text-rose-700 dark:text-rose-300",
    countBg: "bg-rose-500/15",
  },
};

export default function ClientJobCandidates() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState<string | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState<{ open: boolean; assignmentId: string | null; name: string }>({
    open: false,
    assignmentId: null,
    name: "",
  });
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; assignmentId: string | null; name: string }>({
    open: false,
    assignmentId: null,
    name: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [timelineDrawer, setTimelineDrawer] = useState<{ open: boolean; candidateId: string; name: string }>({
    open: false,
    candidateId: "",
    name: "",
  });

  useEffect(() => {
    if (!user) return;
    const resolve = async () => {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (clientRow) {
        setClientId(clientRow.id);
        return;
      }
      const { data: cu } = await supabase
        .from("company_users")
        .select("client_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      setClientId(cu?.client_id ?? null);
    };
    resolve();
  }, [user]);

  const isUnassigned = jobId === "sem-vaga";

  const { data: jobInfo } = useQuery({
    queryKey: ["client-job-info", jobId],
    enabled: !!jobId && !isUnassigned,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, function_name, description, requirements, short_description, created_at, is_active")
        .eq("id", jobId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["client-job-candidates", jobId, clientId, isUnassigned],
    enabled: !!clientId && (!!jobId || isUnassigned),
    queryFn: async () => {
      let query = supabase
        .from("client_candidates")
        .select(`
          id,
          candidate_id,
          assigned_at,
          interview_status,
          interview_date,
          interview_time,
          rejection_reason,
          notes,
          aso_status,
          candidate:candidate_id (
            user_id,
            full_name,
            email,
            phone,
            desired_function,
            avatar_url,
            city,
            state
          )
        `)
        .eq("client_id", clientId!)
        .order("assigned_at", { ascending: false });

      query = isUnassigned ? query.is("job_id", null) : query.eq("job_id", jobId!);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((a: any) => ({
        ...a,
        candidate: Array.isArray(a.candidate) ? a.candidate[0] : a.candidate,
      }));
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!scheduleDialog.assignmentId) throw new Error("ID inválido");
      const { error } = await supabase
        .from("client_candidates")
        .update({
          interview_status: "interview",
          interview_evaluated_at: new Date().toISOString(),
          interview_date: interviewDate,
          interview_time: interviewTime,
        })
        .eq("id", scheduleDialog.assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-job-candidates"] });
      toast({ title: "Entrevista agendada", description: `${formatDateBR(interviewDate)} às ${interviewTime}` });
      setScheduleDialog({ open: false, assignmentId: null, name: "" });
      setInterviewDate("");
      setInterviewTime("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectDialog.assignmentId) throw new Error("ID inválido");
      if (!rejectReason.trim()) throw new Error("Informe o motivo da reprovação");
      const { error } = await supabase
        .from("client_candidates")
        .update({
          interview_status: "rejected",
          interview_evaluated_at: new Date().toISOString(),
          rejection_reason: rejectReason.trim(),
        })
        .eq("id", rejectDialog.assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-job-candidates"] });
      toast({ title: "Candidato reprovado" });
      setRejectDialog({ open: false, assignmentId: null, name: "" });
      setRejectReason("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const groupByStatus = (list: any[]) => ({
    pending: list.filter((c) => !c.interview_status || c.interview_status === "pending"),
    interview: list.filter((c) => c.interview_status === "interview"),
    approved: list.filter((c) => c.interview_status === "approved"),
    rejected: list.filter((c) => c.interview_status === "rejected"),
  });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");

  const allCandidates = candidates ?? [];

  const locationOptions = Array.from(
    new Set(
      allCandidates
        .map((c: any) => [c.candidate?.city, c.candidate?.state].filter(Boolean).join(" / "))
        .filter((v: string) => v.length > 0)
    )
  ).sort();

  const functionOptions = Array.from(
    new Set(
      allCandidates
        .map((c: any) => c.candidate?.desired_function)
        .filter((v: string | null) => !!v)
    )
  ).sort();

  const filteredCandidates = allCandidates.filter((c: any) => {
    const term = search.trim().toLowerCase();
    if (term) {
      const haystack = [
        c.candidate?.full_name,
        c.candidate?.email,
        c.candidate?.phone,
        c.candidate?.desired_function,
        c.candidate?.city,
        c.candidate?.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (statusFilter !== "all") {
      const cur = c.interview_status || "pending";
      if (cur !== statusFilter) return false;
    }
    if (locationFilter !== "all") {
      const loc = [c.candidate?.city, c.candidate?.state].filter(Boolean).join(" / ");
      if (loc !== locationFilter) return false;
    }
    if (functionFilter !== "all") {
      if (c.candidate?.desired_function !== functionFilter) return false;
    }
    return true;
  });

  const groups = groupByStatus(filteredCandidates);
  const total = allCandidates.length;
  const filteredTotal = filteredCandidates.length;
  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    locationFilter !== "all" ||
    functionFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setLocationFilter("all");
    setFunctionFilter("all");
  };


  const renderCandidateCard = (c: any) => {
    const initials = (c.candidate?.full_name ?? "?")
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    const isPending = !c.interview_status || c.interview_status === "pending";
    return (
      <Card
        key={c.id}
        className="group rounded-xl border bg-card hover:shadow-lg hover:border-primary/30 transition-all"
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-background">
              <AvatarImage src={c.candidate?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate text-foreground">
                {c.candidate?.full_name ?? "Sem nome"}
              </h4>
              {c.candidate?.desired_function && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <Briefcase className="h-3 w-3" />
                  {c.candidate.desired_function}
                </p>
              )}
              {(c.candidate?.city || c.candidate?.state) && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {[c.candidate?.city, c.candidate?.state].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
          </div>

          {(c.candidate?.email || c.candidate?.phone) && (
            <div className="space-y-1 text-xs text-muted-foreground rounded-lg bg-muted/40 p-2">
              {c.candidate?.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{c.candidate.email}</span>
                </div>
              )}
              {c.candidate?.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0" />
                  {c.candidate.phone}
                </div>
              )}
            </div>
          )}

          {c.interview_status === "interview" && c.interview_date && (
            <div className="flex items-center gap-1.5 text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2.5 py-1.5 rounded-lg">
              <CalendarIcon className="h-3.5 w-3.5" />
              {formatDateBR(c.interview_date)}
              {c.interview_time && <span className="opacity-80">• {c.interview_time}</span>}
            </div>
          )}

          {c.interview_status === "rejected" && c.rejection_reason && (
            <div className="text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2.5 py-1.5 rounded-lg line-clamp-2">
              <span className="font-medium">Motivo:</span> {c.rejection_reason}
            </div>
          )}

          <div className="pt-2 border-t space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 px-2 min-w-0"
                onClick={() => navigate(`/c/aprovados/${c.candidate_id}`)}
              >
                <Eye className="h-3 w-3 shrink-0" />
                <span className="truncate">Perfil</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 px-2 min-w-0"
                onClick={() =>
                  setTimelineDrawer({
                    open: true,
                    candidateId: c.candidate_id,
                    name: c.candidate?.full_name ?? "Candidato",
                  })
                }
              >
                <Activity className="h-3 w-3 shrink-0" />
                <span className="truncate">Timeline</span>
              </Button>
            </div>
            {isPending && (
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1 px-2 min-w-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() =>
                    setScheduleDialog({
                      open: true,
                      assignmentId: c.id,
                      name: c.candidate?.full_name ?? "Candidato",
                    })
                  }
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">Aprovar</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs gap-1 px-2 min-w-0"
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      assignmentId: c.id,
                      name: c.candidate?.full_name ?? "Candidato",
                    })
                  }
                >
                  <XCircle className="h-3 w-3 shrink-0" />
                  <span className="truncate">Reprovar</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderColumn = (key: StatusKey, list: any[]) => {
    const meta = COLUMN_META[key];
    const Icon = meta.icon;
    return (
      <div className="flex flex-col rounded-2xl border bg-muted/30 overflow-hidden min-h-[400px]">
        <div className={`h-1 w-full ${meta.accent}`} />
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/60 backdrop-blur">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${meta.iconBg}`}>
              <Icon className={`h-4 w-4 ${meta.iconColor}`} />
            </div>
            <h3 className="font-semibold text-sm truncate text-foreground">{meta.label}</h3>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center ${meta.countBg} ${meta.count}`}
          >
            {list.length}
          </span>
        </div>
        <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-22rem)]">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${meta.iconBg} mb-2 opacity-60`}>
                <Icon className={`h-5 w-5 ${meta.iconColor}`} />
              </div>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </div>
          ) : (
            list.map(renderCandidateCard)
          )}
        </div>
      </div>
    );
  };

  const headerTitle = isUnassigned ? "Atribuições gerais" : jobInfo?.title ?? "Carregando...";
  const headerSubtitle = isUnassigned
    ? "Profissionais liberados sem vínculo com vaga específica"
    : jobInfo?.function_name;

  return (
    <DashboardLayout userType="client">
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/c/minhas-vagas")}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Minhas Vagas
        </Button>

        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-7">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                {isUnassigned ? <Layers className="h-7 w-7" /> : <Briefcase className="h-7 w-7" />}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">
                  {headerTitle}
                </h1>
                {headerSubtitle && (
                  <p className="text-sm md:text-base text-muted-foreground mt-1">{headerSubtitle}</p>
                )}
                {!isUnassigned && jobInfo?.short_description && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl line-clamp-2">
                    {jobInfo.short_description}
                  </p>
                )}
              </div>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-4 gap-2 lg:gap-3 shrink-0">
              <MiniStat icon={Users} value={total} label="Total" tone="primary" />
              <MiniStat icon={Hourglass} value={groups.pending.length} label="Pendentes" tone="warning" />
              <MiniStat icon={CheckCircle2} value={groups.approved.length} label="Aprovados" tone="success" />
              <MiniStat icon={XCircle} value={groups.rejected.length} label="Reprovados" tone="danger" />
            </div>
          </div>
        </div>

        {/* Filters */}
        {total > 0 && (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="h-4 w-4 text-primary" />
                Filtrar candidatos
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {filteredTotal} de {total}
                  </Badge>
                )}
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8 text-xs">
                  <X className="h-3.5 w-3.5" />
                  Limpar filtros
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="relative lg:col-span-1 md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Aguardando avaliação</SelectItem>
                  <SelectItem value="interview">Em entrevista</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Reprovados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={functionFilter} onValueChange={setFunctionFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Função desejada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  {functionOptions.map((f: string) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as localizações</SelectItem>
                  {locationOptions.map((loc: string) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Kanban */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : total === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">Nenhum candidato liberado</p>
              <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">
                Os administradores liberarão os profissionais conforme forem aprovados internamente.
              </p>
            </CardContent>
          </Card>
        ) : filteredTotal === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">Nenhum candidato encontrado</p>
              <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">
                Ajuste os filtros aplicados para visualizar candidatos.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 gap-1">
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {renderColumn("pending", groups.pending)}
            {renderColumn("interview", groups.interview)}
            {renderColumn("approved", groups.approved)}
            {renderColumn("rejected", groups.rejected)}
          </div>
        )}
      </div>


      {/* Schedule dialog */}
      <Dialog open={scheduleDialog.open} onOpenChange={(o) => !o && setScheduleDialog({ open: false, assignmentId: null, name: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar entrevista</DialogTitle>
            <DialogDescription>
              Defina a data e horário para entrevistar <strong>{scheduleDialog.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
            </div>
            <div>
              <Label>Horário</Label>
              <Input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog({ open: false, assignmentId: null, name: "" })}>
              Cancelar
            </Button>
            <Button
              onClick={() => scheduleMutation.mutate()}
              disabled={!interviewDate || !interviewTime || scheduleMutation.isPending}
            >
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && setRejectDialog({ open: false, assignmentId: null, name: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar candidato</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação de <strong>{rejectDialog.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da reprovação"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, assignmentId: null, name: "" })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              Confirmar reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CandidateTimelineDrawer
        open={timelineDrawer.open}
        onOpenChange={(o) => setTimelineDrawer((s) => ({ ...s, open: o }))}
        jobId={isUnassigned ? "" : (jobId ?? "")}
        candidateId={timelineDrawer.candidateId}
        candidateName={timelineDrawer.name}
        jobTitle={jobInfo?.title}
        readOnly
      />
    </DashboardLayout>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: any;
  value: number;
  label: string;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };
  return (
    <div className="rounded-xl border bg-background/60 backdrop-blur p-2.5 lg:p-3 min-w-[78px]">
      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1.5 text-xl font-bold text-foreground leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}
