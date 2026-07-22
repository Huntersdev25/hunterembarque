import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Calculator, Percent, Info, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onSummaryChange: (data: { margemBruta: number }) => void;
}

interface EncargosPrevidenciarios {
  fgts: number;
  inss: number;
  rat: number;
  terceiros: number;
  outros: number;
}

interface CustosFixos {
  valeAlimentacao: number;
  valeTransporte: number;
  uniformeEpi: number;
  planoSaude: number;
  seguroVida: number;
  custosAdministrativos: number;
}

interface Financeiro {
  receitaBruta: number;
  salarioBase: number;
}

export function CustosEncargos({ onSummaryChange }: Props) {
  const [editMode, setEditMode] = useState<string | null>(null);
  const [margemMinima, setMargemMinima] = useState(15); // 15% margem mínima esperada

  // Encargos previdenciários (%)
  const [encargos, setEncargos] = useState<EncargosPrevidenciarios>({
    fgts: 8,
    inss: 20,
    rat: 3,
    terceiros: 5.8,
    outros: 0
  });

  // Custos fixos (R$)
  const [custos, setCustos] = useState<CustosFixos>({
    valeAlimentacao: 600,
    valeTransporte: 220,
    uniformeEpi: 150,
    planoSaude: 450,
    seguroVida: 80,
    custosAdministrativos: 300
  });

  // Dados financeiros
  const [financeiro, setFinanceiro] = useState<Financeiro>({
    receitaBruta: 15000,
    salarioBase: 5000
  });

  // Cálculos automáticos
  const calculos = useMemo(() => {
    // Total de encargos (%)
    const totalEncargosPercent = encargos.fgts + encargos.inss + encargos.rat + encargos.terceiros + encargos.outros;
    
    // Total de encargos (R$)
    const totalEncargosValor = financeiro.salarioBase * (totalEncargosPercent / 100);

    // Total de custos fixos
    const totalCustosFixos = Object.values(custos).reduce((acc, val) => acc + val, 0);

    // Custo total mensal
    const custoTotalMensal = financeiro.salarioBase + totalEncargosValor + totalCustosFixos;

    // Receita líquida
    const receitaLiquida = financeiro.receitaBruta - custoTotalMensal;

    // Margem bruta
    const margemBrutaPercent = financeiro.receitaBruta > 0 
      ? ((receitaLiquida / financeiro.receitaBruta) * 100) 
      : 0;
    
    const margemBrutaValor = receitaLiquida;

    // Lucro estimado
    const lucroEstimado = receitaLiquida;

    return {
      totalEncargosPercent,
      totalEncargosValor,
      totalCustosFixos,
      custoTotalMensal,
      receitaLiquida,
      margemBrutaPercent,
      margemBrutaValor,
      lucroEstimado
    };
  }, [encargos, custos, financeiro]);

  useEffect(() => {
    onSummaryChange({ margemBruta: calculos.margemBrutaPercent });
  }, [calculos.margemBrutaPercent, onSummaryChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleEncargosChange = (key: keyof EncargosPrevidenciarios, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEncargos(prev => ({ ...prev, [key]: numValue }));
  };

  const handleCustosChange = (key: keyof CustosFixos, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustos(prev => ({ ...prev, [key]: numValue }));
  };

  const handleFinanceiroChange = (key: keyof Financeiro, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFinanceiro(prev => ({ ...prev, [key]: numValue }));
  };

  const margemStatus = calculos.margemBrutaPercent >= margemMinima ? "success" : 
                       calculos.margemBrutaPercent >= margemMinima * 0.7 ? "warning" : "danger";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Custos, Encargos e Margem</h3>
          <p className="text-sm text-muted-foreground">
            Análise financeira com cálculo automático de custos e margem
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Margem Mínima Esperada:</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={margemMinima}
              onChange={(e) => setMargemMinima(parseFloat(e.target.value) || 0)}
              className="w-20 h-8"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Margin Alert */}
      {calculos.margemBrutaPercent < margemMinima && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Alerta de Margem Baixa</p>
                <p className="text-sm text-muted-foreground">
                  A margem atual ({calculos.margemBrutaPercent.toFixed(1)}%) está abaixo da margem mínima esperada ({margemMinima}%).
                  Revise os custos ou ajuste a receita.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicadores Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo Total Mensal</p>
                <p className="text-xl font-bold">{formatCurrency(calculos.custoTotalMensal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita Líquida</p>
                <p className={cn("text-xl font-bold", calculos.receitaLiquida < 0 ? "text-destructive" : "text-success")}>
                  {formatCurrency(calculos.receitaLiquida)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          margemStatus === "success" ? "border-success/50" :
          margemStatus === "warning" ? "border-warning/50" : "border-destructive/50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                margemStatus === "success" ? "bg-success/10" :
                margemStatus === "warning" ? "bg-warning/10" : "bg-destructive/10"
              )}>
                <Percent className={cn(
                  "h-5 w-5",
                  margemStatus === "success" ? "text-success" :
                  margemStatus === "warning" ? "text-warning" : "text-destructive"
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem Bruta</p>
                <p className={cn(
                  "text-xl font-bold",
                  margemStatus === "success" ? "text-success" :
                  margemStatus === "warning" ? "text-warning" : "text-destructive"
                )}>
                  {calculos.margemBrutaPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">{formatCurrency(calculos.margemBrutaValor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Calculator className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro Estimado</p>
                <p className={cn("text-xl font-bold", calculos.lucroEstimado < 0 ? "text-destructive" : "text-foreground")}>
                  {formatCurrency(calculos.lucroEstimado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados Base */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Dados Base
            </CardTitle>
            <CardDescription>Receita e salário base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Receita Bruta Mensal (R$)</Label>
              <Input
                type="number"
                value={financeiro.receitaBruta}
                onChange={(e) => handleFinanceiroChange("receitaBruta", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Salário Base (R$)</Label>
              <Input
                type="number"
                value={financeiro.salarioBase}
                onChange={(e) => handleFinanceiroChange("salarioBase", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Encargos Previdenciários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Encargos Previdenciários
            </CardTitle>
            <CardDescription>
              Total: {calculos.totalEncargosPercent.toFixed(1)}% ({formatCurrency(calculos.totalEncargosValor)})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "fgts", label: "FGTS" },
              { key: "inss", label: "INSS" },
              { key: "rat", label: "RAT" },
              { key: "terceiros", label: "Terceiros" },
              { key: "outros", label: "Outros" }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <Label className="text-sm flex-1">{label}</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={encargos[key as keyof EncargosPrevidenciarios]}
                    onChange={(e) => handleEncargosChange(key as keyof EncargosPrevidenciarios, e.target.value)}
                    className="w-20 h-8 text-right"
                  />
                  <span className="text-xs text-muted-foreground w-4">%</span>
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Encargos</span>
              <Badge variant="secondary">{formatCurrency(calculos.totalEncargosValor)}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Custos Fixos e Benefícios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Custos Fixos e Benefícios
            </CardTitle>
            <CardDescription>
              Total: {formatCurrency(calculos.totalCustosFixos)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "valeAlimentacao", label: "Vale Alimentação" },
              { key: "valeTransporte", label: "Vale Transporte" },
              { key: "uniformeEpi", label: "Uniforme / EPI" },
              { key: "planoSaude", label: "Plano de Saúde" },
              { key: "seguroVida", label: "Seguro de Vida" },
              { key: "custosAdministrativos", label: "Custos Administrativos" }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <Label className="text-sm flex-1">{label}</Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    value={custos[key as keyof CustosFixos]}
                    onChange={(e) => handleCustosChange(key as keyof CustosFixos, e.target.value)}
                    className="w-24 h-8 text-right"
                  />
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Custos</span>
              <Badge variant="secondary">{formatCurrency(calculos.totalCustosFixos)}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Detalhado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Demonstrativo de Resultado
          </CardTitle>
          <CardDescription>Visão detalhada dos cálculos e fórmulas aplicadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Receita Bruta</span>
              <span className="font-medium">{formatCurrency(financeiro.receitaBruta)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">(-) Salário Base</span>
              <span className="font-medium text-destructive">- {formatCurrency(financeiro.salarioBase)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">(-) Encargos Previdenciários ({calculos.totalEncargosPercent.toFixed(1)}%)</span>
              <span className="font-medium text-destructive">- {formatCurrency(calculos.totalEncargosValor)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">(-) Custos Fixos e Benefícios</span>
              <span className="font-medium text-destructive">- {formatCurrency(calculos.totalCustosFixos)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold">Custo Total</span>
              <span className="font-bold">{formatCurrency(calculos.custoTotalMensal)}</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-muted/50 rounded-lg px-3">
              <span className="font-semibold">Resultado (Lucro/Prejuízo)</span>
              <span className={cn("font-bold text-lg", calculos.receitaLiquida >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(calculos.receitaLiquida)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 bg-primary/5 rounded-lg px-3">
              <span className="font-semibold">Margem Bruta</span>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  margemStatus === "success" ? "bg-success" :
                  margemStatus === "warning" ? "bg-warning" : "bg-destructive"
                )}>
                  {calculos.margemBrutaPercent.toFixed(1)}%
                </Badge>
                <span className="text-sm text-muted-foreground">({formatCurrency(calculos.margemBrutaValor)})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
