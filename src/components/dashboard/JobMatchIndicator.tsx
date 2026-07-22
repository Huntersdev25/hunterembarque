import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ArrowRight, Sparkles, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
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
  required_certifications_list: string[];
}

interface JobMatchIndicatorProps {
  certifications: CertificationStatus[];
  jobs: Job[];
  userFunction: string | null;
}

export function JobMatchIndicator({ certifications, jobs, userFunction }: JobMatchIndicatorProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const validCertNames = certifications
    .filter(c => c.hasIt && !c.isExpired)
    .map(c => c.name);

  const functionMatchedJobs = jobs.filter(job => {
    if (!userFunction || !job.function_name) return false;
    return job.function_name.toLowerCase().trim() === userFunction.toLowerCase().trim();
  });

  const jobsWithReadiness = functionMatchedJobs.map(job => {
    const requiredCerts = job.required_certifications_list || [];
    if (requiredCerts.length === 0) {
      return { ...job, ready: true, missingCerts: [] as string[], totalRequired: 0, validCount: 0 };
    }
    const missingCerts = requiredCerts.filter(cert => !validCertNames.includes(cert));
    return {
      ...job,
      ready: missingCerts.length === 0,
      missingCerts,
      totalRequired: requiredCerts.length,
      validCount: requiredCerts.length - missingCerts.length,
    };
  });

  const readyJobs = jobsWithReadiness.filter(j => j.ready);
  const notReadyJobs = jobsWithReadiness.filter(j => !j.ready);

  // Auto-advance carousel
  useEffect(() => {
    if (jobsWithReadiness.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % jobsWithReadiness.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [jobsWithReadiness.length]);

  const goNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % jobsWithReadiness.length);
  }, [jobsWithReadiness.length]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + jobsWithReadiness.length) % jobsWithReadiness.length);
  }, [jobsWithReadiness.length]);

  const currentJob = jobsWithReadiness[currentSlide];

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>
      
      <CardContent className="relative p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-sm font-semibold text-white/90">Vagas para sua Função</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {readyJobs.length > 0 && (
                <Badge className="bg-green-500/30 text-green-200 border-green-400/30 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {readyJobs.length} pronta{readyJobs.length > 1 ? "s" : ""}
                </Badge>
              )}
              {notReadyJobs.length > 0 && (
                <Badge className="bg-amber-500/30 text-amber-200 border-amber-400/30 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {notReadyJobs.length} pendente{notReadyJobs.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <span className="text-white/60 text-sm font-bold">
              {functionMatchedJobs.length}/{jobs.length}
            </span>
          </div>
        </div>

        {/* Carousel */}
        {jobsWithReadiness.length > 0 ? (
          <div className="relative">
            {/* Job Card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 min-h-[100px] flex items-center gap-4">
              {/* Nav prev */}
              {jobsWithReadiness.length > 1 && (
                <button
                  onClick={goPrev}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
              )}

              {/* Content */}
              {currentJob && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="h-4 w-4 text-white/70 flex-shrink-0" />
                    <h3 className="text-white font-bold text-lg truncate">{currentJob.title}</h3>
                  </div>
                  <p className="text-white/60 text-sm mb-2">{currentJob.function_name}</p>
                  
                  {currentJob.ready ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 text-sm font-medium">
                        Documentação completa — pronto para embarcar
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="text-amber-300 text-sm font-medium">
                        Faltam {currentJob.missingCerts.length} certificação{currentJob.missingCerts.length > 1 ? "ões" : ""}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Nav next */}
              {jobsWithReadiness.length > 1 && (
                <button
                  onClick={goNext}
                  className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-white" />
                </button>
              )}
            </div>

            {/* Dots */}
            {jobsWithReadiness.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {jobsWithReadiness.map((_, i) => (
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
              Nenhuma vaga disponível para sua função no momento
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
