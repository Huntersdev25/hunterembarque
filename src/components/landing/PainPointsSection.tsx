import { AlertTriangle, FileX, Clock, Shuffle, ShieldAlert } from "lucide-react";

const pains = [
  { icon: Shuffle, title: "Falta de rastreabilidade", desc: "Sem visibilidade do status de cada profissional no processo de embarque." },
  { icon: FileX, title: "Erros documentais", desc: "Certificações vencidas ou incompletas descobertas na última hora." },
  { icon: Clock, title: "Tempo elevado de contratação", desc: "Processos manuais que atrasam a operação e geram custos extras." },
  { icon: AlertTriangle, title: "Falta de padronização", desc: "Cada operação segue um fluxo diferente, sem padrão definido." },
  { icon: ShieldAlert, title: "Risco operacional", desc: "Embarques sem conformidade que colocam a operação em risco." },
];

export function PainPointsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            O embarque offshore não pode depender de planilhas.
          </h2>
          <p className="text-lg text-muted-foreground">
            O setor enfrenta desafios críticos que impactam diretamente a
            eficiência operacional e a segurança das operações.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pains.map((pain, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-border bg-card p-6 hover:border-destructive/30 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                <pain.icon className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{pain.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pain.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
