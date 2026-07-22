import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface ValidityTimelineProps {
  certifications: CertificationStatus[];
}

export function ValidityTimeline({ certifications }: ValidityTimelineProps) {
  const today = new Date();

  const certsWithDates = certifications
    .filter(c => c.validity && !c.isIndeterminate)
    .map(c => ({
      ...c,
      daysLeft: differenceInDays(new Date(c.validity!), today),
      validityDate: new Date(c.validity!)
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (certsWithDates.length === 0) return null;

  const expired = certsWithDates.filter(c => c.daysLeft <= 0);
  const expiring = certsWithDates.filter(c => c.daysLeft > 0 && c.daysLeft <= 30);
  const valid = certsWithDates.filter(c => c.daysLeft > 30);

  const maxDays = 120;

  const getPositionPercent = (days: number) => {
    if (days <= 0) return 0;
    if (days >= maxDays) return 100;
    return (days / maxDays) * 100;
  };

  const getColor = (days: number) => {
    if (days <= 0) return "bg-red-500";
    if (days <= 30) return "bg-amber-500";
    if (days <= 60) return "bg-yellow-400";
    return "bg-green-500";
  };

  const getTextColor = (days: number) => {
    if (days <= 0) return "text-red-600";
    if (days <= 30) return "text-amber-600";
    return "text-green-600";
  };

  const getIcon = (days: number) => {
    if (days <= 0) return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    if (days <= 30) return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  };

  const Section = ({ title, items, borderColor }: { title: string; items: typeof certsWithDates; borderColor: string }) => {
    if (items.length === 0) return null;
    return (
      <div className={`border-l-2 ${borderColor} pl-3 space-y-1`}>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p>
        {items.map((cert) => (
          <div key={cert.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {getIcon(cert.daysLeft)}
              <span className="text-sm font-medium">{cert.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${getTextColor(cert.daysLeft)}`}>
                {cert.daysLeft > 0 ? `${cert.daysLeft}d` : `−${Math.abs(cert.daysLeft)}d`}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(cert.validityDate, 'dd/MM/yy', { locale: ptBR })}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
            <CalendarClock className="h-4 w-4 text-cyan-600" />
          </div>
          Timeline de Validade
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Visual Timeline Bar */}
        <div className="mb-6">
          <div className="relative h-3 bg-muted rounded-full overflow-visible">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-200 via-amber-200 via-yellow-100 to-green-200 dark:from-red-900/40 dark:via-amber-900/40 dark:to-green-900/40" />
            
            {[0, 15, 30, 60, 90].map((day) => (
              <div
                key={day}
                className="absolute top-full mt-1"
                style={{ left: `${getPositionPercent(day)}%`, transform: 'translateX(-50%)' }}
              >
                <div className="h-2 w-px bg-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground">{day}d</span>
              </div>
            ))}

            {certsWithDates.slice(0, 8).map((cert) => (
              <div
                key={cert.name}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${getPositionPercent(cert.daysLeft)}%`, transform: `translate(-50%, -50%)` }}
                title={`${cert.label}: ${cert.daysLeft > 0 ? `${cert.daysLeft} dias restantes` : `vencido há ${Math.abs(cert.daysLeft)} dias`}`}
              >
                <div className={`h-5 w-5 rounded-full ${getColor(cert.daysLeft)} border-2 border-background shadow-md flex items-center justify-center`}>
                  <span className="text-[8px] text-white font-bold">{cert.label.slice(0, 2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 text-[10px] text-muted-foreground">
            <span>Hoje</span>
            <span>120 dias</span>
          </div>
        </div>

        {/* Grouped legend */}
        <div className="space-y-3">
          <Section title={`🚫 Vencidos (${expired.length})`} items={expired} borderColor="border-red-400" />
          <Section title={`⚠️ Vencendo em breve (${expiring.length})`} items={expiring} borderColor="border-amber-400" />
          <Section title={`✅ Válidos (${valid.length})`} items={valid.slice(0, 3)} borderColor="border-green-400" />
        </div>
      </CardContent>
    </Card>
  );
}
