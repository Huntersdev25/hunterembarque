import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Anchor, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SocialProofProps {
  userFunction: string | null;
}

export function SocialProof({ userFunction }: SocialProofProps) {
  const [stats, setStats] = useState({
    recentBoardings: 0,
    functionBoardings: 0,
    activeApplicants: 0,
    newJobsThisWeek: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [userFunction]);

  const fetchStats = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [boardingsRes, applicantsRes, newJobsRes] = await Promise.all([
      // Recent assignments (proxy for boardings)
      supabase.from('client_candidates')
        .select('*', { count: 'exact', head: true })
        .gte('assigned_at', oneMonthAgo.toISOString()),
      // Active applicants  
      supabase.from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('applied_at', oneWeekAgo.toISOString()),
      // New jobs this week
      supabase.from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('created_at', oneWeekAgo.toISOString()),
    ]);

    setStats({
      recentBoardings: boardingsRes.count || 0,
      functionBoardings: 0,
      activeApplicants: applicantsRes.count || 0,
      newJobsThisWeek: newJobsRes.count || 0,
    });
  };

  const proofItems = [
    {
      icon: Anchor,
      text: `${stats.recentBoardings} profissiona${stats.recentBoardings !== 1 ? "is" : "l"} alocado${stats.recentBoardings !== 1 ? "s" : ""} este mês`,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      icon: Users,
      text: `${stats.activeApplicants} candidatura${stats.activeApplicants !== 1 ? "s" : ""} esta semana`,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      icon: Briefcase,
      text: `${stats.newJobsThisWeek} nova${stats.newJobsThisWeek !== 1 ? "s" : ""} vaga${stats.newJobsThisWeek !== 1 ? "s" : ""} esta semana`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ].filter(item => {
    // Only show items with non-zero counts
    const num = parseInt(item.text);
    return num > 0;
  });

  if (proofItems.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-r from-background to-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Atividade na Plataforma
          </span>
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {proofItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border">
              <div className={`h-7 w-7 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
