import { useState, useEffect } from "react";
import { formatDateBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import huntersLogoWatermark from '@/assets/hunters-logo-watermark.png';

interface JobCandidatesReportExportProps {
  jobId: string;
  jobTitle: string;
}

interface CandidateData {
  id: string;
  candidate_id: string;
  status: string;
  applied_at: string;
  profiles: {
    full_name: string;
    cpf: string;
    phone: string;
    email: string;
    city?: string;
    state?: string;
    residence_location?: string;
    desired_function?: string;
  } | null;
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

// DDDs por estado brasileiro
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

export function JobCandidatesReportExport({ jobId, jobTitle }: JobCandidatesReportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [dddFilter, setDddFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  
  // Colunas a exibir
  const [showColumns, setShowColumns] = useState({
    name: true,
    cpf: true,
    phone: true,
    email: true,
    location: true,
    status: true,
    appliedAt: true,
  });

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    }
  }, [isOpen, jobId]);

  useEffect(() => {
    applyFilters();
  }, [candidates, statusFilter, stateFilter, dddFilter, cityFilter, nameFilter]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          candidate_id,
          status,
          applied_at
        `)
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Buscar profiles separadamente
      const candidatesWithProfiles = await Promise.all(
        (data || []).map(async (application) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, cpf, phone, email, city, state, residence_location, desired_function')
            .eq('user_id', application.candidate_id)
            .single();

          return {
            ...application,
            profiles: profile
          };
        })
      );

      setCandidates(candidatesWithProfiles);
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar candidatos para o relatório"
      });
    } finally {
      setLoading(false);
    }
  };

  // Extrai DDD do telefone
  const extractDDD = (phone?: string): string => {
    if (!phone) return '';
    // Remove tudo exceto números
    const cleaned = phone.replace(/\D/g, '');
    // Se começar com 55 (código do Brasil), pegar os próximos 2 dígitos
    if (cleaned.startsWith('55') && cleaned.length >= 4) {
      return cleaned.substring(2, 4);
    }
    // Se tiver 10-11 dígitos, os 2 primeiros são o DDD
    if (cleaned.length >= 10) {
      return cleaned.substring(0, 2);
    }
    return '';
  };

  const applyFilters = () => {
    let filtered = [...candidates];

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Filtro por estado (inclui busca por DDD do estado)
    if (stateFilter !== 'all') {
      const stateDDDs = DDD_BY_STATE[stateFilter] || [];
      filtered = filtered.filter(c => {
        const state = c.profiles?.state?.toUpperCase() || '';
        const residence = c.profiles?.residence_location?.toUpperCase() || '';
        const candidateDDD = extractDDD(c.profiles?.phone);
        
        // Match por estado no perfil OU por DDD do telefone
        return state === stateFilter || 
               residence.includes(stateFilter) || 
               stateDDDs.includes(candidateDDD);
      });
    }

    // Filtro por DDD específico (adicional)
    if (dddFilter !== 'all') {
      filtered = filtered.filter(c => {
        const candidateDDD = extractDDD(c.profiles?.phone);
        return candidateDDD === dddFilter;
      });
    }

    // Filtro por cidade
    if (cityFilter.trim()) {
      const citySearch = cityFilter.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const city = c.profiles?.city?.toLowerCase() || '';
        const residence = c.profiles?.residence_location?.toLowerCase() || '';
        return city.includes(citySearch) || residence.includes(citySearch);
      });
    }

    // Filtro por nome
    if (nameFilter.trim()) {
      const nameSearch = nameFilter.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.profiles?.full_name?.toLowerCase().includes(nameSearch)
      );
    }

    setFilteredCandidates(filtered);
  };

  const getStatusLabel = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.label || status;
  };

  const formatDate = (dateString: string) => {
    return formatDateBR(dateString);
  };

  const getLocation = (profile: CandidateData['profiles']) => {
    if (!profile) return '-';
    if (profile.city && profile.state) {
      return `${profile.city} - ${profile.state}`;
    }
    return profile.residence_location || '-';
  };

  const generatePDF = async () => {
    if (filteredCandidates.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum candidato",
        description: "Não há candidatos para gerar o relatório com os filtros aplicados."
      });
      return;
    }

    setGenerating(true);

    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape para caber mais colunas
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Cores
      const primaryBlue = { r: 0, g: 112, b: 192 };
      const darkBlue = { r: 0, g: 70, b: 127 };

      // ========== HEADER ==========
      pdf.setFillColor(primaryBlue.r, primaryBlue.g, primaryBlue.b);
      pdf.rect(0, 0, pageWidth, 35, 'F');

      // Logo Hunters (texto como fallback)
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HUNTERS MANPOWER', 15, 15);

      // Subtítulo
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Relatório de Candidatos', 15, 23);

      // Título da vaga
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Vaga: ${jobTitle}`, 15, 31);

      // Data de geração (direita)
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const dataGeracao = `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
      pdf.text(dataGeracao, pageWidth - 15, 15, { align: 'right' });

      // Filtros aplicados
      const filtrosAplicados: string[] = [];
      if (statusFilter !== 'all') filtrosAplicados.push(`Status: ${getStatusLabel(statusFilter)}`);
      if (stateFilter !== 'all') filtrosAplicados.push(`Estado: ${stateFilter}`);
      if (dddFilter !== 'all') {
        const dddState = ALL_DDDS.find(d => d.ddd === dddFilter)?.state || '';
        filtrosAplicados.push(`DDD: ${dddFilter} (${dddState})`);
      }
      if (cityFilter.trim()) filtrosAplicados.push(`Cidade: ${cityFilter}`);
      if (nameFilter.trim()) filtrosAplicados.push(`Nome: ${nameFilter}`);
      
      if (filtrosAplicados.length > 0) {
        pdf.text(`Filtros: ${filtrosAplicados.join(' | ')}`, pageWidth - 15, 23, { align: 'right' });
      }

      pdf.text(`Total de candidatos: ${filteredCandidates.length}`, pageWidth - 15, 31, { align: 'right' });

      // ========== TABELA ==========
      const headers: string[] = [];
      const columnKeys: string[] = [];

      if (showColumns.name) { headers.push('Nome Completo'); columnKeys.push('name'); }
      if (showColumns.cpf) { headers.push('CPF'); columnKeys.push('cpf'); }
      if (showColumns.phone) { headers.push('Telefone'); columnKeys.push('phone'); }
      if (showColumns.email) { headers.push('E-mail'); columnKeys.push('email'); }
      if (showColumns.location) { headers.push('Localização'); columnKeys.push('location'); }
      if (showColumns.status) { headers.push('Status'); columnKeys.push('status'); }
      if (showColumns.appliedAt) { headers.push('Data Candidatura'); columnKeys.push('appliedAt'); }

      const tableData = filteredCandidates.map(candidate => {
        const row: string[] = [];
        columnKeys.forEach(key => {
          switch (key) {
            case 'name':
              row.push(candidate.profiles?.full_name || '-');
              break;
            case 'cpf':
              row.push(candidate.profiles?.cpf || '-');
              break;
            case 'phone':
              row.push(candidate.profiles?.phone || '-');
              break;
            case 'email':
              row.push(candidate.profiles?.email || '-');
              break;
            case 'location':
              row.push(getLocation(candidate.profiles));
              break;
            case 'status':
              row.push(getStatusLabel(candidate.status));
              break;
            case 'appliedAt':
              row.push(formatDate(candidate.applied_at));
              break;
          }
        });
        return row;
      });

      // Função para adicionar marca d'água no centro
      const addWatermark = () => {
        const totalPages = (pdf as any).internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // Salvar estado atual
          pdf.saveGraphicsState();
          
          // Aplicar opacidade
          pdf.setGState(new (pdf as any).GState({ opacity: 0.08 }));
          
          // Calcular dimensões da marca d'água (centralizada)
          const wmWidth = 120;
          const wmHeight = 60;
          const wmX = (pageWidth - wmWidth) / 2;
          const wmY = (pageHeight - wmHeight) / 2;
          
          // Adicionar imagem
          pdf.addImage(huntersLogoWatermark, 'PNG', wmX, wmY, wmWidth, wmHeight);
          
          // Restaurar estado
          pdf.restoreGraphicsState();
        }
      };

      autoTable(pdf, {
        startY: 42,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [darkBlue.r, darkBlue.g, darkBlue.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [60, 60, 60],
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { left: 10, right: 10 },
        didDrawPage: function(data) {
          // Rodapé em cada página
          const pageCount = (pdf as any).internal.getNumberOfPages();
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
          
          // Logo no rodapé
          pdf.setTextColor(0, 112, 192);
          pdf.setFont('helvetica', 'bold');
          pdf.text('HUNTERS MANPOWER', 10, pageHeight - 8);
        }
      });

      // Adicionar marca d'água em todas as páginas após gerar a tabela
      addWatermark();

      // Salvar PDF
      const fileName = `relatorio-${jobTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Relatório gerado!",
        description: `${filteredCandidates.length} candidatos exportados com sucesso.`
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar o relatório PDF"
      });
    } finally {
      setGenerating(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setStateFilter('all');
    setDddFilter('all');
    setCityFilter('');
    setNameFilter('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Gerar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerar Relatório de Candidatos
          </DialogTitle>
          <DialogDescription>
            Aplique filtros para exportar um relatório PDF personalizado dos candidatos desta vaga.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Carregando candidatos...</span>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Filtros */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  <Label>Estado</Label>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
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
                  <Label>DDD (Telefone)</Label>
                  <Select value={dddFilter} onValueChange={setDddFilter}>
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
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input 
                    placeholder="Buscar por nome" 
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Limpar Filtros
              </Button>
            </div>

            {/* Colunas a exibir */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-muted-foreground">Colunas do Relatório</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(showColumns).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox 
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        setShowColumns(prev => ({ ...prev, [key]: !!checked }))
                      }
                    />
                    <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                      {key === 'name' && 'Nome'}
                      {key === 'cpf' && 'CPF'}
                      {key === 'phone' && 'Telefone'}
                      {key === 'email' && 'E-mail'}
                      {key === 'location' && 'Localização'}
                      {key === 'status' && 'Status'}
                      {key === 'appliedAt' && 'Data'}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">
                <strong>Preview:</strong> {filteredCandidates.length} candidato(s) serão incluídos no relatório
                {filteredCandidates.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {filteredCandidates.slice(0, 5).map(c => (
                      <li key={c.id} className="text-xs">
                        • {c.profiles?.full_name || 'Nome não informado'} - {getLocation(c.profiles)}
                      </li>
                    ))}
                    {filteredCandidates.length > 5 && (
                      <li className="text-xs text-primary">
                        ... e mais {filteredCandidates.length - 5} candidatos
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={generatePDF} 
            disabled={generating || loading || filteredCandidates.length === 0}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF ({filteredCandidates.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
