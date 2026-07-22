import { useState, useMemo } from "react";
import { formatDateBR } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { Building2, Ship, Plus, Trash2, Edit, ArrowLeft, Users, Search, ChevronLeft, ChevronRight, TrendingUp, FileDown, Calendar, MapPin, Anchor } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Client {
  id: string;
  company_name: string;
  contact_name: string;
}

interface Vessel {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface MeasurementCost {
  id: string;
  vessel_id: string;
  collaborator_name: string;
  cir: string | null;
  job_function: string | null;
  period_start: string | null;
  period_end: string | null;
  number_of_days: number;
  monthly_plan: number;
  spot_plan: number;
  standby_plan: number;
  tickets: number;
  boarding_allowance: number;
  disembarking_allowance: number;
  uber_taxi_fuel: number;
  hotel_accommodation: number;
  hotel_extras: number;
  crew_transport: number;
  notes: string | null;
}

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 15, 25];

export default function Medicoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [isVesselDialogOpen, setIsVesselDialogOpen] = useState(false);
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [editingCost, setEditingCost] = useState<MeasurementCost | null>(null);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Vessel form state
  const [vesselForm, setVesselForm] = useState({
    name: "",
    description: "",
  });

  // Cost form state
  const [costForm, setCostForm] = useState<Partial<MeasurementCost>>({
    collaborator_name: "",
    cir: "",
    job_function: "",
    period_start: "",
    period_end: "",
    number_of_days: 0,
    monthly_plan: 0,
    spot_plan: 0,
    standby_plan: 0,
    tickets: 0,
    boarding_allowance: 0,
    disembarking_allowance: 0,
    uber_taxi_fuel: 0,
    hotel_accommodation: 0,
    hotel_extras: 0,
    crew_transport: 0,
    notes: "",
  });

  // Fetch clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients-for-measurements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, contact_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data as Client[];
    },
  });

  // Fetch vessels for selected client
  const { data: vessels = [], isLoading: loadingVessels } = useQuery({
    queryKey: ["vessels", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from("measurement_vessels")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("name");
      if (error) throw error;
      return data as Vessel[];
    },
    enabled: !!selectedClient,
  });

  // Fetch costs for selected vessel
  const { data: costs = [], isLoading: loadingCosts } = useQuery({
    queryKey: ["measurement-costs", selectedVessel?.id],
    queryFn: async () => {
      if (!selectedVessel) return [];
      const { data, error } = await supabase
        .from("measurement_costs")
        .select("*")
        .eq("vessel_id", selectedVessel.id)
        .order("collaborator_name");
      if (error) throw error;
      return data as MeasurementCost[];
    },
    enabled: !!selectedVessel,
  });

  // Create/Update vessel mutation
  const vesselMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (editingVessel) {
        const { error } = await supabase
          .from("measurement_vessels")
          .update({
            name: data.name,
            description: data.description || null,
          })
          .eq("id", editingVessel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("measurement_vessels")
          .insert({
            client_id: selectedClient!.id,
            name: data.name,
            description: data.description || null,
            created_by: user!.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vessels", selectedClient?.id] });
      setIsVesselDialogOpen(false);
      setEditingVessel(null);
      setVesselForm({ name: "", description: "" });
      toast.success(editingVessel ? "Embarcação atualizada!" : "Embarcação cadastrada!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar embarcação: " + error.message);
    },
  });

  // Delete vessel mutation
  const deleteVesselMutation = useMutation({
    mutationFn: async (vesselId: string) => {
      const { error } = await supabase
        .from("measurement_vessels")
        .delete()
        .eq("id", vesselId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vessels", selectedClient?.id] });
      toast.success("Embarcação removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover embarcação: " + error.message);
    },
  });

  // Create/Update cost mutation
  const costMutation = useMutation({
    mutationFn: async (data: Partial<MeasurementCost>) => {
      if (editingCost) {
        const { error } = await supabase
          .from("measurement_costs")
          .update({
            ...data,
            period_start: data.period_start || null,
            period_end: data.period_end || null,
          })
          .eq("id", editingCost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("measurement_costs")
          .insert({
            vessel_id: selectedVessel!.id,
            collaborator_name: data.collaborator_name!,
            cir: data.cir || null,
            job_function: data.job_function || null,
            period_start: data.period_start || null,
            period_end: data.period_end || null,
            number_of_days: data.number_of_days || 0,
            monthly_plan: data.monthly_plan || 0,
            spot_plan: data.spot_plan || 0,
            standby_plan: data.standby_plan || 0,
            tickets: data.tickets || 0,
            boarding_allowance: data.boarding_allowance || 0,
            disembarking_allowance: data.disembarking_allowance || 0,
            uber_taxi_fuel: data.uber_taxi_fuel || 0,
            hotel_accommodation: data.hotel_accommodation || 0,
            hotel_extras: data.hotel_extras || 0,
            crew_transport: data.crew_transport || 0,
            notes: data.notes || null,
            created_by: user!.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement-costs", selectedVessel?.id] });
      setIsCostDialogOpen(false);
      setEditingCost(null);
      resetCostForm();
      toast.success(editingCost ? "Registro atualizado!" : "Registro cadastrado!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar registro: " + error.message);
    },
  });

  // Delete cost mutation
  const deleteCostMutation = useMutation({
    mutationFn: async (costId: string) => {
      const { error } = await supabase
        .from("measurement_costs")
        .delete()
        .eq("id", costId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement-costs", selectedVessel?.id] });
      toast.success("Registro removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover registro: " + error.message);
    },
  });

  const resetCostForm = () => {
    setCostForm({
      collaborator_name: "",
      cir: "",
      job_function: "",
      period_start: "",
      period_end: "",
      number_of_days: 0,
      monthly_plan: 0,
      spot_plan: 0,
      standby_plan: 0,
      tickets: 0,
      boarding_allowance: 0,
      disembarking_allowance: 0,
      uber_taxi_fuel: 0,
      hotel_accommodation: 0,
      hotel_extras: 0,
      crew_transport: 0,
      notes: "",
    });
  };

  const handleEditVessel = (vessel: Vessel) => {
    setEditingVessel(vessel);
    setVesselForm({
      name: vessel.name,
      description: vessel.description || "",
    });
    setIsVesselDialogOpen(true);
  };

  const handleEditCost = (cost: MeasurementCost) => {
    setEditingCost(cost);
    setCostForm({
      ...cost,
      period_start: cost.period_start || "",
      period_end: cost.period_end || "",
    });
    setIsCostDialogOpen(true);
  };

  // Calculate metrics
  const calculateMetrics = () => {
    const totalCrewMeasurement = costs.reduce((acc, cost) => 
      acc + cost.monthly_plan + cost.spot_plan + cost.standby_plan, 0);
    
    const totalAllowances = costs.reduce((acc, cost) => 
      acc + cost.boarding_allowance + cost.disembarking_allowance, 0);
    
    const totalHotelDays = costs.reduce((acc, cost) => acc + cost.hotel_accommodation, 0);
    
    const totalHotelFood = costs.reduce((acc, cost) => acc + cost.hotel_extras, 0);
    
    const totalTransport = costs.reduce((acc, cost) => acc + cost.uber_taxi_fuel, 0);
    
    const totalCrewTransport = costs.reduce((acc, cost) => acc + cost.crew_transport, 0);
    
    const totalTickets = costs.reduce((acc, cost) => acc + cost.tickets, 0);
    
    const totalLogistics = totalAllowances + totalHotelDays + totalHotelFood + 
      totalTransport + totalCrewTransport + totalTickets;
    
    const totalGeneral = totalCrewMeasurement + totalLogistics;

    return {
      totalCrewMeasurement,
      totalAllowances,
      totalHotelDays,
      totalHotelFood,
      totalTransport,
      totalCrewTransport,
      totalTickets,
      totalLogistics,
      totalGeneral,
    };
  };

  const metrics = calculateMetrics();

  const chartData = [
    { name: "Tripulação", value: metrics.totalCrewMeasurement, fill: CHART_COLORS[0] },
    { name: "Ajudas de Custo", value: metrics.totalAllowances, fill: CHART_COLORS[1] },
    { name: "Diárias Hotel", value: metrics.totalHotelDays, fill: CHART_COLORS[2] },
    { name: "Alimentação Hotel", value: metrics.totalHotelFood, fill: CHART_COLORS[3] },
    { name: "Uber/Taxi/Combustível", value: metrics.totalTransport, fill: CHART_COLORS[4] },
    { name: "Transporte Tripulação", value: metrics.totalCrewTransport, fill: CHART_COLORS[5] },
    { name: "Passagens", value: metrics.totalTickets, fill: CHART_COLORS[6] },
  ];

  // Filtered and paginated data
  const filteredCosts = useMemo(() => {
    if (!searchQuery.trim()) return costs;
    const query = searchQuery.toLowerCase();
    return costs.filter(cost => 
      cost.collaborator_name.toLowerCase().includes(query) ||
      (cost.cir && cost.cir.toLowerCase().includes(query)) ||
      (cost.job_function && cost.job_function.toLowerCase().includes(query))
    );
  }, [costs, searchQuery]);

  const totalPages = Math.ceil(filteredCosts.length / itemsPerPage);
  const paginatedCosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCosts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCosts, currentPage, itemsPerPage]);

  // Reset page when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-4">
          <p className="font-semibold text-foreground">{payload[0].name || payload[0].payload?.name}</p>
          <p className="text-lg font-bold text-primary mt-1">{formatCurrency(payload[0].value as number)}</p>
        </div>
      );
    }
    return null;
  };

  // PDF Export function
  const exportToPDF = () => {
    if (!selectedClient || !selectedVessel || costs.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Colors
    const primaryColor: [number, number, number] = [59, 130, 246];
    const darkColor: [number, number, number] = [30, 41, 59];
    const grayColor: [number, number, number] = [100, 116, 139];
    const lightGray: [number, number, number] = [241, 245, 249];

    // Helper function to add new page if needed
    const checkNewPage = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // ============ HEADER ============
    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, "F");

    // Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("HUNTERS", margin, 22);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("MANPOWER", margin, 28);

    // Report title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE MEDIÇÃO", pageWidth - margin, 18, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth - margin, 26, { align: "right" });

    yPos = 55;

    // ============ CLIENT & VESSEL INFO ============
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, "F");

    doc.setTextColor(...darkColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMAÇÕES DA MEDIÇÃO", margin + 5, yPos + 8);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);

    // Left column
    doc.text("Cliente:", margin + 5, yPos + 18);
    doc.text("Embarcação:", margin + 5, yPos + 26);

    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text(selectedClient.company_name, margin + 35, yPos + 18);
    doc.text(selectedVessel.name, margin + 35, yPos + 26);

    // Right column
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text("Total de Colaboradores:", pageWidth / 2 + 10, yPos + 18);
    doc.text("Período:", pageWidth / 2 + 10, yPos + 26);

    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text(String(costs.length), pageWidth / 2 + 55, yPos + 18);
    
    const startDates = costs.filter(c => c.period_start).map(c => new Date(c.period_start!));
    const endDates = costs.filter(c => c.period_end).map(c => new Date(c.period_end!));
    const minDate = startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null;
    const maxDate = endDates.length > 0 ? new Date(Math.max(...endDates.map(d => d.getTime()))) : null;
    const periodText = minDate && maxDate 
      ? `${minDate.toLocaleDateString("pt-BR")} a ${maxDate.toLocaleDateString("pt-BR")}`
      : "Não definido";
    doc.text(periodText, pageWidth / 2 + 55, yPos + 26);

    yPos += 45;

    // ============ SUMMARY METRICS ============
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO FINANCEIRO", margin, yPos);
    yPos += 8;

    // Metrics grid
    const metricsData = [
      { label: "Medição Total da Tripulação", value: metrics.totalCrewMeasurement },
      { label: "Total de Ajudas de Custo", value: metrics.totalAllowances },
      { label: "Total de Diárias de Hotel", value: metrics.totalHotelDays },
      { label: "Total de Alimentação Hotel", value: metrics.totalHotelFood },
      { label: "Total Uber/Taxi/Combustível", value: metrics.totalTransport },
      { label: "Total Transporte Tripulação", value: metrics.totalCrewTransport },
      { label: "Total de Passagens", value: metrics.totalTickets },
    ];

    const colWidth = (pageWidth - 2 * margin) / 2;
    let col = 0;
    let rowY = yPos;

    metricsData.forEach((metric, index) => {
      const xPos = margin + col * colWidth;
      
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(xPos, rowY, colWidth - 5, 12, 2, 2, "F");
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayColor);
      doc.text(metric.label, xPos + 3, rowY + 5);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkColor);
      doc.text(formatCurrency(metric.value), xPos + 3, rowY + 10);
      
      col++;
      if (col >= 2) {
        col = 0;
        rowY += 14;
      }
    });

    if (col !== 0) rowY += 14;
    yPos = rowY + 5;

    // Total boxes
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, yPos, (pageWidth - 2 * margin - 5) / 2, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL GERAL", margin + 5, yPos + 6);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(metrics.totalGeneral), margin + 5, yPos + 14);

    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin + (pageWidth - 2 * margin + 5) / 2, yPos, (pageWidth - 2 * margin - 5) / 2, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL LOGÍSTICA", margin + (pageWidth - 2 * margin + 5) / 2 + 5, yPos + 6);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(metrics.totalLogistics), margin + (pageWidth - 2 * margin + 5) / 2 + 5, yPos + 14);

    yPos += 28;

    // ============ DETAILED TABLE ============
    checkNewPage(60);

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DETALHAMENTO POR COLABORADOR", margin, yPos);
    yPos += 8;

    // Table headers
    const tableHeaders = ["Colaborador", "Função", "Dias", "Passagens", "Ajuda Custo", "Hotel", "Uber/Taxi", "Total"];
    const colWidths = [40, 25, 15, 25, 25, 22, 22, 26];
    
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    
    let xOffset = margin + 2;
    tableHeaders.forEach((header, i) => {
      doc.text(header, xOffset, yPos + 5.5);
      xOffset += colWidths[i];
    });
    
    yPos += 8;

    // Table rows
    costs.forEach((cost, index) => {
      checkNewPage(10);
      
      const rowTotal = cost.monthly_plan + cost.spot_plan + cost.standby_plan + 
                       cost.tickets + cost.boarding_allowance + cost.disembarking_allowance +
                       cost.uber_taxi_fuel + cost.hotel_accommodation + cost.hotel_extras + cost.crew_transport;
      
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
      }
      
      doc.setTextColor(...darkColor);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      
      xOffset = margin + 2;
      
      // Truncate long names
      const truncatedName = cost.collaborator_name.length > 22 
        ? cost.collaborator_name.substring(0, 20) + "..." 
        : cost.collaborator_name;
      doc.text(truncatedName, xOffset, yPos + 5.5);
      xOffset += colWidths[0];
      
      doc.text((cost.job_function || "-").substring(0, 12), xOffset, yPos + 5.5);
      xOffset += colWidths[1];
      
      doc.text(String(cost.number_of_days), xOffset, yPos + 5.5);
      xOffset += colWidths[2];
      
      doc.text(formatCurrency(cost.tickets).replace("R$", "").trim(), xOffset, yPos + 5.5);
      xOffset += colWidths[3];
      
      doc.text(formatCurrency(cost.boarding_allowance + cost.disembarking_allowance).replace("R$", "").trim(), xOffset, yPos + 5.5);
      xOffset += colWidths[4];
      
      doc.text(formatCurrency(cost.hotel_accommodation + cost.hotel_extras).replace("R$", "").trim(), xOffset, yPos + 5.5);
      xOffset += colWidths[5];
      
      doc.text(formatCurrency(cost.uber_taxi_fuel).replace("R$", "").trim(), xOffset, yPos + 5.5);
      xOffset += colWidths[6];
      
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(rowTotal).replace("R$", "").trim(), xOffset, yPos + 5.5);
      
      yPos += 8;
    });

    // Table totals row
    doc.setFillColor(...darkColor);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 10, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAIS", margin + 2, yPos + 6.5);
    
    const totalDays = costs.reduce((acc, c) => acc + c.number_of_days, 0);
    const totalRowTickets = costs.reduce((acc, c) => acc + c.tickets, 0);
    const totalRowAllowances = costs.reduce((acc, c) => acc + c.boarding_allowance + c.disembarking_allowance, 0);
    const totalRowHotel = costs.reduce((acc, c) => acc + c.hotel_accommodation + c.hotel_extras, 0);
    const totalRowTransport = costs.reduce((acc, c) => acc + c.uber_taxi_fuel, 0);
    const grandTotal = costs.reduce((acc, c) => 
      acc + c.monthly_plan + c.spot_plan + c.standby_plan + c.tickets + 
      c.boarding_allowance + c.disembarking_allowance + c.uber_taxi_fuel + 
      c.hotel_accommodation + c.hotel_extras + c.crew_transport, 0);
    
    xOffset = margin + 2 + colWidths[0] + colWidths[1];
    doc.text(String(totalDays), xOffset, yPos + 6.5);
    xOffset += colWidths[2];
    doc.text(formatCurrency(totalRowTickets).replace("R$", "").trim(), xOffset, yPos + 6.5);
    xOffset += colWidths[3];
    doc.text(formatCurrency(totalRowAllowances).replace("R$", "").trim(), xOffset, yPos + 6.5);
    xOffset += colWidths[4];
    doc.text(formatCurrency(totalRowHotel).replace("R$", "").trim(), xOffset, yPos + 6.5);
    xOffset += colWidths[5];
    doc.text(formatCurrency(totalRowTransport).replace("R$", "").trim(), xOffset, yPos + 6.5);
    xOffset += colWidths[6];
    doc.text(formatCurrency(grandTotal).replace("R$", "").trim(), xOffset, yPos + 6.5);

    yPos += 18;

    // ============ COST DISTRIBUTION CHART (Text representation) ============
    checkNewPage(60);

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DISTRIBUIÇÃO DE CUSTOS", margin, yPos);
    yPos += 10;

    const filteredChartData = chartData.filter(d => d.value > 0);
    const maxValue = Math.max(...filteredChartData.map(d => d.value));

    filteredChartData.forEach((item, index) => {
      checkNewPage(15);
      
      const barWidth = (item.value / maxValue) * (pageWidth - 2 * margin - 60);
      const percentage = ((item.value / metrics.totalGeneral) * 100).toFixed(1);
      
      // Label
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkColor);
      doc.text(item.name, margin, yPos + 4);
      
      // Bar background
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(margin + 45, yPos, pageWidth - 2 * margin - 60, 6, 2, 2, "F");
      
      // Bar fill
      const colors: [number, number, number][] = [
        [59, 130, 246], [16, 185, 129], [245, 158, 11], [239, 68, 68],
        [139, 92, 246], [6, 182, 212], [249, 115, 22], [236, 72, 153]
      ];
      doc.setFillColor(...colors[index % colors.length]);
      doc.roundedRect(margin + 45, yPos, Math.max(barWidth, 2), 6, 2, 2, "F");
      
      // Value
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${formatCurrency(item.value)} (${percentage}%)`, pageWidth - margin, yPos + 4, { align: "right" });
      
      yPos += 10;
    });

    yPos += 10;

    // ============ FOOTER ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      // Footer text
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayColor);
      doc.text("Hunters Manpower - Sistema de Gestão de Medições", margin, pageHeight - 10);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    // Save PDF
    const fileName = `Medicao_${selectedClient.company_name.replace(/\s+/g, "_")}_${selectedVessel.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("Relatório PDF exportado com sucesso!");
  };

  // Client selection view
  if (!selectedClient) {
    return (
      <DashboardLayout userType="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Medições</h1>
            <p className="text-muted-foreground">Selecione um cliente para gerenciar embarcações e custos</p>
          </div>

          {loadingClients ? (
            <div className="text-center py-8">Carregando clientes...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{client.company_name}</h3>
                        <p className="text-sm text-muted-foreground">{client.contact_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {clients.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Vessel selection view
  if (!selectedVessel) {
    return (
      <DashboardLayout userType="admin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClient(null)}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar aos Clientes
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedClient.company_name}
              </h1>
              <p className="text-muted-foreground">Embarcações cadastradas</p>
            </div>
            <Button onClick={() => setIsVesselDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Embarcação
            </Button>
          </div>

          {loadingVessels ? (
            <div className="text-center py-8">Carregando embarcações...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vessels.map((vessel) => (
                <Card
                  key={vessel.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-4 flex-1"
                        onClick={() => setSelectedVessel(vessel)}
                      >
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Ship className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{vessel.name}</h3>
                          {vessel.description && (
                            <p className="text-sm text-muted-foreground">{vessel.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVessel(vessel);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Deseja remover esta embarcação?")) {
                              deleteVesselMutation.mutate(vessel.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {vessels.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Nenhuma embarcação cadastrada
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vessel Dialog */}
        <Dialog open={isVesselDialogOpen} onOpenChange={setIsVesselDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVessel ? "Editar Embarcação" : "Nova Embarcação"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Embarcação</Label>
                <Input
                  value={vesselForm.name}
                  onChange={(e) => setVesselForm({ ...vesselForm, name: e.target.value })}
                  placeholder="Ex: Navio Exemplo"
                />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={vesselForm.description}
                  onChange={(e) => setVesselForm({ ...vesselForm, description: e.target.value })}
                  placeholder="Descrição da embarcação..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsVesselDialogOpen(false);
                setEditingVessel(null);
                setVesselForm({ name: "", description: "" });
              }}>
                Cancelar
              </Button>
              <Button
                onClick={() => vesselMutation.mutate(vesselForm)}
                disabled={!vesselForm.name || vesselMutation.isPending}
              >
                {vesselMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // Cost table view with charts
  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVessel(null)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às Embarcações
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {selectedVessel.name}
            </h1>
            <p className="text-muted-foreground">
              Cliente: {selectedClient.company_name}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={exportToPDF}
              disabled={costs.length === 0}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={() => setIsCostDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </div>
        </div>

        {/* Costs Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Controle de Custos da Tripulação
                </CardTitle>
                <CardDescription className="mt-1">
                  {filteredCosts.length} registro(s) encontrado(s)
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome, CIR ou função..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt.toString()}>{opt} por página</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[1600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="min-w-[180px] font-semibold">Nome dos Colaboradores</TableHead>
                      <TableHead className="font-semibold">CIR</TableHead>
                      <TableHead className="font-semibold">Função</TableHead>
                      <TableHead className="font-semibold">Início</TableHead>
                      <TableHead className="font-semibold">Fim</TableHead>
                      <TableHead className="font-semibold">Nº Dias</TableHead>
                      <TableHead className="font-semibold">Plano Mensal</TableHead>
                      <TableHead className="font-semibold">Plano Spot</TableHead>
                      <TableHead className="font-semibold">Plano Stand By</TableHead>
                      <TableHead className="font-semibold">Passagens</TableHead>
                      <TableHead className="font-semibold">Ajuda de Custo</TableHead>
                      <TableHead className="font-semibold">Uber/Taxi/Comb.</TableHead>
                      <TableHead className="font-semibold">Hospedagem</TableHead>
                      <TableHead className="font-semibold">Extras Hotel</TableHead>
                      <TableHead className="text-right font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCosts ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginatedCosts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "Nenhum resultado encontrado" : "Nenhum registro de custo cadastrado"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCosts.map((cost, idx) => (
                        <TableRow key={cost.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <TableCell className="font-medium">{cost.collaborator_name}</TableCell>
                          <TableCell>{cost.cir || "-"}</TableCell>
                          <TableCell>
                            {cost.job_function ? (
                              <Badge variant="outline" className="text-xs">{cost.job_function}</Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>{formatDateBR(cost.period_start)}</TableCell>
                          <TableCell>{formatDateBR(cost.period_end)}</TableCell>
                          <TableCell className="text-center">{cost.number_of_days}</TableCell>
                          <TableCell>{formatCurrency(cost.monthly_plan)}</TableCell>
                          <TableCell>{formatCurrency(cost.spot_plan)}</TableCell>
                          <TableCell>{formatCurrency(cost.standby_plan)}</TableCell>
                          <TableCell>{formatCurrency(cost.tickets)}</TableCell>
                          <TableCell>{formatCurrency(cost.boarding_allowance + cost.disembarking_allowance)}</TableCell>
                          <TableCell>{formatCurrency(cost.uber_taxi_fuel)}</TableCell>
                          <TableCell>{formatCurrency(cost.hotel_accommodation)}</TableCell>
                          <TableCell>{formatCurrency(cost.hotel_extras)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditCost(cost)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (confirm("Deseja remover este registro?")) {
                                    deleteCostMutation.mutate(cost.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredCosts.length)} de {filteredCosts.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Table - Exactly like Excel */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo da Medição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Medição Total da Tripulação</span>
                <span className="font-bold">{formatCurrency(metrics.totalCrewMeasurement)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Total de Ajudas de Custo</span>
                <span className="font-bold">{formatCurrency(metrics.totalAllowances)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Total de Diárias de Hotel</span>
                <span className="font-bold">{formatCurrency(metrics.totalHotelDays)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Total de Alimentação Hotel</span>
                <span className="font-bold">{formatCurrency(metrics.totalHotelFood)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Total de Uber / Taxi / Aj de Custo para Combustível</span>
                <span className="font-bold">{formatCurrency(metrics.totalTransport)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Total Serviço de Transporte da Tripulação Hotel x Estaleiro / Estaleiro x Hotel</span>
                <span className="font-bold">{formatCurrency(metrics.totalCrewTransport)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Total de Passagens</span>
                <span className="font-bold">{formatCurrency(metrics.totalTickets)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t-2 border-primary bg-primary/5 px-3 rounded-lg mt-4">
                <span className="font-bold text-lg">Total Geral</span>
                <span className="font-bold text-xl text-primary">{formatCurrency(metrics.totalGeneral)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-green-500/5 px-3 rounded-lg">
                <span className="font-bold text-lg">Total Logística</span>
                <span className="font-bold text-xl text-green-600">{formatCurrency(metrics.totalLogistics)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modern Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Donut Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Distribuição de Custos
              </CardTitle>
              <CardDescription>Visão proporcional por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {CHART_COLORS.map((color, index) => (
                        <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={chartData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {chartData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#gradient-${index})`}
                          className="drop-shadow-sm hover:drop-shadow-lg transition-all duration-300"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={CustomTooltip} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={60}
                      formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Horizontal Bar Chart */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Comparativo por Categoria
              </CardTitle>
              <CardDescription>Análise detalhada dos valores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.filter(d => d.value > 0)} 
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <defs>
                      {CHART_COLORS.map((color, index) => (
                        <linearGradient key={index} id={`bar-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={color} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={130} 
                      fontSize={11}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <Tooltip content={CustomTooltip} />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 8, 8, 0]}
                      maxBarSize={35}
                    >
                      {chartData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#bar-gradient-${index})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Area Chart for Total Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visão Geral dos Custos
            </CardTitle>
            <CardDescription>Total geral: {formatCurrency(metrics.totalGeneral)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData.filter(d => d.value > 0)}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <Tooltip content={CustomTooltip} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fill="url(#areaGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Dialog */}
      <Dialog open={isCostDialogOpen} onOpenChange={setIsCostDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? "Editar Registro" : "Novo Registro de Custo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nome do Colaborador *</Label>
              <Input
                value={costForm.collaborator_name}
                onChange={(e) => setCostForm({ ...costForm, collaborator_name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>CIR</Label>
              <Input
                value={costForm.cir || ""}
                onChange={(e) => setCostForm({ ...costForm, cir: e.target.value })}
                placeholder="Número do CIR"
              />
            </div>
            <div>
              <Label>Função</Label>
              <Input
                value={costForm.job_function || ""}
                onChange={(e) => setCostForm({ ...costForm, job_function: e.target.value })}
                placeholder="Função a bordo"
              />
            </div>
            <div>
              <Label>Número de Dias</Label>
              <Input
                type="number"
                value={costForm.number_of_days}
                onChange={(e) => setCostForm({ ...costForm, number_of_days: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={costForm.period_start || ""}
                onChange={(e) => setCostForm({ ...costForm, period_start: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={costForm.period_end || ""}
                onChange={(e) => setCostForm({ ...costForm, period_end: e.target.value })}
              />
            </div>
            
            <div className="md:col-span-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 mt-2">Planos</h4>
            </div>
            <div>
              <Label>Plano Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.monthly_plan}
                onChange={(e) => setCostForm({ ...costForm, monthly_plan: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Plano Spot (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.spot_plan}
                onChange={(e) => setCostForm({ ...costForm, spot_plan: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Plano Stand By (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.standby_plan}
                onChange={(e) => setCostForm({ ...costForm, standby_plan: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 mt-2">Passagens e Ajudas</h4>
            </div>
            <div>
              <Label>Passagens (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.tickets}
                onChange={(e) => setCostForm({ ...costForm, tickets: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Ajuda de Custo Embarque (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.boarding_allowance}
                onChange={(e) => setCostForm({ ...costForm, boarding_allowance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Ajuda de Custo Desembarque (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.disembarking_allowance}
                onChange={(e) => setCostForm({ ...costForm, disembarking_allowance: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 mt-2">Transporte</h4>
            </div>
            <div>
              <Label>Uber/Taxi/Combustível (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.uber_taxi_fuel}
                onChange={(e) => setCostForm({ ...costForm, uber_taxi_fuel: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Transporte Tripulação Hotel/Estaleiro (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.crew_transport}
                onChange={(e) => setCostForm({ ...costForm, crew_transport: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 mt-2">Hospedagem</h4>
            </div>
            <div>
              <Label>Hospedagem Hotel (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.hotel_accommodation}
                onChange={(e) => setCostForm({ ...costForm, hotel_accommodation: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Extras Hotel (Refeições/Bebidas) (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={costForm.hotel_extras}
                onChange={(e) => setCostForm({ ...costForm, hotel_extras: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={costForm.notes || ""}
                onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCostDialogOpen(false);
              setEditingCost(null);
              resetCostForm();
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => costMutation.mutate(costForm)}
              disabled={!costForm.collaborator_name || costMutation.isPending}
            >
              {costMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
