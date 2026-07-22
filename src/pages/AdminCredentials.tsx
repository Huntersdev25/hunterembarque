import { useState, useEffect } from "react";
import { formatDateBR } from "@/lib/utils";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneBR } from "@/lib/phoneFormat";

interface Administrator {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export default function AdminCredentials() {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const { toast } = useToast();

  const [newAdminData, setNewAdminData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: ""
  });

  const [editAdminData, setEditAdminData] = useState({
    full_name: "",
    phone: ""
  });

  useEffect(() => {
    fetchAdministrators();
  }, []);

  const fetchAdministrators = async () => {
    try {
      const { data, error } = await supabase
        .from('administrators')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdministrators(data || []);
    } catch (error) {
      console.error('Erro ao carregar administradores:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar administradores"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Usar edge function para criar admin sem afetar sessão atual
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: {
          email: newAdminData.email,
          password: newAdminData.password,
          full_name: newAdminData.full_name,
          phone: newAdminData.phone
        }
      });

      if (error) {
        console.error('Erro na edge function:', error);
        throw new Error(error.message || 'Erro ao criar administrador');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar administrador');
      }

      toast({
        title: "Sucesso",
        description: "Administrador criado com sucesso"
      });

      setIsCreateDialogOpen(false);
      setNewAdminData({
        email: "",
        password: "",
        full_name: "",
        phone: ""
      });
      fetchAdministrators();
    } catch (error: any) {
      console.error('Erro ao criar administrador:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao criar administrador"
      });
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAdmin) return;

    try {
      const { error } = await supabase
        .from('administrators')
        .update({
          full_name: editAdminData.full_name,
          phone: editAdminData.phone
        })
        .eq('id', editingAdmin.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Administrador atualizado com sucesso"
      });

      setIsEditDialogOpen(false);
      setEditingAdmin(null);
      fetchAdministrators();
    } catch (error) {
      console.error('Erro ao atualizar administrador:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar administrador"
      });
    }
  };

  const handleDeleteAdmin = async (admin: Administrator) => {
    if (!confirm(`Tem certeza que deseja excluir o administrador ${admin.full_name}?`)) return;

    try {
      // Usar edge function para deletar completamente o usuário
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: admin.user_id
        }
      });

      if (error) {
        console.error('❌ Erro na edge function delete-user:', error);
        throw new Error(error.message || 'Erro ao excluir administrador');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao excluir administrador');
      }

      toast({
        title: "Sucesso",
        description: "Administrador excluído completamente do sistema"
      });

      fetchAdministrators();
    } catch (error) {
      console.error('Erro ao excluir administrador:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Erro ao excluir administrador: ${error.message}`
      });
    }
  };

  const openEditDialog = (admin: Administrator) => {
    setEditingAdmin(admin);
    setEditAdminData({
      full_name: admin.full_name,
      phone: admin.phone
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-maritime-blue">TI | Credenciais</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie credenciais administrativas do sistema
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Administradores do Sistema</CardTitle>
                <CardDescription>
                  Total de {administrators.length} administradores cadastrados
                </CardDescription>
              </div>
              <Button variant="maritime" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Administrador
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {administrators.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-warning" />
                        <User className="h-4 w-4 text-muted-foreground" />
                        {admin.full_name}
                      </div>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.phone}</TableCell>
                    <TableCell>{formatDateBR(admin.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(admin)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteAdmin(admin)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog para criar administrador */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Administrador</DialogTitle>
              <DialogDescription>
                Preencha as informações para criar um novo administrador no sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={newAdminData.full_name}
                  onChange={(e) => setNewAdminData({ ...newAdminData, full_name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="+55 11 98765-4321"
                  value={newAdminData.phone}
                  onChange={(e) => setNewAdminData({ ...newAdminData, phone: formatPhoneBR(e.target.value) })}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="maritime">
                  Criar Administrador
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar administrador */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Administrador</DialogTitle>
              <DialogDescription>
                Edite as informações do administrador {editingAdmin?.full_name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Nome Completo</Label>
                <Input
                  id="edit_full_name"
                  value={editAdminData.full_name}
                  onChange={(e) => setEditAdminData({ ...editAdminData, full_name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Telefone</Label>
                <Input
                  id="edit_phone"
                  value={editAdminData.phone}
                  onChange={(e) => setEditAdminData({ ...editAdminData, phone: e.target.value })}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="maritime">
                  Atualizar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}