import { useState, useEffect, useMemo, useCallback } from "react";
import { formatDateBR } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download, Phone, Mail, MapPin, Calendar, DollarSign, User, Trash2, Filter, Plus, Edit, Briefcase, ChevronLeft, ChevronRight, Building2, FileText, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { Input } from "@/components/ui/input";
import { ProfilePDFExport } from "@/components/ProfilePDFExport";
import { CandidateDetailView } from "@/components/CandidateDetailView";
import { AdminCandidateDrawer } from "@/components/AdminCandidateDrawer";
import { AssignCandidateToJob } from "@/components/AssignCandidateToJob";
import { AssignCandidateToClient } from "@/components/AssignCandidateToClient";
import { GenericTableReportExport, ReportColumn, ReportFilter } from "@/components/GenericTableReportExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Candidate {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
  gender?: "masculino" | "feminino" | "outro";
  residence_location?: string;
  desired_function?: string;
  professional_experience?: string;
  salary_expectation?: number;
  vessel_type?: string;
  available_from?: string;
  available_until?: string;
  profile_complete: boolean;
  created_at: string;
  cv_file_path?: string;
  cv_file_name?: string;
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address_number?: string;
  address_complement?: string;
  avatar_url?: string;
  // Informações de candidaturas com motivos de reprovação
  applications?: Array<{
    id: string;
    status: string;
    rejection_reason?: string;
    jobs: {
      title: string;
    };
  }>;
}

