import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDateBR } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Trash2, UserCheck, UserX, Users, Pencil, Crosshair, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { GenericTableReportExport } from "@/components/GenericTableReportExport";
import { formatPhoneBR } from "@/lib/phoneFormat";

export default function AdminClients() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [credentialsDialog, setCredentialsDialog] = useState<{ open: boolean; email: string; password: string; companyName: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    clientType: "labor_supply" as "hunting" | "labor_supply",
  });
  const [editFormData, setEditFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    clientType: "labor_supply" as "hunting" | "labor_supply",
  });
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });




  const createClientMutation = useMutation({
    mutationFn: async (newClient: typeof formData) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const { data, error } = await supabase.functions.invoke('create-client', {
        body: {
          email: newClient.email,
          companyName: newClient.companyName,
          contactName: newClient.contactName,
          phone: newClient.phone,
          clientType: newClient.clientType,
        },
      });

      // Verificar erros do invoke (network/CORS)
      if (error) {
        console.error('Edge function invoke error:', error);
        throw new Error(error.message || 'Erro ao conectar com o servidor');
      }

      // Agora a função sempre retorna 200, verificar success no body
      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido ao criar cliente');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      // Mostrar dialog com credenciais para o admin copiar
      setCredentialsDialog({
        open: true,
        email: formData.email,
        password: data.generatedPassword,
        companyName: formData.companyName,
      });
      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        clientType: "labor_supply",
      });
    },
    onError: (error: any) => {
      console.error('Create client error:', error);
      toast.error(error.message || "Erro ao criar cliente");
    },
  });

  const toggleClientStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Status do cliente atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Você precisa estar logado');
      }

      const { data, error } = await supabase.functions.invoke('delete-client', {
        body: { userId },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao excluir cliente');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido ao excluir cliente');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir cliente: " + error.message);
    },
  });




  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editFormData }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          company_name: data.companyName,
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          client_type: data.clientType,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado com sucesso!");
      setEditOpen(false);
      setEditingClient(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar cliente: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClientMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateClientMutation.mutate({
        id: editingClient.id,
        data: editFormData,
      });
    }
  };

  const openEditDialog = (client: any) => {
    setEditingClient(client);
    setEditFormData({
      companyName: client.company_name,
      contactName: client.contact_name,
      email: client.email,
      phone: client.phone,
      clientType: client.client_type || "labor_supply",
    });
    setEditOpen(true);
  };

  return (
    <DashboardLayout userType="admin">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Gerenciar Clientes
            </h1>
            <p className="text-muted-foreground mt-2">
              Cadastre e gerencie os clientes que terão acesso ao painel administrativo
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados do cliente. Um email de acesso será enviado automaticamente.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactName">Nome do Contato</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="+55 11 98765-4321"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhoneBR(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientType">Tipo de Cliente</Label>
                    <Select
                      value={formData.clientType}
                      onValueChange={(value: "hunting" | "labor_supply") => 
                        setFormData({ ...formData, clientType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor_supply">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Fornecimento de Mão de Obra
                          </div>
                        </SelectItem>
                        <SelectItem value="hunting">
                          <div className="flex items-center gap-2">
                            <Crosshair className="h-4 w-4" />
                            Hunting
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
                    <p><strong>Nota:</strong> O cliente receberá a senha padrão <code className="bg-background px-1 py-0.5 rounded">Hunters@2024</code> e será obrigado a alterá-la no primeiro login.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Criando..." : "Cadastrar Cliente"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Clientes Cadastrados</CardTitle>
                <CardDescription>
                  Lista de todos os clientes com acesso ao painel administrativo
                </CardDescription>
              </div>
              <GenericTableReportExport
                title="Relatório de Clientes"
                subtitle="Gestão de Clientes"
                data={clients || []}
                columns={[
                  { key: 'company_name', label: 'Empresa' },
                  { key: 'client_type', label: 'Tipo', format: (v) => v === 'hunting' ? 'Hunting' : 'Mão de Obra' },
                  { key: 'contact_name', label: 'Contato' },
                  { key: 'email', label: 'E-mail' },
                  { key: 'phone', label: 'Telefone' },
                  { key: 'is_active', label: 'Status', format: (v) => v ? 'Ativo' : 'Inativo' },
                  { key: 'created_at', label: 'Criado em', format: (v) => formatDateBR(v) },
                ]}
                filters={[
                  { key: 'company_name', label: 'Empresa', type: 'text' },
                  { key: 'client_type', label: 'Tipo', type: 'select', options: [
                    { value: 'hunting', label: 'Hunting' },
                    { value: 'labor_supply', label: 'Mão de Obra' },
                  ] },
                  { key: 'is_active', label: 'Status', type: 'select', options: [
                    { value: 'true', label: 'Ativo' },
                    { value: 'false', label: 'Inativo' },
                  ], filterFn: (row, val) => String(row.is_active) === val },
                ]}
                fileName="clientes"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : !clients || clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente cadastrado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/a/empresas/${client.id}`)}
                    >
                      <TableCell className="font-medium">{client.company_name}</TableCell>
                      <TableCell>
                        <Badge variant={client.client_type === "hunting" ? "secondary" : "default"}>
                          {client.client_type === "hunting" ? (
                            <span className="flex items-center gap-1">
                              <Crosshair className="h-3 w-3" />
                              Hunting
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Mão de Obra
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{client.contact_name}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>
                        <Badge variant={client.is_active ? "default" : "secondary"}>
                          {client.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateBR(client.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleClientStatusMutation.mutate({
                                id: client.id,
                                isActive: client.is_active,
                              })
                            }
                          >
                            {client.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir este cliente?")) {
                                deleteClientMutation.mutate(client.user_id);
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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize os dados do cliente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-companyName">Nome da Empresa</Label>
                  <Input
                    id="edit-companyName"
                    value={editFormData.companyName}
                    onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-contactName">Nome do Contato</Label>
                  <Input
                    id="edit-contactName"
                    value={editFormData.contactName}
                    onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-clientType">Tipo de Cliente</Label>
                  <Select
                    value={editFormData.clientType}
                    onValueChange={(value: "hunting" | "labor_supply") => 
                      setEditFormData({ ...editFormData, clientType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labor_supply">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Fornecimento de Mão de Obra
                        </div>
                      </SelectItem>
                      <SelectItem value="hunting">
                        <div className="flex items-center gap-2">
                          <Crosshair className="h-4 w-4" />
                          Hunting
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? "Atualizando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>



      </div>

      {/* Dialog de Credenciais */}
      <Dialog open={!!credentialsDialog?.open} onOpenChange={(v) => { if (!v) setCredentialsDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <UserCheck className="h-5 w-5" />
              Cliente criado com sucesso!
            </DialogTitle>
            <DialogDescription>
              Copie os dados de acesso abaixo e envie para o cliente <strong>{credentialsDialog?.companyName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Login (e-mail)</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={credentialsDialog?.email || ''} className="font-mono text-sm" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(credentialsDialog?.email || '');
                    setCopiedField('email');
                    setTimeout(() => setCopiedField(null), 2000);
                    toast.success("E-mail copiado!");
                  }}
                >
                  {copiedField === 'email' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Senha temporária</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={credentialsDialog?.password || ''} className="font-mono text-sm" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(credentialsDialog?.password || '');
                    setCopiedField('password');
                    setTimeout(() => setCopiedField(null), 2000);
                    toast.success("Senha copiada!");
                  }}
                >
                  {copiedField === 'password' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-xs text-amber-800">
                ⚠️ <strong>Atenção:</strong> Esta senha não será exibida novamente. Copie e envie ao cliente antes de fechar esta janela.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const text = `Dados de acesso - Hunter Embarque\n\nLogin: ${credentialsDialog?.email}\nSenha: ${credentialsDialog?.password}\n\nAcesse: https://hunterembarque.com/login`;
                navigator.clipboard.writeText(text);
                setCopiedField('all');
                setTimeout(() => setCopiedField(null), 2000);
                toast.success("Todos os dados copiados!");
              }}
            >
              {copiedField === 'all' ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
              Copiar tudo
            </Button>
            <Button onClick={() => setCredentialsDialog(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
