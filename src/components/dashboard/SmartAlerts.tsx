import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle, Clock, ArrowRight, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";

interface CertificationStatus {
  name: string;
  label: string;
  fullName?: string;
  hasIt: boolean;
  validity: string | null;
  isIndeterminate?: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface SmartAlertsProps {
  certifications: CertificationStatus[];
  profileCompletion: number;
}

interface SmartAlert {
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  action?: string;
  actionLink?: string;
}

export function SmartAlerts({ certifications, profileCompletion }: SmartAlertsProps) {
  const today = new Date();
  const alerts: SmartAlert[] = [];

  // Expired certs — critical
  certifications.filter(c => c.isExpired && c.validity).forEach(cert => {
    const daysExpired = differenceInDays(today, new Date(cert.validity!));
    alerts.push({
      type: "critical",
      title: `Seu ${cert.label} venceu há ${daysExpired} dias`,
      description: `Você NÃO poderá embarcar com o ${cert.fullName || cert.label} vencido. Renove imediatamente para não perder oportunidades.`,
      action: "Renovar agora",
      actionLink: "/profile"
    });
  });

  // Expiring soon certs — warning
  certifications.filter(c => c.isExpiringSoon && c.validity && !c.isExpired).forEach(cert => {
    const daysLeft = differenceInDays(new Date(cert.validity!), today);
    alerts.push({
      type: "warning",
      title: `Seu ${cert.label} vence em ${daysLeft} dias`,
      description: `Renove agora para não perder oportunidades nas próximas semanas. Sem o ${cert.fullName || cert.label} válido, você será bloqueado.`,
      action: "Atualizar",
      actionLink: "/profile"
    });
  });

  // Profile incomplete
  if (profileCompletion < 100) {
    alerts.push({
      type: "info",
      title: `Perfil ${profileCompletion}% completo`,
      description: "Complete seu perfil para aparecer nas buscas dos recrutadores e aumentar suas chances.",
      action: "Completar perfil",
      actionLink: "/profile"
    });
  }

  if (alerts.length === 0) return null;

  const getAlertStyles = (type: string) => {
    switch (type) {
      case "critical":
        return {
          bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          titleColor: "text-red-800 dark:text-red-300",
          descColor: "text-red-600 dark:text-red-400",
          pulse: true
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
          titleColor: "text-amber-800 dark:text-amber-300",
          descColor: "text-amber-600 dark:text-amber-400",
          pulse: false
        };
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          titleColor: "text-blue-800 dark:text-blue-300",
          descColor: "text-blue-600 dark:text-blue-400",
          pulse: false
        };
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Bell className="h-4 w-4 text-red-600" />
          </div>
          Alertas Inteligentes
          {alerts.filter(a => a.type === "critical").length > 0 && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert, index) => {
          const styles = getAlertStyles(alert.type);
          return (
            <div
              key={index}
              className={`p-4 rounded-xl border ${styles.bg} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${styles.pulse ? 'animate-pulse' : ''}`}>
                  {styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${styles.titleColor}`}>
                    {alert.title}
                  </p>
                  <p className={`text-xs mt-1 ${styles.descColor}`}>
                    {alert.description}
                  </p>
                  {alert.action && alert.actionLink && (
                    <Link to={alert.actionLink}>
                      <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs font-medium">
                        {alert.action}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
