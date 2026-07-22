import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, FileCheck, RefreshCw, UserCheck, Paperclip } from "lucide-react";
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

interface RecommendedActionsProps {
  certifications: CertificationStatus[];
  profileCompletion: number;
  missingAttachments?: number;
}

interface ActionItem {
  priority: number;
  icon: any;
  label: string;
  detail: string;
  urgency: "high" | "medium" | "low";
  link: string;
}

export function RecommendedActions({ certifications, profileCompletion, missingAttachments = 0 }: RecommendedActionsProps) {
  const actions: ActionItem[] = [];

  // Renew expired certs
  certifications.filter(c => c.isExpired).forEach(cert => {
    actions.push({
      priority: 1,
      icon: RefreshCw,
      label: `Renovar ${cert.label}`,
      detail: cert.fullName || cert.label,
      urgency: "high",
      link: "/profile"
    });
  });

  // Renew expiring certs
  certifications.filter(c => c.isExpiringSoon && !c.isExpired).forEach(cert => {
    const daysLeft = cert.validity ? differenceInDays(new Date(cert.validity), new Date()) : 0;
    actions.push({
      priority: 2,
      icon: FileCheck,
      label: `Atualizar ${cert.label}`,
      detail: `Vence em ${daysLeft} dias`,
      urgency: "medium",
      link: "/profile"
    });
  });

  // Missing attachments
  if (missingAttachments > 0) {
    actions.push({
      priority: 2,
      icon: Paperclip,
      label: `Anexar ${missingAttachments} certificação${missingAttachments > 1 ? "ões" : ""}`,
      detail: "Anexe os arquivos para acesso offline e validação rápida",
      urgency: missingAttachments > 5 ? "high" : "medium",
      link: "/profile"
    });
  }

  // Complete profile
  if (profileCompletion < 100) {
    actions.push({
      priority: 3,
      icon: UserCheck,
      label: "Completar perfil",
      detail: `${100 - profileCompletion}% restante`,
      urgency: profileCompletion < 50 ? "high" : "low",
      link: "/profile"
    });
  }

  if (actions.length === 0) return null;

  // Sort by priority
  actions.sort((a, b) => a.priority - b.priority);

  const urgencyStyles = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const urgencyLabels = {
    high: "Urgente",
    medium: "Importante",
    low: "Sugerido",
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Target className="h-4 w-4 text-indigo-600" />
          </div>
          O que você deve fazer agora
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.slice(0, 5).map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} to={action.link}>
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all group cursor-pointer">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted flex-shrink-0">
                    <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{action.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.detail}</p>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] px-2 ${urgencyStyles[action.urgency]}`}>
                    {urgencyLabels[action.urgency]}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
