import { StepShell } from "@/components/onboarding/StepShell";
import type { StepComponentProps } from "@/components/onboarding/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { STEPS, type StepId, CERTIFICATIONS, isoToBR } from "@/lib/onboarding";
import { CheckCircle2, AlertCircle, Pencil, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

const GENDER_LABEL: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
};

const LEVEL_LABEL: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
  fluente: "Fluente",
  nativo: "Nativo",
};

const money = (v: unknown): string => {
  const n = typeof v === "number" ? v : Number(v);
  if (!n || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseLangs = (raw: unknown): { name: string; level: string }[] => {
  if (!raw || typeof raw !== "string") return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

interface Row {
  label: string;
  value: string;
}

function ReviewSection({
  title,
  complete,
  rows,
  onEdit,
}: {
  title: string;
  complete: boolean;
  rows: Row[];
  onEdit: () => void;
}) {
  return (
    <div className={cn("rounded-xl border p-4", !complete && "border-warning/40 bg-warning/5")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {complete ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-warning" />
          )}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-8">
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Editar
        </Button>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{r.label}</dt>
            <dd className="text-sm text-foreground break-words">{r.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function StepReview({ progress, onBack, onNext, goToStep }: StepComponentProps) {
  const { profile, certs, stepStatuses, readiness, ready, saving } = progress;
  const { toast } = useToast();

  const stepIndex = (id: StepId) => STEPS.find((s) => s.id === id)!.index;

  const ownedCerts = CERTIFICATIONS.filter((c) => certs?.[c.id] === true);
  const langs = parseLangs(profile?.languages);

  const handleComplete = async () => {
    if (!ready) {
      toast({ variant: "destructive", title: "Ainda faltam itens", description: "Complete as seções destacadas para concluir." });
      return;
    }
    const ok = await progress.completeOnboarding();
    if (ok) onNext();
    else toast({ variant: "destructive", title: "Erro ao concluir", description: "Tente novamente." });
  };

  return (
    <StepShell
      title="Revisão final"
      description="Confira tudo que você preencheu antes de concluir."
      icon={<PartyPopper className="h-6 w-6" />}
      onBack={onBack}
      onNext={handleComplete}
      nextLabel="Concluir cadastro"
      nextDisabled={!ready}
      isFinal
      saving={saving}
    >
      <div className="space-y-4">
        {/* Banner de prontidão */}
        <div className={cn(
          "rounded-xl border p-4 flex items-center gap-3",
          ready ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10",
        )}>
          {ready ? <CheckCircle2 className="h-6 w-6 text-success shrink-0" /> : <AlertCircle className="h-6 w-6 text-warning shrink-0" />}
          <div>
            <p className="font-semibold text-foreground">
              {ready ? "Perfil pronto para contratação!" : `Perfil ${readiness}% completo`}
            </p>
            <p className="text-sm text-muted-foreground">
              {ready
                ? "Ao concluir, seu perfil ficará visível para as empresas."
                : "Complete as seções destacadas em amarelo para liberar a conclusão."}
            </p>
          </div>
        </div>

        {/* Dados pessoais */}
        <ReviewSection
          title="Dados pessoais"
          complete={stepStatuses.personal.complete}
          onEdit={() => goToStep(stepIndex("personal"))}
          rows={[
            { label: "Nome completo", value: profile?.full_name ?? "" },
            { label: "CPF", value: profile?.cpf ?? "" },
            { label: "RG", value: profile?.rg ?? "" },
            { label: "Nascimento", value: isoToBR(profile?.birth_date) },
            { label: "Sexo", value: GENDER_LABEL[profile?.gender] ?? "" },
            { label: "Telefone", value: profile?.phone ?? "" },
          ]}
        />

        {/* Endereço */}
        <ReviewSection
          title="Endereço"
          complete={stepStatuses.address.complete}
          onEdit={() => goToStep(stepIndex("address"))}
          rows={[
            { label: "CEP", value: profile?.cep ?? "" },
            { label: "Logradouro", value: profile?.street ?? "" },
            { label: "Número", value: profile?.address_number ?? "" },
            { label: "Complemento", value: profile?.address_complement ?? "" },
            { label: "Bairro", value: profile?.neighborhood ?? "" },
            { label: "Cidade / UF", value: [profile?.city, profile?.state].filter(Boolean).join(" / ") },
          ]}
        />

        {/* Profissional */}
        <ReviewSection
          title="Perfil profissional"
          complete={stepStatuses.professional.complete}
          onEdit={() => goToStep(stepIndex("professional"))}
          rows={[
            { label: "Função desejada", value: profile?.desired_function ?? "" },
            { label: "Tipo de embarcação", value: profile?.vessel_type ?? "" },
            { label: "Pretensão salarial", value: money(profile?.salary_expectation) },
            { label: "Disponível a partir de", value: isoToBR(profile?.available_from) },
            { label: "Experiência", value: profile?.professional_experience ?? "" },
            { label: "Idiomas", value: langs.map((l) => `${l.name} (${LEVEL_LABEL[l.level] ?? l.level})`).join(", ") },
          ]}
        />

        {/* Certificações */}
        <div className={cn("rounded-xl border p-4", !stepStatuses.certifications.complete && "border-warning/40 bg-warning/5")}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {stepStatuses.certifications.complete ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
              <h3 className="text-sm font-semibold text-foreground">
                Certificações <span className="text-muted-foreground font-normal">({ownedCerts.length} que possui)</span>
              </h3>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(stepIndex("certifications"))} className="h-8">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          </div>
          {ownedCerts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ownedCerts.map((c) => {
                const validity = certs?.[`${c.id}_indeterminate`]
                  ? "indeterminada"
                  : isoToBR(certs?.[`${c.id}_validity`]);
                return (
                  <Badge key={c.id} variant="outline" className="text-xs font-normal">
                    {c.name}
                    {validity ? <span className="text-muted-foreground ml-1">· val. {validity}</span> : null}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma certificação marcada como “possuo”.</p>
          )}
        </div>

        {/* Documentos */}
        <div className={cn("rounded-xl border p-4", !stepStatuses.documents.complete && "border-warning/40 bg-warning/5")}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {stepStatuses.documents.complete ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
              <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => goToStep(stepIndex("documents"))} className="h-8">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">Currículo (CV)</dt>
              <dd className="text-sm text-foreground break-words">{profile?.cv_file_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Foto de perfil</dt>
              <dd className="text-sm text-foreground">{profile?.avatar_url ? "Adicionada" : "Não adicionada (opcional)"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </StepShell>
  );
}
