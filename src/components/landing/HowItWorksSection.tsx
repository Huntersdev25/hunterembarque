import { UserPlus, FileCheck, Cpu, CheckCircle2, History } from "lucide-react";

const steps = [
  { icon: UserPlus, num: "01", title: "Cadastro Inteligente", desc: "Profissional cria perfil técnico estruturado com certificações, experiência e disponibilidade." },
  { icon: FileCheck, num: "02", title: "Validação Documental", desc: "Verificação automática de certificados, validades e conformidade regulatória." },
  { icon: Cpu, num: "03", title: "Matching Automatizado", desc: "Algoritmo cruza requisitos da vaga com perfil do profissional para encontrar o melhor fit." },
  { icon: CheckCircle2, num: "04", title: "Confirmação de Embarque", desc: "Processo de aprovação e confirmação com rastreabilidade completa." },
  { icon: History, num: "05", title: "Rastreamento e Histórico", desc: "Acompanhamento em tempo real e histórico completo de movimentações." },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Fluxo operacional completo, do cadastro ao embarque
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-maritime flex items-center justify-center mb-4 shadow-maritime">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="text-xs font-bold text-primary mb-2">{step.num}</span>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
