import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Eye, EyeOff, Search, Building2, Settings2, Loader2 } from "lucide-react";
import { VisibilityControlDrawer } from "@/components/VisibilityControlDrawer";

interface ClientCandidateWithDetails {
  id: string;
  candidate_id: string;
  client_id: string;
  candidate: {
    full_name: string;
    email: string;
  };
  client: {
    company_name: string;
    client_type: string;
  };
  visibility: {
    show_availability: boolean;
    show_salary_expectation: boolean;
    show_certifications: boolean;
    show_documents: boolean;
    show_personal_documents: boolean;
    show_address: boolean;
    show_professional_experience: boolean;
    show_contact_info: boolean;
  } | null;
}

export default function TIVisibility() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<ClientCandidateWithDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['ti-visibility-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_candidates')
        .select(`
          id,
          candidate_id,
          client_id,
          profiles!client_candidates_candidate_id_fkey (
            full_name,
            email
          ),
          clients!client_candidates_client_id_fkey (
            company_name,
            client_type
          ),
          client_candidate_visibility (
            show_availability,
            show_salary_expectation,
            show_certifications,
            show_documents,
            show_personal_documents,
            show_address,
            show_professional_experience,
            show_contact_info
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        candidate_id: item.candidate_id,
        client_id: item.client_id,
        candidate: item.profiles as any,
        client: item.clients as any,
        visibility: item.client_candidate_visibility?.[0] || null
      })) as ClientCandidateWithDetails[];
    }
  });

  const filteredAssignments = assignments?.filter(a => 
    a.candidate?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.client?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVisibilityScore = (visibility: ClientCandidateWithDetails['visibility']) => {
    if (!visibility) return 0;
    const fields = [
      visibility.show_availability,
      visibility.show_salary_expectation,
      visibility.show_certifications,
      visibility.show_documents,
      visibility.show_personal_documents,
      visibility.show_address,
      visibility.show_professional_experience,
      visibility.show_contact_info
    ];
    return fields.filter(Boolean).length;
  };

  const handleOpenDrawer = (assignment: ClientCandidateWithDetails) => {
    setSelectedAssignment(assignment);
    setDrawerOpen(true);
  };

  return (
    <TILayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Controle de Visibilidade</h1>
          <p className="text-muted-foreground">
            Gerencie quais informações dos candidatos são visíveis para cada cliente
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Atribuições Ativas
                </CardTitle>
                <CardDescription>
                  {assignments?.length || 0} candidatos atribuídos a clientes
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Visibilidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma atribuição encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignments?.map((assignment) => {
                      const score = getVisibilityScore(assignment.visibility);
                      const isRestricted = score < 4;

                      return (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{assignment.candidate?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{assignment.candidate?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {assignment.client?.company_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={assignment.client?.client_type === 'hunting' ? 'secondary' : 'default'}>
                              {assignment.client?.client_type === 'hunting' ? 'Hunting' : 'Fornecimento'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isRestricted ? (
                                <EyeOff className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-green-500" />
                              )}
                              <span className="text-sm">{score}/8 campos</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenDrawer(assignment)}
                            >
                              <Settings2 className="h-4 w-4 mr-1" />
                              Configurar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Visibility Drawer */}
        {selectedAssignment && (
          <VisibilityControlDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            clientCandidateId={selectedAssignment.id}
            candidateName={selectedAssignment.candidate?.full_name || 'Candidato'}
            clientName={selectedAssignment.client?.company_name || 'Cliente'}
            visibility={selectedAssignment.visibility as any}
            onVisibilityChange={() => {
              queryClient.invalidateQueries({ queryKey: ['ti-visibility-assignments'] });
            }}
          />
        )}
      </div>
    </TILayout>
  );
}
