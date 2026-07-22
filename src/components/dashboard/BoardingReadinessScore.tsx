import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, Anchor, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CertificationStatus {
  name: string;
  label: string;
  hasIt: boolean;
  validity: string | null;
  isIndeterminate?: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface BoardingReadinessScoreProps {
  certifications: CertificationStatus[];
  profileCompletion: number;
}

export function BoardingReadinessScore({ certifications, profileCompletion }: BoardingReadinessScoreProps) {
  const totalCerts = certifications.length;
  const validCerts = certifications.filter(c => c.hasIt && !c.isExpired).length;
  const expiringCerts = certifications.filter(c => c.isExpiringSoon).length;
  const expiredCerts = certifications.filter(c => c.isExpired).length;
  const blockers = certifications.filter(c => c.isExpired);

  // Calculate readiness score
  const certScore = totalCerts > 0 ? (validCerts / totalCerts) * 70 : 0;
  const profileScore = (profileCompletion / 100) * 30;
  const readinessScore = Math.round(certScore + profileScore);

  const getScoreLevel = () => {
    // If there are ANY blockers (expired certs), status can never be "PRONTO"
    if (expiredCerts > 0) {
      if (readinessScore < 40) return { label: "CRÍTICO", color: "text-red-500", bg: "from-red-500/20 to-rose-500/10", ring: "ring-red-500/30", emoji: "🔴" };
      return { label: "BLOQUEADO", color: "text-red-500", bg: "from-red-500/20 to-orange-500/10", ring: "ring-red-500/30", emoji: "🚫" };
    }
    if (readinessScore >= 70) return { label: "PRONTO", color: "text-green-500", bg: "from-green-500/20 to-emerald-500/10", ring: "ring-green-500/30", emoji: "🟢" };
    if (readinessScore >= 40) return { label: "ATENÇÃO", color: "text-amber-500", bg: "from-amber-500/20 to-yellow-500/10", ring: "ring-amber-500/30", emoji: "🟡" };
    return { label: "CRÍTICO", color: "text-red-500", bg: "from-red-500/20 to-rose-500/10", ring: "ring-red-500/30", emoji: "🔴" };
  };

  const level = getScoreLevel();

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${level.bg} opacity-50`} />
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl" />
      
      <CardContent className="relative p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Circle */}
          <div className="relative flex-shrink-0">
            <div className={`h-32 w-32 rounded-full flex items-center justify-center ring-4 ${level.ring} bg-background shadow-2xl`}>
              <div className="text-center">
                <span className={`text-4xl font-black ${level.color}`}>{readinessScore}%</span>
              </div>
            </div>
            <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-background shadow-lg flex items-center justify-center">
              <Anchor className={`h-4 w-4 ${level.color}`} />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Badge variant="outline" className={`text-sm font-bold px-3 py-1 ${level.color} border-current`}>
                {level.emoji} {level.label} PARA EMBARQUE
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span><strong>{validCerts}</strong> documentos válidos</span>
              </div>
              {expiringCerts > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span><strong>{expiringCerts}</strong> próximos do vencimento</span>
                </div>
              )}
              {expiredCerts > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-red-600 font-medium"><strong>{expiredCerts}</strong> bloqueadores — você não pode embarcar</span>
                </div>
              )}
            </div>

            {/* Mini progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Prontidão geral</span>
                <span className="font-medium">{readinessScore}%</span>
              </div>
              <Progress value={readinessScore} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
