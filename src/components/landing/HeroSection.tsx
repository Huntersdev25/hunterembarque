import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import offshoreImage from "@/assets/offshore-platform-modern.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center bg-background pt-16 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-maritime-blue/10 border border-maritime-blue/20 px-4 py-1.5 mb-8">
              <div className="w-2 h-2 rounded-full bg-maritime-blue animate-pulse" />
              <span className="text-sm font-medium text-maritime-blue">
                Plataforma operacional offshore
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-[1.1] tracking-tight mb-6">
              O sistema operacional do{" "}
              <span className="text-maritime-blue">embarque offshore.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
              Da triagem ao embarque, automatizamos a movimentação de profissionais
              com inteligência e controle total.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-16">
              <Link to="/login" className="sm:hidden">
                <Button size="lg" variant="maritime" className="text-sm px-7 rounded-full">
                  Entrar Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register" className="hidden sm:inline-flex">
                <Button size="lg" variant="maritime" className="text-sm px-7 rounded-full">
                  Entrar Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/vagas">
                <Button size="lg" variant="outline" className="text-sm px-7 rounded-full border-maritime-blue/30 text-maritime-blue hover:bg-maritime-blue/5">
                  Ver Vagas
                </Button>
              </Link>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {[
                { value: "2.500+", label: "Profissionais ativos" },
                { value: "8.000+", label: "Embarques realizados" },
                { value: "48h", label: "SLA médio" },
                { value: "67%", label: "Redução no tempo" },
              ].map((metric) => (
                <div key={metric.label}>
                  <p className="text-2xl sm:text-3xl font-bold text-maritime-blue">
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right image */}
          <div className="hidden lg:block relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={offshoreImage}
                alt="Plataforma offshore"
                className="w-full h-[540px] object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-maritime-dark/30 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
