import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, Sparkles, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, 
  Zap, ArrowRight, Send
} from "lucide-react";
import { Link } from "react-router-dom";

interface CertificationStatus {
  name: string;
  label: string;
  hasIt: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface Job {
  id: string;
  title: string;
  function_name: string;
  short_description?: string;
  required_certifications_list: string[];
}

interface CompatibilityScoreProps {
  certifications: CertificationStatus[];
  jobs: Job[];
  userFunction: string | null;
  appliedJobIds: string[];
  onQuickApply: (jobId: string) => void;
  applyingToJob: string | null;
  isProfileComplete: boolean;
}

export function CompatibilityScore({ 
  certifications, jobs, userFunction, appliedJobIds, 
  onQuickApply, applyingToJob, isProfileComplete 
}: CompatibilityScoreProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const validCertNames = certifications
    .filter(c => c.hasIt && !c.isExpired)
    .map(c => c.name);

  const functionMatchedJobs = jobs.filter(job => {
    if (!userFunction || !job.function_name) return false;
    return job.function_name.toLowerCase().trim() === userFunction.toLowerCase().trim();
  });

  const jobsWithScore = functionMatchedJobs.map(job => {
    const requiredCerts = job.required_certifications_list || [];
    if (requiredCerts.length === 0) {
      return { ...job, score: 100, missingCerts: [] as string[], ready: true };
    }
    const matchedCerts = requiredCerts.filter(cert => validCertNames.includes(cert));
    const score = Math.round((matchedCerts.length / requiredCerts.length) * 100);
    const missingCerts = requiredCerts.filter(cert => !validCertNames.includes(cert));
    return { ...job, score, missingCerts, ready: missingCerts.length === 0 };
  }).sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (jobsWithScore.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % jobsWithScore.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [jobsWithScore.length]);

  const goNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % jobsWithScore.length);
  }, [jobsWithScore.length]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + jobsWithScore.length) % jobsWithScore.length);
  }, [jobsWithScore.length]);

  const currentJob = jobsWithScore[currentSlide];
  const readyCount = jobsWithScore.filter(j => j.ready).length;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return "bg-green-400";
    if (score >= 60) return "bg-amber-400";
    return "bg-red-400";
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>
      
      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-sm font-semibold text-white/90">Vagas para sua Função</span>
          </div>
          <div className="flex items-center gap-2">
            {readyCount > 0 && (
              <Badge className="bg-green-500/30 text-green-200 border-green-400/30 text-xs">
                <Zap className="h-3 w-3 mr-1" />
                {readyCount} pronta{readyCount > 1 ? "s" : ""}
              </Badge>
            )}
            <span className="text-white/60 text-sm font-bold">
              {jobsWithScore.length} vaga{jobsWithScore.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Carousel */}
        {jobsWithScore.length > 0 ? (
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 min-h-[140px]">
              <div className="flex items-start gap-4">
                {/* Nav prev */}
                {jobsWithScore.length > 1 && (
                  <button
                    onClick={goPrev}
                    className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors mt-4"
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                )}

                {/* Content */}
                {currentJob && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="h-4 w-4 text-white/70 flex-shrink-0" />
                          <h3 className="text-white font-bold text-lg truncate">{currentJob.title}</h3>
                        </div>
                        <p className="text-white/60 text-sm">{currentJob.function_name}</p>
                      </div>
                      {/* Score circle */}
                      <div className="flex-shrink-0 text-center">
                        <div className={`text-3xl font-black ${getScoreColor(currentJob.score)}`}>
                          {currentJob.score}%
                        </div>
                        <p className="text-white/50 text-[10px]">compatível</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(currentJob.score)}`}
                          style={{ width: `${currentJob.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Status message */}
                    {currentJob.ready ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="text-green-300 text-sm font-medium">
                            100% dos requisitos — pronto para embarcar!
                          </span>
                        </div>
                        {!appliedJobIds.includes(currentJob.id) && isProfileComplete ? (
                          <Button 
                            size="sm" 
                            onClick={() => onQuickApply(currentJob.id)}
                            disabled={!!applyingToJob}
                            className="bg-green-500 hover:bg-green-600 text-white border-0 ml-2 flex-shrink-0"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Candidatar-se
                          </Button>
                        ) : appliedJobIds.includes(currentJob.id) ? (
                          <Badge className="bg-white/20 text-white/80 border-white/30 text-xs ml-2">
                            Já aplicou
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span className="text-amber-300 text-sm">
                          Falta{currentJob.missingCerts.length > 1 ? "m" : ""} {currentJob.missingCerts.length}: {" "}
                          <span className="text-white/80 font-medium">
                            {currentJob.missingCerts.map(c => c.toUpperCase()).join(", ")}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Nav next */}
                {jobsWithScore.length > 1 && (
                  <button
                    onClick={goNext}
                    className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors mt-4"
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Dots */}
            {jobsWithScore.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {jobsWithScore.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentSlide ? "w-6 bg-white" : "w-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <Briefcase className="h-8 w-8 text-white/40 mx-auto mb-2" />
            <p className="text-white/70 text-sm">
              {userFunction 
                ? "Nenhuma vaga disponível para sua função no momento"
                : "Defina sua função no perfil para ver vagas compatíveis"}
            </p>
          </div>
        )}

        {/* CTA */}
        <Link to="/jobs" className="block mt-4">
          <Button 
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            variant="outline"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Ver todas as vagas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
