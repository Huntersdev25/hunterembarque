import { Card, CardContent } from "@/components/ui/card";
import { Flame, Calendar, Trophy, TrendingUp } from "lucide-react";

interface ActivityStreakProps {
  profileCompletion: number;
  totalCertifications: number;
  totalApplications: number;
  lastLoginDate?: string;
}

export function ActivityStreak({ 
  profileCompletion, totalCertifications, totalApplications, lastLoginDate 
}: ActivityStreakProps) {
  // Calculate activity score based on profile actions
  const activityScore = Math.min(100, 
    (profileCompletion > 80 ? 30 : profileCompletion > 50 ? 15 : 0) +
    (totalCertifications > 10 ? 30 : totalCertifications > 5 ? 20 : totalCertifications * 4) +
    (totalApplications > 5 ? 40 : totalApplications * 8)
  );

  // Simulated streak (in production, track via DB)
  const streakDays = Math.min(7, Math.max(1, Math.floor(activityScore / 15)));

  const weekDays = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const today = new Date().getDay();
  // Adjust: JS getDay() returns 0=Sun, we want Mon first
  const adjustedToday = today === 0 ? 6 : today - 1;

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sequência de Atividade</p>
              <p className="text-[10px] text-muted-foreground">Mantenha seu perfil ativo</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-orange-500">{streakDays}</span>
            <span className="text-xs text-muted-foreground ml-1">dias</span>
          </div>
        </div>

        {/* Week visualization */}
        <div className="flex items-center gap-1.5 mb-3">
          {weekDays.map((day, i) => {
            const isActive = i <= adjustedToday && i >= adjustedToday - streakDays + 1;
            const isToday = i === adjustedToday;
            return (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] text-muted-foreground">{day}</span>
                <div className={`h-6 rounded-md mt-1 flex items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-gradient-to-b from-orange-400 to-orange-500 shadow-sm' 
                    : 'bg-muted'
                } ${isToday ? 'ring-2 ring-orange-400/50' : ''}`}>
                  {isActive && <Flame className="h-3 w-3 text-white" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Streak message */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30">
          <TrendingUp className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
          <p className="text-[11px] text-orange-700 dark:text-orange-300">
            {streakDays >= 5 
              ? "🔥 Incrível! Continue verificando seu perfil para manter o streak!"
              : "Atualize documentos e verifique vagas para aumentar sua sequência"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
