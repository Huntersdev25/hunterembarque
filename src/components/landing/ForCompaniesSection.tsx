import { LayoutDashboard, History, Activity, SlidersHorizontal, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const features = [
  { icon: LayoutDashboard, title: "Dashboard de candidatos", desc: "Visão centralizada de todos os profissionais." },
  { icon: History, title: "Histórico de embarques", desc: "Registro completo de todas as operações." },
  { icon: Activity, title: "Controle de status", desc: "Acompanhamento em tempo real do processo." },
  { icon: SlidersHorizontal, title: "Filtros técnicos avançados", desc: "Busca por certificações, funções e disponibilidade." },
  { icon: Timer, title: "SLA monitorado", desc: "Indicadores de performance operacional." },
];

export function ForCompaniesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Para Empresas</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              Para quem precisa manter a operação em movimento.
            </h2>
            <p className="text-muted-foreground mb-8">
              Ferramentas completas para gerenciar o ciclo de vida do embarque,
              da requisição ao desembarque.
            </p>
            <Link to="/register">
              <Button variant="maritime" size="lg">
                Começar agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-card transition-all">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
