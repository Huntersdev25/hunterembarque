import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDateBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, Mail, CheckCircle, Calendar as CalendarIcon, Send, RotateCcw, Clock, Trash2, Briefcase, ChevronLeft, ChevronRight, Users, ClipboardCheck, Stethoscope, Ship, XCircle, ArrowRight, MapPin, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { ClientCandidatesFilters, ClientCandidateFilterValues, applyClientCandidateFilters } from "@/components/ClientCandidatesFilters";

export default function ClientCandidates() {
  const navigate = useNavigate();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [interviewScheduleDialog, setInterviewScheduleDialog] = useState<{ open: boolean; assignmentId: string | null; candidateName: string }>({
    open: false,
    assignmentId: null,
    candidateName: ""
  });
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [extendPeriodDialog, setExtendPeriodDialog] = useState<{ open: boolean; assignmentId: string | null; candidateName: string; currentNotes: string }>({
    open: false,
    assignmentId: null,
    candidateName: "",
    currentNotes: ""
  });
  const [extendStart, setExtendStart] = useState("");
  const [extendEnd, setExtendEnd] = useState("");
  const [evaluationDialog, setEvaluationDialog] = useState<{ open: boolean; assignmentId: string | null; action: 'approve' | 'reject' | null }>({ 
    open: false, 
    assignmentId: null, 
    action: null 
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [revertDialog, setRevertDialog] = useState<{ open: boolean; assignmentId: string | null; candidateName: string }>({
    open: false,
    assignmentId: null,
    candidateName: ""
  });
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; assignmentId: string | null; candidateName: string; reason: string }>({
    open: false,
    assignmentId: null,
    candidateName: "",
    reason: ""
  });
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [candidateFilters, setCandidateFilters] = useState<ClientCandidateFilterValues>({ name: '', status: 'all', jobFunction: 'all', asoStatus: 'all' });
  
  // Form state para nova solicitação
  const [jobFunction, setJobFunction] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState("media");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [unit, setUnit] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setClientInfo(data);
      } else {
        // Se não for cliente principal, buscar como company_user
        const { data: companyUserData } = await supabase
          .from("company_users")
          .select("client_id, clients(*)")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        
        if (companyUserData?.clients) {
          setClientInfo(companyUserData.clients);
        }
      }
    };

    fetchClientInfo();
  }, [user]);

  // Realtime sync para atualizações em tempo real
  useRealtimeSync({
    table: "client_candidates",
    queryKey: ["client-approved-candidates"],
    enabled: true,
  });

  const { data: approvedCandidates, isLoading } = useQuery({
    queryKey: ["client-approved-candidates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      console.log('🔍 ClientCandidates - Verificando tipo de usuário:', user.id);

      // Primeiro verifica se é cliente principal
      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let clientId: string | null = null;
      let companyUserId: string | null = null;

      if (clientData) {
        // É o dono da empresa, pode ver todos os candidatos
        console.log('✅ É DONO da empresa, mostrando todos os candidatos');
        clientId = clientData.id;
      } else {
        // Não é dono, verifica se é company_user
        const { data: companyUserData } = await supabase
          .from("company_users")
          .select("id, client_id, role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!companyUserData) {
          console.error('❌ Usuário não encontrado em nenhuma tabela!');
          throw new Error("Usuário não encontrado");
        }

        clientId = companyUserData.client_id;
        
        // Se não for company_admin, só mostra candidatos atribuídos a ele
        if (companyUserData.role !== 'company_admin') {
          companyUserId = companyUserData.id;
          console.log('👤 É USUÁRIO COMUM, filtrando por company_user_id:', companyUserId);
        } else {
          console.log('👔 É COMPANY_ADMIN, mostrando todos os candidatos da empresa');
        }
      }

      let query = supabase
        .from("client_candidates")
        .select(`
          id,
          candidate_id,
          assigned_at,
          notes,
          interview_status,
          interview_evaluated_at,
          interview_date,
          interview_time,
          aso_status,
          company_user_id,
          job_id,
          job:job_id (
            id,
            title,
            function_name
          ),
          candidate:candidate_id (
            user_id,
            full_name,
            email,
            phone,
            desired_function,
            professional_experience,
            available_from,
            available_until,
            salary_expectation,
            city,
            state,
            residence_location,
            cpf,
            rg,
            gender,
            birth_date,
            vessel_type,
            avatar_url,
            cv_file_path,
            cv_file_name
          )
        `)
        .eq("client_id", clientId);

      // Se for usuário comum, filtrar apenas seus candidatos
      if (companyUserId) {
        console.log('🔒 Aplicando filtro company_user_id =', companyUserId);
        query = query.eq("company_user_id", companyUserId);
      }

      const { data: assignments, error } = await query.order("assigned_at", { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar candidatos:', error);
        throw error;
      }
      
      console.log('📊 Candidatos encontrados:', assignments?.length || 0);
      
      const normalized = (assignments ?? []).map((a: any) => ({
        ...a,
        candidate: Array.isArray(a.candidate) ? a.candidate[0] : a.candidate,
        job: Array.isArray(a.job) ? a.job[0] : a.job,
      }));
      return normalized;
    },
  });

  // Helper function to send webhook notification
  const notifyWebhook = async (data: {
    candidateName: string;
    candidateFunction: string;
    status: string;
    interviewDate?: string;
    interviewTime?: string;
    rejectionReason?: string;
    assignmentId: string;
  }) => {
    try {
      const { error } = await supabase.functions.invoke('notify-candidate-status', {
        body: {
          ...data,
          clientName: clientInfo?.company_name || 'Cliente',
        },
      });
      if (error) {
        console.error('Erro ao notificar webhook:', error);
      } else {
        console.log('✅ Webhook notificado com sucesso');
      }
    } catch (err) {
      console.error('Erro ao chamar edge function:', err);
    }
  };

  const evaluateCandidateMutation = useMutation({
    mutationFn: async ({ assignmentId, status, reason, candidateName, candidateFunction }: { 
      assignmentId: string; 
      status: 'approved' | 'rejected'; 
      reason?: string;
      candidateName?: string;
      candidateFunction?: string;
    }) => {
      const updateData: any = {
        interview_status: status,
        interview_evaluated_at: new Date().toISOString(),
      };
      
      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from("client_candidates")
        .update(updateData)
        .eq("id", assignmentId);

      if (error) throw error;

      // Notify webhook about status change
      await notifyWebhook({
        candidateName: candidateName || 'Candidato',
        candidateFunction: candidateFunction || '',
        status,
        rejectionReason: reason,
        assignmentId,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-approved-candidates"] });
      toast({
        title: variables.status === 'approved' ? "Candidato Aprovado" : "Candidato Reprovado",
        description: variables.status === 'approved' 
          ? "O candidato foi aprovado na entrevista." 
          : "O candidato foi reprovado na entrevista.",
      });
      setEvaluationDialog({ open: false, assignmentId: null, action: null });
      setRejectionReason("");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível avaliar o candidato. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error evaluating candidate:", error);
    },
  });

  const handleSelectCandidate = (assignmentId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const handleSelectAll = (candidates: any[]) => {
    const pendingIds = candidates
      .filter((c: any) => !c.interview_status || c.interview_status === 'pending')
      .map((c: any) => c.id);
    
    if (selectedCandidates.length === pendingIds.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(pendingIds);
    }
  };

  const handleApproveSelected = () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: "Nenhum candidato selecionado",
        description: "Selecione ao menos um candidato para aprovar.",
        variant: "destructive",
      });
      return;
    }
    // For multiple selection, open schedule dialog for first candidate
    const firstCandidate = approvedCandidates?.find((c: any) => c.id === selectedCandidates[0]);
    setInterviewScheduleDialog({
      open: true,
      assignmentId: selectedCandidates[0],
      candidateName: firstCandidate?.candidate?.full_name || "o candidato"
    });
  };

  const handleScheduleInterview = async () => {
    if (!interviewDate || !interviewTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a data e horário da entrevista.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the candidate status to 'interview' with scheduled date/time
      const assignmentIds = selectedCandidates.length > 0 ? selectedCandidates : [interviewScheduleDialog.assignmentId];
      
      for (const assignmentId of assignmentIds) {
        if (assignmentId) {
          const candidate = approvedCandidates?.find((c: any) => c.id === assignmentId);
          
          const { error } = await supabase
            .from("client_candidates")
            .update({
              interview_status: 'interview',
              interview_evaluated_at: new Date().toISOString(),
              interview_date: interviewDate,
              interview_time: interviewTime,
            })
            .eq("id", assignmentId);

          if (error) throw error;

          // Notify webhook about interview scheduled
          await notifyWebhook({
            candidateName: candidate?.candidate?.full_name || 'Candidato',
            candidateFunction: candidate?.candidate?.desired_function || '',
            status: 'interview',
            interviewDate,
            interviewTime,
            assignmentId,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["client-approved-candidates"] });
      toast({
        title: assignmentIds.length > 1 ? "Entrevistas Agendadas" : "Entrevista Agendada",
        description: assignmentIds.length > 1 
          ? `Entrevistas agendadas para ${assignmentIds.length} candidatos.`
          : `Entrevista agendada para ${interviewDate} às ${interviewTime}.`,
      });
      
      setInterviewScheduleDialog({ open: false, assignmentId: null, candidateName: "" });
      setSelectedCandidates([]);
      setInterviewDate("");
      setInterviewTime("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível agendar a entrevista. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error scheduling interview:", error);
    }
  };

  const handleEvaluate = (assignmentId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const candidate = approvedCandidates?.find((c: any) => c.id === assignmentId);
      setSelectedCandidates([assignmentId]);
      setInterviewScheduleDialog({
        open: true,
        assignmentId,
        candidateName: candidate?.candidate?.full_name || "o candidato"
      });
    } else {
      setEvaluationDialog({ open: true, assignmentId, action: 'reject' });
    }
  };

  const handleRejectConfirm = () => {
    if (!evaluationDialog.assignmentId) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o motivo da reprovação.",
        variant: "destructive",
      });
      return;
    }

    const candidate = approvedCandidates?.find((c: any) => c.id === evaluationDialog.assignmentId);
    evaluateCandidateMutation.mutate({ 
      assignmentId: evaluationDialog.assignmentId, 
      status: 'rejected',
      reason: rejectionReason.trim(),
      candidateName: candidate?.candidate?.full_name,
      candidateFunction: candidate?.candidate?.desired_function,
    });
  };

  const handleRevertStatus = async () => {
    if (!revertDialog.assignmentId) return;

    try {
      const candidate = approvedCandidates?.find((c: any) => c.id === revertDialog.assignmentId);
      
      const { error } = await supabase
        .from("client_candidates")
        .update({
          interview_status: 'pending',
          interview_evaluated_at: null,
          interview_date: null,
          interview_time: null,
          rejection_reason: null,
          notes: null
        })
        .eq("id", revertDialog.assignmentId);

      if (error) throw error;

      // Notify webhook about status reverted to pending
      await notifyWebhook({
        candidateName: revertDialog.candidateName,
        candidateFunction: candidate?.candidate?.desired_function || '',
        status: 'reverted_to_pending',
        assignmentId: revertDialog.assignmentId,
      });

      queryClient.invalidateQueries({ queryKey: ["client-approved-candidates"] });
      toast({
        title: "Status Revertido",
        description: `O status de ${revertDialog.candidateName} foi revertido para "Aguardando Avaliação".`,
      });
      
      setRevertDialog({ open: false, assignmentId: null, candidateName: "" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível reverter o status. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error reverting status:", error);
    }
  };

  const handleExtendPeriod = async () => {
    if (!extendPeriodDialog.assignmentId) return;

    if (!extendStart || !extendEnd) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha as datas de início e fim do novo período.",
        variant: "destructive",
      });
      return;
    }

    try {
      const extensionNote = `\n📅 EXTENSÃO: ${extendStart} até ${extendEnd} (${new Date().toLocaleDateString('pt-BR')})`;
      const updatedNotes = (extendPeriodDialog.currentNotes || "") + extensionNote;

      const { error } = await supabase
        .from("client_candidates")
        .update({
          notes: updatedNotes
        })
        .eq("id", extendPeriodDialog.assignmentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["client-approved-candidates"] });
      toast({
        title: "Período Estendido",
        description: `O período de ${extendPeriodDialog.candidateName} foi estendido com sucesso.`,
      });
      
      setExtendPeriodDialog({ open: false, assignmentId: null, candidateName: "", currentNotes: "" });
      setExtendStart("");
      setExtendEnd("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível estender o período. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error extending period:", error);
    }
  };

  const handleRemoveCandidate = async () => {
    if (!removeDialog.assignmentId) return;

    if (!removeDialog.reason.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o motivo da reprovação.",
        variant: "destructive",
      });
      return;
    }

    try {
      const candidate = approvedCandidates?.find((c: any) => c.id === removeDialog.assignmentId);
      
      const { error } = await supabase
        .from("client_candidates")
        .update({
          interview_status: 'rejected',
          interview_evaluated_at: new Date().toISOString(),
          rejection_reason: removeDialog.reason.trim()
        })
        .eq("id", removeDialog.assignmentId);

      if (error) throw error;

      // Notify webhook about rejection
      await notifyWebhook({
        candidateName: removeDialog.candidateName,
        candidateFunction: candidate?.candidate?.desired_function || '',
        status: 'rejected',
        rejectionReason: removeDialog.reason.trim(),
        assignmentId: removeDialog.assignmentId,
      });

      queryClient.invalidateQueries({ queryKey: ["client-approved-candidates"] });
      toast({
        title: "Candidato Reprovado",
        description: `${removeDialog.candidateName} foi reprovado.`,
      });
      
      setRemoveDialog({ open: false, assignmentId: null, candidateName: "", reason: "" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível reprovar o candidato. Tente novamente.",
        variant: "destructive",
      });
      console.error("Error rejecting candidate:", error);
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
      'pending': { label: "Aguardando Avaliação", variant: "outline" },
      'awaiting_company_approval': { label: "Aguardando Aprovação da Empresa", variant: "secondary" },
      'interview': { label: "Em Entrevista", variant: "default" },
      'aso': { label: "Realizando ASO", variant: "default" },
      'completed': { label: "Processo Concluído", variant: "default" },
      'rejected': { label: "Reprovado", variant: "destructive" },
      'approved': { label: "Aprovado (Legado)", variant: "default" },
    };
    
    const config = statusConfig[status || 'pending'] || statusConfig['pending'];
    
    if (status === 'awaiting_company_approval') {
      return <Badge className="bg-yellow-500 text-white">{config.label}</Badge>;
    }
    if (status === 'interview') {
      return <Badge className="bg-blue-500 text-white">{config.label}</Badge>;
    }
    if (status === 'aso') {
      return <Badge className="bg-purple-500 text-white">{config.label}</Badge>;
    }
    if (status === 'completed' || status === 'approved') {
      return <Badge className="bg-green-500 text-white">{status === 'completed' ? 'Processo Concluído' : 'Aprovado'}</Badge>;
    }
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const updateAsoStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, asoStatus }: { assignmentId: string; asoStatus: string }) => {
      const { error } = await supabase
        .from("client_candidates")
        .update({ aso_status: asoStatus })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-approved-candidates"] });
      toast({
        title: "Status ASO Atualizado",
        description: "O status do ASO foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do ASO.",
        variant: "destructive",
      });
      console.error("Error updating ASO status:", error);
    },
  });

  // Mutation para atualizar o status do candidato (workflow)
  const updateInterviewStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      const { error } = await supabase
        .from("client_candidates")
        .update({ 
          interview_status: status,
          interview_evaluated_at: new Date().toISOString()
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-approved-candidates"] });
      toast({
        title: "Status Atualizado",
        description: "O status do candidato foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      console.error("Error updating interview status:", error);
    },
  });

  const renderAsoStatusSelect = (assignmentId: string, currentStatus?: string) => {
    return (
      <Select
        value={currentStatus || 'pendente'}
        onValueChange={(value) => updateAsoStatusMutation.mutate({ assignmentId, asoStatus: value })}
      >
        <SelectTrigger className="w-[90px] sm:w-[120px] h-6 sm:h-8 text-[9px] sm:text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="marcado">Marcado</SelectItem>
          <SelectItem value="finalizado">Finalizado</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  // Renderiza o select de status do workflow (interview -> aso -> completed)
  const renderWorkflowStatusSelect = (assignmentId: string, currentStatus?: string) => {
    // Só mostra o select para candidatos que já passaram de pending
    if (!currentStatus || currentStatus === 'pending' || currentStatus === 'rejected') {
      return null;
    }

    return (
      <Select
        value={currentStatus}
        onValueChange={(value) => updateInterviewStatusMutation.mutate({ assignmentId, status: value })}
      >
        <SelectTrigger className="w-[110px] sm:w-[140px] h-6 sm:h-8 text-[9px] sm:text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          <SelectItem value="interview">Em Entrevista</SelectItem>
          <SelectItem value="aso">Realizando ASO</SelectItem>
          <SelectItem value="completed">Concluído</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const handleFiltersChange = useCallback((filters: ClientCandidateFilterValues) => {
    setCandidateFilters(filters);
  }, []);

  const filteredCandidates = useMemo(() => {
    if (!approvedCandidates) return [];
    return approvedCandidates.filter((c: any) => applyClientCandidateFilters(c, candidateFilters));
  }, [approvedCandidates, candidateFilters]);

  const activeCandidates = filteredCandidates.filter(
    (app: any) => !app.interview_status || ['pending', 'awaiting_company_approval', 'interview', 'aso', 'completed', 'approved'].includes(app.interview_status)
  );

  const rejectedCandidates = filteredCandidates.filter(
    (app: any) => app.interview_status === 'rejected'
  );

  const availableFunctions = useMemo(() => {
    if (!approvedCandidates) return [];
    const fns = new Set(approvedCandidates.map((c: any) => c.candidate?.desired_function).filter(Boolean));
    return Array.from(fns).sort() as string[];
  }, [approvedCandidates]);

  // Pipeline counts - must be before any early return to respect hooks rules
  const pipelineCounts = useMemo(() => {
    if (!approvedCandidates) return { pending: 0, interview: 0, aso: 0, completed: 0, rejected: 0, total: 0 };
    const counts = { pending: 0, interview: 0, aso: 0, completed: 0, rejected: 0, total: approvedCandidates.length };
    approvedCandidates.forEach((c: any) => {
      const s = c.interview_status || 'pending';
      if (s === 'pending' || s === 'awaiting_company_approval') counts.pending++;
      else if (s === 'interview') counts.interview++;
      else if (s === 'aso') counts.aso++;
      else if (s === 'completed' || s === 'approved') counts.completed++;
      else if (s === 'rejected') counts.rejected++;
    });
    return counts;
  }, [approvedCandidates]);

  if (isLoading) {
    return (
      <DashboardLayout userType="client">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maritime-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  const getPageForGroup = (groupKey: string) => currentPage[groupKey] || 1;
  const setPageForGroup = (groupKey: string, page: number) => setCurrentPage(prev => ({ ...prev, [groupKey]: page }));

  const renderPagination = (groupKey: string, totalItems: number) => {
    const page = getPageForGroup(groupKey);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Página {page} de {totalPages} ({totalItems} profissionais)
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPageForGroup(groupKey, page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const elements: React.ReactNode[] = [];
              if (prev && p - prev > 1) {
                elements.push(<span key={`dots-${p}`} className="px-2 text-muted-foreground">…</span>);
              }
              elements.push(
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setPageForGroup(groupKey, p)}>
                  {p}
                </Button>
              );
              return elements;
            })}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPageForGroup(groupKey, page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderMobileCard = (app: any, showActions: boolean) => {
    const isPending = !app.interview_status || app.interview_status === 'pending';
    return (
      <Card key={app.id} className="cursor-pointer" onClick={() => app.candidate?.user_id && navigate(`/c/aprovados/${app.candidate.user_id}`)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="font-semibold truncate">{app.candidate?.full_name || "N/A"}</p>
              <Badge variant="secondary" className="text-xs">{app.candidate?.desired_function || "Não especificado"}</Badge>
              {app.job && <Badge variant="outline" className="text-xs ml-1">{app.job.title}</Badge>}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {renderWorkflowStatusSelect(app.id, app.interview_status) || getStatusBadge(app.interview_status)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>{app.candidate?.city && app.candidate?.state ? `${app.candidate.city}, ${app.candidate.state}` : "Não informado"}</div>
            <div>ASO: <span onClick={(e) => e.stopPropagation()}>{renderAsoStatusSelect(app.id, app.aso_status)}</span></div>
            <div className="flex items-center gap-1"><Mail className="h-3 w-3" /><span className="truncate">{app.candidate?.email || "N/A"}</span></div>
            <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.candidate?.phone || "N/A"}</div>
          </div>
          <div className="text-xs text-muted-foreground">Atribuído em: {formatDateBR(app.assigned_at)}</div>
          {!showActions && app.rejection_reason && (
            <div className="text-xs"><span className="font-medium">Motivo: </span>{app.rejection_reason}</div>
          )}
          <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              {showActions && isPending && (
                <Checkbox checked={selectedCandidates.includes(app.id)} onCheckedChange={() => handleSelectCandidate(app.id)} />
              )}
              <Button variant="outline" size="sm" className="h-7" onClick={() => app.candidate?.user_id && navigate(`/c/aprovados/${app.candidate.user_id}`)}>
                <Eye className="h-3 w-3 mr-1" />Ver
              </Button>
              {showActions && ['approved', 'completed', 'aso'].includes(app.interview_status) && (
                <Button variant="outline" size="sm" className="h-7 text-blue-600" onClick={() => setExtendPeriodDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "", currentNotes: app.notes || "" })}>
                  <Clock className="h-3 w-3 mr-1" />Estender
                </Button>
              )}
              {showActions && app.interview_status && app.interview_status !== 'pending' && (
                <Button variant="outline" size="sm" className="h-7 text-orange-600" onClick={() => setRevertDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "" })}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              {showActions && isPending && (
                <Button variant="outline" size="sm" className="h-7 text-green-600" onClick={() => handleEvaluate(app.id, 'approve')}>
                  <CheckCircle className="h-3 w-3" />
                </Button>
              )}
              {app.interview_status !== 'rejected' && (
                <Button variant="outline" size="sm" className="h-7 text-red-600" onClick={() => setRemoveDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "", reason: "" })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCandidateTable = (candidates: any[], showActions = true, groupKey = 'default') => {
    const pendingCandidates = candidates.filter((c: any) => !c.interview_status || c.interview_status === 'pending');
    const allPendingSelected = pendingCandidates.length > 0 && selectedCandidates.length === pendingCandidates.length;

    const page = getPageForGroup(groupKey);
    const paginatedCandidates = candidates.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    if (isMobile) {
      return (
        <div className="space-y-3">
          {paginatedCandidates.map((app: any) => renderMobileCard(app, showActions))}
          {renderPagination(groupKey, candidates.length)}
        </div>
      );
    }
    
    return (
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showActions && (
                <TableHead className="w-10 px-2">
                  <Checkbox
                    checked={allPendingSelected}
                    onCheckedChange={() => handleSelectAll(candidates)}
                  />
                </TableHead>
              )}
              <TableHead className="min-w-[120px] px-2">Nome</TableHead>
              <TableHead className="hidden xl:table-cell min-w-[100px] px-2">Vaga</TableHead>
              <TableHead className="min-w-[100px] px-2">Função</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[110px] px-2">Localização</TableHead>
              <TableHead className="min-w-[130px] px-2">Status</TableHead>
              <TableHead className="min-w-[110px] px-2">ASO</TableHead>
              <TableHead className="hidden xl:table-cell min-w-[150px] px-2">Contato</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[80px] px-2">Data</TableHead>
              {!showActions && <TableHead className="hidden lg:table-cell min-w-[120px] px-2">Motivo</TableHead>}
              <TableHead className="text-right min-w-[100px] px-2">Ações</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {paginatedCandidates.map((app: any) => {
            const isPending = !app.interview_status || app.interview_status === 'pending';
            const isSelected = selectedCandidates.includes(app.id);
            
            return (
              <TableRow 
                key={app.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  if (app.candidate?.user_id) {
                    navigate(`/c/aprovados/${app.candidate.user_id}`);
                  }
                }}
              >
                {showActions && (
                  <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={!isPending}
                      onCheckedChange={() => handleSelectCandidate(app.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium px-2">
                  <span className="line-clamp-1">{app.candidate?.full_name || "N/A"}</span>
                </TableCell>
              <TableCell className="hidden xl:table-cell px-2">
                {app.job ? (
                  <Badge variant="outline" className="text-xs">
                    <span className="line-clamp-1">{app.job.title}</span>
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-2">
                <Badge variant="secondary" className="text-xs">
                  <span className="line-clamp-1">{app.candidate?.desired_function || "N/E"}</span>
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm px-2">
                <span className="line-clamp-1">
                  {app.candidate?.city && app.candidate?.state
                    ? `${app.candidate.city}, ${app.candidate.state}`
                    : "—"}
                </span>
              </TableCell>
              <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                {renderWorkflowStatusSelect(app.id, app.interview_status) || getStatusBadge(app.interview_status)}
              </TableCell>
              <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                {renderAsoStatusSelect(app.id, app.aso_status)}
              </TableCell>
              <TableCell className="hidden xl:table-cell px-2">
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" /><span className="truncate max-w-[140px]">{app.candidate?.email || "N/A"}</span></span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{app.candidate?.phone || "N/A"}</span>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm px-2">
                {formatDateBR(app.assigned_at)}
              </TableCell>
              {!showActions && (
                <TableCell className="hidden lg:table-cell px-2">
                  <p className="text-sm text-muted-foreground line-clamp-1 max-w-[180px]">
                    {app.rejection_reason || "Não informado"}
                  </p>
                </TableCell>
              )}
              <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                <TooltipProvider>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => app.candidate?.user_id && navigate(`/c/aprovados/${app.candidate.user_id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Ver Detalhes</p></TooltipContent>
                    </Tooltip>
                    
                    {showActions && ['approved', 'completed', 'aso'].includes(app.interview_status) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setExtendPeriodDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "", currentNotes: app.notes || "" })}>
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Estender Período</p></TooltipContent>
                      </Tooltip>
                    )}

                    {showActions && app.interview_status && app.interview_status !== 'pending' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => setRevertDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "" })}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Reverter para Aguardando</p></TooltipContent>
                      </Tooltip>
                    )}
                    
                    {showActions && isPending && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleEvaluate(app.id, 'approve')}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Aprovar Candidato</p></TooltipContent>
                      </Tooltip>
                    )}

                    {app.interview_status !== 'rejected' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setRemoveDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "", reason: "" })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Reprovar Candidato</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
      {renderPagination(groupKey, candidates.length)}
    </div>
  )};
  




  const pipelineStages = [
    { key: 'pending', label: 'Aguardando', count: pipelineCounts.pending, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
    { key: 'interview', label: 'Entrevista', count: pipelineCounts.interview, icon: CalendarIcon, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
    { key: 'aso', label: 'ASO', count: pipelineCounts.aso, icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800' },
    { key: 'completed', label: 'Concluído', count: pipelineCounts.completed, icon: Ship, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  ];

  const getStepIndex = (status?: string) => {
    if (!status || status === 'pending' || status === 'awaiting_company_approval') return 0;
    if (status === 'interview') return 1;
    if (status === 'aso') return 2;
    if (status === 'completed' || status === 'approved') return 3;
    return -1; // rejected
  };

  const renderWorkflowStepper = (status?: string) => {
    const currentStep = getStepIndex(status);
    if (currentStep === -1) return null;
    const steps = [
      { label: 'Aguardando', icon: Users },
      { label: 'Entrevista', icon: CalendarIcon },
      { label: 'ASO', icon: Stethoscope },
      { label: 'Concluído', icon: Ship },
    ];
    return (
      <div className="flex items-center gap-0.5">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div key={i} className="flex items-center gap-0.5">
              {i > 0 && (
                <div className={`w-4 h-0.5 ${isDone ? 'bg-emerald-400' : 'bg-border'}`} />
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isActive ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20' :
                      isDone ? 'bg-emerald-500 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>{step.label}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
    );
  };

  const renderEnhancedCard = (app: any, showActions: boolean) => {
    const isPending = !app.interview_status || app.interview_status === 'pending';
    const isRejected = app.interview_status === 'rejected';
    const initials = (app.candidate?.full_name || 'N A').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

    return (
      <div
        key={app.id}
        className={`group relative rounded-xl border bg-card p-3 sm:p-4 transition-all hover:shadow-md hover:border-primary/20 cursor-pointer ${
          isRejected ? 'opacity-70 border-destructive/20' : ''
        }`}
        onClick={() => app.candidate?.user_id && navigate(`/c/aprovados/${app.candidate.user_id}`)}
      >
        {/* Top row: avatar + info */}
        <div className="flex items-start gap-2.5 sm:gap-3">
          <Avatar className="h-9 w-9 sm:h-11 sm:w-11 border-2 border-background shadow-sm shrink-0">
            <AvatarImage src={app.candidate?.avatar_url} />
            <AvatarFallback className="text-[10px] sm:text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-xs sm:text-sm truncate">{app.candidate?.full_name || 'N/A'}</h4>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1 sm:px-1.5 truncate max-w-[100px] sm:max-w-none">{app.candidate?.desired_function || 'N/E'}</Badge>
              {app.job && <Badge variant="outline" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1 sm:px-1.5 truncate max-w-[80px] sm:max-w-none hidden xs:inline-flex">{app.job.title}</Badge>}
            </div>
          </div>
        </div>

        {/* Workflow stepper - below name on mobile, inline on desktop */}
        <div className="mt-2">
          {!isRejected && renderWorkflowStepper(app.interview_status)}
          {isRejected && <Badge variant="destructive" className="text-[9px] sm:text-[10px]">Reprovado</Badge>}
        </div>

        {/* Details - 2 cols on mobile, 4 cols on desktop */}
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{app.candidate?.city && app.candidate?.state ? `${app.candidate.city}, ${app.candidate.state}` : '—'}</span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{app.candidate?.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatDateBR(app.assigned_at)}</span>
          </div>
          <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <Stethoscope className="h-3 w-3 shrink-0" />
            {renderAsoStatusSelect(app.id, app.aso_status)}
          </div>
        </div>

        {/* Interview date */}
        {app.interview_date && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-[11px]">
            <CalendarIcon className="h-3 w-3 text-blue-500 shrink-0" />
            <span className="text-blue-600 font-medium truncate">Entrevista: {formatDateBR(app.interview_date)}{app.interview_time ? ` às ${app.interview_time}` : ''}</span>
          </div>
        )}

        {/* Rejection reason */}
        {isRejected && app.rejection_reason && (
          <div className="mt-2 text-[10px] sm:text-[11px] bg-destructive/5 rounded-lg px-2.5 py-1.5 border border-destructive/10">
            <span className="font-medium text-destructive">Motivo: </span>
            <span className="text-muted-foreground break-words">{app.rejection_reason}</span>
          </div>
        )}

        {/* Actions - visible on mobile, hover on desktop */}
        <div className="mt-2.5 flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {showActions && isPending && (
            <Checkbox checked={selectedCandidates.includes(app.id)} onCheckedChange={() => handleSelectCandidate(app.id)} className="mr-1" />
          )}

          {!isRejected && renderWorkflowStatusSelect(app.id, app.interview_status)}

          <div className="flex-1" />

          <div className="flex items-center gap-0.5 flex-wrap">
            {showActions && isPending && (
              <Button variant="outline" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[11px] px-1.5 sm:px-2 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300" onClick={() => handleEvaluate(app.id, 'approve')}>
                <CheckCircle className="h-3 w-3 mr-0.5 sm:mr-1" />Agendar
              </Button>
            )}
            {showActions && ['approved', 'completed', 'aso'].includes(app.interview_status) && (
              <Button variant="outline" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[11px] px-1.5 sm:px-2 text-blue-600 hover:bg-blue-50" onClick={() => setExtendPeriodDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "", currentNotes: app.notes || "" })}>
                <Clock className="h-3 w-3 mr-0.5 sm:mr-1" />Estender
              </Button>
            )}
            {showActions && app.interview_status && app.interview_status !== 'pending' && !isRejected && (
              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 hover:bg-amber-50" onClick={() => setRevertDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "" })}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            {!isRejected && (
              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:bg-destructive/10" onClick={() => setRemoveDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "", reason: "" })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            {isRejected && (
              <Button variant="ghost" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[11px] px-1.5 text-amber-600 hover:bg-amber-50" onClick={() => setRevertDialog({ open: true, assignmentId: app.id, candidateName: app.candidate?.full_name || "" })}>
                <RotateCcw className="h-3 w-3 mr-0.5" />Reverter
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout userType="client">
      <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Gestão de Profissionais</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe o fluxo completo de cada profissional atribuído
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setRequestDialogOpen(true)} variant="outline" size={isMobile ? "sm" : "default"} className="flex-1 sm:flex-auto">
              <Send className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
            {selectedCandidates.length > 0 && (
              <Button onClick={handleApproveSelected} size={isMobile ? "sm" : "default"} className="flex-1 sm:flex-auto">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Agendar ({selectedCandidates.length})
              </Button>
            )}
          </div>
        </div>

        {/* Pipeline Summary */}
        {pipelineCounts.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pipelineStages.map((stage, i) => {
              const Icon = stage.icon;
              const pct = pipelineCounts.total > 0 ? Math.round((stage.count / pipelineCounts.total) * 100) : 0;
              return (
                <div key={stage.key} className={`relative rounded-xl border ${stage.border} ${stage.bg} p-4 transition-all hover:shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${stage.bg}`}>
                      <Icon className={`h-4 w-4 ${stage.color}`} />
                    </div>
                    <span className={`text-2xl font-bold ${stage.color}`}>{stage.count}</span>
                  </div>
                  <p className="text-xs font-medium mt-2 text-foreground/80">{stage.label}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-background/60 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      stage.key === 'pending' ? 'bg-amber-400' :
                      stage.key === 'interview' ? 'bg-blue-400' :
                      stage.key === 'aso' ? 'bg-purple-400' :
                      'bg-emerald-400'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{pct}% do total</p>
                </div>
              );
            })}
          </div>
        )}

        <ClientCandidatesFilters
          onFiltersChange={handleFiltersChange}
          totalCount={approvedCandidates?.length || 0}
          filteredCount={filteredCandidates.length}
          availableFunctions={availableFunctions}
        />

        {approvedCandidates && approvedCandidates.length > 0 ? (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="active" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Em Processo ({activeCandidates.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" />
                Reprovados ({rejectedCandidates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {(() => {
                const byJob = new Map<string, { jobTitle: string; candidates: any[] }>();
                const noJob: any[] = [];
                
                activeCandidates.forEach((c: any) => {
                  if (c.job?.id) {
                    const key = c.job.id;
                    if (!byJob.has(key)) {
                      byJob.set(key, { jobTitle: c.job.title || 'Sem título', candidates: [] });
                    }
                    byJob.get(key)!.candidates.push(c);
                  } else {
                    noJob.push(c);
                  }
                });

                const jobGroups = Array.from(byJob.entries());

                if (jobGroups.length === 0 && noJob.length === 0) {
                  return (
                    <div className="text-center py-16">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">Nenhum candidato em processo.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {jobGroups.map(([jobId, group]) => (
                      <div key={jobId} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm">{group.jobTitle}</h3>
                          <Badge variant="secondary" className="text-[10px] h-5">{group.candidates.length}</Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {group.candidates.slice(
                            (getPageForGroup(`job-${jobId}`) - 1) * ITEMS_PER_PAGE,
                            getPageForGroup(`job-${jobId}`) * ITEMS_PER_PAGE
                          ).map((app: any) => renderEnhancedCard(app, true))}
                        </div>
                        {renderPagination(`job-${jobId}`, group.candidates.length)}
                      </div>
                    ))}
                    {noJob.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-sm text-muted-foreground">Sem Vaga Vinculada</h3>
                          <Badge variant="outline" className="text-[10px] h-5">{noJob.length}</Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {noJob.slice(
                            (getPageForGroup('no-job') - 1) * ITEMS_PER_PAGE,
                            getPageForGroup('no-job') * ITEMS_PER_PAGE
                          ).map((app: any) => renderEnhancedCard(app, true))}
                        </div>
                        {renderPagination('no-job', noJob.length)}
                      </div>
                    )}
                  </>
                );
              })()}
            </TabsContent>

            <TabsContent value="rejected">
              {rejectedCandidates.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {rejectedCandidates.slice(
                    (getPageForGroup('rejected') - 1) * ITEMS_PER_PAGE,
                    getPageForGroup('rejected') * ITEMS_PER_PAGE
                  ).map((app: any) => renderEnhancedCard(app, false))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <CheckCircle className="h-12 w-12 mx-auto text-emerald-300 mb-3" />
                  <p className="text-muted-foreground">Nenhum candidato reprovado.</p>
                </div>
              )}
              {renderPagination('rejected', rejectedCandidates.length)}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Nenhum candidato atribuído ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Entre em contato com o administrador ou envie uma solicitação.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={interviewScheduleDialog.open} onOpenChange={(open) => {
        if (!open) {
          setInterviewScheduleDialog({ open: false, assignmentId: null, candidateName: "" });
          setInterviewDate("");
          setInterviewTime("");
          setSelectedCandidates([]);
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Agendar Entrevista
            </DialogTitle>
            <DialogDescription>
              {selectedCandidates.length > 1 
                ? `Agende a entrevista para ${selectedCandidates.length} candidatos selecionados.`
                : `Agende a data e horário da entrevista para ${interviewScheduleDialog.candidateName}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="interview-date">Data da Entrevista *</Label>
              <Input
                id="interview-date"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interview-time">Horário *</Label>
              <Input
                id="interview-time"
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setInterviewScheduleDialog({ open: false, assignmentId: null, candidateName: "" });
              setInterviewDate("");
              setInterviewTime("");
              setSelectedCandidates([]);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleScheduleInterview}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Confirmar Entrevista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evaluationDialog.open} onOpenChange={(open) => {
        if (!open) {
          setEvaluationDialog({ open: false, assignmentId: null, action: null });
          setRejectionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Candidato</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da reprovação. Esta informação será visível apenas para os administradores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo da Reprovação *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Descreva o motivo da reprovação..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEvaluationDialog({ open: false, assignmentId: null, action: null });
                setRejectionReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={evaluateCandidateMutation.isPending}
            >
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendPeriodDialog.open} onOpenChange={(open) => {
        if (!open) {
          setExtendPeriodDialog({ open: false, assignmentId: null, candidateName: "", currentNotes: "" });
          setExtendStart("");
          setExtendEnd("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Estender Período
            </DialogTitle>
            <DialogDescription>
              Defina o novo período de embarque para {extendPeriodDialog.candidateName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="extend-start">Início do Novo Período *</Label>
                <Input
                  id="extend-start"
                  type="date"
                  value={extendStart}
                  onChange={(e) => setExtendStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extend-end">Fim do Novo Período *</Label>
                <Input
                  id="extend-end"
                  type="date"
                  value={extendEnd}
                  onChange={(e) => setExtendEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExtendPeriodDialog({ open: false, assignmentId: null, candidateName: "", currentNotes: "" });
                setExtendStart("");
                setExtendEnd("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleExtendPeriod}>
              <Clock className="h-4 w-4 mr-2" />
              Confirmar Extensão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revertDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRevertDialog({ open: false, assignmentId: null, candidateName: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              Reverter Aprovação
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reverter a aprovação de {revertDialog.candidateName}? 
              O candidato voltará para o status "Aguardando Avaliação" e as informações de embarcação e disponibilidade serão removidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevertDialog({ open: false, assignmentId: null, candidateName: "" })}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleRevertStatus}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirmar Reversão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Reprovação */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRemoveDialog({ open: false, assignmentId: null, candidateName: "", reason: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Reprovar Candidato
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação de {removeDialog.candidateName}. Esta informação será visível apenas para os administradores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remove-rejection-reason">Motivo da Reprovação *</Label>
              <Textarea
                id="remove-rejection-reason"
                placeholder="Descreva o motivo da reprovação..."
                value={removeDialog.reason}
                onChange={(e) => setRemoveDialog(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialog({ open: false, assignmentId: null, candidateName: "", reason: "" })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveCandidate}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Profissional</DialogTitle>
            <DialogDescription>
              Preencha os dados para solicitar profissionais especializados
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (!clientInfo?.id || !user?.id) {
                toast({
                  title: "Erro",
                  description: "Informações do cliente não encontradas",
                  variant: "destructive",
                });
                return;
              }

              try {
                const { error } = await supabase
                  .from("professional_requests")
                  .insert([{
                    client_id: clientInfo.id,
                    job_function: jobFunction,
                    description: description,
                    quantity: parseInt(quantity),
                    urgency: urgency,
                    period_start: periodStart || null,
                    period_end: periodEnd || null,
                    unit: unit || null,
                    required_certifications: certifications,
                    created_by: user.id,
                  }]);
                
                if (error) throw error;

                queryClient.invalidateQueries({ queryKey: ["professional-requests"] });
                toast({
                  title: "Solicitação enviada",
                  description: "Sua solicitação foi enviada com sucesso!",
                });
                
                setRequestDialogOpen(false);
                setJobFunction("");
                setDescription("");
                setQuantity("1");
                setUrgency("media");
                setPeriodStart("");
                setPeriodEnd("");
                setUnit("");
                setCertifications([]);
              } catch (error: any) {
                toast({
                  title: "Erro ao enviar solicitação",
                  description: error.message,
                  variant: "destructive",
                });
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-function">Função *</Label>
                <Input
                  id="job-function"
                  value={jobFunction}
                  onChange={(e) => setJobFunction(e.target.value)}
                  placeholder="Ex: Engenheiro Naval, Capitão, etc."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period-start">Período - Início</Label>
                  <Input
                    id="period-start"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-end">Período - Fim</Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifications">Certificações</Label>
                <Input
                  id="certifications"
                  value={certifications.join(", ")}
                  onChange={(e) => setCertifications(e.target.value.split(",").map(c => c.trim()).filter(Boolean))}
                  placeholder="Ex: STCW, CIR, DP (separar por vírgula)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unidade/Embarcação</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: Plataforma P-70, Navio XYZ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgência *</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger id="urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os requisitos e detalhes da solicitação..."
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitação
                </Button>
              </DialogFooter>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
