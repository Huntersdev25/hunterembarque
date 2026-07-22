import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link to="/">
              <img
                src="/lovable-uploads/25395886-eba9-4c0a-9c0e-59af5a00eabc.png"
                alt="Hunters Manpower"
                width="140"
                height="36"
                loading="eager"
                className="h-7 sm:h-8 w-auto"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/vagas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Vagas
              </Link>
            </nav>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/register" className="hidden md:inline-flex">
              <Button size="sm" className="text-sm rounded-full px-5 bg-foreground text-background hover:bg-foreground/90">
                Criar Conta
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-2 border-t border-border/40 pt-3">
            <Link to="/vagas" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                Vagas
              </Button>
            </Link>
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                Criar Conta
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
