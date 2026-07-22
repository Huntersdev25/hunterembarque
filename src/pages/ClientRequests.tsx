import { useEffect, useState } from "react";
import { parseDateLocal } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Plus, Clock, Calendar, Users, Building2, FileCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ClientRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  
  // Form state para nova solicitação
  const [jobFunction, setJobFunction] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState("media");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [unit, setUnit] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      setClientInfo(data);
    };

    fetchClientInfo();
  }, [user]);

  // Buscar solicitações do cliente
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ["professional-requests", clientInfo?.id],
    queryFn: async () => {
      if (!clientInfo?.id) return [];
      
      const { data, error } = await supabase
        .from("professional_requests")
        .select("*")
        .eq("client_id", clientInfo.id)
        .order("requested_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientInfo?.id,
  });

  // Mutation para criar nova solicitação
  const createRequestMutation = useMutation({
    mutationFn: async (newRequest: any) => {
      const { data, error } = await supabase
        .from("professional_requests")
        .insert([newRequest])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-requests"] });
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação foi enviada com sucesso!",
      });
      setIsRequestDialogOpen(false);
      // Limpar form
      setJobFunction("");
      setDescription("");
      setQuantity("1");
      setUrgency("media");
      setPeriodStart("");
      setPeriodEnd("");
      setUnit("");
      setCertifications([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientInfo?.id || !user?.id) {
      toast({
        title: "Erro",
        description: "Informações do cliente não encontradas",
        variant: "destructive",
      });
      return;
    }

    createRequestMutation.mutate({
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
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendente: { label: "Pendente", variant: "outline" },
      em_andamento: { label: "Em Andamento", variant: "default" },
      concluido: { label: "Concluído", variant: "secondary" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };
    
    const config = statusConfig[status] || statusConfig.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig: Record<string, { label: string; className: string }> = {
      baixa: { label: "Baixa", className: "bg-green-100 text-green-800" },
      media: { label: "Média", className: "bg-yellow-100 text-yellow-800" },
      alta: { label: "Alta", className: "bg-red-100 text-red-800" },
    };
    
    const config = urgencyConfig[urgency] || urgencyConfig.media;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout userType="client">
      <div className="container mx-auto py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Send className="h-8 w-8" />
              Solicitações de Profissionais
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas solicitações de profissionais especializados
            </p>
          </div>
          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Nova Solicitação de Profissional</DialogTitle>
                <DialogDescription>
                  Preencha os dados para solicitar profissionais especializados
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
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
                  <Label htmlFor="unit">Unidade</Label>
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

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRequestDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createRequestMutation.isPending}>
                    {createRequestMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {loadingRequests ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Carregando solicitações...</p>
              </CardContent>
            </Card>
          ) : requests && requests.length > 0 ? (
            requests.map((request: any) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{request.job_function}</CardTitle>
                      <CardDescription>
                        Solicitado em {format(parseDateLocal(request.requested_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(request.status)}
                      {getUrgencyBadge(request.urgency)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{request.quantity} profissional(is)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Atualizado: {format(parseDateLocal(request.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    {request.unit && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{request.unit}</span>
                      </div>
                    )}
                    {(request.period_start || request.period_end) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {request.period_start && format(parseDateLocal(request.period_start), "dd/MM/yyyy")}
                          {request.period_start && request.period_end && " - "}
                          {request.period_end && format(parseDateLocal(request.period_end), "dd/MM/yyyy")}
                        </span>
                      </div>
                    )}
                  </div>

                  {request.required_certifications && request.required_certifications.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileCheck className="h-4 w-4" />
                        Certificações Requeridas:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {request.required_certifications.map((cert: string, idx: number) => (
                          <Badge key={idx} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.description && (
                    <div>
                      <p className="text-sm font-medium mb-1">Descrição:</p>
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                    </div>
                  )}

                  {request.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Observações:</p>
                      <p className="text-sm text-muted-foreground">{request.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação ainda</h3>
                <p className="text-muted-foreground">
                  Clique em "Nova Solicitação" para solicitar profissionais especializados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
