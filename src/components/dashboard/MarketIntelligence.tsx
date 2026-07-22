import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, MapPin, Award, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarketIntelligenceProps {
  userFunction: string | null;
}

interface MarketData {
  topFunctions: Array<{ name: string; count: number }>;
  topCertifications: Array<{ name: string; count: number }>;
  totalActiveJobs: number;
  totalProfessionals: number;
}

export function MarketIntelligence({ userFunction }: MarketIntelligenceProps) {
  const [data, setData] = useState<MarketData | null>(null);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    const [jobsRes, profilesRes] = await Promise.all([
      supabase.from('jobs').select('function_name, required_certifications_list').eq('is_active', true),
      supabase.from('profiles').select('desired_function', { count: 'exact', head: true }),
    ]);

    const jobs = jobsRes.data || [];

    // Count jobs by function
    const functionCounts: Record<string, number> = {};
    jobs.forEach(j => {
      const fn = j.function_name || 'Outras';
      functionCounts[fn] = (functionCounts[fn] || 0) + 1;
    });
    const topFunctions = Object.entries(functionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count most requested certifications
    const certCounts: Record<string, number> = {};
    jobs.forEach(j => {
      const certs = Array.isArray(j.required_certifications_list) 
        ? j.required_certifications_list 
        : [];
      (certs as string[]).forEach(c => {
        certCounts[c] = (certCounts[c] || 0) + 1;
      });
    });
    const topCertifications = Object.entries(certCounts)
      .map(([name, count]) => ({ name: name.toUpperCase(), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setData({
      topFunctions,
      topCertifications,
      totalActiveJobs: jobs.length,
      totalProfessionals: profilesRes.count || 0,
    });
  };

  if (!data) return null;

  const userFunctionJobs = data.topFunctions.find(
    f => f.name.toLowerCase().trim() === (userFunction || '').toLowerCase().trim()
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
          </div>
          Inteligência de Mercado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User function insight */}
        {userFunction && userFunctionJobs && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Sua função: {userFunction}
              </span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {userFunctionJobs.count} vaga{userFunctionJobs.count !== 1 ? "s" : ""} ativa{userFunctionJobs.count !== 1 ? "s" : ""} agora • 
              Posição #{data.topFunctions.indexOf(userFunctionJobs) + 1} em demanda
            </p>
          </div>
        )}

        {/* Top demanded functions */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Funções mais demandadas
          </p>
          <div className="space-y-1.5">
            {data.topFunctions.slice(0, 4).map((fn, i) => {
              const maxCount = data.topFunctions[0]?.count || 1;
              const isUser = fn.name.toLowerCase().trim() === (userFunction || '').toLowerCase().trim();
              return (
                <div key={fn.name} className="flex items-center gap-2">
                  <span className={`text-xs w-4 font-bold ${isUser ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-medium truncate ${isUser ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                        {fn.name}
                        {isUser && " ⭐"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{fn.count} vagas</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isUser ? 'bg-emerald-500' : 'bg-primary/40'}`}
                        style={{ width: `${(fn.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top certifications */}
        {data.topCertifications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Award className="h-3 w-3" />
              Certificações mais valorizadas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.topCertifications.map((cert) => (
                <Badge key={cert.name} variant="secondary" className="text-[10px]">
                  {cert.name} ({cert.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
