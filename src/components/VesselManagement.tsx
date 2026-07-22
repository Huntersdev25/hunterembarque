import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Ship, Plus, Trash2, Edit, Power, PowerOff } from "lucide-react";

interface VesselManagementProps {
  clientId: string;
  clientName: string;
}

interface Vessel {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export function VesselManagement({ clientId, clientName }: VesselManagementProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const { data: vessels, isLoading } = useQuery({
    queryKey: ["client-vessels", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_vessels")
        .select("*")
        .eq("client_id", clientId)
        .order("name");
      if (error) throw error;
      return data as Vessel[];
    },
    enabled: !!clientId,
  });

  const createVesselMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("measurement_vessels").insert({
        client_id: clientId,
        name: data.name,
        description: data.description || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-vessels", clientId] });
      toast.success("Embarcação cadastrada com sucesso!");
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar embarcação: " + error.message);
    },
  });

  const updateVesselMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description: string }) => {
      const { error } = await supabase
        .from("measurement_vessels")
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-vessels", clientId] });
      toast.success("Embarcação atualizada com sucesso!");
      setIsOpen(false);
      setEditingVessel(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar embarcação: " + error.message);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("measurement_vessels")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-vessels", clientId] });
      toast.success("Status atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const deleteVesselMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("measurement_vessels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-vessels", clientId] });
      toast.success("Embarcação removida com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover embarcação: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVessel) {
      updateVesselMutation.mutate({ id: editingVessel.id, ...formData });
    } else {
      createVesselMutation.mutate(formData);
    }
  };

  const openEditDialog = (vessel: Vessel) => {
    setEditingVessel(vessel);
    setFormData({
      name: vessel.name,
      description: vessel.description || "",
    });
    setIsOpen(true);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Embarcações de {clientName}
            </CardTitle>
            <CardDescription>Gerencie as embarcações deste cliente</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingVessel(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Embarcação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVessel ? "Editar Embarcação" : "Nova Embarcação"}</DialogTitle>
                <DialogDescription>
                  {editingVessel ? "Atualize os dados da embarcação" : "Cadastre uma nova embarcação para este cliente"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vessel-name">Nome da Embarcação</Label>
                    <Input
                      id="vessel-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Navio Petrobras 001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vessel-description">Descrição (opcional)</Label>
                    <Textarea
                      id="vessel-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Informações adicionais sobre a embarcação..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createVesselMutation.isPending || updateVesselMutation.isPending}>
                    {editingVessel ? "Atualizar" : "Cadastrar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Carregando embarcações...</div>
        ) : !vessels || vessels.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhuma embarcação cadastrada. Adicione a primeira!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vessels.map((vessel) => (
                <TableRow key={vessel.id}>
                  <TableCell className="font-medium">{vessel.name}</TableCell>
                  <TableCell className="text-muted-foreground">{vessel.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={vessel.is_active ? "default" : "secondary"}>
                      {vessel.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(vessel)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatusMutation.mutate({ id: vessel.id, isActive: vessel.is_active })}
                      >
                        {vessel.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir esta embarcação? Todos os itens de rancho associados serão excluídos.")) {
                            deleteVesselMutation.mutate(vessel.id);
                          }
                        }}
                      >
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
  );
}