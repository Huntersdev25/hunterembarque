/**
 * Seleção de MÚLTIPLAS funções do profissional (catálogo job_functions).
 * Usado pelo admin para marcar todas as funções que o profissional exerce.
 */
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

interface JobFunction { id: string; name: string; description: string | null }

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  helpText?: string;
}

export function MultiFunctionSelector({
  value,
  onChange,
  label = "Funções do profissional",
  helpText = "Marque todas as funções que o profissional exerce.",
}: Props) {
  const [functions, setFunctions] = useState<JobFunction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("job_functions")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name");
      if (!mounted) return;
      if (error) console.error("Erro ao carregar funções:", error);
      setFunctions(data ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando funções…
        </div>
      ) : functions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Nenhuma função cadastrada. Rode a migração do catálogo de funções.
        </p>
      ) : (
        <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto rounded-lg border bg-background p-2.5">
          {functions.map((f) => {
            const active = value.includes(f.name);
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => toggle(f.name)}
                title={f.description || undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-maritime-blue bg-maritime-blue text-white"
                    : "border-input bg-background text-foreground hover:bg-muted",
                )}
              >
                {active && <Check className="h-3 w-3" />}
                {f.name}
              </button>
            );
          })}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} função(ões) selecionada(s)
        </p>
      )}
    </div>
  );
}
