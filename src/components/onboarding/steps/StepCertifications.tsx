import { useMemo, useState } from "react";
import { StepShell } from "@/components/onboarding/StepShell";
import type { StepComponentProps } from "@/components/onboarding/types";
import { CertificationRow } from "@/components/onboarding/CertificationRow";
import { CertificationDetailsDialog } from "@/components/onboarding/CertificationDetailsDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CERTIFICATIONS,
  CERT_IDS,
  CERT_CATEGORY_LABELS,
  type CertCategory,
  type CertAnswer,
  type CertFieldState,
  brToISO,
  isoToBR,
  parseBRDate,
  isValidityExpired,
} from "@/lib/onboarding";
import { Award, Search, CheckCircle2 } from "lucide-react";

const parseStcw = (raw: unknown): any => {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return typeof p === "object" ? p : {};
    } catch {
      return {};
    }
  }
  return {};
};

const CATEGORY_ORDER = Object.keys(CERT_CATEGORY_LABELS) as CertCategory[];
type Filter = "all" | CertCategory;

export function StepCertifications({ progress, userId, onNext, onBack, onSaveAndExit }: StepComponentProps) {
  const { certs, onboardingData, saving } = progress;
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const answeredSet = useMemo(() => new Set(onboardingData.certs_answered ?? []), [onboardingData]);
  const [answers, setAnswers] = useState<Record<string, CertAnswer>>(() => {
    const initial: Record<string, CertAnswer> = {};
    CERT_IDS.forEach((id) => {
      if (certs?.[id] === true) initial[id] = "owned";
      else if (answeredSet.has(id)) initial[id] = "not_owned";
      else initial[id] = "unanswered";
    });
    return initial;
  });

  const [fieldsMap, setFieldsMap] = useState<Record<string, CertFieldState>>(() => {
    const initial: Record<string, CertFieldState> = {};
    CERTIFICATIONS.forEach((c) => {
      initial[c.id] = {
        issueDate: isoToBR(certs?.[`${c.id}_issue_date`]),
        validityDate: isoToBR(certs?.[`${c.id}_validity`]),
        indeterminate: Boolean(certs?.[`${c.id}_indeterminate`]),
        dpBasico: Boolean(certs?.[`${c.id}_dp_basico`]),
        dpAvancado: Boolean(certs?.[`${c.id}_dp_avancado`]),
        dpIlimitado: Boolean(certs?.[`${c.id}_dp_ilimitado`]),
        filePath: certs?.[`${c.id}_file_path`] ?? null,
        fileName: certs?.[`${c.id}_file_name`] ?? null,
      };
    });
    return initial;
  });

  const [stcwRules, setStcwRules] = useState<any>(parseStcw(certs?.stcw_rules));

  const setAnswer = (id: string, a: CertAnswer) => setAnswers((p) => ({ ...p, [id]: a }));
  const setFields = (id: string, patch: Partial<CertFieldState>) =>
    setFieldsMap((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const answeredCount = CERT_IDS.filter((id) => answers[id] !== "unanswered").length;
  const ownedCount = CERT_IDS.filter((id) => answers[id] === "owned").length;
  const pendingInCategory = (cat: CertCategory) =>
    CERTIFICATIONS.filter((c) => c.category === cat && answers[c.id] === "unanswered").length;

  const markRestNotOwned = () =>
    setAnswers((p) => {
      const next = { ...p };
      CERT_IDS.forEach((id) => {
        if (next[id] === "unanswered") next[id] = "not_owned";
      });
      return next;
    });

  // Lista visível conforme filtro de categoria + busca.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return CERTIFICATIONS.filter((c) => {
      if (filter !== "all" && c.category !== filter) return false;
      if (term && !c.name.toLowerCase().includes(term) && !c.description.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [filter, search]);

  // Agrupa por categoria (mantém subtítulos quando "Todas").
  const visibleByCategory = useMemo(() => {
    const map = new Map<CertCategory, typeof CERTIFICATIONS>();
    CATEGORY_ORDER.forEach((cat) => {
      const items = visible.filter((c) => c.category === cat);
      if (items.length) map.set(cat, items);
    });
    return map;
  }, [visible]);

  const buildPayload = () => {
    const payload: Record<string, any> = { stcw_rules: JSON.stringify(stcwRules ?? {}) };
    CERTIFICATIONS.forEach((c) => {
      const owned = answers[c.id] === "owned";
      const f = fieldsMap[c.id];
      payload[c.id] = owned;
      payload[`${c.id}_issue_date`] = owned && f.issueDate.length === 10 ? brToISO(f.issueDate) : null;
      payload[`${c.id}_validity`] = owned && !f.indeterminate && f.validityDate.length === 10 ? brToISO(f.validityDate) : null;
      payload[`${c.id}_indeterminate`] = owned ? f.indeterminate : false;
      payload[`${c.id}_file_path`] = owned ? f.filePath : null;
      payload[`${c.id}_file_name`] = owned ? f.fileName : null;
      if (c.hasDP) {
        payload[`${c.id}_dp_basico`] = owned ? f.dpBasico : false;
        payload[`${c.id}_dp_avancado`] = owned ? f.dpAvancado : false;
        payload[`${c.id}_dp_ilimitado`] = owned ? f.dpIlimitado : false;
      }
    });
    return payload;
  };

  const persist = async () => {
    const ok1 = await progress.saveCertsPatch(buildPayload());
    const answeredIds = CERT_IDS.filter((id) => answers[id] !== "unanswered");
    const ok2 = await progress.markCertsAnswered(answeredIds);
    return ok1 && ok2;
  };

  const validate = (): string | null => {
    const pending = CERT_IDS.filter((id) => answers[id] === "unanswered");
    if (pending.length > 0) return `Responda todas as certificações — faltam ${pending.length}.`;

    const incomplete = CERTIFICATIONS.filter((c) => {
      if (answers[c.id] !== "owned") return false;
      const f = fieldsMap[c.id];
      const okIssue = f.issueDate.length === 10;
      const okValidity = f.indeterminate || f.validityDate.length === 10;
      return !(okIssue && okValidity && Boolean(f.filePath));
    });
    if (incomplete.length > 0)
      return `Complete emissão, validade e anexo de: ${incomplete.map((c) => c.name).join(", ")}.`;

    const invalidDates = CERTIFICATIONS.filter((c) => {
      if (answers[c.id] !== "owned" || fieldsMap[c.id].indeterminate) return false;
      const f = fieldsMap[c.id];
      if (isValidityExpired(f.validityDate)) return true;
      const issue = parseBRDate(f.issueDate);
      const val = parseBRDate(f.validityDate);
      return !!issue && !!val && val < issue;
    });
    if (invalidDates.length > 0)
      return `Corrija a validade (vencida ou anterior à emissão) de: ${invalidDates.map((c) => c.name).join(", ")}.`;

    return null;
  };

  const handleNext = async () => {
    const err = validate();
    if (err) {
      toast({ variant: "destructive", title: "Certificações pendentes", description: err });
      const firstPending = CERT_IDS.find((id) => answers[id] === "unanswered");
      if (firstPending) setFilter(CERTIFICATIONS.find((c) => c.id === firstPending)!.category);
      return;
    }
    const ok = await persist();
    if (ok) onNext();
    else toast({ variant: "destructive", title: "Erro ao salvar", description: "Tente novamente." });
  };

  const handleSaveAndExit = async () => {
    await persist();
    onSaveAndExit();
  };

  const detailsCert = detailsId ? CERTIFICATIONS.find((c) => c.id === detailsId) ?? null : null;

  return (
    <StepShell
      title="Certificações marítimas"
      description="Informe se possui ou não cada certificação. As que possui, toque para anexar."
      icon={<Award className="h-6 w-6" />}
      onNext={handleNext}
      onBack={onBack}
      onSaveAndExit={handleSaveAndExit}
      saving={saving}
    >
      {/* Cabeçalho fixo: progresso + busca + filtros */}
      <div className="sticky top-0 z-10 -mt-1 mb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={cn("h-4 w-4", answeredCount === CERT_IDS.length ? "text-success" : "text-muted-foreground")} />
            <span className="font-semibold text-foreground">{answeredCount}</span>
            <span className="text-muted-foreground">de {CERT_IDS.length} · {ownedCount} possuo</span>
          </div>
          {answeredCount < CERT_IDS.length && (
            <Button type="button" variant="outline" size="sm" onClick={markRestNotOwned} className="text-xs">
              Não possuo as demais
            </Button>
          )}
        </div>

        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-maritime-blue transition-all duration-300" style={{ width: `${(answeredCount / CERT_IDS.length) * 100}%` }} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar (ex.: STCW, CIR, DP)" className="pl-9" />
        </div>

        {/* Chips de categoria (scroll horizontal no mobile) */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todas" />
          {CATEGORY_ORDER.map((cat) => (
            <FilterChip
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              label={CERT_CATEGORY_LABELS[cat]}
              pending={pendingInCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* Lista compacta */}
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma certificação encontrada.</p>
      ) : (
        <div className="space-y-5">
          {Array.from(visibleByCategory.entries()).map(([cat, items]) => (
            <div key={cat} className="space-y-2">
              {filter === "all" && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
                  {CERT_CATEGORY_LABELS[cat]}
                </h3>
              )}
              {items.map((cert) => (
                <CertificationRow
                  key={cert.id}
                  cert={cert}
                  answer={answers[cert.id]}
                  fields={fieldsMap[cert.id]}
                  onAnswerChange={(a) => setAnswer(cert.id, a)}
                  onOpenDetails={() => setDetailsId(cert.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <CertificationDetailsDialog
        cert={detailsCert}
        fields={detailsId ? fieldsMap[detailsId] : undefined}
        stcwRules={stcwRules}
        userId={userId}
        open={!!detailsId}
        onOpenChange={(o) => !o && setDetailsId(null)}
        onFieldChange={(patch) => detailsId && setFields(detailsId, patch)}
        onStcwChange={detailsCert?.hasSTCW ? setStcwRules : undefined}
      />
    </StepShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  pending,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  pending?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
        active
          ? "border-maritime-blue bg-maritime-blue text-white"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {label}
      {pending ? (
        <span
          className={cn(
            "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
            active ? "bg-white/25 text-white" : "bg-warning/20 text-warning",
          )}
        >
          {pending}
        </span>
      ) : null}
    </button>
  );
}
