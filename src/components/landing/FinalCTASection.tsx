import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-24 bg-maritime-dark relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.15)_0%,_transparent_70%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
          Pronto para profissionalizar seu processo de embarque?
        </h2>
        <p className="text-lg text-primary-foreground/60 mb-10 max-w-2xl mx-auto">
          Junte-se às empresas que já automatizaram sua operação e reduziram
          custos com a plataforma Hunters Embarque.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <Button size="lg" variant="maritime" className="text-base px-8">
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar com Especialista
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="maritime" className="text-base px-8">
              Criar Conta
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
