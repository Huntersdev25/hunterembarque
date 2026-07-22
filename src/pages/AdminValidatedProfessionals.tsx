import { useState, DragEvent } from "react";
import { parseDateLocal } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, Building2, Calendar, User, Mail, Phone, 
  XCircle, Clock, Stethoscope, UserCheck, 
  Eye, MoreHorizontal, MapPin, Settings
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { CandidateDetailView } from "@/components/CandidateDetailView";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { VisibilityControlDrawer } from "@/components/VisibilityControlDrawer";

// Configuração das colunas do Kanban
const KANBAN_COLUMNS = [
  { 
    id: 'pending', 
    label: "Pendentes", 
    color: "#64748b",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    statuses: ['pending', null, undefined, ''],
    icon: Clock,
    targetStatus: 'pending'
  },
  { 
    id: 'interview', 
    label: "Entrevista", 
    color: "#3b82f6",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    statuses: ['interview'],
    icon: UserCheck,
    targetStatus: 'interview'
  },
  { 
    id: 'aso', 
    label: "ASO", 
    color: "#8b5cf6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    statuses: ['aso'],
    icon: Stethoscope,
    targetStatus: 'aso'
  },
  { 
    id: 'completed', 
    label: "Concluído", 
    color: "#22c55e",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    statuses: ['completed', 'approved', 'hired', 'contracted'],
    icon: CheckCircle,
    targetStatus: 'completed'
  },
];

