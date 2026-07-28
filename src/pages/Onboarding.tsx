import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { STEPS, TOTAL_STEPS } from "@/lib/onboarding";
import { StepWelcome } from "@/components/onboarding/steps/StepWelcome";
import { StepPersonalData } from "@/components/onboarding/steps/StepPersonalData";
import { StepAddress } from "@/components/onboarding/steps/StepAddress";
import { StepProfessional } from "@/components/onboarding/steps/StepProfessional";
import { StepCertifications } from "@/components/onboarding/steps/StepCertifications";
import { StepDocuments } from "@/components/onboarding/steps/StepDocuments";
import { StepReview } from "@/components/onboarding/steps/StepReview";
import type { StepComponentProps } from "@/components/onboarding/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Ship, LogOut, PartyPopper, Loader2 } from "lucide-react";

const STEP_COMPONENTS: Record<number, (p: StepComponentProps) => JSX.Element> = {
  0: StepWelcome,
  1: StepPersonalData,
  2: StepAddress,
  3: StepProfessional,
  4: StepCertifications,
  5: StepDocuments,
  6: StepReview,
};

export default function Onboarding() {
  const { user, signOut, refreshProfileStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const progress = useOnboardingProgress(user?.id);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const finishingRef = useRef(false);

  // Perfil já completo ao ENTRAR na trilha? Sai direto.
  // O ref evita que a conclusão dentro do fluxo (que marca profile_complete)
  // dispare o redirect antes da tela de celebração.
  useEffect(() => {
    if (finishingRef.current) return;
    if (!progress.loading && progress.profile?.profile_complete) {
      navigate("/dashboard", { replace: true });
    }
  }, [progress.loading, progress.profile, navigate]);

  // Retomada: posiciona na etapa correta após o carregamento.
  useEffect(() => {
    if (progress.loading || initialized) return;
    const savedStep = Number(progress.profile?.onboarding_step ?? 0);
    const resume = savedStep === 0 ? 0 : Math.max(savedStep, progress.firstIncompleteIndex);
    const clamped = Math.min(Math.max(resume, 0), TOTAL_STEPS - 1);
    setCurrentIndex(clamped);
    setMaxVisited(Math.max(clamped, progress.firstIncompleteIndex));
    setInitialized(true);
  }, [progress.loading, progress.profile, progress.firstIncompleteIndex, initialized]);

  // No mobile o container do card não é mais o elemento rolável (a página rola),
  // então subimos tanto o card (desktop) quanto a janela (mobile).
  const scrollTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = async () => {
    finishingRef.current = true;
    setCelebrating(true);
    await refreshProfileStatus();
    setTimeout(() => navigate("/dashboard", { replace: true }), 2400);
  };

  const goToStep = (index: number) => {
    const clamped = Math.min(Math.max(index, 0), TOTAL_STEPS - 1);
    setCurrentIndex(clamped);
    setMaxVisited((m) => Math.max(m, clamped));
    progress.saveOnboarding({ onboarding_step: clamped });
    scrollTop();
  };

  const goNext = () => {
    if (currentIndex >= TOTAL_STEPS - 1) {
      finish();
      return;
    }
    goToStep(currentIndex + 1);
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      scrollTop();
    }
  };

  const handleSaveAndExit = async () => {
    toast({ title: "Progresso salvo", description: "Continue seu cadastro quando quiser." });
    await signOut();
    navigate("/login", { replace: true });
  };

  if (progress.loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maritime-mist">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-maritime-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando sua trilha...</span>
        </div>
      </div>
    );
  }

  if (celebrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maritime-mist p-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
            <PartyPopper className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Cadastro concluído! 🎉</h1>
          <p className="text-muted-foreground mb-6">
            Seu perfil está pronto para contratação e já está visível para as empresas do setor marítimo.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Levando você ao painel...
          </div>
        </div>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentIndex];
  const stepProps: StepComponentProps = {
    progress,
    userId: user!.id,
    onNext: goNext,
    onBack: goBack,
    onSaveAndExit: handleSaveAndExit,
    goToStep,
    isFirst: currentIndex === 0,
    isLast: currentIndex === TOTAL_STEPS - 1,
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-maritime-mist">
      {/* Cabeçalho (fixo no topo para "Sair" sempre acessível) */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-maritime-blue" />
          <span className="text-sm sm:text-base font-semibold text-maritime-blue">Hunters Manpower</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSaveAndExit} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Salvar e sair</span>
          <span className="sm:hidden">Sair</span>
        </Button>
      </header>

      {/* Conteúdo — no mobile flui e a página rola; no desktop usa altura fixa com scroll interno */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:min-h-0">
        <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:gap-8">
          <OnboardingStepper
            currentIndex={currentIndex}
            stepStatuses={progress.stepStatuses}
            readiness={progress.readiness}
            maxVisitedIndex={maxVisited}
            onStepClick={goToStep}
          />

          <main className="min-w-0 flex-1 lg:min-h-0">
            <div
              ref={scrollRef}
              className="flex flex-col rounded-2xl border bg-card p-4 shadow-card sm:p-6 lg:h-full lg:min-h-0 lg:overflow-hidden lg:p-8"
            >
              <div key={currentIndex} className="flex flex-col animate-fade-in lg:min-h-0 lg:flex-1">
                <StepComponent {...stepProps} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
