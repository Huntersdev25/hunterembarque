import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";

export interface ClientCandidateFilterValues {
  name: string;
  status: string;
  jobFunction: string;
  asoStatus: string;
}

interface ClientCandidatesFiltersProps {
  onFiltersChange: (filters: ClientCandidateFilterValues) => void;
  totalCount: number;
  filteredCount: number;
  availableFunctions: string[];
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Aguardando Avaliação' },
  { value: 'interview', label: 'Em Entrevista' },
  { value: 'aso', label: 'Realizando ASO' },
  { value: 'completed', label: 'Concluído' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Reprovado' },
];

const ASO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'marcado', label: 'Marcado' },
  { value: 'finalizado', label: 'Finalizado' },
];

const initialFilters: ClientCandidateFilterValues = {
  name: '',
  status: 'all',
  jobFunction: 'all',
  asoStatus: 'all',
};

export function ClientCandidatesFilters({ onFiltersChange, totalCount, filteredCount, availableFunctions }: ClientCandidatesFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<ClientCandidateFilterValues>(initialFilters);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFiltersChange]);

  const updateFilter = <K extends keyof ClientCandidateFilterValues>(key: K, value: ClientCandidateFilterValues[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters =
    filters.name !== '' ||
    filters.status !== 'all' ||
    filters.jobFunction !== 'all' ||
    filters.asoStatus !== 'all';

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Filtros</CardTitle>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredCount} de {totalCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); resetFilters(); }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Buscar por nome..."
                  value={filters.name}
                  onChange={(e) => updateFilter('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={filters.jobFunction} onValueChange={(v) => updateFilter('jobFunction', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Funções</SelectItem>
                    {availableFunctions.map(fn => (
                      <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status ASO</Label>
                <Select value={filters.asoStatus} onValueChange={(v) => updateFilter('asoStatus', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function applyClientCandidateFilters(candidate: any, filters: ClientCandidateFilterValues): boolean {
  // Name filter
  if (filters.name) {
    const name = (candidate.candidate?.full_name || '').toLowerCase();
    if (!name.includes(filters.name.toLowerCase())) return false;
  }

  // Status filter
  if (filters.status !== 'all') {
    const status = candidate.interview_status || 'pending';
    if (status !== filters.status) return false;
  }

  // Job function filter
  if (filters.jobFunction !== 'all') {
    const fn = candidate.candidate?.desired_function || '';
    if (fn !== filters.jobFunction) return false;
  }

  // ASO status filter
  if (filters.asoStatus !== 'all') {
    const aso = candidate.aso_status || 'pendente';
    if (aso !== filters.asoStatus) return false;
  }

  return true;
}
