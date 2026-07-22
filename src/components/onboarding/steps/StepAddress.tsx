import { useState } from "react";
import { StepShell } from "@/components/onboarding/StepShell";
import type { StepComponentProps } from "@/components/onboarding/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CityCombobox } from "@/components/onboarding/CityCombobox";
import { useToast } from "@/hooks/use-toast";
import { fetchCepData, formatCep, isValidCep } from "@/lib/viaCep";
import { UFS } from "@/lib/ibge";
import { ADDRESS_REQUIRED } from "@/lib/onboarding";
import { MapPin, Loader2 } from "lucide-react";

export function StepAddress({ progress, onNext, onBack, onSaveAndExit }: StepComponentProps) {
  const { profile, saving } = progress;
  const { toast } = useToast();
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);

  const [form, setForm] = useState({
    cep: profile?.cep ?? "",
    street: profile?.street ?? "",
    address_number: profile?.address_number ?? "",
    address_complement: profile?.address_complement ?? "",
    neighborhood: profile?.neighborhood ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value);
    setCepError(false);
    set("cep", formatted);
    if (isValidCep(formatted)) {
      setCepLoading(true);
      const data = await fetchCepData(formatted);
      setCepLoading(false);
      if (data) {
        setForm((p) => ({
          ...p,
          street: data.logradouro || p.street,
          neighborhood: data.bairro || p.neighborhood,
          city: data.localidade || p.city,
          state: data.uf || p.state,
        }));
      } else {
        setCepError(true);
        toast({ variant: "destructive", title: "CEP não encontrado", description: "Preencha o endereço manualmente." });
      }
    }
  };

  const validate = (): string | null => {
    for (const f of ADDRESS_REQUIRED) {
      if (!String((form as any)[f.key] ?? "").trim()) return `Preencha: ${f.label}`;
    }
    if (!isValidCep(form.cep)) return "CEP inválido — informe os 8 dígitos.";
    return null;
  };

  const buildPatch = () => ({
    cep: form.cep || null,
    street: form.street || null,
    address_number: form.address_number || null,
    address_complement: form.address_complement || null,
    neighborhood: form.neighborhood || null,
    city: form.city || null,
    state: form.state || null,
    residence_location: form.city && form.state ? `${form.city} - ${form.state}` : null,
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
      title="Endereço"
      description="Comece pelo CEP — preenchemos o resto para você."
      icon={<MapPin className="h-6 w-6" />}
      onNext={handleNext}
      onBack={onBack}
      onSaveAndExit={handleSaveAndExit}
      saving={saving}
    >
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cep">CEP *</Label>
          <div className="relative">
            <Input
              id="cep"
              value={form.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
              aria-invalid={cepError}
              className={cepError ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {cepError && <p className="text-xs text-destructive">CEP não encontrado</p>}
        </div>

        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="street">Logradouro *</Label>
          <Input id="street" value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Rua, avenida..." />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address_number">Número *</Label>
          <Input id="address_number" value={form.address_number} onChange={(e) => set("address_number", e.target.value)} placeholder="123" />
        </div>

        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="address_complement">Complemento</Label>
          <Input id="address_complement" value={form.address_complement} onChange={(e) => set("address_complement", e.target.value)} placeholder="Apto, bloco... (opcional)" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="neighborhood">Bairro *</Label>
          <Input id="neighborhood" value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Bairro" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="state">Estado (UF) *</Label>
          <Select
            value={form.state}
            onValueChange={(uf) => setForm((p) => ({ ...p, state: uf, city: "" }))}
          >
            <SelectTrigger id="state">
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {UFS.map((uf) => (
                <SelectItem key={uf.sigla} value={uf.sigla}>
                  {uf.nome} ({uf.sigla})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="city">Cidade *</Label>
          <CityCombobox id="city" uf={form.state} value={form.city} onChange={(city) => set("city", city)} />
        </div>
      </div>
    </StepShell>
  );
}
