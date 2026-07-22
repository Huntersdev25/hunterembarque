import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface CertificationStatus {
  name: string;
  label: string;
  fullName?: string;
  hasIt: boolean;
  validity: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  hasAttachment?: boolean;
}

interface PriorityActionsProps {
  certifications: CertificationStatus[];
  profileCompletion: number;
}

interface ActionItem {
  title: string;
  detail: string;
  urgency: "urgent" | "important" | "suggested";
}

export function PriorityActions({ certifications, profileCompletion }: PriorityActionsProps) {
  const actions: ActionItem[] = [];

  // Expired certs first
  certifications.filter(c => c.isExpired).forEach(cert => {
    const daysAgo = cert.validity
      ? differenceInDays(new Date(), new Date(cert.validity))
      : 0;
    actions.push({
      title: `Renovar ${cert.fullName || cert.label}`,
      detail: `Vencido há ${daysAgo} dia${daysAgo !== 1 ? "s" : ""}`,
      urgency: "urgent",
    });
  });

  // Expiring certs
  certifications.filter(c => c.isExpiringSoon && !c.isExpired).forEach(cert => {
    const daysLeft = cert.validity
      ? differenceInDays(new Date(cert.validity), new Date())
      : 0;
    actions.push({
      title: `Atualizar ${cert.fullName || cert.label}`,
      detail: `Vence em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`,
      urgency: "important",
    });
  });

  // Missing attachments
  const missingAttachments = certifications.filter(c => c.hasIt && c.hasAttachment === false);
  if (missingAttachments.length > 0) {
    actions.push({
      title: `Anexar ${missingAttachments.length} certificação${missingAttachments.length > 1 ? "ões" : ""}`,
      detail: "Anexe os arquivos para validação e acesso offline",
      urgency: missingAttachments.length > 3 ? "urgent" : "important",
    });
  }

  // Profile completion
  if (profileCompletion < 100) {
    actions.push({
      title: "Completar perfil",
      detail: `${100 - profileCompletion}% restante para preencher`,
      urgency: profileCompletion < 50 ? "urgent" : "suggested",
    });
  }

  if (actions.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">O que você deve fazer agora</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div>
          {actions.slice(0, 6).map((action, index) => (
            <div key={index}>
              {index > 0 && <Separator className="my-0" />}
              <Link to="/profile">
                <div className="flex items-center gap-4 py-3.5 hover:bg-accent/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer">
                  {/* Number */}
                  <div className="flex items-center justify-center h-7 w-7 rounded-full border-2 border-muted-foreground/20 flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.detail}</p>
                  </div>

                  {/* Urgency badge */}
                  {action.urgency === "urgent" && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-[10px] px-2 flex-shrink-0">
                      Urgente
                    </Badge>
                  )}
                  {action.urgency === "important" && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] px-2 flex-shrink-0">
                      Importante
                    </Badge>
                  )}

                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
