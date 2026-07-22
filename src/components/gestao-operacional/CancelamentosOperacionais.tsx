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
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Calendar as CalendarIcon, Trash2, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type CancelamentoCodigo = "CLIENT" | "SCHEDULE" | "REGIST" | "PLANNI" | "WEATHER" | "MEDICAL" | "UNPLAN" | "SEAT" | "VENDOR" | "OPERAT";
type JanelaCancelamento = "72h" | "48h" | "24h";

interface Cancelamento {
  id: string;
  codigo: CancelamentoCodigo;
  janela: JanelaCancelamento;
  dataEvento: Date;
  planejado: boolean;
  descricaoAdicional: string;
}

interface Props {
  onSummaryChange: (data: { totalCancelamentos: number; percentualMudancas: number }) => void;
}

const CODIGOS_CANCELAMENTO: Record<CancelamentoCodigo, { descricao: string; impacto: "baixo" | "medio" | "alto" }> = {
  "CLIENT": { descricao: "Cancelamento pelo Cliente", impacto: "alto" },
  "SCHEDULE": { descricao: "Mudança de Programação", impacto: "medio" },
  "REGIST": { descricao: "Problema de Registro", impacto: "baixo" },
  "PLANNI": { descricao: "Erro de Planejamento", impacto: "medio" },
  "WEATHER": { descricao: "Condições Climáticas", impacto: "baixo" },
  "MEDICAL": { descricao: "Motivo Médico", impacto: "baixo" },
  "UNPLAN": { descricao: "Evento Não Planejado", impacto: "alto" },
  "SEAT": { descricao: "Indisponibilidade de Assentos", impacto: "medio" },
  "VENDOR": { descricao: "Problema com Fornecedor", impacto: "alto" },
  "OPERAT": { descricao: "Questão Operacional", impacto: "medio" },
};

