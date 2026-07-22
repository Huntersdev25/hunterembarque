/**
 * Componente ProfileAnalysisCard
 * Card de análise de perfil com IA para feedback ao candidato
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, TrendingUp, Award, Loader2, ChevronDown, ChevronRight, 
  CheckCircle, AlertCircle, Target, BookOpen, Briefcase, Star,
  ArrowRight, Clock, Lightbulb, RefreshCw
} from "lucide-react";

interface CertificationRecommendation {
  key: string;
  name: string;
  demandCount: number;
  userHas: boolean;
}

interface JobOpportunity {
  jobId: string;
  jobTitle: string;
  jobFunction: string;
  certMatch: number;
  functionMatch: boolean;
  missingCerts: string[];
  potentialScore: number;
}

interface ImprovementArea {
  area: string;
  priority: string;
  action: string;
  impact: string;
}

interface CertificationStrategy {
  immediate: string[];
  shortTerm: string[];
  reasoning: string;
}

interface AIAnalysis {
  overallAssessment: string;
  strengths: string[];
  improvementAreas: ImprovementArea[];
  certificationStrategy: CertificationStrategy;
  careerTips: string[];
  profileScore: number;
  marketReadiness: string;
}

interface ProfileAnalysisData {
  profile: {
    name: string;
    desiredFunction: string;
    completeness: number;
  };
  certifications: {
    valid: number;
    expired: number;
    expiredList: string[];
    validList: string[];
  };
  experience: {
    totalBoardingDays: number;
    totalRecords: number;
  };
  marketAnalysis: {
    totalActiveJobs: number;
    compatibleJobs: number;
    topOpportunities: JobOpportunity[];
    recommendedCertifications: CertificationRecommendation[];
  };
  aiAnalysis: AIAnalysis | null;
}

interface ProfileAnalysisCardProps {
  userId: string;
  autoLoad?: boolean;
}

export function ProfileAnalysisCard({ userId, autoLoad = false }: ProfileAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<ProfileAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState({
    opportunities: true,
    certifications: false,
    tips: false,
  });

  useEffect(() => {
    if (autoLoad) {
      loadAnalysis();
    }
  }, [userId, autoLoad]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-profile", {
        body: { userId },
      });

      if (error) throw error;
      if (data?.success) {
        setAnalysis(data);
        setExpanded(true);
      }
    } catch (err) {
      console.error("Error loading profile analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  const getReadinessColor = (readiness: string) => {
    switch (readiness) {
      case "pronto": return "bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400";
      case "quase pronto": return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400";
      case "em desenvolvimento": return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400";
      default: return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "text-red-600 dark:text-red-400";
      case "média": return "text-amber-600 dark:text-amber-400";
      default: return "text-blue-600 dark:text-blue-400";
    }
  };

  if (!analysis && !loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Análise de Perfil com IA</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Receba feedback personalizado sobre seu perfil e dicas para melhorar suas chances no mercado marítimo
              </p>
            </div>
            <Button onClick={loadAnalysis} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analisar Meu Perfil
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Analisando seu perfil...</p>
              <p className="text-sm text-muted-foreground">
                A IA está comparando seu perfil com as vagas disponíveis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const ai = analysis.aiAnalysis;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Análise de Perfil</CardTitle>
              <CardDescription>Feedback personalizado com IA</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ai?.marketReadiness && (
              <Badge className={getReadinessColor(ai.marketReadiness)}>
                {ai.marketReadiness}
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={loadAnalysis}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Score e Resumo */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">{ai?.profileScore || 0}</span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <Badge variant="outline" className="text-xs">Score</Badge>
            </div>
          </div>
          <div className="flex-1">
            {ai?.overallAssessment && (
              <p className="text-sm leading-relaxed">{ai.overallAssessment}</p>
            )}
          </div>
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{analysis.certifications.valid}</div>
            <div className="text-xs text-muted-foreground">Certificações</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{analysis.experience.totalBoardingDays}</div>
            <div className="text-xs text-muted-foreground">Dias Embarque</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{analysis.marketAnalysis.compatibleJobs}</div>
            <div className="text-xs text-muted-foreground">Vagas Compatíveis</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{analysis.profile.completeness}%</div>
            <div className="text-xs text-muted-foreground">Perfil Completo</div>
          </div>
        </div>

        {/* Certificações expiradas - alerta */}
        {analysis.certifications.expired > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="font-medium text-sm">
                {analysis.certifications.expired} certificação(ões) vencida(s):
              </span>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
              {analysis.certifications.expiredList.join(", ")}
            </p>
          </div>
        )}

        <Separator />

        {/* Pontos Fortes */}
        {ai?.strengths && ai.strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Seus Pontos Fortes
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ai.strengths.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Vagas Compatíveis */}
        <Collapsible 
          open={sectionsOpen.opportunities} 
          onOpenChange={(open) => setSectionsOpen(prev => ({ ...prev, opportunities: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <h4 className="font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Melhores Oportunidades ({analysis.marketAnalysis.topOpportunities.length})
            </h4>
            {sectionsOpen.opportunities ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {analysis.marketAnalysis.topOpportunities.map((job, i) => (
              <div key={job.jobId} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{job.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{job.jobFunction}</p>
                  </div>
                  <Badge 
                    variant={job.potentialScore >= 70 ? "default" : "outline"}
                    className={job.potentialScore >= 70 ? "bg-green-600" : ""}
                  >
                    {job.potentialScore}% match
                  </Badge>
                </div>
                {job.missingCerts.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="text-amber-600">Faltam:</span> {job.missingCerts.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Estratégia de Certificações */}
        <Collapsible 
          open={sectionsOpen.certifications} 
          onOpenChange={(open) => setSectionsOpen(prev => ({ ...prev, certifications: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <h4 className="font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Certificações Recomendadas
            </h4>
            {sectionsOpen.certifications ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {ai?.certificationStrategy && (
              <>
                {ai.certificationStrategy.immediate.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Prioridade Imediata
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ai.certificationStrategy.immediate.map((cert, i) => (
                        <Badge key={i} variant="outline" className="border-red-300 text-red-600 dark:text-red-400">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {ai.certificationStrategy.shortTerm.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Próximos 6 Meses
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ai.certificationStrategy.shortTerm.map((cert, i) => (
                        <Badge key={i} variant="outline" className="border-amber-300 text-amber-600 dark:text-amber-400">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {ai.certificationStrategy.reasoning && (
                  <p className="text-xs text-muted-foreground italic">
                    {ai.certificationStrategy.reasoning}
                  </p>
                )}
              </>
            )}

            {/* Certificações mais demandadas */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Mais demandadas no mercado:</p>
              {analysis.marketAnalysis.recommendedCertifications.slice(0, 5).map((cert, i) => (
                <div key={cert.key} className="flex items-center justify-between text-sm">
                  <span>{cert.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cert.demandCount} vaga(s)
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Dicas de Carreira */}
        <Collapsible 
          open={sectionsOpen.tips} 
          onOpenChange={(open) => setSectionsOpen(prev => ({ ...prev, tips: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-lg transition-colors">
            <h4 className="font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Dicas para sua Carreira
            </h4>
            {sectionsOpen.tips ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ul className="space-y-2">
              {ai?.careerTips?.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>

        {/* Áreas de Melhoria */}
        {ai?.improvementAreas && ai.improvementAreas.length > 0 && (
          <div className="space-y-2 p-4 bg-primary/5 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Próximos Passos para Melhorar
            </h4>
            <ul className="space-y-3">
              {ai.improvementAreas.map((area, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{area.area}</span>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(area.priority)}`}>
                      {area.priority}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{area.action}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ↳ {area.impact}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
