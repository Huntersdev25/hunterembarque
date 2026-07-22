import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface CertificationStatus {
  name: string;
  label: string;
  fullName?: string;
  hasIt: boolean;
  validity: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface StatusHeroProps {
  certifications: CertificationStatus[];
  profileCompletion: number;
}

export function StatusHero({ certifications, profileCompletion }: StatusHeroProps) {
  const totalCerts = certifications.length;
  const validCerts = certifications.filter(c => c.hasIt && !c.isExpired).length;
  const expiredCerts = certifications.filter(c => c.isExpired);
  const expiringCerts = certifications.filter(c => c.isExpiringSoon);

  const certScore = totalCerts > 0 ? (validCerts / totalCerts) * 70 : 0;
  const profileScore = (profileCompletion / 100) * 30;
  const readinessScore = Math.round(certScore + profileScore);

  const hasBlockers = expiredCerts.length > 0;
  const isReady = !hasBlockers && readinessScore >= 70;

  // SVG ring
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (readinessScore / 100) * circumference;

  const strokeColor = hasBlockers ? "#E06000" : isReady ? "#22c55e" : "#E06000";
  const badgeLabel = hasBlockers
    ? "Bloqueado para embarque"
    : isReady
      ? "Pronto para embarque"
      : "Atenção necessária";
  const badgeBg = hasBlockers
    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
    : isReady
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

  const expiredLabels = expiredCerts.map(c => c.label);

  return (
    <Card className="max-w-full overflow-hidden border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex min-w-0 max-w-full flex-col items-center gap-4 sm:flex-row sm:gap-6">
          {/* Left: Progress ring */}
          <div className="flex-shrink-0 self-center">
            <svg width={size} height={size} className="transform -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="relative" style={{ marginTop: -size }}>
              <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <span className="text-3xl font-black" style={{ color: strokeColor }}>
                  {readinessScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Center: Status info */}
          <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
            <Badge className={`text-xs font-semibold px-3 py-1 border-0 ${badgeBg}`}>
              {badgeLabel}
            </Badge>

            {hasBlockers ? (
              <>
                <h2 className="text-lg font-bold text-foreground">
                  {expiredCerts.length} certificação{expiredCerts.length > 1 ? "ões" : ""} vencida{expiredCerts.length > 1 ? "s" : ""} impede{expiredCerts.length > 1 ? "m" : ""} o embarque
                </h2>
                <p className="text-sm text-muted-foreground">
                  Renove {expiredLabels.join(" e ")} para liberar seu perfil.{" "}
                  <Link to="/profile" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
                    Ver detalhes →
                  </Link>
                </p>
              </>
            ) : isReady ? (
              <>
                <h2 className="text-lg font-bold text-foreground">
                  Seus documentos estão em dia!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Você está pronto para embarcar.{" "}
                  {expiringCerts.length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {expiringCerts.length} documento{expiringCerts.length > 1 ? "s" : ""} vencendo em breve.
                    </span>
                  )}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-foreground">
                  Perfil com pendências
                </h2>
                <p className="text-sm text-muted-foreground">
                  Complete seu perfil e documentos para aumentar sua prontidão.{" "}
                  <Link to="/profile" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
                    Ver detalhes →
                  </Link>
                </p>
              </>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-shrink-0">
            {hasBlockers && (
              <Link to="/profile" className="w-full sm:w-auto">
                <Button className="bg-foreground text-background hover:bg-foreground/90 w-full">
                  Como renovar
                </Button>
              </Link>
            )}
            <Link to="/profile" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full text-muted-foreground">
                Ver documentos
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
