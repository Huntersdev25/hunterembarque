import { cn } from "@/lib/utils";
import { STEPS, TOTAL_STEPS, type StepId, type StepStatus } from "@/lib/onboarding";
import { Check, Circle } from "lucide-react";

interface OnboardingStepperProps {
  currentIndex: number;
  stepStatuses: Record<StepId, StepStatus>;
  readiness: number;
  maxVisitedIndex: number;
  onStepClick: (index: number) => void;
}

/** Anel circular de prontidão (%). */
function ReadinessRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} strokeWidth="6" className="stroke-muted" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={r}
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-maritime-blue transition-all duration-500"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-maritime-blue">
        {value}%
      </span>
    </div>
  );
}

export function OnboardingStepper({
  currentIndex,
  stepStatuses,
  readiness,
  maxVisitedIndex,
  onStepClick,
}: OnboardingStepperProps) {
  return (
    <>
      {/* -------- Desktop: painel lateral -------- */}
      <aside className="hidden lg:flex flex-col gap-6 w-72 shrink-0">
        <div className="flex items-center gap-3">
          <ReadinessRing value={readiness} />
          <div>
            <p className="text-sm font-semibold text-foreground">Prontidão do perfil</p>
            <p className="text-xs text-muted-foreground">
              Complete as etapas para ficar pronto para contratação.
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {STEPS.map((step) => {
            const status = stepStatuses[step.id];
            const isCurrent = step.index === currentIndex;
            const isDone = status?.complete;
            const reachable = step.index <= maxVisitedIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => reachable && onStepClick(step.index)}
                disabled={!reachable}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  isCurrent ? "bg-maritime-blue/10" : "hover:bg-muted",
                  !reachable && "opacity-50 cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isDone
                      ? "border-success bg-success text-success-foreground"
                      : isCurrent
                        ? "border-maritime-blue text-maritime-blue"
                        : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : step.index === 0 ? <Circle className="h-3 w-3" /> : step.index}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-sm font-medium leading-tight",
                      isCurrent ? "text-maritime-blue" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">{step.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* -------- Mobile: barra de progresso compacta -------- */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">
            Etapa {Math.min(currentIndex + 1, TOTAL_STEPS)} de {TOTAL_STEPS}
          </span>
          <span className="text-sm font-bold text-maritime-blue">{readiness}% pronto</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-maritime-blue transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {STEPS[currentIndex]?.label}
        </p>
      </div>
    </>
  );
}
