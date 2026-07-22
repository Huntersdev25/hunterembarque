import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, ChevronUp, X, Calendar, MapPin, Award } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface JobCandidatesFiltersProps {
  onFiltersChange: (filters: CandidateFilters) => void;
  totalCandidates: number;
  filteredCount: number;
}

export interface CandidateFilters {
  name: string;
  status: string;
  state: string;
  city: string;
  ddd: string;
  certifications: string[];
  availableFrom: string;
  availableTo: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'lista_espera', label: 'Em Análise' },
  { value: 'contato_realizado', label: 'Contato Realizado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Reprovado' },
  { value: 'finalizado', label: 'Finalizado' },
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const DDD_BY_STATE: Record<string, string[]> = {
  'RJ': ['21', '22', '24'],
  'SP': ['11', '12', '13', '14', '15', '16', '17', '18', '19'],
  'MG': ['31', '32', '33', '34', '35', '37', '38'],
  'ES': ['27', '28'],
  'BA': ['71', '73', '74', '75', '77'],
  'PE': ['81', '87'],
  'CE': ['85', '88'],
  'PA': ['91', '93', '94'],
  'AM': ['92', '97'],
  'PR': ['41', '42', '43', '44', '45', '46'],
  'SC': ['47', '48', '49'],
  'RS': ['51', '53', '54', '55'],
  'GO': ['62', '64'],
  'DF': ['61'],
  'MT': ['65', '66'],
  'MS': ['67'],
  'MA': ['98', '99'],
  'PI': ['86', '89'],
  'RN': ['84'],
  'PB': ['83'],
  'AL': ['82'],
  'SE': ['79'],
  'TO': ['63'],
  'RO': ['69'],
  'AC': ['68'],
  'AP': ['96'],
  'RR': ['95'],
};

const ALL_DDDS = Object.entries(DDD_BY_STATE)
  .flatMap(([state, ddds]) => ddds.map(ddd => ({ ddd, state })))
  .sort((a, b) => a.ddd.localeCompare(b.ddd));

const CERTIFICATIONS_LIST = [
  { id: 'cir', name: 'CIR' },
  { id: 'stcw', name: 'STCW' },
  { id: 'caaq', name: 'CAAQ' },
  { id: 'tbs1', name: 'TBS1' },
  { id: 'cbsp', name: 'CBSP' },
  { id: 'thuet', name: 'THUET' },
  { id: 'espe', name: 'ESPE' },
  { id: 'esrs', name: 'ESRS' },
  { id: 'ebps', name: 'EBPS' },
  { id: 'ecin', name: 'ECIN' },
  { id: 'ecia_caci', name: 'ECIA/CACI' },
  { id: 'eopn', name: 'EOPN' },
  { id: 'ebcp', name: 'EBCP' },
  { id: 'epsm', name: 'EPSM' },
  { id: 'cess', name: 'CESS' },
  { id: 'cerr', name: 'CERR' },
  { id: 'efnt', name: 'EFNT' },
  { id: 'ebpq', name: 'EBPQ' },
  { id: 'ebgl', name: 'EBGL' },
  { id: 'esop', name: 'ESOP' },
  { id: 'dp', name: 'DP' },
  { id: 'gmdss', name: 'GMDSS' },
  { id: 'alph', name: 'ALPH' },
];

const initialFilters: CandidateFilters = {
  name: '',
  status: 'all',
  state: 'all',
  city: '',
  ddd: 'all',
  certifications: [],
  availableFrom: '',
  availableTo: '',
};

