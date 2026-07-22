import { useState, useEffect } from "react";
import { formatDateBR } from "@/lib/utils";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Ship, Building2, LayoutDashboard, Users, UserCheck, Calendar } from "lucide-react";

type BoardingStatus = "EM" | "REP" | "DS" | "DEMITIR";

interface Company {
  id: string;
  name: string;
  created_at: string;
}

interface Unit {
  id: string;
  name: string;
  location: string | null;
  company_id: string;
  boarding_companies?: { name: string };
}

interface Employee {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  unit_id: string;
  boarding_units?: {
    name: string;
    boarding_companies: { name: string };
  };
}

interface BoardingRecord {
  employee_id: string;
  record_date: string;
  status: BoardingStatus;
}

const MONTHS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const STATUS_OPTIONS: { value: BoardingStatus; label: string; color: string }[] = [
  { value: "EM", label: "Embarcado", color: "text-green-600" },
  { value: "REP", label: "Repouso", color: "text-blue-600" },
  { value: "DS", label: "Desembarque", color: "text-orange-600" },
  { value: "DEMITIR", label: "Demitir", color: "text-red-600" },
];

export default function BoardingControl() {
  const { userRole } = useAuth();
  const userType = (userRole === "admin" || userRole === "ti") ? "admin" : "client";
  const [activeTab, setActiveTab] = useState("approved");
  
  // Control states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<BoardingRecord[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  
  // Form states
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitLocation, setUnitLocation] = useState("");
  const [unitCompanyId, setUnitCompanyId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [employeeCompanyId, setEmployeeCompanyId] = useState("");
  const [employeeUnitId, setEmployeeUnitId] = useState("");
  const [employeeUnits, setEmployeeUnits] = useState<Unit[]>([]);

  // All data states
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  
  // Approved candidates state
  const [approvedCandidates, setApprovedCandidates] = useState<any[]>([]);
  const [selectedApprovedCandidate, setSelectedApprovedCandidate] = useState<string>("");
  const [approvedRecords, setApprovedRecords] = useState<BoardingRecord[]>([]);
  const [approvedMonth, setApprovedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [approvedYear, setApprovedYear] = useState<string>(String(new Date().getFullYear()));
  const [loadingApproved, setLoadingApproved] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchAllUnits();
    fetchAllEmployees();
    fetchApprovedCandidates();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchUnits(selectedCompany);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedUnit && selectedMonth && selectedYear) {
      fetchEmployees(selectedUnit);
      fetchRecords(selectedUnit, selectedMonth, selectedYear);
    }
  }, [selectedUnit, selectedMonth, selectedYear]);

  useEffect(() => {
    if (employeeCompanyId) {
      fetchEmployeeUnits(employeeCompanyId);
    }
  }, [employeeCompanyId]);

  useEffect(() => {
    if (selectedApprovedCandidate && approvedMonth && approvedYear) {
      fetchApprovedCandidateRecords(selectedApprovedCandidate, approvedMonth, approvedYear);
    }
  }, [selectedApprovedCandidate, approvedMonth, approvedYear]);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from("boarding_companies")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar empresas");
      return;
    }
    setCompanies(data || []);
  };

  const fetchUnits = async (companyId: string) => {
    const { data, error } = await supabase
      .from("boarding_units")
      .select("*")
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar unidades");
      return;
    }
    setUnits(data || []);
    setSelectedUnit("");
  };

  const fetchAllUnits = async () => {
    const { data, error } = await supabase
      .from("boarding_units")
      .select("*, boarding_companies(name)")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar unidades");
      return;
    }
    setAllUnits(data || []);
  };

  const fetchEmployeeUnits = async (companyId: string) => {
    const { data, error } = await supabase
      .from("boarding_units")
      .select("*")
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar unidades");
      return;
    }
    setEmployeeUnits(data || []);
  };

  const fetchEmployees = async (unitId: string) => {
    const { data, error } = await supabase
      .from("boarding_employees")
      .select("*")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar colaboradores");
      return;
    }
    setEmployees(data || []);
  };

  const fetchAllEmployees = async () => {
    const { data, error } = await supabase
      .from("boarding_employees")
      .select("*, boarding_units(name, boarding_companies(name))")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar colaboradores");
      return;
    }
    setAllEmployees(data || []);
  };

  const fetchApprovedCandidates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get candidates approved by this client or their company
    const { data: clientData } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let clientId = clientData?.id;

    if (!clientId) {
      const { data: companyUserData } = await supabase
        .from("company_users")
        .select("client_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      clientId = companyUserData?.client_id;
    }

    if (!clientId && userType !== "admin") return;

    let query = supabase
      .from("client_candidates")
      .select(`
        id,
        candidate_id,
        vessel_name,
        period_start,
        period_end,
        boarding_employee_id,
        interview_status,
        notes,
        candidate:candidate_id (
          full_name,
          desired_function
        )
      `)
      .eq("interview_status", "approved")
      .not("boarding_employee_id", "is", null);

    if (clientId && userType !== "admin") {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query.order("period_start", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar profissionais aprovados");
      return;
    }

    const normalized = (data || []).map((a: any) => ({
      ...a,
      candidate: Array.isArray(a.candidate) ? a.candidate[0] : a.candidate,
    }));

    setApprovedCandidates(normalized);
  };

  const fetchApprovedCandidateRecords = async (boardingEmployeeId: string, month: string, year: string) => {
    setLoadingApproved(true);
    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, "0")}-${daysInMonth}`;

    const { data, error } = await (supabase as any)
      .from("boarding_records")
      .select("*")
      .eq("employee_id", boardingEmployeeId)
      .gte("record_date", startDate)
      .lte("record_date", endDate);

    if (error) {
      toast.error("Erro ao carregar registros");
      setLoadingApproved(false);
      return;
    }
    setApprovedRecords(data || []);
    setLoadingApproved(false);
  };

  const updateApprovedRecord = async (employeeId: string, day: number, status: BoardingStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const recordDate = `${approvedYear}-${approvedMonth.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    const { error } = await (supabase as any)
      .from("boarding_records")
      .upsert({
        employee_id: employeeId,
        record_date: recordDate,
        status: status,
        updated_by: user.id,
      }, {
        onConflict: "employee_id,record_date"
      });

    if (error) {
      toast.error("Erro ao salvar registro");
      return;
    }

    setApprovedRecords(prev => {
      const existing = prev.find(r => r.employee_id === employeeId && r.record_date === recordDate);
      if (existing) {
        return prev.map(r => 
          r.employee_id === employeeId && r.record_date === recordDate
            ? { ...r, status }
            : r
        );
      }
      return [...prev, { employee_id: employeeId, record_date: recordDate, status }];
    });

    toast.success("Registro atualizado");
  };

  const getApprovedStatusForDay = (employeeId: string, day: number): BoardingStatus | undefined => {
    const recordDate = `${approvedYear}-${approvedMonth.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = approvedRecords.find(r => r.employee_id === employeeId && r.record_date === recordDate);
    return record?.status;
  };

  const fetchRecords = async (unitId: string, month: string, year: string) => {
    setLoading(true);
    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, "0")}-${daysInMonth}`;

    const { data, error } = await (supabase as any)
      .from("boarding_records")
      .select("*")
      .gte("record_date", startDate)
      .lte("record_date", endDate)
      .in("employee_id", employees.map(e => e.id));

    if (error) {
      toast.error("Erro ao carregar registros");
      setLoading(false);
      return;
    }
    setRecords(data || []);
    setLoading(false);
  };

  const updateRecord = async (employeeId: string, day: number, status: BoardingStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const recordDate = `${selectedYear}-${selectedMonth.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    const { error } = await (supabase as any)
      .from("boarding_records")
      .upsert({
        employee_id: employeeId,
        record_date: recordDate,
        status: status,
        updated_by: user.id,
      }, {
        onConflict: "employee_id,record_date"
      });

    if (error) {
      toast.error("Erro ao salvar registro");
      return;
    }

    setRecords(prev => {
      const existing = prev.find(r => r.employee_id === employeeId && r.record_date === recordDate);
      if (existing) {
        return prev.map(r => 
          r.employee_id === employeeId && r.record_date === recordDate
            ? { ...r, status }
            : r
        );
      }
      return [...prev, { employee_id: employeeId, record_date: recordDate, status }];
    });

    toast.success("Registro atualizado");
  };

  const getStatusForDay = (employeeId: string, day: number): BoardingStatus | undefined => {
    const recordDate = `${selectedYear}-${selectedMonth.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const record = records.find(r => r.employee_id === employeeId && r.record_date === recordDate);
    return record?.status;
  };

  // Company CRUD
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingCompany) {
      const { error } = await supabase
        .from("boarding_companies")
        .update({ name: companyName })
        .eq("id", editingCompany.id);

      if (error) {
        toast.error("Erro ao atualizar empresa");
        return;
      }
      toast.success("Empresa atualizada");
    } else {
      const { error } = await supabase
        .from("boarding_companies")
        .insert({ name: companyName, created_by: user.id });

      if (error) {
        toast.error("Erro ao criar empresa");
        return;
      }
      toast.success("Empresa criada");
    }

    setCompanyDialogOpen(false);
    setCompanyName("");
    setEditingCompany(null);
    fetchCompanies();
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyName(company.name);
    setCompanyDialogOpen(true);
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Tem certeza? Todas as unidades e colaboradores serão removidos.")) return;
    
    const { error } = await supabase.from("boarding_companies").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir empresa");
      return;
    }
    toast.success("Empresa excluída");
    fetchCompanies();
  };

  // Unit CRUD
  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingUnit) {
      const { error } = await supabase
        .from("boarding_units")
        .update({ name: unitName, location: unitLocation, company_id: unitCompanyId })
        .eq("id", editingUnit.id);

      if (error) {
        toast.error("Erro ao atualizar unidade");
        return;
      }
      toast.success("Unidade atualizada");
    } else {
      const { error } = await supabase
        .from("boarding_units")
        .insert({ name: unitName, location: unitLocation, company_id: unitCompanyId, created_by: user.id });

      if (error) {
        toast.error("Erro ao criar unidade");
        return;
      }
      toast.success("Unidade criada");
    }

    setUnitDialogOpen(false);
    setUnitName("");
    setUnitLocation("");
    setUnitCompanyId("");
    setEditingUnit(null);
    fetchAllUnits();
  };

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitName(unit.name);
    setUnitLocation(unit.location || "");
    setUnitCompanyId(unit.company_id);
    setUnitDialogOpen(true);
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm("Tem certeza? Todos os colaboradores serão removidos.")) return;
    
    const { error } = await supabase.from("boarding_units").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir unidade");
      return;
    }
    toast.success("Unidade excluída");
    fetchAllUnits();
  };

  // Employee CRUD
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingEmployee) {
      const { error } = await supabase
        .from("boarding_employees")
        .update({ name: employeeName, role: employeeRole, unit_id: employeeUnitId })
        .eq("id", editingEmployee.id);

      if (error) {
        toast.error("Erro ao atualizar colaborador");
        return;
      }
      toast.success("Colaborador atualizado");
    } else {
      const { error } = await supabase
        .from("boarding_employees")
        .insert({ name: employeeName, role: employeeRole, unit_id: employeeUnitId, created_by: user.id });

      if (error) {
        toast.error("Erro ao criar colaborador");
        return;
      }
      toast.success("Colaborador criado");
    }

    setEmployeeDialogOpen(false);
    setEmployeeName("");
    setEmployeeRole("");
    setEmployeeCompanyId("");
    setEmployeeUnitId("");
    setEditingEmployee(null);
    fetchAllEmployees();
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeName(employee.name);
    setEmployeeRole(employee.role);
    setEmployeeUnitId(employee.unit_id);
    setEmployeeDialogOpen(true);
  };

  const handleToggleEmployeeActive = async (employee: Employee) => {
    const { error } = await supabase
      .from("boarding_employees")
      .update({ is_active: !employee.is_active })
      .eq("id", employee.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(employee.is_active ? "Colaborador desativado" : "Colaborador ativado");
    fetchAllEmployees();
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Tem certeza? Todos os registros de embarque serão removidos.")) return;
    
    const { error } = await supabase.from("boarding_employees").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir colaborador");
      return;
    }
    toast.success("Colaborador excluído");
    fetchAllEmployees();
  };

  const daysInMonth = selectedMonth && selectedYear 
    ? new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate()
    : 0;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const approvedDaysInMonth = approvedMonth && approvedYear 
    ? new Date(parseInt(approvedYear), parseInt(approvedMonth), 0).getDate()
    : 0;

  const approvedDays = Array.from({ length: approvedDaysInMonth }, (_, i) => i + 1);

  const selectedApprovedCandidateData = approvedCandidates.find(c => c.boarding_employee_id === selectedApprovedCandidate);

  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Controle de Embarque</h1>
          <p className="text-muted-foreground mt-1">Gerencie empresas, unidades, colaboradores e embarques</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Aprovados</span>
            </TabsTrigger>
            <TabsTrigger value="control" className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              <span className="hidden sm:inline">Controle</span>
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresas</span>
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Unidades</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Colaboradores</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Profissionais Aprovados */}
          <TabsContent value="approved" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Profissionais Aprovados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Profissional</label>
                    <Select value={selectedApprovedCandidate} onValueChange={setSelectedApprovedCandidate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional..." />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedCandidates.map(candidate => (
                          <SelectItem key={candidate.id} value={candidate.boarding_employee_id}>
                            <div className="flex flex-col">
                              <span>{candidate.candidate?.full_name || "N/A"}</span>
                              <span className="text-xs text-muted-foreground">
                                {candidate.vessel_name} • {candidate.period_start} a {candidate.period_end}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mês</label>
                    <Select value={approvedMonth} onValueChange={setApprovedMonth}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ano</label>
                    <Select value={approvedYear} onValueChange={setApprovedYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028].map(year => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedApprovedCandidateData && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Profissional:</span>
                        <p className="font-medium">{selectedApprovedCandidateData.candidate?.full_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Função:</span>
                        <p className="font-medium">{selectedApprovedCandidateData.candidate?.desired_function || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Embarcação:</span>
                        <p className="font-medium">{selectedApprovedCandidateData.vessel_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Período:</span>
                        <p className="font-medium">
                          {selectedApprovedCandidateData.period_start && formatDateBR(selectedApprovedCandidateData.period_start)} 
                          {" - "}
                          {selectedApprovedCandidateData.period_end && formatDateBR(selectedApprovedCandidateData.period_end)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedApprovedCandidate ? (
                  loadingApproved ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Profissional</TableHead>
                            {approvedDays.map(day => (
                              <TableHead key={day} className="text-center min-w-[80px]">{String(day).padStart(2, "0")}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {selectedApprovedCandidateData?.candidate?.full_name || "N/A"}
                            </TableCell>
                            {approvedDays.map(day => {
                              const currentStatus = getApprovedStatusForDay(selectedApprovedCandidate, day);
                              return (
                                <TableCell key={day} className="p-1">
                                  <Select
                                    value={currentStatus || ""}
                                    onValueChange={(value) => updateApprovedRecord(selectedApprovedCandidate, day, value as BoardingStatus)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map(status => (
                                        <SelectItem key={status.value} value={status.value} className={status.color}>
                                          {status.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {approvedCandidates.length > 0 
                        ? "Selecione um profissional para ver o calendário de embarque"
                        : "Nenhum profissional aprovado encontrado. Aprove candidatos na tela de Candidatos."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Controle */}
          <TabsContent value="control" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Empresa</label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unidade</label>
                    <Select value={selectedUnit} onValueChange={setSelectedUnit} disabled={!selectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mês</label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(month => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ano</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028].map(year => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedUnit && (
              <Card>
                <CardHeader>
                  <CardTitle>Calendário - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : employees.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Colaborador</TableHead>
                            <TableHead className="sticky left-[200px] bg-background z-10 min-w-[150px]">Função</TableHead>
                            {days.map(day => (
                              <TableHead key={day} className="text-center min-w-[80px]">{String(day).padStart(2, "0")}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map(employee => (
                            <TableRow key={employee.id}>
                              <TableCell className="sticky left-0 bg-background font-medium">{employee.name}</TableCell>
                              <TableCell className="sticky left-[200px] bg-background">{employee.role}</TableCell>
                              {days.map(day => {
                                const currentStatus = getStatusForDay(employee.id, day);
                                return (
                                  <TableCell key={day} className="p-1">
                                    <Select
                                      value={currentStatus || ""}
                                      onValueChange={(value) => updateRecord(employee.id, day, value as BoardingStatus)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {STATUS_OPTIONS.map(status => (
                                          <SelectItem key={status.value} value={status.value} className={status.color}>
                                            {status.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Empresas */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={companyDialogOpen} onOpenChange={(open) => { setCompanyDialogOpen(open); if (!open) { setEditingCompany(null); setCompanyName(""); } }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCompany ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCompanySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Empresa</Label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">{editingCompany ? "Atualizar" : "Criar"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader><CardTitle>Lista de Empresas</CardTitle></CardHeader>
              <CardContent>
                {companies.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data de Criação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>{formatDateBR(company.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => handleEditCompany(company)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCompany(company.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Unidades */}
          <TabsContent value="units" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={unitDialogOpen} onOpenChange={(open) => { setUnitDialogOpen(open); if (!open) { setEditingUnit(null); setUnitName(""); setUnitLocation(""); setUnitCompanyId(""); } }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Unidade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUnit ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUnitSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Select value={unitCompanyId} onValueChange={setUnitCompanyId} required>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome da Unidade</Label>
                      <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Localização</Label>
                      <Input value={unitLocation} onChange={(e) => setUnitLocation(e.target.value)} placeholder="Opcional" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setUnitDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">{editingUnit ? "Atualizar" : "Criar"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader><CardTitle>Lista de Unidades</CardTitle></CardHeader>
              <CardContent>
                {allUnits.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUnits.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell className="font-medium">{unit.name}</TableCell>
                          <TableCell>{unit.boarding_companies?.name}</TableCell>
                          <TableCell>{unit.location || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => handleEditUnit(unit)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUnit(unit.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Colaboradores */}
          <TabsContent value="employees" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={employeeDialogOpen} onOpenChange={(open) => { setEmployeeDialogOpen(open); if (!open) { setEditingEmployee(null); setEmployeeName(""); setEmployeeRole(""); setEmployeeCompanyId(""); setEmployeeUnitId(""); } }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Colaborador
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingEmployee ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Select value={employeeCompanyId} onValueChange={setEmployeeCompanyId} required>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Unidade</Label>
                      <Select value={employeeUnitId} onValueChange={setEmployeeUnitId} disabled={!employeeCompanyId} required>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {employeeUnits.map(unit => (
                            <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Função</Label>
                      <Input value={employeeRole} onChange={(e) => setEmployeeRole(e.target.value)} required />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setEmployeeDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">{editingEmployee ? "Atualizar" : "Criar"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader><CardTitle>Lista de Colaboradores</CardTitle></CardHeader>
              <CardContent>
                {allEmployees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum colaborador cadastrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.role}</TableCell>
                          <TableCell>{employee.boarding_units?.name}</TableCell>
                          <TableCell>{employee.boarding_units?.boarding_companies?.name}</TableCell>
                          <TableCell>
                            <Badge variant={employee.is_active ? "default" : "secondary"}>
                              {employee.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => handleToggleEmployeeActive(employee)}>
                                {employee.is_active ? "Desativar" : "Ativar"}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(employee)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteEmployee(employee.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
