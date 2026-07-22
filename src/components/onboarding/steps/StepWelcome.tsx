import { StepShell } from "@/components/onboarding/StepShell";
import type { StepComponentProps } from "@/components/onboarding/types";
import { User, MapPin, Briefcase, Award, FileText, ShieldCheck } from "lucide-react";

const CHECKLIST = [
  { icon: User, title: "Dados pessoais", desc: "CPF, nascimento e contato" },
  { icon: MapPin, title: "Endereço", desc: "Preenchido pelo CEP" },
  { icon: Briefcase, title: "Perfil profissional", desc: "Função, experiência e embarcação" },
  { icon: Award, title: "Certificações marítimas", desc: "Marque o que possui e anexe" },
  { icon: FileText, title: "Documentos", desc: "Currículo, foto e vídeo" },
];

export function StepWelcome({ onNext }: StepComponentProps) {
  return (
    <StepShell
      title="Bem-vindo à sua trilha de cadastro"
      description="Vamos deixar seu perfil pronto para as empresas do setor marítimo."
      icon={<ShieldCheck className="h-6 w-6" />}
      hideBack
      nextLabel="Começar agora"
      onNext={onNext}
    >
      <div className="space-y-6">
        <div className="rounded-xl border bg-maritime-blue/5 p-4 sm:p-5">
          <p className="text-sm text-foreground leading-relaxed">
            Um perfil completo é o que faz as empresas encontrarem e contratarem você. Leva cerca de{" "}
            <strong>10 minutos</strong> e você pode <strong>sair e continuar depois</strong> — seu progresso
            fica salvo automaticamente a cada etapa.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground mb-3">O que você vai preencher:</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CHECKLIST.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maritime-blue/10 text-maritime-blue">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">
            💡 Tenha em mãos seus <strong>certificados digitalizados</strong> (PDF, JPG ou PNG) para anexar na
            etapa de certificações.
          </p>
        </div>
      </div>
    </StepShell>
  );
}
