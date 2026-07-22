import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Users,
  ArrowRight,
  Search,
  Clock,
  Sparkles,
  TrendingUp,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateBR } from "@/lib/utils";

interface JobWithStats {
  id: string;
  title: string;
  function_name: string;
  short_description: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
  cover_image_url: string | null;
  total_released: number;
  pending_evaluation: number;
}

export default function ClientMyJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [unassigned, setUnassigned] = useState<{ total: number; pending: number }>({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchClientAndJobs = async () => {
      setLoading(true);

      let resolvedClientId: string | null = null;
      const { data: clientRow } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clientRow) {
        resolvedClientId = clientRow.id;
      } else {
        const { data: cu } = await supabase
          .from("company_users")
          .select("client_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        resolvedClientId = cu?.client_id ?? null;
      }

      if (!resolvedClientId) {
        setJobs([]);
        setLoading(false);
        return;
      }
      setClientId(resolvedClientId);

      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, function_name, short_description, description, is_active, created_at, cover_image_url")
        .eq("client_id", resolvedClientId)
        .order("created_at", { ascending: false });

      const { data: assignments } = await supabase
        .from("client_candidates")
        .select("job_id, interview_status")
        .eq("client_id", resolvedClientId);

      const statsByJob = new Map<string, { total: number; pending: number }>();
      let unassignedTotal = 0;
      let unassignedPending = 0;
      (assignments ?? []).forEach((a: any) => {
        if (!a.job_id) {
          unassignedTotal += 1;
          if (!a.interview_status || a.interview_status === "pending") unassignedPending += 1;
          return;
        }
        const cur = statsByJob.get(a.job_id) ?? { total: 0, pending: 0 };
        cur.total += 1;
        if (!a.interview_status || a.interview_status === "pending") cur.pending += 1;
        statsByJob.set(a.job_id, cur);
      });

      const enriched: JobWithStats[] = (jobsData ?? []).map((j: any) => ({
        ...j,
        total_released: statsByJob.get(j.id)?.total ?? 0,
        pending_evaluation: statsByJob.get(j.id)?.pending ?? 0,
      }));
      setJobs(enriched);
      setUnassigned({ total: unassignedTotal, pending: unassignedPending });
      setLoading(false);
    };

    fetchClientAndJobs();
  }, [user]);

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.function_name.toLowerCase().includes(search.toLowerCase())
  );

  const totals = useMemo(() => {
    const totalReleased = jobs.reduce((s, j) => s + j.total_released, 0) + unassigned.total;
    const totalPending = jobs.reduce((s, j) => s + j.pending_evaluation, 0) + unassigned.pending;
    const activeJobs = jobs.filter((j) => j.is_active).length;
    return { totalReleased, totalPending, activeJobs };
  }, [jobs, unassigned]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <DashboardLayout userType="client">
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Painel de vagas
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Minhas Vagas
              </h1>
              <p className="mt-2 max-w-xl text-sm md:text-base text-muted-foreground">
                Acompanhe os profissionais liberados pelos administradores e gerencie cada etapa do processo seletivo.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <StatPill icon={Briefcase} label="Vagas ativas" value={totals.activeJobs} tone="primary" />
              <StatPill icon={Users} label="Liberados" value={totals.totalReleased} tone="success" />
              <StatPill icon={Clock} label="Pendentes" value={totals.totalPending} tone="warning" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou função..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-card"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 && unassigned.total === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Briefcase className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">
                {jobs.length === 0 ? "Nenhuma vaga ainda" : "Nada por aqui"}
              </p>
              <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">
                {jobs.length === 0
                  ? "Quando os administradores publicarem vagas para sua empresa, elas aparecerão aqui."
                  : "Nenhuma vaga corresponde ao filtro aplicado."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {unassigned.total > 0 && (
              <button
                type="button"
                onClick={() => navigate(`/c/minhas-vagas/sem-vaga`)}
                className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/60"
              >
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="rounded-xl bg-primary/15 p-2.5">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="bg-background/60 backdrop-blur">
                      Legado
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">Atribuições gerais</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Profissionais liberados sem vínculo com vaga específica.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-primary/20">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-bold text-foreground">{unassigned.total}</span>
                      <span className="text-muted-foreground">liberados</span>
                      {unassigned.pending > 0 && (
                        <Badge variant="warning" className="gap-1 h-5">
                          <Clock className="h-3 w-3" />
                          {unassigned.pending}
                        </Badge>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            )}

            {filtered.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => navigate(`/c/minhas-vagas/${job.id}`)}
                className="group relative overflow-hidden rounded-2xl border bg-card p-0 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/30"
              >
                {/* Top accent bar */}
                <div
                  className={`h-1.5 w-full ${
                    job.is_active
                      ? "bg-gradient-to-r from-primary via-primary/70 to-primary/40"
                      : "bg-muted"
                  }`}
                />

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                        {getInitials(job.function_name || job.title)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground line-clamp-1 leading-tight">
                          {job.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Briefcase className="h-3 w-3" />
                          {job.function_name}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={job.is_active ? "success" : "secondary"}
                      className="shrink-0 h-6"
                    >
                      {job.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>

                  {job.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] whitespace-pre-wrap">
                      {job.description}
                    </p>
                  )}

                  {/* Mini stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/40 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Liberados
                      </div>
                      <div className="text-lg font-bold text-foreground mt-0.5">
                        {job.total_released}
                      </div>
                    </div>
                    <div
                      className={`rounded-lg p-2.5 ${
                        job.pending_evaluation > 0
                          ? "bg-amber-500/10"
                          : "bg-muted/40"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-xs ${
                          job.pending_evaluation > 0
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {job.pending_evaluation > 0 ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Pendentes
                      </div>
                      <div
                        className={`text-lg font-bold mt-0.5 ${
                          job.pending_evaluation > 0
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-foreground"
                        }`}
                      >
                        {job.pending_evaluation}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {formatDateBR(job.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                      Ver candidatos
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "primary" | "success" | "warning";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="rounded-xl border bg-background/60 backdrop-blur p-3 md:p-4 min-w-[110px]">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground leading-none">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}
