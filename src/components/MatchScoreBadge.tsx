/**
 * Componente MatchScoreBadge
 * Exibe o score de compatibilidade entre candidato e vaga com visual moderno
 * Inclui modal de feedback detalhado para scores baixos
 */
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, TrendingUp, Award, Loader2, ChevronRight, CheckCircle, 
  AlertCircle, Target, BookOpen, Clock, ArrowUpRight, Lightbulb, 
  ShieldCheck, XCircle, RefreshCw
} from "lucide-react";

interface FeedbackData {
  functionMatch: string;
  functionDetails: string | null;
  missingCertifications: string[];
  expiredCertifications: string[];
  validCertifications: string[];
  totalBoardingDays: number;
  relevantExperienceDays: number;
  recommendations: string[];
}

interface AIAnalysisData {
  summary?: string;
  analysis?: string;
  strengths?: string[];
  improvements?: string[];
  transferableSkills?: string[];
  feedback?: FeedbackData;
}

interface MatchScoreData {
  overall_score: number;
  certification_score: number;
  experience_score: number;
  ai_summary: string | null;
  ai_analysis: string | null;
}

interface MatchScoreBadgeProps {
  profileId: string;
  jobId: string;
  compact?: boolean;
  showDetails?: boolean;
  onScoreCalculated?: (score: number) => void;
}