const IMPACTO_COLORS = {
  baixo: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  medio: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  alto: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

export function CancelamentosOperacionais({ onSummaryChange }: Props) {
  const [cancelamentos, setCancelamentos] = useState<Cancelamento[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mesReferencia, setMesReferencia] = useState<Date>(new Date());
  
  // Form state
  const [formCodigo, setFormCodigo] = useState<CancelamentoCodigo | "">("");
  const [formJanela, setFormJanela] = useState<JanelaCancelamento>("72h");
  const [formDataEvento, setFormDataEvento] = useState<Date | undefined>();
  const [formPlanejado, setFormPlanejado] = useState(true);
  const [formDescricao, setFormDescricao] = useState("");

  // Analytics
  const analytics = useMemo(() => {
    const mesInicio = startOfMonth(mesReferencia);
    const mesFim = endOfMonth(mesReferencia);
    
    const cancelamentosMes = cancelamentos.filter(c => 
      isWithinInterval(c.dataEvento, { start: mesInicio, end: mesFim })
    );

    const total = cancelamentosMes.length;
    const planejados = cancelamentosMes.filter(c => c.planejado).length;
    const executados = cancelamentosMes.filter(c => !c.planejado).length;
    const percentualMudancas = total > 0 ? ((executados / total) * 100) : 0;

    // Por código
    const porCodigo: Record<string, number> = {};
    cancelamentosMes.forEach(c => {
      porCodigo[c.codigo] = (porCodigo[c.codigo] || 0) + 1;
    });

    // Por janela
    const porJanela: Record<string, number> = { "72h": 0, "48h": 0, "24h": 0 };
    cancelamentosMes.forEach(c => {
      porJanela[c.janela]++;
    });

    // Por impacto
    const porImpacto = { baixo: 0, medio: 0, alto: 0 };
    cancelamentosMes.forEach(c => {
      porImpacto[CODIGOS_CANCELAMENTO[c.codigo].impacto]++;
    });

    // Chart data
    const codigoChartData = Object.entries(porCodigo)
      .map(([codigo, count]) => ({
        name: codigo,
        value: count,
        descricao: CODIGOS_CANCELAMENTO[codigo as CancelamentoCodigo]?.descricao || codigo
      }))
      .sort((a, b) => b.value - a.value);

    return {
      total,
      planejados,
      executados,
      percentualMudancas,
      porCodigo,
      porJanela,
      porImpacto,
      codigoChartData
    };
  }, [cancelamentos, mesReferencia]);

  useEffect(() => {
    onSummaryChange({
      totalCancelamentos: analytics.total,
      percentualMudancas: analytics.percentualMudancas
    });
  }, [analytics, onSummaryChange]);

  const handleAddCancelamento = () => {
    if (!formCodigo || !formDataEvento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const novoCancelamento: Cancelamento = {
      id: crypto.randomUUID(),
      codigo: formCodigo,
      janela: formJanela,
      dataEvento: formDataEvento,
      planejado: formPlanejado,
      descricaoAdicional: formDescricao
    };

    setCancelamentos(prev => [...prev, novoCancelamento]);
    resetForm();
    setDialogOpen(false);
    toast.success("Cancelamento registrado");
  };

  const resetForm = () => {
    setFormCodigo("");
    setFormJanela("72h");
    setFormDataEvento(undefined);
    setFormPlanejado(true);
    setFormDescricao("");
  };

  const handleDelete = (id: string) => {
    setCancelamentos(prev => prev.filter(c => c.id !== id));
    toast.success("Cancelamento removido");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Cancelamentos Operacionais</h3>
          <p className="text-sm text-muted-foreground">
            Registre e analise cancelamentos por código, janela e impacto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(mesReferencia, "MMMM yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={mesReferencia}
                onSelect={(date) => date && setMesReferencia(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar Cancelamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Cancelamento</DialogTitle>
                <DialogDescription>
                  Preencha os dados do cancelamento operacional
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Código do Cancelamento</Label>
                  <Select value={formCodigo} onValueChange={(v) => setFormCodigo(v as CancelamentoCodigo)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o código" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CODIGOS_CANCELAMENTO) as CancelamentoCodigo[]).map(codigo => (
                        <SelectItem key={codigo} value={codigo}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{codigo}</span>
                            <span className="text-muted-foreground">- {CODIGOS_CANCELAMENTO[codigo].descricao}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Janela de Cancelamento</Label>
                  <Select value={formJanela} onValueChange={(v) => setFormJanela(v as JanelaCancelamento)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="72h">72 horas</SelectItem>
                      <SelectItem value="48h">48 horas</SelectItem>
                      <SelectItem value="24h">24 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data do Evento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDataEvento && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formDataEvento ? format(formDataEvento, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={formDataEvento} onSelect={setFormDataEvento} locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formPlanejado ? "planejado" : "executado"} onValueChange={(v) => setFormPlanejado(v === "planejado")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejado">Planejado</SelectItem>
                      <SelectItem value="executado">Executado (mudança)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição Adicional (opcional)</Label>
                  <Input
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    placeholder="Observações..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleAddCancelamento}>Registrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Cancelamentos</p>
                <p className="text-2xl font-bold">{analytics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <BarChart3 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Planejados</p>
                <p className="text-2xl font-bold">{analytics.planejados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Executados (Mudanças)</p>
                <p className="text-2xl font-bold">{analytics.executados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(
          analytics.percentualMudancas > 30 ? "border-destructive/50" : 
          analytics.percentualMudancas > 15 ? "border-warning/50" : "border-success/50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                analytics.percentualMudancas > 30 ? "bg-destructive/10" : 
                analytics.percentualMudancas > 15 ? "bg-warning/10" : "bg-success/10"
              )}>
                <TrendingDown className={cn(
                  "h-5 w-5",
                  analytics.percentualMudancas > 30 ? "text-destructive" : 
                  analytics.percentualMudancas > 15 ? "text-warning" : "text-success"
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">% Mudanças</p>
                <p className="text-2xl font-bold">{analytics.percentualMudancas.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {analytics.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking por código */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking por Motivo</CardTitle>
              <CardDescription>Principais motivos de cancelamento</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.codigoChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip 
                    formatter={(value, name, props) => [value, props.payload.descricao]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Por Impacto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Impacto</CardTitle>
              <CardDescription>Cancelamentos por nível de impacto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Baixo", value: analytics.porImpacto.baixo, color: "#10b981" },
                        { name: "Médio", value: analytics.porImpacto.medio, color: "#f59e0b" },
                        { name: "Alto", value: analytics.porImpacto.alto, color: "#ef4444" }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: "Baixo", value: analytics.porImpacto.baixo, color: "#10b981" },
                        { name: "Médio", value: analytics.porImpacto.medio, color: "#f59e0b" },
                        { name: "Alto", value: analytics.porImpacto.alto, color: "#ef4444" }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de Cancelamentos</CardTitle>
          <CardDescription>Histórico detalhado de cancelamentos operacionais</CardDescription>
        </CardHeader>
        <CardContent>
          {cancelamentos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum cancelamento registrado. Clique em "Registrar Cancelamento" para começar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Janela</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelamentos
                    .sort((a, b) => b.dataEvento.getTime() - a.dataEvento.getTime())
                    .map(cancel => {
                      const config = CODIGOS_CANCELAMENTO[cancel.codigo];
                      const impactoStyle = IMPACTO_COLORS[config.impacto];
                      return (
                        <TableRow key={cancel.id}>
                          <TableCell>{format(cancel.dataEvento, "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{cancel.codigo}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{config.descricao}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{cancel.janela}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={cancel.planejado ? "default" : "destructive"}>
                              {cancel.planejado ? "Planejado" : "Executado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(impactoStyle.bg, impactoStyle.text, impactoStyle.border, "border")}>
                              {config.impacto.charAt(0).toUpperCase() + config.impacto.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(cancel.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
