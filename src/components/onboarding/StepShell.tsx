import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, LogOut, CheckCircle2 } from "lucide-react";

interface StepShellProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Rótulo do botão principal (default "Continuar"). */
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  onBack?: () => void;
  hideBack?: boolean;
  onSaveAndExit?: () => void;
  saving?: boolean;
  /** Última etapa usa ícone de check no botão principal. */
  isFinal?: boolean;
}

export function StepShell({
  title,
  description,
  icon,
  children,
  nextLabel = "Continuar",
  onNext,
  nextDisabled = false,
  onBack,
  hideBack = false,
  onSaveAndExit,
  saving = false,
  isFinal = false,
}: StepShellProps) {
  return (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      {/* Cabeçalho da etapa */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-maritime-blue/10 text-maritime-blue">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Corpo — flui no mobile (página rola), scroll interno só no desktop */}
      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1 lg:-mr-1">{children}</div>

      {/* Rodapé de navegação — grudado no fim da viewport no mobile */}
      <div className="sticky bottom-0 z-10 mt-5 flex flex-col-reverse items-stretch gap-2 border-t bg-card pt-4 pb-1 sm:mt-6 sm:flex-row sm:items-center sm:static sm:pb-0">
        {!hideBack && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={saving}
            className="sm:mr-auto min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        )}

        {onSaveAndExit && (
          <Button
            type="button"
            variant="outline"
            onClick={onSaveAndExit}
            disabled={saving}
            className="min-h-[44px]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Salvar e continuar depois
          </Button>
        )}

        {onNext && (
          <Button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || saving}
            className="min-h-[44px] sm:min-w-[180px]"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {isFinal ? <CheckCircle2 className="h-4 w-4 mr-2" /> : null}
                {nextLabel}
                {!isFinal && <ArrowRight className="h-4 w-4 ml-2" />}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
