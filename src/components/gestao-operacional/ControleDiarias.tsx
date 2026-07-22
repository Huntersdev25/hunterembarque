import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays, eachDayOfInterval, isWithinInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, Trash2, Edit, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos de status diário
type StatusDiario = "EM" | "R" | "DS" | "RNG" | "DOBRA";

interface DiaStatus {
  data: Date;
  status: StatusDiario;
}

interface Profissional {
  id: string;
  cargo: string;
  nome: string;
  dailyRate: number;
  periodoInicio: Date;
  periodoFim: Date;
  diasStatus: DiaStatus[];
}

interface Props {
  onSummaryChange: (data: { totalDiasEmbarcados: number; valorTotalPagar: number; valorAdicionalDobra: number }) => void;
}

// Cargos e daily rates padrão
const CARGOS_DAILY_RATES: Record<string, number> = {
  "Comandante": 1200,
  "Imediato": 950,
  "Chefe de Máquinas": 1100,
  "Oficial de Náutica": 800,
  "Oficial de Máquinas": 800,
  "Contramestre": 650,
  "Marinheiro de Convés": 450,
  "Marinheiro de Máquinas": 450,
  "Cozinheiro": 400,
  "Taifeiro": 350,
  "Eletricista": 700,
  "Operador de ROV": 900,
  "Mergulhador": 1000,
  "Guincheiro": 550,
  "Plataformista": 600,
};

const STATUS_CONFIG: Record<StatusDiario, { label: string; color: string; multiplier: number }> = {
  "EM": { label: "Embarcado", color: "bg-success text-success-foreground", multiplier: 1 },
  "R": { label: "Repouso", color: "bg-muted text-muted-foreground", multiplier: 0 },
  "DS": { label: "Descanso Solo", color: "bg-secondary text-secondary-foreground", multiplier: 0 },
  "RNG": { label: "Repouso Não Gozo", color: "bg-warning text-warning-foreground", multiplier: 1.5 },
  "DOBRA": { label: "Dobra", color: "bg-primary text-primary-foreground", multiplier: 2 },
};

