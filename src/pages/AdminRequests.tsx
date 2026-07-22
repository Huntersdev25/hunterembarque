import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Clock, Building2, Calendar, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { parseDateLocal } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

export default function AdminRequests() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["all-professional-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_requests")
        .select(`
          *,
          clients (
            company_name,
            contact_name,
            email
          )
        `)
        .order("requested_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

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
    <DashboardLayout userType="admin">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Send className="h-8 w-8" />
            Solicitações de Profissionais
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todas as solicitações feitas pelos clientes
          </p>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
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
                      <CardTitle className="text-lg flex items-center gap-2">
                        {request.job_function}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {request.clients?.company_name || "Cliente não informado"}
                      </CardDescription>
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

                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Contato: {request.clients?.contact_name} - {request.clients?.email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação ainda</h3>
                <p className="text-muted-foreground">
                  Quando os clientes fizerem solicitações, elas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
