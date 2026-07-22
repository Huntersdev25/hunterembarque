import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Star, Zap } from "lucide-react";

interface CertificationStatus {
  name: string;
  label: string;
  hasIt: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface ReadinessScoreGamificationProps {
  certifications: CertificationStatus[];
  profileCompletion: number;
}

export function ReadinessScoreGamification({ certifications, profileCompletion }: ReadinessScoreGamificationProps) {
  const totalCerts = certifications.length;
  const validCerts = certifications.filter(c => c.hasIt && !c.isExpired).length;

  const certScore = totalCerts > 0 ? (validCerts / totalCerts) * 70 : 0;
  const profileScore = (profileCompletion / 100) * 30;
  const score = Math.round(certScore + profileScore);

  const levels = [
    { min: 0, max: 40, label: "Crítico", color: "from-red-500 to-rose-600", textColor: "text-red-500", bgColor: "bg-red-500", icon: "🔴", stars: 1 },
    { min: 40, max: 70, label: "Atenção", color: "from-amber-500 to-orange-600", textColor: "text-amber-500", bgColor: "bg-amber-500", icon: "🟡", stars: 2 },
    { min: 70, max: 90, label: "Pronto", color: "from-green-500 to-emerald-600", textColor: "text-green-500", bgColor: "bg-green-500", icon: "🟢", stars: 3 },
    { min: 90, max: 101, label: "Elite", color: "from-blue-500 to-indigo-600", textColor: "text-blue-500", bgColor: "bg-blue-500", icon: "💎", stars: 4 },
  ];

  const currentLevel = levels.find(l => score >= l.min && score < l.max) || levels[0];
  const nextLevel = levels.find(l => l.min > score);
  const pointsToNext = nextLevel ? nextLevel.min - score : 0;

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${currentLevel.color} opacity-5`} />
      
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${currentLevel.color} flex items-center justify-center shadow-lg`}>
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Seu Nível</p>
              <p className={`text-lg font-bold ${currentLevel.textColor}`}>
                {currentLevel.icon} {currentLevel.label}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-black ${currentLevel.textColor}`}>{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4].map(star => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= currentLevel.stars 
                  ? `${currentLevel.textColor} fill-current` 
                  : 'text-muted-foreground/20'
              }`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-2">
            Nível {levels.indexOf(currentLevel) + 1} de {levels.length}
          </span>
        </div>

        {/* Progress to next level */}
        {nextLevel && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Próximo nível: <strong>{nextLevel.label}</strong>
              </span>
              <span className="font-medium">{pointsToNext} pontos</span>
            </div>
            <Progress value={((score - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100} className="h-2" />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              Aumente seu score para receber mais oportunidades
            </p>
          </div>
        )}

        {!nextLevel && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Star className="h-4 w-4 fill-current" />
              Parabéns! Você atingiu o nível máximo!
            </p>
          </div>
        )}

        {/* How to earn points */}
        <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Como ganhar pontos:</p>
          <ul className="space-y-1">
            <li className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              Manter certificações em dia <span className="ml-auto font-medium text-foreground">+70pts</span>
            </li>
            <li className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              Completar perfil 100% <span className="ml-auto font-medium text-foreground">+30pts</span>
            </li>
            <li className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
              Documento vencido <span className="ml-auto font-medium text-red-500">−pontos</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
