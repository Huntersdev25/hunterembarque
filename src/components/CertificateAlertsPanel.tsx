/**
 * Componente CertificateAlertsPanel
 * Exibe alertas de certificados vencendo ou vencidos
 */
import { useState, useEffect } from "react";
import { parseDateLocal } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  Bell, 
  Clock, 
  CheckCircle2, 
  ChevronDown,
  FileWarning,
  Calendar,
  X
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CertificateAlert {
  id: string;
  certification_key: string;
  certification_name: string;
  validity_date: string;
  alert_type: 'expiring_30' | 'expiring_15' | 'expiring_7' | 'expired';
  is_read: boolean;
  created_at: string;
}

interface CertificateAlertsPanelProps {
  isAdmin?: boolean;
  compact?: boolean;
}

export function CertificateAlertsPanel({ isAdmin = false, compact = false }: CertificateAlertsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<CertificateAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user, isAdmin]);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from("certificate_alerts")
        .select("*")
        .order("validity_date", { ascending: true });

      if (!isAdmin) {
        // Get profile ID for current user
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user?.id)
          .single();

        if (profile) {
          query = query.eq("profile_id", profile.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts((data || []) as CertificateAlert[]);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      await supabase
        .from("certificate_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      setAlerts(prev => 
        prev.map(a => a.id === alertId ? { ...a, is_read: true } : a)
      );
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await supabase
        .from("certificate_alerts")
        .delete()
        .eq("id", alertId);

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast({
        title: "Alerta removido",
        description: "O alerta foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'expired':
        return <FileWarning className="h-5 w-5 text-destructive" />;
      case 'expiring_7':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'expiring_15':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'expiring_30':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'expired':
        return "border-l-4 border-l-destructive bg-destructive/5";
      case 'expiring_7':
        return "border-l-4 border-l-red-500 bg-red-50";
      case 'expiring_15':
        return "border-l-4 border-l-amber-500 bg-amber-50";
      case 'expiring_30':
        return "border-l-4 border-l-yellow-500 bg-yellow-50";
      default:
        return "";
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'expired':
        return <Badge variant="destructive">Vencido</Badge>;
      case 'expiring_7':
        return <Badge className="bg-red-500">Vence em 7 dias</Badge>;
      case 'expiring_15':
        return <Badge className="bg-amber-500">Vence em 15 dias</Badge>;
      case 'expiring_30':
        return <Badge className="bg-yellow-500 text-yellow-900">Vence em 30 dias</Badge>;
      default:
        return null;
    }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const expiredCount = alerts.filter(a => a.alert_type === 'expired').length;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0 && !isAdmin) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="font-medium">Todos os certificados em dia!</p>
              <p className="text-sm text-green-600">Nenhum certificado próximo do vencimento.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={expiredCount > 0 ? "border-destructive" : unreadCount > 0 ? "border-amber-300" : ""}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Alertas de Certificados</CardTitle>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {alerts.slice(0, 5).map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-3 rounded-lg flex items-start gap-3 ${getAlertStyle(alert.alert_type)} ${!alert.is_read ? 'font-medium' : 'opacity-80'}`}
                      onClick={() => !alert.is_read && markAsRead(alert.id)}
                    >
                      {getAlertIcon(alert.alert_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{alert.certification_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Validade: {format(parseDateLocal(alert.validity_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      {getAlertBadge(alert.alert_type)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className={expiredCount > 0 ? "border-destructive" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de Certificados
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} novos</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Certificados que precisam de atenção
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {alerts.map((alert) => {
              const daysUntil = differenceInDays(parseDateLocal(alert.validity_date), new Date());
              
              return (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg ${getAlertStyle(alert.alert_type)} ${!alert.is_read ? 'shadow-sm' : 'opacity-75'} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.alert_type)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className={`font-medium ${!alert.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {alert.certification_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {alert.alert_type === 'expired' 
                                ? `Venceu em ${format(parseDateLocal(alert.validity_date), "dd/MM/yyyy", { locale: ptBR })}` 
                                : `Vence em ${format(parseDateLocal(alert.validity_date), "dd/MM/yyyy", { locale: ptBR })} (${daysUntil} dias)`
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getAlertBadge(alert.alert_type)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
