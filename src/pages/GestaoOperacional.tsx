import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, XCircle, DollarSign, Calendar, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { ControleDiarias } from "@/components/gestao-operacional/ControleDiarias";
import { CancelamentosOperacionais } from "@/components/gestao-operacional/CancelamentosOperacionais";
import { CustosEncargos } from "@/components/gestao-operacional/CustosEncargos";

export default function GestaoOperacional() {
  const [activeTab, setActiveTab] = useState("diarias");
  
  // Summary data - would come from the modules
  const [summaryData, setSummaryData] = useState({
    totalDiasEmbarcados: 0,
    valorTotalPagar: 0,
    valorAdicionalDobra: 0,
    totalCancelamentos: 0,
    percentualMudancas: 0,
    margemBruta: 0
  });

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão Operacional & Financeira</h1>
          <p className="text-muted-foreground">Controle de embarques, cancelamentos e análise de custos</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dias Embarcados</p>
                  <p className="text-xl font-bold text-foreground">{summaryData.totalDiasEmbarcados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total a Pagar</p>
                  <p className="text-xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.valorTotalPagar)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Adicional Dobra/RNG</p>
                  <p className="text-xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryData.valorAdicionalDobra)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cancelamentos</p>
                  <p className="text-xl font-bold text-foreground">{summaryData.totalCancelamentos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">% Mudanças</p>
                  <p className="text-xl font-bold text-foreground">{summaryData.percentualMudancas.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${summaryData.margemBruta >= 20 ? 'from-success/10 to-success/5 border-success/20' : summaryData.margemBruta >= 10 ? 'from-warning/10 to-warning/5 border-warning/20' : 'from-destructive/10 to-destructive/5 border-destructive/20'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${summaryData.margemBruta >= 20 ? 'bg-success/10' : summaryData.margemBruta >= 10 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                  <TrendingUp className={`h-5 w-5 ${summaryData.margemBruta >= 20 ? 'text-success' : summaryData.margemBruta >= 10 ? 'text-warning' : 'text-destructive'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margem Bruta</p>
                  <p className="text-xl font-bold text-foreground">{summaryData.margemBruta.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="diarias" className="gap-2">
              <Ship className="h-4 w-4" />
              <span className="hidden sm:inline">Controle de Diárias</span>
              <span className="sm:hidden">Diárias</span>
            </TabsTrigger>
            <TabsTrigger value="cancelamentos" className="gap-2">
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Cancelamentos</span>
              <span className="sm:hidden">Cancel.</span>
            </TabsTrigger>
            <TabsTrigger value="custos" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Custos & Margem</span>
              <span className="sm:hidden">Custos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diarias" className="space-y-4">
            <ControleDiarias onSummaryChange={(data) => setSummaryData(prev => ({ ...prev, ...data }))} />
          </TabsContent>

          <TabsContent value="cancelamentos" className="space-y-4">
            <CancelamentosOperacionais onSummaryChange={(data) => setSummaryData(prev => ({ ...prev, ...data }))} />
          </TabsContent>

          <TabsContent value="custos" className="space-y-4">
            <CustosEncargos onSummaryChange={(data) => setSummaryData(prev => ({ ...prev, ...data }))} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
