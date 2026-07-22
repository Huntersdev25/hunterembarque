import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { fetchMunicipios } from "@/lib/ibge";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

interface CityComboboxProps {
  /** UF selecionada (sigla). Sem UF, o seletor fica desabilitado. */
  uf: string;
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  id?: string;
}

/** Remove acentos e caixa para comparação/busca robusta. */
const norm = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Seletor de cidade com busca (acento-insensível), populado pela API do IBGE. */
export function CityCombobox({ uf, value, onChange, placeholder = "Selecione a cidade", id }: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    if (!uf) {
      setCities([]);
      return;
    }
    setLoading(true);
    fetchMunicipios(uf).then((list) => {
      if (active) {
        setCities(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [uf]);

  // Garante que a cidade atual (ex.: preenchida pelo CEP) esteja na lista.
  const allOptions = useMemo(() => {
    if (value && !cities.includes(value)) return [value, ...cities];
    return cities;
  }, [cities, value]);

  // Filtragem manual acento-insensível + limite para performance em estados grandes.
  const filtered = useMemo(() => {
    const q = norm(query);
    const base = q ? allOptions.filter((c) => norm(c).includes(q)) : allOptions;
    return base.slice(0, 100);
  }, [allOptions, query]);

  // Escape hatch: permite usar a cidade digitada quando não há correspondência
  // exata (ex.: localidade pequena, ou APIs indisponíveis).
  const trimmed = query.trim();
  const showUseTyped = trimmed.length >= 2 && !allOptions.some((c) => norm(c) === norm(trimmed));

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!uf}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          <span className="truncate">{value || (uf ? placeholder : "Selecione a UF primeiro")}</span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* shouldFilter={false}: a filtragem é feita por nós (acento-insensível). */}
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar cidade..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              {loading ? "Carregando cidades..." : "Digite o nome da cidade acima."}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === city ? "opacity-100" : "opacity-0")} />
                  {city}
                </CommandItem>
              ))}
              {showUseTyped && (
                <CommandItem
                  value={`__use__${trimmed}`}
                  onSelect={() => {
                    onChange(trimmed);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Usar “{trimmed}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
