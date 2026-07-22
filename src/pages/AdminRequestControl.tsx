import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  DollarSign, 
  FileText, 
  Pencil, 
  Plus, 
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Upload,
  Calendar
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ApprovedCandidate {
  id: string;
  candidate_id: string;
  vessel_name: string;
  period_start: string;
  period_end: string;
  client_id: string;
  candidate: {
    full_name: string;
    desired_function: string;
  };
  clients?: {
    company_name: string;
  };
}

interface ProfessionalCost {
  id: string;
  client_candidate_id: string;
  daily_rate: number;
  total_days: number;
  total_cost: number;
  transportation_cost: number;
  food_cost: number;
  accommodation_cost: number;
  other_costs: number;
  other_costs_description: string;
  payment_status: string;
  invoice_number: string;
  invoice_date: string;
  notes: string;
}

interface LegalRequirement {
  id: string;
  client_candidate_id: string;
  fgts_status: string;
  fgts_last_payment: string;
  fgts_notes: string;
  inss_status: string;
  inss_last_payment: string;
  inss_notes: string;
  aso_status: string;
  aso_validity: string;
  aso_notes: string;
  epi_status: string;
  epi_delivery_date: string;
  epi_items: string[];
  epi_notes: string;
  salary_status: string;
  salary_last_payment: string;
  salary_amount: number;
  salary_notes: string;
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_dia: "bg-green-100 text-green-800",
  pago: "bg-green-100 text-green-800",
  valido: "bg-green-100 text-green-800",
  entregue: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-800",
  vencido: "bg-red-100 text-red-800",
  incompleto: "bg-orange-100 text-orange-800",
  parcial: "bg-blue-100 text-blue-800",
  nao_aplicavel: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_dia: "Em Dia",
  pago: "Pago",
  valido: "Válido",
  entregue: "Entregue",
  atrasado: "Atrasado",
  vencido: "Vencido",
  incompleto: "Incompleto",
  parcial: "Parcial",
  nao_aplicavel: "N/A",
};