export function ControleDiarias({ onSummaryChange }: Props) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  
  // Form state
  const [formCargo, setFormCargo] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formDailyRate, setFormDailyRate] = useState(0);
  const [formPeriodoInicio, setFormPeriodoInicio] = useState<Date | undefined>();
  const [formPeriodoFim, setFormPeriodoFim] = useState<Date | undefined>();

  // Calculate totals
  const totals = useMemo(() => {
    let totalDiasEmbarcados = 0;
    let valorTotalPagar = 0;
    let valorAdicionalDobra = 0;

    profissionais.forEach(prof => {
      const diasValidos = prof.diasStatus.filter(d => d.status !== "R" && d.status !== "DS");
      totalDiasEmbarcados += diasValidos.length;

      prof.diasStatus.forEach((dia, index) => {
        const config = STATUS_CONFIG[dia.status];
        const valorDia = prof.dailyRate * config.multiplier;
        
        // Regra: a partir do 15º dia embarcado consecutivo, diária em dobro
        if (dia.status === "EM" && index >= 14) {
          valorTotalPagar += prof.dailyRate * 2;
          valorAdicionalDobra += prof.dailyRate;
        } else {
          valorTotalPagar += valorDia;
          if (config.multiplier > 1) {
            valorAdicionalDobra += valorDia - prof.dailyRate;
          }
        }
      });
    });

    return { totalDiasEmbarcados, valorTotalPagar, valorAdicionalDobra };
  }, [profissionais]);

  useEffect(() => {
    onSummaryChange(totals);
  }, [totals, onSummaryChange]);

  const handleCargoChange = (cargo: string) => {
    setFormCargo(cargo);
    setFormDailyRate(CARGOS_DAILY_RATES[cargo] || 0);
  };

  const handleAddProfissional = () => {
    if (!formCargo || !formNome || !formPeriodoInicio || !formPeriodoFim) {
      toast.error("Preencha todos os campos");
      return;
    }

    const dias = eachDayOfInterval({ start: formPeriodoInicio, end: formPeriodoFim });
    const diasStatus: DiaStatus[] = dias.map(data => ({
      data,
      status: "EM" as StatusDiario
    }));

    const novoProfissional: Profissional = {
      id: editingId || crypto.randomUUID(),
      cargo: formCargo,
      nome: formNome,
      dailyRate: formDailyRate,
      periodoInicio: formPeriodoInicio,
      periodoFim: formPeriodoFim,
      diasStatus
    };

    if (editingId) {
      setProfissionais(prev => prev.map(p => p.id === editingId ? novoProfissional : p));
      setEditingId(null);
    } else {
      setProfissionais(prev => [...prev, novoProfissional]);
    }

    resetForm();
    setDialogOpen(false);
    toast.success(editingId ? "Profissional atualizado" : "Profissional adicionado");
  };

  const resetForm = () => {
    setFormCargo("");
    setFormNome("");
    setFormDailyRate(0);
    setFormPeriodoInicio(undefined);
    setFormPeriodoFim(undefined);
    setEditingId(null);
  };

  const handleEdit = (prof: Profissional) => {
    setFormCargo(prof.cargo);
    setFormNome(prof.nome);
    setFormDailyRate(prof.dailyRate);
    setFormPeriodoInicio(prof.periodoInicio);
    setFormPeriodoFim(prof.periodoFim);
    setEditingId(prof.id);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setProfissionais(prev => prev.filter(p => p.id !== id));
    toast.success("Profissional removido");
  };

  const handleStatusChange = (profId: string, diaIndex: number, newStatus: StatusDiario) => {
    setProfissionais(prev => prev.map(prof => {
      if (prof.id === profId) {
        const newDiasStatus = [...prof.diasStatus];
        newDiasStatus[diaIndex] = { ...newDiasStatus[diaIndex], status: newStatus };
        return { ...prof, diasStatus: newDiasStatus };
      }
      return prof;
    }));
  };

  const calcularResumo = (prof: Profissional) => {
    let diariasNormais = 0;
    let diariasDobro = 0;
    let diariasRNG = 0;
    let valorTotal = 0;

    prof.diasStatus.forEach((dia, index) => {
      if (dia.status === "EM") {
        if (index >= 14) {
          diariasDobro++;
          valorTotal += prof.dailyRate * 2;
        } else {
          diariasNormais++;
          valorTotal += prof.dailyRate;
        }
      } else if (dia.status === "RNG") {
        diariasRNG++;
        valorTotal += prof.dailyRate * 1.5;
      } else if (dia.status === "DOBRA") {
        diariasDobro++;
        valorTotal += prof.dailyRate * 2;
      }
    });

    return { diariasNormais, diariasDobro, diariasRNG, valorTotal };
  };

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Controle de Embarque e Diárias</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie diárias embarcadas com cálculo automático de dobras e RNG
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Profissional
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Adicionar"} Profissional</DialogTitle>
              <DialogDescription>
                Preencha os dados do profissional para controle de diárias
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Profissional</Label>
                <Input 
                  value={formNome} 
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={formCargo} onValueChange={handleCargoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CARGOS_DAILY_RATES).map(cargo => (
                      <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Daily Rate (R$)</Label>
                <Input 
                  type="number" 
                  value={formDailyRate} 
                  onChange={(e) => setFormDailyRate(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Valor preenchido automaticamente com base no cargo</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formPeriodoInicio && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formPeriodoInicio ? format(formPeriodoInicio, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={formPeriodoInicio} onSelect={setFormPeriodoInicio} locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formPeriodoFim && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formPeriodoFim ? format(formPeriodoFim, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={formPeriodoFim} onSelect={setFormPeriodoFim} locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleAddProfissional}>{editingId ? "Atualizar" : "Adicionar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Regras de Cálculo Automático:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>Até 14 dias: diária normal</li>
                <li>A partir do 15º dia consecutivo: diária em dobro (2x)</li>
                <li>RNG (Repouso Não Gozo): multiplicador 1.5x</li>
                <li>Dobra manual: multiplicador 2x</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profissionais Table */}
      {profissionais.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum profissional cadastrado. Clique em "Adicionar Profissional" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {profissionais.map(prof => {
            const resumo = calcularResumo(prof);
            return (
              <Card key={prof.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{prof.nome}</CardTitle>
                      <CardDescription>{prof.cargo} • R$ {prof.dailyRate.toFixed(2)}/dia</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(prof)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(prof.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Diárias Normais</p>
                      <p className="text-lg font-semibold">{resumo.diariasNormais}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Diárias em Dobro</p>
                      <p className="text-lg font-semibold">{resumo.diariasDobro}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-warning/10">
                      <p className="text-xs text-muted-foreground">Diárias RNG</p>
                      <p className="text-lg font-semibold">{resumo.diariasRNG}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-success/10">
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="text-lg font-semibold text-success">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.valorTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="overflow-x-auto">
                    <div className="flex gap-1 flex-wrap">
                      {prof.diasStatus.map((dia, index) => (
                        <Popover key={index}>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "w-10 h-10 rounded text-xs font-medium flex flex-col items-center justify-center transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary",
                                STATUS_CONFIG[dia.status].color
                              )}
                            >
                              <span className="text-[10px]">{format(dia.data, "dd")}</span>
                              <span className="text-[10px]">{dia.status}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{format(dia.data, "dd/MM/yyyy", { locale: ptBR })}</p>
                              <div className="flex gap-1 flex-wrap">
                                {(Object.keys(STATUS_CONFIG) as StatusDiario[]).map(status => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={dia.status === status ? "default" : "outline"}
                                    className="text-xs"
                                    onClick={() => handleStatusChange(prof.id, index, status)}
                                  >
                                    {STATUS_CONFIG[status].label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t">
                    {(Object.keys(STATUS_CONFIG) as StatusDiario[]).map(status => (
                      <div key={status} className="flex items-center gap-1.5">
                        <div className={cn("w-3 h-3 rounded", STATUS_CONFIG[status].color)} />
                        <span className="text-xs text-muted-foreground">{STATUS_CONFIG[status].label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
