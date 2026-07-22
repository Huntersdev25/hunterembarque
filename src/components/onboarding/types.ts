import type { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

export type OnboardingProgress = ReturnType<typeof useOnboardingProgress>;

export interface StepComponentProps {
  progress: OnboardingProgress;
  userId: string;
  onNext: () => void;
  onBack: () => void;
  onSaveAndExit: () => void;
  goToStep: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}
