import { User, Briefcase, Bell, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const benefits = [
  { icon: User, title: "Perfil técnico estruturado", desc: "Certificações, experiência e dados validados em um só lugar." },
  { icon: Briefcase, title: "Histórico profissional consolidado", desc: "Todo seu histórico de embarques em uma timeline." },
  { icon: Bell, title: "Alertas de oportunidades", desc: "Receba notificações de vagas compatíveis com seu perfil." },
  { icon: Eye, title: "Status transparente", desc: "Acompanhe cada etapa do seu processo de candidatura." },
];

export function ForProfessionalsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 hover:shadow-maritime transition-all">
                <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <b.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{b.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="order-1 lg:order-2">
            <span className="text-sm font-semibold text-accent uppercase tracking-wider">Para Profissionais</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              Para quem vive do mar.
            </h2>
            <p className="text-muted-foreground mb-8">
              Seu perfil profissional completo, com certificações validadas,
              histórico consolidado e acesso direto às melhores oportunidades do setor.
            </p>
            <Link to="/register">
              <Button variant="maritime" size="lg">
                Criar meu perfil
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
