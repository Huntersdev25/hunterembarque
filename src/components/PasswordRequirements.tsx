import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  showMatchCheck?: boolean;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordRequirements({ password, confirmPassword, showMatchCheck = false }: PasswordRequirementsProps) {
  const requirements: Requirement[] = useMemo(() => {
    const reqs: Requirement[] = [
      { label: "Mínimo de 6 caracteres", met: password.length >= 6 },
      { label: "Pelo menos uma letra maiúscula", met: /[A-Z]/.test(password) },
      { label: "Pelo menos uma letra minúscula", met: /[a-z]/.test(password) },
      { label: "Pelo menos um número", met: /[0-9]/.test(password) },
      { label: "Pelo menos um caractere especial (!@#$%&*)", met: /[!@#$%&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];

    if (showMatchCheck && confirmPassword !== undefined) {
      reqs.push({
        label: "As senhas coincidem",
        met: password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
      });
    }

    return reqs;
  }, [password, confirmPassword, showMatchCheck]);

  const allMet = requirements.every((r) => r.met);

  if (!password) {
    return (
      <div className="bg-muted/50 border border-border rounded-md p-3 space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">Requisitos da senha:</p>
        <ul className="space-y-1">
          {requirements.map((req, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
              {req.label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn(
      "border rounded-md p-3 space-y-1.5 transition-colors",
      allMet ? "bg-primary/5 border-primary/30" : "bg-muted/50 border-border"
    )}>
      <p className="text-sm font-medium text-foreground">Requisitos da senha:</p>
      <ul className="space-y-1">
        {requirements.map((req, i) => (
          <li key={i} className={cn(
            "flex items-center gap-2 text-sm transition-colors",
            req.met ? "text-primary" : "text-destructive"
          )}>
            {req.met ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 flex-shrink-0" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  );
}