export default function AdminCandidates() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<string | null>(null);
  const [functionFilter, setFunctionFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [debouncedNameFilter, setDebouncedNameFilter] = useState('');
  const [debouncedFunctionFilter, setDebouncedFunctionFilter] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assigningCandidate, setAssigningCandidate] = useState<{ id: string; name: string } | null>(null);
  const [isAssignClientDialogOpen, setIsAssignClientDialogOpen] = useState(false);
  const [assigningCandidateToClient, setAssigningCandidateToClient] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const { toast } = useToast();

  // Debounce dos filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameFilter(nameFilter);
      setDebouncedFunctionFilter(functionFilter);
      setCurrentPage(1); // Reset para primeira página ao filtrar
    }, 500);

    return () => clearTimeout(timer);
  }, [nameFilter, functionFilter]);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniciando busca de candidatos...');
      
      // Buscar IDs de usuários que não devem ser listados
      const [admins, clients, tiUsers] = await Promise.all([
        supabase.from('administrators').select('user_id'),
        supabase.from('clients').select('user_id'),
        supabase.from('ti_users').select('user_id')
      ]);

      const excludedIds = [
        ...(admins.data?.map(a => a.user_id) || []),
        ...(clients.data?.map(c => c.user_id) || []),
        ...(tiUsers.data?.map(t => t.user_id) || [])
      ];

      console.log('🔍 Total de IDs excluídos:', excludedIds.length);

      // Query com paginação - só busca candidatos que NÃO estão nas tabelas de exclusão
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('role', 'candidate')
        .neq('role', 'ti')
        .order('created_at', { ascending: false });
      
      // Só aplica filtro de exclusão se houver IDs para excluir
      if (excludedIds.length > 0) {
        query = query.not('user_id', 'in', `(${excludedIds.join(',')})`);
      }

      // Aplicar filtros
      if (debouncedNameFilter) {
        query = query.ilike('full_name', `%${debouncedNameFilter}%`);
      }
      if (debouncedFunctionFilter) {
        query = query.ilike('desired_function', `%${debouncedFunctionFilter}%`);
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setCandidates(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      console.log('✅ Candidatos carregados:', data?.length, 'Total:', count);
    } catch (error) {
      console.error('❌ Erro ao carregar candidatos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar candidatos"
      });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [debouncedNameFilter, debouncedFunctionFilter, currentPage, toast]);

  useEffect(() => {
    fetchCandidates();

    // Subscription para atualizações em tempo real
    const subscription = supabase
      .channel('candidates-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.candidate' },
        () => {
          // Só recarrega se estiver na primeira página e sem filtros
          if (currentPage === 1 && !debouncedNameFilter && !debouncedFunctionFilter) {
            fetchCandidates();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCandidates, currentPage, debouncedNameFilter, debouncedFunctionFilter]);

  const viewCandidate = useCallback((candidate: Candidate) => {
    navigate(`/a/profissionais/${candidate.user_id}`);
  }, [navigate]);

  const editCandidate = useCallback((candidate: Candidate) => {
    setEditingCandidate(candidate);
    setIsFormDialogOpen(true);
  }, []);

  const addNewCandidate = useCallback(() => {
    setEditingCandidate(null);
    setIsFormDialogOpen(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    fetchCandidates();
    setIsFormDialogOpen(false);
    setEditingCandidate(null);
  }, [fetchCandidates]);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "Não informado";
    return formatDateBR(dateString);
  }, []);

  const openAssignDialog = useCallback((candidate: Candidate) => {
    setAssigningCandidate({ id: candidate.user_id, name: candidate.full_name });
    setIsAssignDialogOpen(true);
  }, []);

  const openAssignClientDialog = useCallback((candidate: Candidate) => {
    setAssigningCandidateToClient({ id: candidate.user_id, name: candidate.full_name });
    setIsAssignClientDialogOpen(true);
  }, []);

  const deleteCandidate = useCallback(async (candidateId: string) => {
    setDeletingCandidate(candidateId);
    try {
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate) {
        throw new Error('Candidato não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: candidate.user_id }
      });

      if (error) {
        console.error('❌ Erro na edge function delete-user:', error);
        throw new Error(error.message || 'Erro ao excluir usuário');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao excluir usuário');
      }

      toast({
        title: "Sucesso",
        description: "Candidato excluído completamente do sistema",
        variant: "default"
      });

      setCandidates(prevCandidates => 
        prevCandidates.filter(candidate => candidate.id !== candidateId)
      );
    } catch (error: any) {
      console.error('❌ Erro ao excluir candidato:', error);
      toast({
        title: "Erro",
        description: `Erro ao excluir candidato: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setDeletingCandidate(null);
    }
  }, [candidates, toast]);

  const [exporting, setExporting] = useState(false);
  const exportAllToExcel = useCallback(async () => {
    setExporting(true);
    try {
      const [admins, clients, tiUsers] = await Promise.all([
        supabase.from('administrators').select('user_id'),
        supabase.from('clients').select('user_id'),
        supabase.from('ti_users').select('user_id'),
      ]);
      const excludedIds = [
        ...(admins.data?.map(a => a.user_id) || []),
        ...(clients.data?.map(c => c.user_id) || []),
        ...(tiUsers.data?.map(t => t.user_id) || []),
      ];

      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        let q = supabase
          .from('profiles')
          .select('full_name, email, phone, desired_function')
          .eq('role', 'candidate')
          .order('full_name', { ascending: true })
          .range(from, from + pageSize - 1);
        if (excludedIds.length > 0) {
          q = q.not('user_id', 'in', `(${excludedIds.join(',')})`);
        }
        const { data, error } = await q;
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Candidatos');
      ws.columns = [
        { header: 'Nome', key: 'full_name', width: 40 },
        { header: 'Função', key: 'desired_function', width: 30 },
        { header: 'E-mail', key: 'email', width: 35 },
        { header: 'Telefone', key: 'phone', width: 22 },
      ];
      ws.getRow(1).font = { bold: true };
      all.forEach(r => ws.addRow({
        full_name: r.full_name || '',
        desired_function: r.desired_function || 'Não informado',
        email: r.email || '',
        phone: r.phone || '',
      }));

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidatos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Exportado', description: `${all.length} candidatos exportados.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message || 'Falha ao exportar' });
    } finally {
      setExporting(false);
    }
  }, [toast]);

  // Memoizar a lista filtrada
  const displayedCandidates = useMemo(() => candidates, [candidates]);

  if (initialLoad) {
    return (
      <DashboardLayout userType="admin">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-maritime-blue">Candidatos</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Visualize e gerencie todos os candidatos cadastrados
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Todos os Candidatos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Página {currentPage} de {totalPages} - Exibindo {candidates.length} de {totalPages * itemsPerPage} candidatos
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <GenericTableReportExport
                    title="Relatório de Candidatos"
                    subtitle="Gestão de Candidatos"
                    data={candidates}
                    columns={[
                      { key: 'full_name', label: 'Nome Completo' },
                      { key: 'email', label: 'E-mail' },
                      { key: 'phone', label: 'Telefone' },
                      { key: 'desired_function', label: 'Função Desejada', format: (v) => v || 'Não informado' },
                      { key: 'city', label: 'Cidade', format: (v) => v || '-' },
                      { key: 'state', label: 'Estado', format: (v) => v || '-' },
                      { key: 'profile_complete', label: 'Perfil', format: (v) => v ? 'Completo' : 'Incompleto' },
                      { key: 'created_at', label: 'Cadastro', format: (v) => formatDateBR(v) },
                    ]}
                    filters={[
                      { key: 'full_name', label: 'Nome', type: 'text' },
                      { key: 'desired_function', label: 'Função', type: 'text' },
                      { key: 'profile_complete', label: 'Status do Perfil', type: 'select', options: [
                        { value: 'true', label: 'Completo' },
                        { value: 'false', label: 'Incompleto' },
                      ], filterFn: (row, val) => String(row.profile_complete) === val },
                    ]}
                    fileName="candidatos"
                  />
                  <Button onClick={exportAllToExcel} disabled={exporting} variant="outline" className="gap-2 text-sm h-9" size="sm">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="hidden sm:inline">{exporting ? 'Exportando...' : 'Exportar Excel'}</span>
                    <span className="sm:hidden">Excel</span>
                  </Button>
                  <Button onClick={addNewCandidate} className="gap-2 text-sm h-9" size="sm">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Adicionar Candidato</span>
                    <span className="sm:hidden">Adicionar</span>
                  </Button>

                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Buscar por nome..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="w-full h-9 text-sm"
                  />
                </div>
                <div className="relative flex-1">
                  <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Filtrar por função..."
                    value={functionFilter}
                    onChange={(e) => setFunctionFilter(e.target.value)}
                    className="w-full pl-10 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Tabela desktop - oculta em mobile */}
            <div className="hidden lg:block overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Função Desejada</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCandidates.map((candidate, index) => (
                    <TableRow 
                      key={candidate.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => viewCandidate(candidate)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={candidate.avatar_url || undefined} 
                            alt={candidate.full_name}
                          />
                          <AvatarFallback className="bg-maritime-blue text-primary-foreground">
                            {candidate.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{candidate.full_name}</TableCell>
                      <TableCell>{candidate.email}</TableCell>
                      <TableCell>{candidate.phone}</TableCell>
                      <TableCell>{candidate.desired_function || "Não informado"}</TableCell>
                      <TableCell>
                        <Badge variant={candidate.profile_complete ? "success" : "warning"}>
                          {candidate.profile_complete ? "Completo" : "Incompleto"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(candidate.created_at)}</TableCell>
                      <TableCell className="min-w-[240px]">
                        <div className="flex gap-1 flex-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => viewCandidate(candidate)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => editCandidate(candidate)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => openAssignDialog(candidate)} title="Atribuir a Vaga">
                            <Briefcase className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => openAssignClientDialog(candidate)} title="Atribuir a Cliente">
                            <Building2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
                                disabled={deletingCandidate === candidate.id}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Candidato</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o candidato "{candidate.full_name}"? 
                                  Esta ação não pode ser desfeita e todos os dados serão permanentemente removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteCandidate(candidate.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-4 px-4 sm:px-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Cards mobile - visível apenas em telas pequenas */}
            <div className="lg:hidden space-y-3 p-4">
              {displayedCandidates.map((candidate) => (
                <Card key={candidate.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage 
                          src={candidate.avatar_url || undefined} 
                          alt={candidate.full_name}
                        />
                        <AvatarFallback className="bg-maritime-blue text-primary-foreground text-sm">
                          {candidate.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{candidate.full_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                        <p className="text-xs text-muted-foreground">{candidate.phone}</p>
                      </div>
                      <Badge variant={candidate.profile_complete ? "success" : "warning"} className="text-xs flex-shrink-0">
                        {candidate.profile_complete ? "Completo" : "Incompleto"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground truncate">{candidate.desired_function || "Não informado"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Cadastro: {formatDate(candidate.created_at)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" onClick={() => viewCandidate(candidate)} className="text-xs h-8">
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => editCandidate(candidate)} className="text-xs h-8">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(candidate)} className="text-xs h-8">
                        <Briefcase className="h-3 w-3 mr-1" />
                        Vaga
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignClientDialog(candidate)} className="text-xs h-8">
                        <Building2 className="h-3 w-3 mr-1" />
                        Cliente
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive text-xs h-8 col-span-2"
                            disabled={deletingCandidate === candidate.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Candidato</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o candidato "{candidate.full_name}"? 
                              Esta ação não pode ser desfeita e todos os dados serão permanentemente removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteCandidate(candidate.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paginação mobile */}
            <div className="lg:hidden flex items-center justify-between mt-4 px-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialog para visualizar candidato */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil do Candidato: {selectedCandidate?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCandidate && <CandidateDetailView candidate={selectedCandidate} />}
          </DialogContent>
        </Dialog>

        {/* Drawer para adicionar/editar candidato */}
        <AdminCandidateDrawer
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          candidate={editingCandidate}
          onSuccess={handleFormSuccess}
        />

        {/* Dialog para atribuir candidato a vaga */}
        {assigningCandidate && (
          <AssignCandidateToJob
            candidateId={assigningCandidate.id}
            candidateName={assigningCandidate.name}
            isOpen={isAssignDialogOpen}
            onClose={() => {
              setIsAssignDialogOpen(false);
              setAssigningCandidate(null);
            }}
          />
        )}

        {/* Dialog para atribuir candidato a cliente */}
        {assigningCandidateToClient && (
          <AssignCandidateToClient
            candidateId={assigningCandidateToClient.id}
            candidateName={assigningCandidateToClient.name}
            isOpen={isAssignClientDialogOpen}
            onClose={() => {
              setIsAssignClientDialogOpen(false);
              setAssigningCandidateToClient(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}