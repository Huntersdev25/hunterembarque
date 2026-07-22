import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { Link } from "react-router-dom";

interface CertificationStatus {
  name: string;
  label: string;
  hasIt: boolean;
  isExpired: boolean;
}

interface Job {
  id: string;
  title: string;
  function_name: string;
  required_certifications_list: string[];
}

interface JobCompatibilityCardProps {
  certifications: CertificationStatus[];
  jobs: Job[];
  userFunction: string | null;
  appliedJobIds: string[];
  onQuickApply: (jobId: string) => void;
  applyingToJob: string | null;
  isProfileComplete: boolean;
}

export function JobCompatibilityCard({
  certifications, jobs, userFunction, appliedJobIds,
  onQuickApply, applyingToJob, isProfileComplete,
}: JobCompatibilityCardProps) {
  const validCertNames = certifications
    .filter(c => c.hasIt && !c.isExpired)
    .map(c => c.name);

  const matchedJobs = jobs
    .filter(job => {
      if (!userFunction || !job.function_name) return false;
      return job.function_name.toLowerCase().trim() === userFunction.toLowerCase().trim();
    })
    .map(job => {
      const required = job.required_certifications_list || [];
      if (required.length === 0) return { ...job, score: 100, missing: [] as string[] };
      const matched = required.filter(c => validCertNames.includes(c));
      const score = Math.round((matched.length / required.length) * 100);
      const missing = required.filter(c => !validCertNames.includes(c));
      return { ...job, score, missing };
    })
    .sort((a, b) => b.score - a.score);

  const topJob = matchedJobs[0];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Vaga compatível</CardTitle>
          <Link to="/jobs" className="text-xs text-muted-foreground hover:text-foreground font-medium">
            Ver todas →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {topJob ? (
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-foreground">{topJob.title}</p>
              <p className="text-sm text-muted-foreground">{topJob.function_name}</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Compatibilidade</span>
                <span className="font-bold" style={{ color: "#E06000" }}>{topJob.score}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${topJob.score}%`, backgroundColor: "#E06000" }}
                />
              </div>
            </div>

            {topJob.missing.length > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Faltam: {topJob.missing.map(c => c.toUpperCase()).join(", ")}
              </p>
            )}

            {topJob.score === 100 && !appliedJobIds.includes(topJob.id) && isProfileComplete && (
              <Button
                size="sm"
                onClick={() => onQuickApply(topJob.id)}
                disabled={!!applyingToJob}
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Send className="h-3.5 w-3.5 mr-2" />
                Candidatar-se agora
              </Button>
            )}

            {appliedJobIds.includes(topJob.id) && (
              <Badge variant="secondary" className="text-xs">Já candidatado</Badge>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {userFunction
              ? "Nenhuma vaga para sua função no momento"
              : "Defina sua função no perfil"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
