import { Clock, FileCheck, Ship, UserCheck } from "lucide-react";

const metrics = [
  { icon: Clock, value: "48h", label: "Tempo médio de preenchimento", description: "Da requisição ao profissional confirmado" },
  { icon: FileCheck, value: "98,5%", label: "Taxa de aprovação documental", description: "Documentação validada antes do embarque" },
  { icon: Ship, value: "650+", label: "Embarques mensais", description: "Volume operacional mensal médio" },
  { icon: UserCheck, value: "94%", label: "Taxa de retenção", description: "Profissionais que retornam para novos embarques" },
];

export function MetricsSection() {
  return (
    <section className="py-20 bg-maritime-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-primary-foreground mb-3">
            Resultados que falam por si
          </h2>
          <p className="text-primary-foreground/60 max-w-xl mx-auto">
            Indicadores operacionais reais da nossa plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="relative group rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center hover:border-primary/40 transition-all"
            >
              <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-primary/10 flex items-center justify-center">
                <m.icon className="h-7 w-7 text-primary" />
              </div>
              <p className="text-4xl font-bold text-primary mb-2">{m.value}</p>
              <p className="text-sm font-semibold text-primary-foreground mb-1">{m.label}</p>
              <p className="text-xs text-primary-foreground/50">{m.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
