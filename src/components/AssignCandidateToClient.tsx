import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Building2, AlertCircle, Briefcase, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AssignCandidateToClientProps {
  candidateId: string;
  candidateName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  client_type: string;
}

export function AssignCandidateToClient({ 
  candidateId, 
  candidateName, 
  isOpen, 
  onClose 
}: AssignCandidateToClientProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [assignmentType, setAssignmentType] = useState<"all" | "specific">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const queryClient = useQueryClient();

  // Buscar clientes com tipo
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["clients-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, client_type")
        .neq("is_active", false)
        .order("company_name");

      if (error) throw error;
      return data as Client[];
    },
    enabled: isOpen,
    staleTime: 0,
  });

  // Atualizar cliente selecionado quando muda
  useEffect(() => {
    if (selectedClientId && clients) {
      const client = clients.find(c => c.id === selectedClientId);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
  }, [selectedClientId, clients]);

  const { data: companyUsers } = useQuery({
    queryKey: ["company-users", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      
      const { data, error } = await supabase
        .from("company_users")
        .select("id, full_name, email, role, is_active")
        .eq("client_id", selectedClientId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Buscar perfil do candidato (função desejada)
  const { data: candidateProfile } = useQuery({
    queryKey: ["candidate-profile-for-match", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("desired_function")
        .eq("user_id", candidateId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!candidateId,
  });

  // Buscar vagas ativas do cliente selecionado que batem com a função desejada
  const { data: matchedJobs } = useQuery({
    queryKey: ["matched-jobs", selectedClientId, candidateProfile?.desired_function],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, function_name, is_active")
        .eq("client_id", selectedClientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const desired = (candidateProfile?.desired_function || "").trim().toLowerCase();
      if (!desired) return data || [];
      // Prioriza vagas com função idêntica (case-insensitive)
      const matched = (data || []).filter(
        (j) => (j.function_name || "").trim().toLowerCase() === desired
      );
      return matched.length > 0 ? matched : data || [];
    },
    enabled: !!selectedClientId,
  });

  const autoMatchedJob = (() => {
    const desired = (candidateProfile?.desired_function || "").trim().toLowerCase();
    if (!desired || !matchedJobs) return null;
    return (
      matchedJobs.find(
        (j) => (j.function_name || "").trim().toLowerCase() === desired
      ) || null
    );
  })();

  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // Quando o cliente muda, pré-seleciona a vaga compatível automaticamente
  useEffect(() => {
    if (autoMatchedJob) {
      setSelectedJobId(autoMatchedJob.id);
    } else {
      setSelectedJobId("");
    }
  }, [autoMatchedJob?.id]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const jobIdToAssign = selectedJobId || null;

      // Se não houver usuários da empresa, atribuir diretamente ao cliente
      if (!companyUsers || companyUsers.length === 0) {
        const { error } = await supabase
          .from("client_candidates")
          .insert({
            client_id: selectedClientId,
            candidate_id: candidateId,
            assigned_by: user.id,
            company_user_id: null,
            job_id: jobIdToAssign,
            notes: notes || null,
          });

        if (error) throw error;
        return;
      }

      // Se for atribuir para todos os usuários da empresa
      if (assignmentType === "all") {
        const assignments = companyUsers.map(companyUser => ({
          client_id: selectedClientId,
          candidate_id: candidateId,
          assigned_by: user.id,
          company_user_id: companyUser.id,
          job_id: jobIdToAssign,
          notes: notes || null,
        }));

        const { error } = await supabase
          .from("client_candidates")
          .insert(assignments);

        if (error) throw error;
      } else if (assignmentType === "specific" && selectedUserId) {
        // Atribuir apenas para usuário específico
        const { error } = await supabase
          .from("client_candidates")
          .insert({
            client_id: selectedClientId,
            candidate_id: candidateId,
            assigned_by: user.id,
            company_user_id: selectedUserId,
            job_id: jobIdToAssign,
            notes: notes || null,
          });

        if (error) throw error;
      } else {
        throw new Error("Selecione um usuário específico");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-candidates"] });
      const job = matchedJobs?.find((j) => j.id === selectedJobId);
      const message = job
        ? `Candidato atribuído à vaga "${job.title}" com sucesso!`
        : assignmentType === "all"
        ? "Candidato atribuído para todos os usuários da empresa!"
        : "Candidato atribuído com sucesso!";
      toast.success(message);
      handleClose();
    },
    onError: (error: any) => {
      if (error.message.includes("duplicate key")) {
        toast.error("Este candidato já foi atribuído a este cliente");
      } else {
        toast.error("Erro ao atribuir candidato: " + error.message);
      }
    },
  });

  const handleClose = () => {
    setSelectedClientId("");
    setAssignmentType("all");
    setSelectedUserId("");
    setSelectedJobId("");
    setNotes("");
    setSelectedClient(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error("Selecione uma empresa");
      return;
    }
    if (assignmentType === "specific" && !selectedUserId) {
      toast.error("Selecione um usuário da empresa");
      return;
    }
    assignMutation.mutate();
  };

  const isHuntingClient = selectedClient?.client_type === 'hunting';

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Atribuir Candidato a Cliente
          </SheetTitle>
          <SheetDescription>
            Enviar <strong>{candidateName}</strong> para visualização de um cliente específico
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client">Empresa ({clients?.length || 0} disponíveis)</Label>
              {loadingClients ? (
                <div className="p-2 text-sm text-muted-foreground">Carregando empresas...</div>
              ) : (
                <Select value={selectedClientId} onValueChange={(value) => {
                  setSelectedClientId(value);
                  setAssignmentType("all");
                  setSelectedUserId("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{client.company_name}</span>
                          <Badge 
                            variant="outline" 
                            className={`ml-2 text-xs ${
                              client.client_type === 'hunting' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {client.client_type === 'hunting' ? 'Hunting' : 'Mão de Obra'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Alerta para cliente Hunting */}
            {isHuntingClient && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Cliente Hunting:</strong> O cliente verá apenas nome, função e contato. 
                  Certificações e documentos ficam bloqueados até você liberar.
                </AlertDescription>
              </Alert>
            )}

            {/* Seletor de vaga (com auto-match pela função desejada) */}
            {selectedClientId && matchedJobs && matchedJobs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="job" className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    Vincular à vaga
                  </Label>
                  {autoMatchedJob && selectedJobId === autoMatchedJob.id && (
                    <Badge variant="outline" className="text-[10px] h-5 gap-1 border-emerald-300 text-emerald-700 bg-emerald-50">
                      <Sparkles className="h-3 w-3" />
                      Match automático
                    </Badge>
                  )}
                </div>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem vínculo a vaga" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" onSelect={() => setSelectedJobId("")}>
                      Sem vínculo a vaga
                    </SelectItem>
                    {matchedJobs.map((job) => {
                      const isMatch =
                        candidateProfile?.desired_function &&
                        (job.function_name || "").trim().toLowerCase() ===
                          candidateProfile.desired_function.trim().toLowerCase();
                      return (
                        <SelectItem key={job.id} value={job.id}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{job.title}</span>
                            {isMatch && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-emerald-300 text-emerald-700 bg-emerald-50">
                                Match
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {candidateProfile?.desired_function && (
                  <p className="text-[11px] text-muted-foreground">
                    Função desejada do profissional: <span className="font-medium text-foreground">{candidateProfile.desired_function}</span>
                  </p>
                )}
              </div>
            )}

            {selectedClientId && matchedJobs && matchedJobs.length === 0 && candidateProfile?.desired_function && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Este cliente não possui vagas ativas. O profissional será atribuído sem vínculo a vaga.
                </AlertDescription>
              </Alert>
            )}

            {selectedClientId && companyUsers && companyUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Atribuir para</Label>
                <Select value={assignmentType} onValueChange={(value: "all" | "specific") => {
                  setAssignmentType(value);
                  setSelectedUserId("");
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todos os usuários da empresa ({companyUsers.length})
                    </SelectItem>
                    <SelectItem value="specific">Usuário específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignmentType === "specific" && selectedClientId && companyUsers && (
              <div className="space-y-2">
                <Label htmlFor="user">Usuário</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.role === "company_admin" ? "Admin" : "Usuário"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre esta atribuição..."
                rows={3}
              />
            </div>
          </div>

          <SheetFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={assignMutation.isPending} className="w-full sm:w-auto">
              {assignMutation.isPending ? "Atribuindo..." : "Atribuir Candidato"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