export function JobCandidatesFilters({ onFiltersChange, totalCandidates, filteredCount }: JobCandidatesFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<CandidateFilters>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<CandidateFilters>(initialFilters);

  // Debounce text inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  const updateFilter = <K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleCertification = (certId: string) => {
    setFilters(prev => ({
      ...prev,
      certifications: prev.certifications.includes(certId)
        ? prev.certifications.filter(c => c !== certId)
        : [...prev.certifications, certId]
    }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = 
    filters.name !== '' ||
    filters.status !== 'all' ||
    filters.state !== 'all' ||
    filters.city !== '' ||
    filters.ddd !== 'all' ||
    filters.certifications.length > 0 ||
    filters.availableFrom !== '' ||
    filters.availableTo !== '';

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Filtros Avançados</CardTitle>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-xs">
                    {totalCandidates - filteredCount > 0 
                      ? `${filteredCount} de ${totalCandidates}` 
                      : 'Ativo'}
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
          <CardContent className="pt-0 space-y-6">
            {/* Row 1: Status + Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="space-y-2 md:col-span-2">
                <Label>Nome</Label>
                <Input 
                  placeholder="Buscar por nome..."
                  value={filters.name}
                  onChange={(e) => updateFilter('name', e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Localização
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={filters.state} onValueChange={(v) => updateFilter('state', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Estados</SelectItem>
                      {BRAZILIAN_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>DDD</Label>
                  <Select value={filters.ddd} onValueChange={(v) => updateFilter('ddd', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por DDD" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">Todos os DDDs</SelectItem>
                      {ALL_DDDS.map(({ ddd, state }) => (
                        <SelectItem key={ddd} value={ddd}>
                          {ddd} - {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input 
                    placeholder="Ex: Rio de Janeiro"
                    value={filters.city}
                    onChange={(e) => updateFilter('city', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Availability */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Disponibilidade
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Disponível a partir de</Label>
                  <Input 
                    type="date"
                    value={filters.availableFrom}
                    onChange={(e) => updateFilter('availableFrom', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Disponível até</Label>
                  <Input 
                    type="date"
                    value={filters.availableTo}
                    onChange={(e) => updateFilter('availableTo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Certifications */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Award className="h-4 w-4" />
                Certificações
                {filters.certifications.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {filters.certifications.length} selecionadas
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {CERTIFICATIONS_LIST.map(cert => (
                  <div key={cert.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cert-${cert.id}`}
                      checked={filters.certifications.includes(cert.id)}
                      onCheckedChange={() => toggleCertification(cert.id)}
                    />
                    <Label 
                      htmlFor={`cert-${cert.id}`} 
                      className="text-xs font-normal cursor-pointer"
                    >
                      {cert.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Helper function to apply filters to candidates
export function applyFiltersToCandidate(
  candidate: any, 
  filters: CandidateFilters,
  candidateCertifications?: any
): boolean {
  // Status filter
  if (filters.status !== 'all' && candidate.status !== filters.status) {
    return false;
  }

  // Name filter
  if (filters.name) {
    const name = (candidate.profiles?.full_name || candidate.full_name || '').toLowerCase();
    if (!name.includes(filters.name.toLowerCase())) {
      return false;
    }
  }

  // State filter (includes DDD-based matching)
  if (filters.state !== 'all') {
    const candidateState = (candidate.profiles?.state || candidate.state || '').toUpperCase();
    const residence = (candidate.profiles?.residence_location || candidate.residence_location || '').toUpperCase();
    const phone = candidate.profiles?.phone || candidate.phone || '';
    const candidateDDD = extractDDD(phone);
    const stateDDDs = DDD_BY_STATE[filters.state] || [];
    
    const matchesState = candidateState === filters.state || 
                         residence.includes(filters.state) || 
                         stateDDDs.includes(candidateDDD);
    if (!matchesState) return false;
  }

  // DDD filter
  if (filters.ddd !== 'all') {
    const phone = candidate.profiles?.phone || candidate.phone || '';
    const candidateDDD = extractDDD(phone);
    if (candidateDDD !== filters.ddd) return false;
  }

  // City filter
  if (filters.city) {
    const city = (candidate.profiles?.city || candidate.city || '').toLowerCase();
    const residence = (candidate.profiles?.residence_location || candidate.residence_location || '').toLowerCase();
    if (!city.includes(filters.city.toLowerCase()) && !residence.includes(filters.city.toLowerCase())) {
      return false;
    }
  }

  // Availability filter
  if (filters.availableFrom) {
    const availableFrom = candidate.profiles?.available_from || candidate.available_from;
    if (availableFrom && new Date(availableFrom) > new Date(filters.availableFrom)) {
      return false;
    }
  }

  if (filters.availableTo) {
    const availableUntil = candidate.profiles?.available_until || candidate.available_until;
    if (availableUntil && new Date(availableUntil) < new Date(filters.availableTo)) {
      return false;
    }
  }

  // Certifications filter
  if (filters.certifications.length > 0 && candidateCertifications) {
    const hasAllCerts = filters.certifications.every(certId => {
      return candidateCertifications[certId] === true;
    });
    if (!hasAllCerts) return false;
  }

  return true;
}

// Extract DDD from phone number
function extractDDD(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length >= 4) {
    return cleaned.substring(2, 4);
  }
  if (cleaned.length >= 10) {
    return cleaned.substring(0, 2);
  }
  return '';
}
