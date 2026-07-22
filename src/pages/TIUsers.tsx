import { useState } from 'react';
import { formatDateBR } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Server, Users, Shield, Building2, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneBR } from '@/lib/phoneFormat';
import { TILayout } from '@/components/ti/TILayout';

export default function TIUsers() {
  const { user, userRole, loading } = useAuth();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createAdminDialogOpen, setCreateAdminDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userType, setUserType] = useState<'ti' | 'admin' | 'client' | 'candidate'>('ti');
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    contact_name: '',
    is_active: true
  });
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });

  const { data: tiUsers, refetch: refetchTI } = useQuery({
    queryKey: ['ti-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ti_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: userRole === 'ti'
  });

  const { data: admins, refetch: refetchAdmins } = useQuery({
    queryKey: ['ti-all-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrators')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: userRole === 'ti'
  });

  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ['ti-all-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: userRole === 'ti'
  });

  const { data: candidates, refetch: refetchCandidates } = useQuery({
    queryKey: ['ti-all-candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'candidate')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: userRole === 'ti'
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleEdit = (userData: any, type: 'ti' | 'admin' | 'client' | 'candidate') => {
    setSelectedUser(userData);
    setUserType(type);
    setEditForm({
      full_name: userData.full_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      company_name: userData.company_name || '',
      contact_name: userData.contact_name || '',
      is_active: userData.is_active !== undefined ? userData.is_active : true
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (userData: any, type: 'ti' | 'admin' | 'client' | 'candidate') => {
    setSelectedUser(userData);
    setUserType(type);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const table = userType === 'ti' ? 'ti_users' : 
                    userType === 'admin' ? 'administrators' : 
                    userType === 'client' ? 'clients' : 'profiles';

      const updateData: any = {
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone
      };

      if (userType === 'client') {
        updateData.company_name = editForm.company_name;
        updateData.contact_name = editForm.contact_name;
        updateData.is_active = editForm.is_active;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });

      setEditDialogOpen(false);
      
      // Refetch data
      if (userType === 'ti') refetchTI();
      else if (userType === 'admin') refetchAdmins();
      else if (userType === 'client') refetchClients();
      else refetchCandidates();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const table = userType === 'ti' ? 'ti_users' : 
                    userType === 'admin' ? 'administrators' : 
                    userType === 'client' ? 'clients' : 'profiles';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário deletado com sucesso",
      });

      setDeleteDialogOpen(false);
      
      // Refetch data
      if (userType === 'ti') refetchTI();
      else if (userType === 'admin') refetchAdmins();
      else if (userType === 'client') refetchClients();
      else refetchCandidates();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
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
        title: 'Sucesso',
        description: 'Administrador criado com sucesso'
      });

      setCreateAdminDialogOpen(false);
      setNewAdminData({
        email: '',
        password: '',
        full_name: '',
        phone: ''
      });
      refetchAdmins();
    } catch (error: any) {
      console.error('Erro ao criar administrador:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao criar administrador'
      });
    }
  };

  return (
    <TILayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Controle total de usuários do sistema</p>
        </div>
        <Tabs defaultValue="ti" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ti">T.I ({tiUsers?.length || 0})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({admins?.length || 0})</TabsTrigger>
            <TabsTrigger value="clients">Clientes ({clients?.length || 0})</TabsTrigger>
            <TabsTrigger value="candidates">Candidatos ({candidates?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="ti">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Usuários T.I
                    </CardTitle>
                    <CardDescription>Usuários com acesso total ao sistema</CardDescription>
                  </div>
                  <Link to="/s/novo-ti">
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar T.I
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiUsers?.map((tiUser) => (
                      <TableRow key={tiUser.id}>
                        <TableCell className="font-medium">{tiUser.full_name}</TableCell>
                        <TableCell>{tiUser.email}</TableCell>
                        <TableCell>{tiUser.phone}</TableCell>
                        <TableCell>{formatDateBR(tiUser.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(tiUser, 'ti')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(tiUser, 'ti')}>
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
          </TabsContent>

          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Administradores
                    </CardTitle>
                    <CardDescription>Usuários com acesso administrativo</CardDescription>
                  </div>
                  <Button onClick={() => setCreateAdminDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Admin
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins?.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.full_name}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{admin.phone}</TableCell>
                        <TableCell>{formatDateBR(admin.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(admin, 'admin')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(admin, 'admin')}>
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
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Clientes
                </CardTitle>
                <CardDescription>Empresas cadastradas no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients?.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.company_name}</TableCell>
                        <TableCell>{client.contact_name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {client.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(client, 'client')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(client, 'client')}>
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
          </TabsContent>

          <TabsContent value="candidates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Candidatos
                </CardTitle>
                <CardDescription>Profissionais cadastrados na plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Função Desejada</TableHead>
                      <TableHead>Perfil Completo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates?.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell className="font-medium">{candidate.full_name}</TableCell>
                        <TableCell>{candidate.email}</TableCell>
                        <TableCell>{candidate.phone}</TableCell>
                        <TableCell>{candidate.desired_function || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${candidate.profile_complete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {candidate.profile_complete ? 'Completo' : 'Incompleto'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(candidate, 'candidate')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(candidate, 'candidate')}>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="+55 11 98765-4321"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: formatPhoneBR(e.target.value) })}
              />
            </div>
            {userType === 'client' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Empresa</Label>
                  <Input
                    id="company_name"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Nome do Contato</Label>
                  <Input
                    id="contact_name"
                    value={editForm.contact_name}
                    onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={createAdminDialogOpen} onOpenChange={setCreateAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Administrador</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo administrador
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new_email">Email</Label>
                <Input
                  id="new_email"
                  type="email"
                  required
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">Senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  required
                  minLength={8}
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_full_name">Nome Completo</Label>
                <Input
                  id="new_full_name"
                  required
                  value={newAdminData.full_name}
                  onChange={(e) => setNewAdminData({ ...newAdminData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_phone">Telefone</Label>
                <Input
                  id="new_phone"
                  required
                  value={newAdminData.phone}
                  onChange={(e) => setNewAdminData({ ...newAdminData, phone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateAdminDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar Administrador</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TILayout>
  );
}
