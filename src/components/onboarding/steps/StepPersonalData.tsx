import { useState } from "react";
import { StepShell } from "@/components/onboarding/StepShell";
import type { StepComponentProps } from "@/components/onboarding/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR } from "@/lib/phoneFormat";
import { maskDateBR, brToISO, isoToBR, PERSONAL_REQUIRED } from "@/lib/onboarding";
import { formatCPF, isValidCPF, formatRG, isValidRG } from "@/lib/validators";
import { User } from "lucide-react";

export function StepPersonalData({ progress, userId, onNext, onBack, onSaveAndExit }: StepComponentProps) {
  const { profile, saving } = progress;
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    cpf: profile?.cpf ?? "",
    rg: profile?.rg ?? "",
    birth_date: isoToBR(profile?.birth_date),
    gender: profile?.gender ?? "",
    phone: profile?.phone ?? "",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  // Feedback em tempo real: só acusa erro quando há dígitos suficientes digitados.
  const cpfInvalid = form.cpf.replace(/\D/g, "").length === 11 && !isValidCPF(form.cpf);
  const rgInvalid = form.rg.trim().length >= 7 && !isValidRG(form.rg);

  const validate = (): string | null => {
    for (const f of PERSONAL_REQUIRED) {
      if (!String((form as any)[f.key] ?? "").trim()) return `Preencha: ${f.label}`;
    }
    if (!isValidCPF(form.cpf)) return "CPF inválido — verifique os dígitos.";
    if (form.rg.trim() && !isValidRG(form.rg)) return "RG inválido — verifique o número.";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.birth_date)) return "Data de nascimento inválida (DD/MM/AAAA).";
    return null;
  };

  const buildPatch = () => {
    const patch: Record<string, any> = {
      cpf: form.cpf || null,
      rg: form.rg || null,
      birth_date: /^\d{2}\/\d{2}\/\d{4}$/.test(form.birth_date) ? brToISO(form.birth_date) : null,
      gender: form.gender || null,
    };
    // Colunas NOT NULL: só sobrescreve quando há valor.
    if (form.full_name.trim()) patch.full_name = form.full_name.trim();
    if (form.phone.trim()) patch.phone = form.phone.trim();
    return patch;
  };

  /**
   * Verifica se CPF/RG já pertencem a outro perfil (RPC com SECURITY DEFINER).
   * Fail-open: se a RPC ainda não existir (migração não aplicada) ou falhar,
   * não bloqueia — o índice único do banco é a garantia final.
   */
  const documentsAvailable = async (): Promise<boolean> => {
    try {
      const { data, error } = await (supabase.rpc as any)("check_documents_unique", {
        p_cpf: form.cpf,
        p_rg: form.rg || null,
        p_user_id: userId,
      });
      if (error) {
        console.warn("check_documents_unique indisponível:", error.message);
        return true;
      }
      if (data?.cpf_taken) {
        toast({ variant: "destructive", title: "CPF já cadastrado", description: "Já existe um perfil com este CPF." });
        return false;
      }
      if (data?.rg_taken) {
        toast({ variant: "destructive", title: "RG já cadastrado", description: "Já existe um perfil com este RG." });
        return false;
      }
      return true;
    } catch (e) {
      console.warn("Erro ao checar unicidade de documentos:", e);
      return true;
    }
  };

  const handleNext = async () => {
    const err = validate();
    if (err) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: err });
      return;
    }
    setChecking(true);
    const available = await documentsAvailable();
    setChecking(false);
    if (!available) return;

    const ok = await progress.saveProfilePatch(buildPatch());
    if (ok) onNext();
    else toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar. O CPF ou RG pode já estar em uso." });
  };

  const handleSaveAndExit = async () => {
    await progress.saveProfilePatch(buildPatch());
    onSaveAndExit();
  };

  return (
    <StepShell
      title="Dados pessoais"
      description="Informações básicas para o seu perfil profissional."
      icon={<User className="h-6 w-6" />}
      onNext={handleNext}
      onBack={onBack}
      onSaveAndExit={handleSaveAndExit}
      saving={saving || checking}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Nome completo *</Label>
          <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Seu nome completo" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF *</Label>
          <Input
            id="cpf"
            value={form.cpf}
            onChange={(e) => set("cpf", formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            aria-invalid={cpfInvalid}
            className={cpfInvalid ? "border-destructive focus-visible:ring-destructive" : undefined}
          />
          {cpfInvalid && <p className="text-xs text-destructive">CPF inválido — verifique os dígitos.</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rg">RG</Label>
          <Input
            id="rg"
            value={form.rg}
            onChange={(e) => set("rg", formatRG(e.target.value))}
            placeholder="Opcional"
            inputMode="text"
            aria-invalid={rgInvalid}
            className={rgInvalid ? "border-destructive focus-visible:ring-destructive" : undefined}
          />
          {rgInvalid && <p className="text-xs text-destructive">RG inválido — verifique o número.</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Data de nascimento *</Label>
          <Input id="birth_date" value={form.birth_date} onChange={(e) => set("birth_date", maskDateBR(e.target.value))} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Sexo *</Label>
          <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input id="phone" value={form.phone} onChange={(e) => set("phone", formatPhoneBR(e.target.value))} placeholder="+55 21 99712-0006" inputMode="tel" />
          <p className="text-xs text-muted-foreground">É por aqui que as empresas entram em contato com você.</p>
        </div>
      </div>
    </StepShell>
  );
}
