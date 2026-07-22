/**
 * Componente para seleção de função profissional
 * Substitui o campo de texto livre por um select com opções pré-cadastradas
 */
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface JobFunction {
  id: string;
  name: string;
  description: string;
}

interface JobFunctionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function JobFunctionSelector({ 
  value, 
  onChange, 
  label = "Função", 
  placeholder = "Selecione uma função",
  required = false 
}: JobFunctionSelectorProps) {
  const [functions, setFunctions] = useState<JobFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  /**
   * Busca todas as funções ativas disponíveis
   */
  const fetchJobFunctions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_functions')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setFunctions(data || []);
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de funções disponíveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobFunctions();
  }, []);

  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      <Label htmlFor="job-function">
        {label} {required && "*"}
      </Label>

      {isMobile ? (
        // Native select no mobile para evitar issues com portal/overlay
        <select
          id="job-function"
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        >
          <option value="" disabled>
            {loading ? "Carregando..." : placeholder}
          </option>
          {functions.map((func) => (
            <option key={func.id} value={func.name}>
              {func.name}
            </option>
          ))}
        </select>
      ) : (
        <Select 
          value={value} 
          onValueChange={onChange}
          disabled={loading}
        >
          <SelectTrigger id="job-function">
            <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {functions.map((func) => (
              <SelectItem key={func.id} value={func.name}>
                <div className="flex flex-col">
                  <span className="font-medium">{func.name}</span>
                  {func.description && (
                    <span className="text-xs text-muted-foreground">{func.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}