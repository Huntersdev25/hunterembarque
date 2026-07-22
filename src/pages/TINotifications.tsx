import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Mail, CheckCircle2, Clock, AlertTriangle, Eye, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function TINotifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['ti-all-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['ti-notification-stats'],
    queryFn: async () => {
      const [
        { count: total },
        { count: unread },
        { count: emailSent }
      ] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('email_sent', true),
      ]);
      return { total, unread, emailSent };
    }
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['ti-notification-stats'] });
      toast.success('Notificação marcada como lida');
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'application': return <Bell className="h-4 w-4 text-cyan-400" />;
      case 'certificate_alert': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default: return <Bell className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'application':
        return <Badge className="bg-cyan-500/20 text-cyan-400">Candidatura</Badge>;
      case 'certificate_alert':
        return <Badge className="bg-amber-500/20 text-amber-400">Certificado</Badge>;
      case 'interview':
        return <Badge className="bg-purple-500/20 text-purple-400">Entrevista</Badge>;
      default:
        return <Badge className="bg-zinc-700 text-zinc-300">{type}</Badge>;
    }
  };

  return (
    <TILayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <Bell className="h-6 w-6 text-emerald-400" />
              Central de Notificações
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Monitore todas as notificações do sistema
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{stats?.total || 0}</p>
                  <p className="text-xs text-zinc-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{stats?.unread || 0}</p>
                  <p className="text-xs text-zinc-500">Não Lidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{stats?.emailSent || 0}</p>
                  <p className="text-xs text-zinc-500">Emails Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {stats?.total ? Math.round(((stats.total - (stats.unread || 0)) / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-zinc-500">Taxa de Leitura</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Table */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Todas as Notificações</CardTitle>
            <CardDescription className="text-zinc-400">
              Últimas 100 notificações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                Nenhuma notificação encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Tipo</TableHead>
                      <TableHead className="text-zinc-400">Mensagem</TableHead>
                      <TableHead className="text-zinc-400 hidden md:table-cell">Data</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications?.map((notification) => (
                      <TableRow 
                        key={notification.id} 
                        className={`border-zinc-800 hover:bg-zinc-800/50 ${!notification.is_read ? 'bg-zinc-800/30' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(notification.type)}
                            {getTypeBadge(notification.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-zinc-200">{notification.title}</p>
                            <p className="text-xs text-zinc-500 line-clamp-1">{notification.message}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-zinc-400 text-sm">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {notification.is_read ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400">Lida</Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-400">Não Lida</Badge>
                            )}
                            {notification.email_sent && (
                              <Mail className="h-3 w-3 text-zinc-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-emerald-400"
                              onClick={() => markAsRead.mutate(notification.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TILayout>
  );
}
