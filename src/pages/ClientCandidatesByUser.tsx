import { useEffect, useState } from "react";
import { formatDateBR } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users2, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CandidateDetailView } from "@/components/CandidateDetailView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ClientCandidatesByUser() {
  const { user } = useAuth();
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

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

  const { data: usersWithCandidates, isLoading } = useQuery({
    queryKey: ["client-users-candidates", clientInfo?.id],
    queryFn: async () => {
      if (!clientInfo?.id) return [];

      const { data: companyUsers, error: usersError } = await supabase
        .from("company_users")
        .select("id, full_name, email, role, is_active")
        .eq("client_id", clientInfo.id)
        .eq("is_active", true)
        .order("full_name");

      if (usersError) throw usersError;
      if (!companyUsers || companyUsers.length === 0) return [];

      const results: any[] = [];

      for (const companyUser of companyUsers) {
        const { data: assignments, error: assignError } = await supabase
          .from("client_candidates")
          .select("id, candidate_id, assigned_at, notes, interview_status")
          .eq("client_id", clientInfo.id)
          .eq("company_user_id", companyUser.id)
          .order("assigned_at", { ascending: false });

        if (assignError) {
          console.error("Error fetching assignments:", assignError);
          results.push({
            ...companyUser,
            candidates: [],
            totalCandidates: 0,
            pendingCandidates: 0,
            approvedCandidates: 0,
            rejectedCandidates: 0,
          });
          continue;
        }

        const candidatesData: any[] = [];
        
        if (assignments && assignments.length > 0) {
          for (const assignment of assignments) {
            const { data: candidateData } = await supabase
              .from("profiles")
              .select("user_id, full_name, email, phone, desired_function, city, state, avatar_url")
              .eq("user_id", assignment.candidate_id)
              .single();

            candidatesData.push({
              id: assignment.id,
              candidate_id: assignment.candidate_id,
              assigned_at: assignment.assigned_at,
              notes: assignment.notes,
              interview_status: assignment.interview_status,
              candidate: candidateData,
            });
          }
        }

        results.push({
          ...companyUser,
          candidates: candidatesData,
          totalCandidates: candidatesData.length,
          pendingCandidates: candidatesData.filter((c: any) => !c.interview_status || c.interview_status === 'pending').length,
          approvedCandidates: candidatesData.filter((c: any) => c.interview_status === 'approved').length,
          rejectedCandidates: candidatesData.filter((c: any) => c.interview_status === 'rejected').length,
        });
      }

      return results;
    },
    enabled: !!clientInfo?.id,
  });

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'pending') {
      return <Badge variant="outline">Pendente</Badge>;
    }
    if (status === 'approved') {
      return <Badge className="bg-green-500">Aprovado</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">Reprovado</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <DashboardLayout userType="client">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maritime-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="client">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users2 className="h-8 w-8" />
            Candidatos por Usuário
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize os candidatos atribuídos a cada usuário da sua empresa
          </p>
        </div>

        <div className="space-y-6">
          {usersWithCandidates && usersWithCandidates.length > 0 ? (
            usersWithCandidates.map((companyUser: any) => (
              <Card key={companyUser.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {companyUser.full_name}
                        <Badge variant={companyUser.role === 'company_admin' ? 'default' : 'secondary'}>
                          {companyUser.role === 'company_admin' ? 'Administrador' : 'Usuário'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3" />
                        {companyUser.email}
                      </CardDescription>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{companyUser.totalCandidates}</div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{companyUser.pendingCandidates}</div>
                        <div className="text-muted-foreground">Pendentes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{companyUser.approvedCandidates}</div>
                        <div className="text-muted-foreground">Aprovados</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {companyUser.candidates && companyUser.candidates.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Localização</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data Atribuição</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyUser.candidates.map((assignment: any) => (
                            <TableRow key={assignment.id}>
                              <TableCell className="font-medium">
                                {assignment.candidate?.full_name || "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {assignment.candidate?.desired_function || "Não especificado"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {assignment.candidate?.city && assignment.candidate?.state
                                  ? `${assignment.candidate.city}, ${assignment.candidate.state}`
                                  : "Não informado"}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(assignment.interview_status)}
                              </TableCell>
                              <TableCell>
                                {formatDateBR(assignment.assigned_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCandidate(assignment.candidate);
                                    setDetailsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Detalhes
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhum candidato atribuído a este usuário.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Users2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum usuário encontrado na sua empresa.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Candidato</DialogTitle>
            <DialogDescription>
              Informações completas do profissional
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedCandidate && (
              <CandidateDetailView candidate={selectedCandidate} />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
