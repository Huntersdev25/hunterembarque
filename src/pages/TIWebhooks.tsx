import { useState } from "react";
import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, Plus, Pencil, Trash2, Copy, CheckCircle2, ExternalLink, Zap, AlertCircle, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SystemWebhook {
  id: string;
  name: string;
  description: string | null;
  webhook_key: string;
  webhook_url: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function TIWebhooks() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<SystemWebhook | null>(null);
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formActive, setFormActive] = useState(true);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['system-webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_webhooks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SystemWebhook[];
    }
  });

  const createWebhook = useMutation({
    mutationFn: async (webhook: { name: string; webhook_key: string; description?: string | null; webhook_url?: string | null; is_active?: boolean }) => {
      const { error } = await supabase
        .from('system_webhooks')
        .insert([webhook]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-webhooks'] });
      toast.success('Webhook criado com sucesso!');
      setCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar webhook');
    }
  });

  const updateWebhook = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SystemWebhook> & { id: string }) => {
      const { error } = await supabase
        .from('system_webhooks')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-webhooks'] });
      toast.success('Webhook atualizado com sucesso!');
      setEditOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar webhook');
    }
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_webhooks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-webhooks'] });
      toast.success('Webhook deletado com sucesso!');
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao deletar webhook');
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('system_webhooks')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-webhooks'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  });

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormKey("");
    setFormUrl("");
    setFormActive(true);
  };

  const handleEdit = (webhook: SystemWebhook) => {
    setSelectedWebhook(webhook);
    setFormName(webhook.name);
    setFormDescription(webhook.description || "");
    setFormKey(webhook.webhook_key);
    setFormUrl(webhook.webhook_url || "");
    setFormActive(webhook.is_active);
    setEditOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const handleDelete = (webhook: SystemWebhook) => {
    setSelectedWebhook(webhook);
    setDeleteOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedWebhook) {
      updateWebhook.mutate({
        id: selectedWebhook.id,
        name: formName,
        description: formDescription || null,
        webhook_url: formUrl.trim() || null,
        is_active: formActive
      });
    }
  };

  const handleSaveCreate = () => {
    if (!formName || !formKey) {
      toast.error('Nome e chave são obrigatórios');
      return;
    }
    createWebhook.mutate({
      name: formName,
      description: formDescription || null,
      webhook_key: formKey,
      webhook_url: formUrl.trim() || null,
      is_active: formActive
    });
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
  };

  const testWebhook = async (webhook: SystemWebhook) => {
    if (!webhook.webhook_url) {
      toast.error('URL do webhook não configurada');
      return;
    }
    
    toast.loading('Testando webhook...', { id: 'test-webhook' });
    
    try {
      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: 'Hunters Embarque - TI Dashboard'
        })
      });
      
      if (response.ok) {
        toast.success('Webhook respondeu com sucesso!', { id: 'test-webhook' });
      } else {
        toast.error(`Webhook retornou erro: ${response.status}`, { id: 'test-webhook' });
      }
    } catch (error: any) {
      toast.error(`Falha ao conectar: ${error.message}`, { id: 'test-webhook' });
    }
  };

  const activeCount = webhooks?.filter(w => w.is_active && w.webhook_url).length || 0;
  const totalCount = webhooks?.length || 0;

  return (
    <TILayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Webhooks do Sistema
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie todas as integrações e webhooks da aplicação
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Webhook
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">Total Webhooks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount - activeCount}</p>
                  <p className="text-xs text-muted-foreground">Inativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">n8n</p>
                  <p className="text-xs text-muted-foreground">Plataforma</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhooks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Configurados</CardTitle>
            <CardDescription>
              Configure as URLs de webhook para cada integração do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : webhooks?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum webhook configurado</p>
                <Button onClick={handleCreate} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro webhook
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Chave</TableHead>
                      <TableHead className="hidden lg:table-cell">Webhook URL</TableHead>
                      <TableHead className="hidden xl:table-cell">Último Disparo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks?.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{webhook.name}</p>
                            {webhook.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {webhook.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {webhook.webhook_key}
                          </code>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {webhook.webhook_url ? (
                            <div className="flex items-center gap-2 max-w-xs">
                              <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                                {webhook.webhook_url}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(webhook.webhook_url!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não configurado</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                          {webhook.last_triggered_at 
                            ? formatDistanceToNow(new Date(webhook.last_triggered_at), {
                                addSuffix: true,
                                locale: ptBR
                              })
                            : 'Nunca'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={webhook.is_active}
                              onCheckedChange={(checked) => 
                                toggleActive.mutate({ id: webhook.id, is_active: checked })
                              }
                            />
                            <Badge 
                              variant={webhook.is_active && webhook.webhook_url ? "default" : "secondary"}
                            >
                              {webhook.is_active && webhook.webhook_url ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {webhook.webhook_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => testWebhook(webhook)}
                                title="Testar webhook"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(webhook)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(webhook)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Sheet */}
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Editar Webhook</SheetTitle>
              <SheetDescription>
                Atualize as configurações do webhook
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do webhook"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição do webhook (opcional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Chave (identificador)</Label>
                <Input
                  value={formKey}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  A chave não pode ser alterada após a criação
                </p>
              </div>
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://n8n.example.com/webhook/..."
                />
                <p className="text-xs text-muted-foreground">
                  Use URLs de produção (/webhook/) ao invés de URLs de teste (/webhook-test/)
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch
                  checked={formActive}
                  onCheckedChange={setFormActive}
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateWebhook.isPending}>
                {updateWebhook.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Create Sheet */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Novo Webhook</SheetTitle>
              <SheetDescription>
                Adicione uma nova integração de webhook ao sistema
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Notificação de Embarque"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição do webhook (opcional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Chave (identificador único) *</Label>
                <Input
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="notify-embarque"
                />
                <p className="text-xs text-muted-foreground">
                  Use apenas letras minúsculas, números e hífens
                </p>
              </div>
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://n8n.example.com/webhook/..."
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch
                  checked={formActive}
                  onCheckedChange={setFormActive}
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCreate} disabled={createWebhook.isPending}>
                {createWebhook.isPending ? 'Criando...' : 'Criar Webhook'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deletar Webhook</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja deletar o webhook "{selectedWebhook?.name}"? 
                Esta ação não pode ser desfeita e pode afetar integrações em funcionamento.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedWebhook && deleteWebhook.mutate(selectedWebhook.id)}
                disabled={deleteWebhook.isPending}
              >
                {deleteWebhook.isPending ? 'Deletando...' : 'Deletar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TILayout>
  );
}