export default function AdminRequestControl() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("costs");
  
  // Dialog states
  const [costDialog, setCostDialog] = useState<{ open: boolean; candidate: ApprovedCandidate | null; cost: ProfessionalCost | null }>({
    open: false,
    candidate: null,
    cost: null
  });
  const [legalDialog, setLegalDialog] = useState<{ open: boolean; candidate: ApprovedCandidate | null; legal: LegalRequirement | null }>({
    open: false,
    candidate: null,
    legal: null
  });

  // Form states for costs
  const [dailyRate, setDailyRate] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [transportationCost, setTransportationCost] = useState("");
  const [foodCost, setFoodCost] = useState("");
  const [accommodationCost, setAccommodationCost] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [otherCostsDescription, setOtherCostsDescription] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pendente");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [costNotes, setCostNotes] = useState("");

  // Form states for legal requirements
  const [fgtsStatus, setFgtsStatus] = useState("pendente");
  const [fgtsLastPayment, setFgtsLastPayment] = useState("");
  const [fgtsNotes, setFgtsNotes] = useState("");
  const [inssStatus, setInssStatus] = useState("pendente");
  const [inssLastPayment, setInssLastPayment] = useState("");
  const [inssNotes, setInssNotes] = useState("");
  const [asoStatus, setAsoStatus] = useState("pendente");
  const [asoValidity, setAsoValidity] = useState("");
  const [asoNotes, setAsoNotes] = useState("");
  const [epiStatus, setEpiStatus] = useState("pendente");
  const [epiDeliveryDate, setEpiDeliveryDate] = useState("");
  const [epiItems, setEpiItems] = useState("");
  const [epiNotes, setEpiNotes] = useState("");
  const [salaryStatus, setSalaryStatus] = useState("pendente");
  const [salaryLastPayment, setSalaryLastPayment] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryNotes, setSalaryNotes] = useState("");

  // Fetch approved candidates
  const { data: approvedCandidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ["approved-candidates-for-control"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_candidates")
        .select(`
          id,
          candidate_id,
          vessel_name,
          period_start,
          period_end,
          client_id,
          candidate:candidate_id (
            full_name,
            desired_function
          ),
          clients:client_id (
            company_name
          )
        `)
        .in("interview_status", ["approved", "completed", "hired", "contracted"])
        .order("period_start", { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        candidate: Array.isArray(item.candidate) ? item.candidate[0] : item.candidate,
        clients: Array.isArray(item.clients) ? item.clients[0] : item.clients,
      }));
    },
  });

  // Fetch costs
  const { data: costs } = useQuery({
    queryKey: ["professional-costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_costs")
        .select("*");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch legal requirements
  const { data: legalRequirements } = useQuery({
    queryKey: ["legal-requirements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_requirements")
        .select("*");

      if (error) throw error;
      return data || [];
    },
  });

  const getCostForCandidate = (candidateId: string) => {
    return costs?.find((c: any) => c.client_candidate_id === candidateId);
  };

  const getLegalForCandidate = (candidateId: string) => {
    return legalRequirements?.find((l: any) => l.client_candidate_id === candidateId);
  };

  const resetCostForm = () => {
    setDailyRate("");
    setTotalDays("");
    setTransportationCost("");
    setFoodCost("");
    setAccommodationCost("");
    setOtherCosts("");
    setOtherCostsDescription("");
    setPaymentStatus("pendente");
    setInvoiceNumber("");
    setInvoiceDate("");
    setCostNotes("");
  };

  const resetLegalForm = () => {
    setFgtsStatus("pendente");
    setFgtsLastPayment("");
    setFgtsNotes("");
    setInssStatus("pendente");
    setInssLastPayment("");
    setInssNotes("");
    setAsoStatus("pendente");
    setAsoValidity("");
    setAsoNotes("");
    setEpiStatus("pendente");
    setEpiDeliveryDate("");
    setEpiItems("");
    setEpiNotes("");
    setSalaryStatus("pendente");
    setSalaryLastPayment("");
    setSalaryAmount("");
    setSalaryNotes("");
  };

  const openCostDialog = (candidate: ApprovedCandidate) => {
    const existingCost = getCostForCandidate(candidate.id);
    if (existingCost) {
      setDailyRate(existingCost.daily_rate?.toString() || "");
      setTotalDays(existingCost.total_days?.toString() || "");
      setTransportationCost(existingCost.transportation_cost?.toString() || "");
      setFoodCost(existingCost.food_cost?.toString() || "");
      setAccommodationCost(existingCost.accommodation_cost?.toString() || "");
      setOtherCosts(existingCost.other_costs?.toString() || "");
      setOtherCostsDescription(existingCost.other_costs_description || "");
      setPaymentStatus(existingCost.payment_status || "pendente");
      setInvoiceNumber(existingCost.invoice_number || "");
      setInvoiceDate(existingCost.invoice_date || "");
      setCostNotes(existingCost.notes || "");
    } else {
      resetCostForm();
    }
    setCostDialog({ open: true, candidate, cost: existingCost || null });
  };

  const openLegalDialog = (candidate: ApprovedCandidate) => {
    const existingLegal = getLegalForCandidate(candidate.id);
    if (existingLegal) {
      setFgtsStatus(existingLegal.fgts_status || "pendente");
      setFgtsLastPayment(existingLegal.fgts_last_payment || "");
      setFgtsNotes(existingLegal.fgts_notes || "");
      setInssStatus(existingLegal.inss_status || "pendente");
      setInssLastPayment(existingLegal.inss_last_payment || "");
      setInssNotes(existingLegal.inss_notes || "");
      setAsoStatus(existingLegal.aso_status || "pendente");
      setAsoValidity(existingLegal.aso_validity || "");
      setAsoNotes(existingLegal.aso_notes || "");
      setEpiStatus(existingLegal.epi_status || "pendente");
      setEpiDeliveryDate(existingLegal.epi_delivery_date || "");
      setEpiItems(existingLegal.epi_items?.join(", ") || "");
      setEpiNotes(existingLegal.epi_notes || "");
      setSalaryStatus(existingLegal.salary_status || "pendente");
      setSalaryLastPayment(existingLegal.salary_last_payment || "");
      setSalaryAmount(existingLegal.salary_amount?.toString() || "");
      setSalaryNotes(existingLegal.salary_notes || "");
    } else {
      resetLegalForm();
    }
    setLegalDialog({ open: true, candidate, legal: existingLegal || null });
  };

  const handleSaveCost = async () => {
    if (!costDialog.candidate || !user) return;

    const totalCost = (parseFloat(dailyRate || "0") * parseInt(totalDays || "0")) +
      parseFloat(transportationCost || "0") +
      parseFloat(foodCost || "0") +
      parseFloat(accommodationCost || "0") +
      parseFloat(otherCosts || "0");

    const costData = {
      client_candidate_id: costDialog.candidate.id,
      daily_rate: parseFloat(dailyRate || "0"),
      total_days: parseInt(totalDays || "0"),
      total_cost: totalCost,
      transportation_cost: parseFloat(transportationCost || "0"),
      food_cost: parseFloat(foodCost || "0"),
      accommodation_cost: parseFloat(accommodationCost || "0"),
      other_costs: parseFloat(otherCosts || "0"),
      other_costs_description: otherCostsDescription,
      payment_status: paymentStatus,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate || null,
      notes: costNotes,
      created_by: user.id,
    };

    try {
      if (costDialog.cost) {
        const { error } = await supabase
          .from("professional_costs")
          .update(costData)
          .eq("id", costDialog.cost.id);

        if (error) throw error;
        toast.success("Custos atualizados com sucesso!");
      } else {
        const { error } = await supabase
          .from("professional_costs")
          .insert(costData);

        if (error) throw error;
        toast.success("Custos cadastrados com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["professional-costs"] });
      setCostDialog({ open: false, candidate: null, cost: null });
      resetCostForm();
    } catch (error) {
      toast.error("Erro ao salvar custos");
      console.error(error);
    }
  };

  const handleSaveLegal = async () => {
    if (!legalDialog.candidate || !user) return;

    const legalData = {
      client_candidate_id: legalDialog.candidate.id,
      fgts_status: fgtsStatus,
      fgts_last_payment: fgtsLastPayment || null,
      fgts_notes: fgtsNotes,
      inss_status: inssStatus,
      inss_last_payment: inssLastPayment || null,
      inss_notes: inssNotes,
      aso_status: asoStatus,
      aso_validity: asoValidity || null,
      aso_notes: asoNotes,
      epi_status: epiStatus,
      epi_delivery_date: epiDeliveryDate || null,
      epi_items: epiItems ? epiItems.split(",").map(i => i.trim()) : [],
      epi_notes: epiNotes,
      salary_status: salaryStatus,
      salary_last_payment: salaryLastPayment || null,
      salary_amount: parseFloat(salaryAmount || "0"),
      salary_notes: salaryNotes,
      created_by: user.id,
    };

    try {
      if (legalDialog.legal) {
        const { error } = await supabase
          .from("legal_requirements")
          .update(legalData)
          .eq("id", legalDialog.legal.id);

        if (error) throw error;
        toast.success("Requisitos atualizados com sucesso!");
      } else {
        const { error } = await supabase
          .from("legal_requirements")
          .insert(legalData);

        if (error) throw error;
        toast.success("Requisitos cadastrados com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: ["legal-requirements"] });
      setLegalDialog({ open: false, candidate: null, legal: null });
      resetLegalForm();
    } catch (error) {
      toast.error("Erro ao salvar requisitos");
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}>
        {STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Controle de Requisições</h1>
          <p className="text-muted-foreground mt-1">Gerencie custos e requisitos legais dos profissionais aprovados</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="costs" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Controle de Custos
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requisitos Legais
            </TabsTrigger>
          </TabsList>

          {/* Tab Custos */}
          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Custos por Profissional
                </CardTitle>
                <CardDescription>
                  Gerencie diárias, transporte, alimentação e outros custos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCandidates ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : approvedCandidates?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhum profissional aprovado encontrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Embarcação</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Custo Total</TableHead>
                          <TableHead>Status Pgto</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedCandidates?.map((candidate: ApprovedCandidate) => {
                          const cost = getCostForCandidate(candidate.id);
                          return (
                            <TableRow key={candidate.id}>
                              <TableCell className="font-medium">
                                {candidate.candidate?.full_name || "N/A"}
                              </TableCell>
                              <TableCell>{candidate.candidate?.desired_function || "N/A"}</TableCell>
                              <TableCell>{candidate.clients?.company_name || "N/A"}</TableCell>
                              <TableCell>{candidate.vessel_name || "N/A"}</TableCell>
                              <TableCell>
                                {candidate.period_start && candidate.period_end
                                  ? `${new Date(candidate.period_start).toLocaleDateString('pt-BR')} - ${new Date(candidate.period_end).toLocaleDateString('pt-BR')}`
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                {cost?.total_cost 
                                  ? `R$ ${cost.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {cost ? getStatusBadge(cost.payment_status) : getStatusBadge("pendente")}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCostDialog(candidate)}
                                >
                                  {cost ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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
          </TabsContent>

          {/* Tab Requisitos Legais */}
          <TabsContent value="legal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Requisitos Legais por Profissional
                </CardTitle>
                <CardDescription>
                  Acompanhe FGTS, INSS, ASO, EPIs e Salários
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCandidates ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : approvedCandidates?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhum profissional aprovado encontrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>FGTS</TableHead>
                          <TableHead>INSS</TableHead>
                          <TableHead>ASO</TableHead>
                          <TableHead>EPIs</TableHead>
                          <TableHead>Salário</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedCandidates?.map((candidate: ApprovedCandidate) => {
                          const legal = getLegalForCandidate(candidate.id);
                          return (
                            <TableRow key={candidate.id}>
                              <TableCell className="font-medium">
                                {candidate.candidate?.full_name || "N/A"}
                              </TableCell>
                              <TableCell>{candidate.clients?.company_name || "N/A"}</TableCell>
                              <TableCell>{getStatusBadge(legal?.fgts_status || "pendente")}</TableCell>
                              <TableCell>{getStatusBadge(legal?.inss_status || "pendente")}</TableCell>
                              <TableCell>{getStatusBadge(legal?.aso_status || "pendente")}</TableCell>
                              <TableCell>{getStatusBadge(legal?.epi_status || "pendente")}</TableCell>
                              <TableCell>{getStatusBadge(legal?.salary_status || "pendente")}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openLegalDialog(candidate)}
                                >
                                  {legal ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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
          </TabsContent>
        </Tabs>

        {/* Dialog de Custos */}
        <Dialog open={costDialog.open} onOpenChange={(open) => !open && setCostDialog({ open: false, candidate: null, cost: null })}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {costDialog.cost ? "Editar Custos" : "Cadastrar Custos"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">{costDialog.candidate?.candidate?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{costDialog.candidate?.vessel_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diária (R$)</Label>
                    <Input
                      type="number"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total de Dias</Label>
                    <Input
                      type="number"
                      value={totalDays}
                      onChange={(e) => setTotalDays(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transporte (R$)</Label>
                    <Input
                      type="number"
                      value={transportationCost}
                      onChange={(e) => setTransportationCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alimentação (R$)</Label>
                    <Input
                      type="number"
                      value={foodCost}
                      onChange={(e) => setFoodCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hospedagem (R$)</Label>
                    <Input
                      type="number"
                      value={accommodationCost}
                      onChange={(e) => setAccommodationCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Outros Custos (R$)</Label>
                    <Input
                      type="number"
                      value={otherCosts}
                      onChange={(e) => setOtherCosts(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição Outros Custos</Label>
                  <Input
                    value={otherCostsDescription}
                    onChange={(e) => setOtherCostsDescription(e.target.value)}
                    placeholder="Descreva os outros custos..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status do Pagamento</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="parcial">Parcial</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nº da Nota Fiscal</Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="NF-000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data da Nota Fiscal</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={costNotes}
                    onChange={(e) => setCostNotes(e.target.value)}
                    placeholder="Notas adicionais..."
                    rows={3}
                  />
                </div>

                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">Custo Total Calculado:</p>
                  <p className="text-xl font-bold text-primary">
                    R$ {(
                      (parseFloat(dailyRate || "0") * parseInt(totalDays || "0")) +
                      parseFloat(transportationCost || "0") +
                      parseFloat(foodCost || "0") +
                      parseFloat(accommodationCost || "0") +
                      parseFloat(otherCosts || "0")
                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCostDialog({ open: false, candidate: null, cost: null })}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCost}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Requisitos Legais */}
        <Dialog open={legalDialog.open} onOpenChange={(open) => !open && setLegalDialog({ open: false, candidate: null, legal: null })}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {legalDialog.legal ? "Editar Requisitos Legais" : "Cadastrar Requisitos Legais"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 py-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">{legalDialog.candidate?.candidate?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{legalDialog.candidate?.clients?.company_name}</p>
                </div>

                {/* FGTS */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">FGTS</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={fgtsStatus} onValueChange={setFgtsStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_dia">Em Dia</SelectItem>
                          <SelectItem value="atrasado">Atrasado</SelectItem>
                          <SelectItem value="nao_aplicavel">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Último Pagamento</Label>
                      <Input type="date" value={fgtsLastPayment} onChange={(e) => setFgtsLastPayment(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input value={fgtsNotes} onChange={(e) => setFgtsNotes(e.target.value)} placeholder="Observações..." />
                  </div>
                </div>

                {/* INSS */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">INSS</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={inssStatus} onValueChange={setInssStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_dia">Em Dia</SelectItem>
                          <SelectItem value="atrasado">Atrasado</SelectItem>
                          <SelectItem value="nao_aplicavel">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Último Pagamento</Label>
                      <Input type="date" value={inssLastPayment} onChange={(e) => setInssLastPayment(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input value={inssNotes} onChange={(e) => setInssNotes(e.target.value)} placeholder="Observações..." />
                  </div>
                </div>

                {/* ASO */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">ASO (Atestado de Saúde Ocupacional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={asoStatus} onValueChange={setAsoStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="valido">Válido</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                          <SelectItem value="nao_aplicavel">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Validade</Label>
                      <Input type="date" value={asoValidity} onChange={(e) => setAsoValidity(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input value={asoNotes} onChange={(e) => setAsoNotes(e.target.value)} placeholder="Observações..." />
                  </div>
                </div>

                {/* EPIs */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">EPIs (Equipamentos de Proteção Individual)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={epiStatus} onValueChange={setEpiStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                          <SelectItem value="incompleto">Incompleto</SelectItem>
                          <SelectItem value="nao_aplicavel">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Entrega</Label>
                      <Input type="date" value={epiDeliveryDate} onChange={(e) => setEpiDeliveryDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Itens Entregues (separados por vírgula)</Label>
                    <Input value={epiItems} onChange={(e) => setEpiItems(e.target.value)} placeholder="Capacete, Luvas, Botas, Colete..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input value={epiNotes} onChange={(e) => setEpiNotes(e.target.value)} placeholder="Observações..." />
                  </div>
                </div>

                {/* Salários */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Salários</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={salaryStatus} onValueChange={setSalaryStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="atrasado">Atrasado</SelectItem>
                          <SelectItem value="nao_aplicavel">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Último Pagamento</Label>
                      <Input type="date" value={salaryLastPayment} onChange={(e) => setSalaryLastPayment(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input value={salaryNotes} onChange={(e) => setSalaryNotes(e.target.value)} placeholder="Observações..." />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLegalDialog({ open: false, candidate: null, legal: null })}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLegal}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}