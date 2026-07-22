import { Database, Search, GitBranch, Activity, ScrollText, Brain, Bell, Sparkles } from "lucide-react";

const differentials = [
  { icon: Database, title: "Base especializada em marítimo", desc: "Dados estruturados para o setor offshore e marítimo." },
  { icon: Search, title: "Curadoria técnica", desc: "Validação qualificada de perfis e certificações." },
  { icon: GitBranch, title: "Match operacional", desc: "Cruzamento baseado em critérios técnicos e operacionais." },
  { icon: Activity, title: "Rastreabilidade de status", desc: "Visão em tempo real de cada etapa do processo." },
  { icon: ScrollText, title: "Histórico completo", desc: "Registro integral de todas as movimentações." },
];

const roadmap = [
  { icon: Brain, title: "Inteligência preditiva", desc: "Previsão de disponibilidade de profissionais." },
  { icon: Bell, title: "Alertas automáticos", desc: "Notificação de vencimento documental." },
  { icon: Sparkles, title: "Sugestão automática", desc: "IA sugere profissionais ideais para cada vaga." },
];

export function TechDifferentialsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Diferencial Tecnológico
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tecnologia construída especificamente para a realidade offshore
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {differentials.map((d, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 hover:shadow-maritime transition-all">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <d.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{d.title}</h3>
              <p className="text-sm text-muted-foreground">{d.desc}</p>
            </div>
          ))}
        </div>

        {/* Roadmap IA */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Roadmap de Inteligência Artificial</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {roadmap.map((r, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <r.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">{r.title}</h4>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