export function MatchScoreBadge({ 
  profileId, 
  jobId, 
  compact = false, 
  showDetails = true,
  onScoreCalculated 
}: MatchScoreBadgeProps) {
  const [matchScore, setMatchScore] = useState<MatchScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    fetchExistingScore();
  }, [profileId, jobId]);

  const fetchExistingScore = async () => {
    try {
      const { data, error } = await supabase
        .from("job_match_scores")
        .select("*")
        .eq("profile_id", profileId)
        .eq("job_id", jobId)
        .single();

      if (data && !error) {
        setMatchScore(data);
        onScoreCalculated?.(data.overall_score);
      } else {
        calculateScore();
      }
    } catch {
      calculateScore();
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async () => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-match-score", {
        body: { profileId, jobId },
      });

      if (data?.matchScore) {
        const score: MatchScoreData = {
          overall_score: data.matchScore.overall,
          certification_score: data.matchScore.certification,
          experience_score: data.matchScore.experience,
          ai_summary: data.matchScore.aiSummary,
          ai_analysis: data.matchScore.aiAnalysis ? JSON.stringify(data.matchScore.aiAnalysis) : null,
        };
        setMatchScore(score);
        onScoreCalculated?.(score.overall_score);
      }
    } catch (err) {
      console.error("Error calculating match score:", err);
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100 border-green-200 dark:bg-green-950/50 dark:border-green-800 dark:text-green-400";
    if (score >= 60) return "text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400";
    if (score >= 40) return "text-amber-600 bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400";
    return "text-red-600 bg-red-100 border-red-200 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excelente Match";
    if (score >= 60) return "Bom Match";
    if (score >= 40) return "Match Parcial";
    return "Baixo Match";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (score >= 60) return <Target className="h-5 w-5 text-blue-500" />;
    if (score >= 40) return <AlertCircle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  if (loading || calculating) {
    return (
      <Badge variant="outline" className="gap-1.5 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        {calculating ? "Calculando..." : "Carregando..."}
      </Badge>
    );
  }

  if (!matchScore) {
    return null;
  }

  const aiAnalysis: AIAnalysisData = matchScore.ai_analysis ? JSON.parse(matchScore.ai_analysis) : {};
  const feedback = aiAnalysis.feedback;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setShowFeedbackModal(true)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all hover:scale-105 ${getScoreColor(matchScore.overall_score)}`}
            >
              <Sparkles className="h-3 w-3" />
              {matchScore.overall_score}%
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getScoreLabel(matchScore.overall_score)}</p>
            <p className="text-xs mt-1">Clique para ver detalhes</p>
          </TooltipContent>
        </Tooltip>
        
        <FeedbackModal 
          open={showFeedbackModal} 
          onOpenChange={setShowFeedbackModal}
          matchScore={matchScore}
          aiAnalysis={aiAnalysis}
          feedback={feedback}
          onRecalculate={calculateScore}
          calculating={calculating}
        />
      </TooltipProvider>
    );
  }

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setShowFeedbackModal(true)}
        className={`gap-2 ${getScoreColor(matchScore.overall_score)} hover:opacity-90 transition-all`}
      >
        <Sparkles className="h-4 w-4" />
        Match: {matchScore.overall_score}%
        {showDetails && <ChevronRight className="h-4 w-4" />}
      </Button>

      <FeedbackModal 
        open={showFeedbackModal} 
        onOpenChange={setShowFeedbackModal}
        matchScore={matchScore}
        aiAnalysis={aiAnalysis}
        feedback={feedback}
        onRecalculate={calculateScore}
        calculating={calculating}
      />
    </>
  );
}

// Modal de feedback detalhado
interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchScore: MatchScoreData;
  aiAnalysis: AIAnalysisData;
  feedback?: FeedbackData;
  onRecalculate: () => void;
  calculating: boolean;
}

function FeedbackModal({ 
  open, 
  onOpenChange, 
  matchScore, 
  aiAnalysis, 
  feedback,
  onRecalculate,
  calculating
}: FeedbackModalProps) {
  const isLowScore = matchScore.overall_score < 60;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Análise de Compatibilidade
          </DialogTitle>
          <DialogDescription>
            {isLowScore 
              ? "Veja o que você pode fazer para aumentar suas chances nesta vaga"
              : "Confira os detalhes da sua compatibilidade com esta vaga"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score principal */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Score Geral</p>
              <p className={`text-4xl font-bold ${getScoreColor(matchScore.overall_score)}`}>
                {matchScore.overall_score}%
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={matchScore.overall_score >= 60 ? "default" : "destructive"}>
                {matchScore.overall_score >= 80 ? "Excelente Match" :
                 matchScore.overall_score >= 60 ? "Bom Match" :
                 matchScore.overall_score >= 40 ? "Match Parcial" : "Precisa Melhorar"}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRecalculate}
                disabled={calculating}
                className="text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${calculating ? 'animate-spin' : ''}`} />
                Recalcular
              </Button>
            </div>
          </div>

          {/* Scores detalhados */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Certificações</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-bold ${getScoreColor(matchScore.certification_score)}`}>
                    {matchScore.certification_score}%
                  </span>
                </div>
                <Progress 
                  value={matchScore.certification_score} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Experiência</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-bold ${getScoreColor(matchScore.experience_score)}`}>
                    {matchScore.experience_score}%
                  </span>
                </div>
                <Progress 
                  value={matchScore.experience_score} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Resumo da IA */}
          {matchScore.ai_summary && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">{matchScore.ai_summary}</p>
            </div>
          )}

          <Separator />

          {/* Certificações - Status */}
          {feedback && (
            <div className="space-y-4">
              {/* Certificações válidas */}
              {feedback.validCertifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Certificações Válidas ({feedback.validCertifications.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {feedback.validCertifications.map((cert, i) => (
                      <Badge key={i} variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificações faltando */}
              {feedback.missingCertifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Certificações Necessárias ({feedback.missingCertifications.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {feedback.missingCertifications.map((cert, i) => (
                      <Badge key={i} variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Obter estas certificações aumentará significativamente seu score.
                  </p>
                </div>
              )}

              {/* Certificações vencidas */}
              {feedback.expiredCertifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Certificações Vencidas ({feedback.expiredCertifications.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {feedback.expiredCertifications.map((cert, i) => (
                      <Badge key={i} variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Renovar estas certificações é essencial para sua candidatura.
                  </p>
                </div>
              )}

              {/* Info de experiência */}
              {(feedback.totalBoardingDays > 0 || feedback.relevantExperienceDays > 0) && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Sua Experiência
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total de embarque</p>
                      <p className="font-medium">{feedback.totalBoardingDays} dias</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Experiência relevante</p>
                      <p className="font-medium">{feedback.relevantExperienceDays} dias</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Pontos fortes */}
          {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Seus Pontos Fortes
              </h4>
              <ul className="space-y-1.5">
                {aiAnalysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Habilidades transferíveis */}
          {aiAnalysis.transferableSkills && aiAnalysis.transferableSkills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-blue-500" />
                Habilidades Transferíveis
              </h4>
              <ul className="space-y-1.5">
                {aiAnalysis.transferableSkills.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendações para melhorar (destacado para scores baixos) */}
          {((feedback?.recommendations && feedback.recommendations.length > 0) || 
            (aiAnalysis.improvements && aiAnalysis.improvements.length > 0)) && (
            <Card className={isLowScore ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Lightbulb className={`h-4 w-4 ${isLowScore ? "text-amber-500" : "text-muted-foreground"}`} />
                  {isLowScore ? "Como Chegar a 100%" : "Sugestões de Melhoria"}
                </h4>
                <ul className="space-y-2">
                  {/* Recomendações do feedback */}
                  {feedback?.recommendations.map((rec, i) => (
                    <li key={`rec-${i}`} className="text-sm flex items-start gap-2">
                      <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                  {/* Sugestões da IA */}
                  {aiAnalysis.improvements?.filter(imp => 
                    !feedback?.recommendations.some(rec => rec.toLowerCase().includes(imp.toLowerCase().slice(0, 20)))
                  ).map((imp, i) => (
                    <li key={`imp-${i}`} className="text-sm flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
