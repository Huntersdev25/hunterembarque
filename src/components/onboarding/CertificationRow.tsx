import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isOwnedCertValid,
  isValidityExpired,
  type CertAnswer,
  type CertFieldState,
  type CertificationMeta,
} from "@/lib/onboarding";
import { Check, X, FileWarning, CalendarClock, ChevronRight } from "lucide-react";

interface CertificationRowProps {
  cert: CertificationMeta;
  answer: CertAnswer;
  fields: CertFieldState;
  onAnswerChange: (answer: CertAnswer) => void;
  onOpenDetails: () => void;
}

/** Linha compacta (uma por certificação) com toggle Possuo/Não possuo e status. */
export function CertificationRow({ cert, answer, fields, onAnswerChange, onOpenDetails }: CertificationRowProps) {
  const owned = answer === "owned";
  const valid = owned && isOwnedCertValid(fields);
  const expired = owned && !fields.indeterminate && isValidityExpired(fields.validityDate);

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        answer === "unanswered" && "border-dashed",
        owned && (valid ? "border-maritime-blue/40 bg-maritime-blue/5" : "border-warning/50 bg-warning/5"),
        answer === "not_owned" && "bg-muted/40",
      )}
    >
      <div className="flex items-center gap-3 p-2.5 sm:p-3">
        {/* Identificação */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{cert.name}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{cert.description}</p>
        </div>

        {/* Toggle compacto */}
        <div className="flex shrink-0 rounded-lg border p-0.5 bg-background">
          <Button
            type="button"
            size="sm"
            variant={owned ? "default" : "ghost"}
            className="h-8 px-2.5 text-xs min-h-[32px]"
            onClick={() => {
              onAnswerChange("owned");
              if (!isOwnedCertValid(fields)) onOpenDetails();
            }}
          >
            <Check className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Possuo</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={answer === "not_owned" ? "secondary" : "ghost"}
            className="h-8 px-2.5 text-xs min-h-[32px]"
            onClick={() => onAnswerChange("not_owned")}
          >
            <X className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Não</span>
          </Button>
        </div>
      </div>

      {/* Faixa de status (só quando "Possuo") */}
      {owned && (
        <button
          type="button"
          onClick={onOpenDetails}
          className={cn(
            "flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]",
            valid ? "text-muted-foreground" : "text-warning",
          )}
        >
          {valid ? (
            <>
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-success" />
              <span className="flex-1">
                Anexado ·{" "}
                {fields.indeterminate ? "validade indeterminada" : `válido até ${fields.validityDate}`}
              </span>
            </>
          ) : (
            <>
              <FileWarning className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{expired ? "Certificação vencida — corrigir" : "Toque para informar datas e anexar"}</span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      )}
    </div>
  );
}