export default function AdminValidatedProfessionals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; recordId: string | null; name: string }>({
    open: false,
    recordId: null,
    name: ""
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [visibilityDialog, setVisibilityDialog] = useState<{ 
    open: boolean; 
    record: any;
  }>({
    open: false,
    record: null
  });
  const [visibilityData, setVisibilityData] = useState<any>(null);

  // Realtime sync para atualizações em tempo real
  useRealtimeSync({
    table: "client_candidates",
    queryKey: ["workflow-professionals"],
    enabled: true,
  });

  // Buscar todos os clientes para o filtro
  const { data: clients } = useQuery({
    queryKey: ["clients-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar todos os profissionais atribuídos a clientes
  const { data: professionals, isLoading } = useQuery({
    queryKey: ["workflow-professionals", selectedClient],
    queryFn: async () => {
      // Buscar todos os registros, incluindo os com interview_status null
      let query = supabase
        .from("client_candidates")
        .select(`
          *,
          clients (
            id,
            company_name,
            contact_name,
            email,
            phone
          ),
          profiles:candidate_id (
            user_id,
            full_name,
            email,
            phone,
            desired_function,
            professional_experience,
            avatar_url,
            cpf,
            rg,
            city,
            state
          )
        `)
        .order("assigned_at", { ascending: false });

      if (selectedClient !== "all") {
        query = query.eq("client_id", selectedClient);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Erro ao buscar profissionais:", error);
        throw error;
      }
      
      // Filtrar rejeitados no lado do cliente para incluir nulls corretamente
      const filtered = (data || []).filter((p: any) => p.interview_status !== 'rejected');
      
      console.log("📊 Profissionais carregados:", filtered.length, filtered);
      return filtered;
    },
  });

  // Mutation para atualizar status (usado no drag-and-drop e botões)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ recordId, newStatus }: { recordId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("client_candidates")
        .update({ 
          interview_status: newStatus,
          interview_evaluated_at: new Date().toISOString()
        })
        .eq("id", recordId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-professionals"] });
      const column = KANBAN_COLUMNS.find(c => c.targetStatus === variables.newStatus);
      toast({
        title: "Status atualizado",
        description: `Profissional movido para: ${column?.label || variables.newStatus}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para rejeitar profissional
  const rejectMutation = useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string; reason: string }) => {
      const { error } = await supabase
        .from("client_candidates")
        .update({ 
          interview_status: "rejected",
          rejection_reason: reason,
          interview_evaluated_at: new Date().toISOString()
        })
        .eq("id", recordId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-professionals"] });
      toast({
        title: "Profissional rejeitado",
        description: "O profissional foi removido do processo.",
      });
      setRejectDialog({ open: false, recordId: null, name: "" });
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao rejeitar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para abrir controle de visibilidade
  const handleOpenVisibility = async (record: any) => {
    // Buscar dados de visibilidade atuais
    const { data } = await supabase
      .from("client_candidate_visibility")
      .select("*")
      .eq("client_candidate_id", record.id)
      .maybeSingle();
    
    setVisibilityData(data);
    setVisibilityDialog({ open: true, record });
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Filtrar profissionais por coluna do Kanban
  const getColumnProfessionals = (columnId: string) => {
    const column = KANBAN_COLUMNS.find(c => c.id === columnId);
    if (!column || !professionals) return [];
    
    return professionals.filter((p: any) => {
      const status = p.interview_status;
      // Para a coluna 'pending', incluir null, undefined, '', ou 'pending'
      if (column.id === 'pending') {
        return !status || status === 'pending' || status === '';
      }
      return column.statuses.includes(status);
    });
  };

  // Drag and Drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, recordId: string) => {
    setDraggedItem(recordId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', recordId);
    // Adicionar classe visual ao elemento arrastado
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggedItem(null);
    setDragOverColumn(null);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    const recordId = e.dataTransfer.getData('text/plain');
    const column = KANBAN_COLUMNS.find(c => c.id === columnId);
    
    if (recordId && column) {
      // Verificar se não é a mesma coluna
      const record = professionals?.find((p: any) => p.id === recordId);
      const currentColumn = KANBAN_COLUMNS.find(c => {
        const status = record?.interview_status;
        if (c.id === 'pending') return !status || status === 'pending' || status === '';
        return c.statuses.includes(status);
      });

      if (currentColumn?.id !== columnId) {
        updateStatusMutation.mutate({ recordId, newStatus: column.targetStatus });
      }
    }
    
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const handleConfirmReject = () => {
    if (!rejectDialog.recordId) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o motivo da reprovação.",
        variant: "destructive",
      });
      return;
    }

    rejectMutation.mutate({ 
      recordId: rejectDialog.recordId, 
      reason: rejectionReason.trim() 
    });
  };

  const renderKanbanCard = (record: any) => {
    const isBeingDragged = draggedItem === record.id;

    return (
      <div
        key={record.id}
        draggable
        onDragStart={(e) => handleDragStart(e, record.id)}
        onDragEnd={handleDragEnd}
        className={`
          bg-white rounded-lg border shadow-sm mb-3 cursor-grab active:cursor-grabbing
          transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
          ${isBeingDragged ? 'opacity-50 scale-95' : ''}
        `}
        style={{ 
          borderLeftWidth: '4px',
          borderLeftColor: KANBAN_COLUMNS.find(c => {
            const status = record.interview_status;
            if (c.id === 'pending') return !status || status === 'pending';
            return c.statuses.includes(status);
          })?.color || '#64748b'
        }}
      >
        <div className="p-3">
          {/* Header do Card */}
          <div className="flex items-start gap-2">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={record.profiles?.avatar_url} alt={record.profiles?.full_name} />
              <AvatarFallback className="text-xs font-medium bg-primary/10">
                {getInitials(record.profiles?.full_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 overflow-hidden">
              <h4 className="font-semibold text-sm leading-tight truncate" title={record.profiles?.full_name}>
                {record.profiles?.full_name || "Nome não disponível"}
              </h4>
              <p className="text-xs text-muted-foreground truncate" title={record.profiles?.email}>
                {record.profiles?.email || "Email não disponível"}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                <DropdownMenuItem onClick={() => {
                  if (record.profiles?.user_id) {
                    navigate(`/a/profissionais/${record.profiles.user_id}`);
                  }
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenVisibility(record)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Controle de Visibilidade
                </DropdownMenuItem>
                {record.interview_status !== 'completed' && (
                  <DropdownMenuItem 
                    onClick={() => setRejectDialog({
                      open: true,
                      recordId: record.id,
                      name: record.profiles?.full_name || "profissional"
                    })}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reprovar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Função */}
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs font-normal truncate max-w-full">
              {record.profiles?.desired_function || "Função não definida"}
            </Badge>
          </div>

          {/* Info adicional */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{record.clients?.company_name || "Cliente não definido"}</span>
            </div>
            
            {(record.profiles?.city || record.profiles?.state) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {[record.profiles?.city, record.profiles?.state].filter(Boolean).join(", ")}
                </span>
              </div>
            )}

            {record.interview_date && (
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3 w-3 flex-shrink-0 text-blue-500" />
                <span className="text-blue-600 font-medium">
                  {format(parseDateLocal(record.interview_date), "dd/MM", { locale: ptBR })}
                  {record.interview_time && ` às ${record.interview_time.slice(0, 5)}`}
                </span>
              </div>
            )}

            {record.aso_status && record.aso_status !== 'pendente' && (
              <div className="flex items-center gap-1.5">
                <Stethoscope className="h-3 w-3 flex-shrink-0" />
                <Badge 
                  variant="outline" 
                  className={`text-xs py-0 h-5 ${
                    record.aso_status === 'finalizado' ? 'bg-green-50 text-green-700 border-green-200' :
                    record.aso_status === 'marcado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-gray-50'
                  }`}
                >
                  ASO: {record.aso_status}
                </Badge>
              </div>
            )}
          </div>

          {/* Data de atribuição */}
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Atribuído em {format(parseDateLocal(record.assigned_at), "dd/MM/yy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderKanbanColumn = (column: typeof KANBAN_COLUMNS[0]) => {
    const columnProfessionals = getColumnProfessionals(column.id);
    const ColumnIcon = column.icon;
    const isDropTarget = dragOverColumn === column.id;

    return (
      <div 
        key={column.id} 
        className="flex-shrink-0 w-[280px] sm:w-[300px] flex flex-col"
      >
        {/* Header da Coluna */}
        <div 
          className={`rounded-t-lg p-3 ${column.bgColor} ${column.borderColor} border`}
          style={{ borderTopWidth: '3px', borderTopColor: column.color }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ColumnIcon className="h-4 w-4" style={{ color: column.color }} />
              <h3 className="font-semibold text-sm">{column.label}</h3>
            </div>
            <Badge 
              className="text-xs"
              style={{ backgroundColor: column.color, color: 'white' }}
            >
              {columnProfessionals.length}
            </Badge>
          </div>
        </div>

        {/* Área de Drop */}
        <div
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
          className={`
            flex-1 ${column.bgColor} ${column.borderColor} border-x border-b rounded-b-lg p-2 
            transition-all duration-200 min-h-[200px]
            ${isDropTarget ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}
          `}
        >
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="pr-2">
              {columnProfessionals.length > 0 ? (
                columnProfessionals.map(renderKanbanCard)
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ColumnIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Arraste cards para cá
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout userType="admin">
      <div className="h-full flex flex-col p-4 sm:p-6">
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                Gestão de Profissionais
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Arraste os cards entre as colunas para atualizar o status
              </p>
            </div>

            {/* Filtro por Cliente */}
            <div className="w-full sm:w-64">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="bg-white h-9">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent className="bg-white border shadow-lg z-50">
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-4">
            {KANBAN_COLUMNS.map(column => {
              const count = getColumnProfessionals(column.id).length;
              return (
                <div 
                  key={column.id} 
                  className={`${column.bgColor} ${column.borderColor} border rounded-lg p-2 sm:p-3`}
                  style={{ borderTopWidth: '2px', borderTopColor: column.color }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-muted-foreground truncate hidden sm:inline">
                      {column.label}
                    </span>
                    <column.icon className="h-3 w-3 sm:hidden" style={{ color: column.color }} />
                    <span className="text-base sm:text-lg font-bold" style={{ color: column.color }}>
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando profissionais...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 sm:gap-4 min-w-max pb-4">
              {KANBAN_COLUMNS.map(renderKanbanColumn)}
            </div>
          </div>
        )}

        {/* Details dialog removed - now navigates to /admin/candidates/:id */}

        {/* Dialog de Rejeição */}
        <Dialog open={rejectDialog.open} onOpenChange={(open) => {
          setRejectDialog(prev => ({ ...prev, open }));
          if (!open) setRejectionReason("");
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reprovar Profissional</DialogTitle>
              <DialogDescription>
                Informe o motivo da reprovação de {rejectDialog.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Motivo da reprovação..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, recordId: null, name: "" })}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
              >
                Confirmar Reprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Drawer de Controle de Visibilidade */}
        <VisibilityControlDrawer
          isOpen={visibilityDialog.open}
          onClose={() => setVisibilityDialog({ open: false, record: null })}
          clientCandidateId={visibilityDialog.record?.id || ""}
          candidateName={visibilityDialog.record?.profiles?.full_name || "Profissional"}
          clientName={visibilityDialog.record?.clients?.company_name || "Cliente"}
          visibility={visibilityData}
          onVisibilityChange={() => {
            // Refetch visibility data
            if (visibilityDialog.record) {
              handleOpenVisibility(visibilityDialog.record);
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}
