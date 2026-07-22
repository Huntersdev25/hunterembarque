import { useState } from "react";
import { StepShell } from "@/components/onboarding/StepShell";
import type { StepComponentProps } from "@/components/onboarding/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobFunctionSelector } from "@/components/JobFunctionSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useToast } from "@/hooks/use-toast";
import { maskDateBR, brToISO, isoToBR, PROFESSIONAL_REQUIRED } from "@/lib/onboarding";
import { Briefcase } from "lucide-react";

const VESSEL_TYPES = [
  "Plataforma / FPSO",
  "Embarcação de Apoio (PSV/AHTS)",
  "Navio Petroleiro",
  "Navio Gaseiro / Químico",
  "Rebocador",
  "Sonda de Perfuração",
  "Embarcação de Passageiros",
  "Outros",
];

interface Language {
  name: string;
  level: string;
}

const parseLanguages = (raw: unknown): Language[] => {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseSalary = (v: string): number | null => {
  const digits = v.replace(/\D/g, "");
  return digits ? Number(digits) : null;
};

export function StepProfessional({ progress, onNext, onBack, onSaveAndExit }: StepComponentProps) {
  const { profile, saving } = progress;
  const { toast } = useToast();

  const [form, setForm] = useState({
    desired_function: profile?.desired_function ?? "",
    vessel_type: profile?.vessel_type ?? "",
    professional_experience: profile?.professional_experience ?? "",
    salary_expectation: profile?.salary_expectation ? String(profile.salary_expectation) : "",
    available_from: isoToBR(profile?.available_from),
  });
  const [languages, setLanguages] = useState<Language[]>(parseLanguages(profile?.languages));

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const validate = (): string | null => {
    for (const f of PROFESSIONAL_REQUIRED) {
      if (!String((form as any)[f.key] ?? "").trim()) return `Preencha: ${f.label}`;
    }
    if (form.available_from && !/^\d{2}\/\d{2}\/\d{4}$/.test(form.available_from))
      return "Data de disponibilidade inválida (DD/MM/AAAA).";
    return null;
  };

  const buildPatch = () => ({
    desired_function: form.desired_function || null,
    vessel_type: form.vessel_type || null,
    professional_experience: form.professional_experience.trim() || null,
    salary_expectation: parseSalary(form.salary_expectation),
    available_from: /^\d{2}\/\d{2}\/\d{4}$/.test(form.available_from) ? brToISO(form.available_from) : null,
    languages: JSON.stringify(languages),
  });

  const handleNext = async () => {
    const err = validate();
    if (err) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: err });
      return;
    }
    const ok = await progress.saveProfilePatch(buildPatch());
    if (ok) onNext();
    else toast({ variant: "destructive", title: "Erro ao salvar", description: "Tente novamente." });
  };

  const handleSaveAndExit = async () => {
    await progress.saveProfilePatch(buildPatch());
    onSaveAndExit();
  };

  return (
    <StepShell
      title="Perfil profissional"
      description="Conte sua experiência e o que você procura."
      icon={<Briefcase className="h-6 w-6" />}
      onNext={handleNext}
      onBack={onBack}
      onSaveAndExit={handleSaveAndExit}
      saving={saving}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <JobFunctionSelector
            value={form.desired_function}
            onChange={(v) => set("desired_function", v)}
            label="Função desejada"
            placeholder="Selecione sua função"
            required
          />

          <div className="space-y-2">
            <Label htmlFor="vessel_type">Tipo de embarcação *</Label>
            <Select value={form.vessel_type} onValueChange={(v) => set("vessel_type", v)}>
              <SelectTrigger id="vessel_type">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {VESSEL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="professional_experience">Experiência profissional *</Label>
          <Textarea
            id="professional_experience"
            value={form.professional_experience}
            onChange={(e) => set("professional_experience", e.target.value)}
            placeholder="Descreva sua experiência a bordo: embarcações, funções, tempo de embarque, principais atividades..."
            rows={5}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="salary_expectation">Pretensão salarial mensal (R$)</Label>
            <Input
              id="salary_expectation"
              value={form.salary_expectation}
              onChange={(e) => set("salary_expectation", e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="Ex.: 5000"
              inputMode="numeric"
            />
            {form.salary_expectation ? (
              <p className="text-xs text-muted-foreground">
                = {Number(form.salary_expectation).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Digite o valor em reais (opcional).</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="available_from">Disponível a partir de</Label>
            <Input
              id="available_from"
              value={form.available_from}
              onChange={(e) => set("available_from", maskDateBR(e.target.value))}
              placeholder="DD/MM/AAAA (opcional)"
              inputMode="numeric"
              maxLength={10}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Idiomas</Label>
          <p className="text-xs text-muted-foreground -mt-1">Recomendado — o inglês é muito valorizado no setor offshore.</p>
          <LanguageSelector languages={languages} onLanguagesChange={setLanguages} />
        </div>
      </div>
    </StepShell>
  );
}
