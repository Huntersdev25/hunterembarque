import { Award, Ship, Users, TrendingUp } from "lucide-react";

const stats = [
  { icon: Award, value: "15+", label: "Anos de experiência no setor marítimo" },
  { icon: Ship, value: "50+", label: "Embarcações atendidas simultaneamente" },
  { icon: Users, value: "10.000+", label: "Profissionais cadastrados na base" },
  { icon: TrendingUp, value: "99,2%", label: "Taxa de conformidade operacional" },
];

export function InstitutionalSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-sm font-semibold text-maritime-blue uppercase tracking-wider">Sobre a Hunters</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-6">
              Hunters Manpower
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed text-justify">
              A Hunters ManPower nasceu para elevar os padrões de excelência no fornecimento de mão de obra técnica especializada para os setores marítimo e de óleo e gás. Mais do que recrutar, atuamos como parceiros estratégicos de operações que exigem precisão, segurança e alta performance, selecionando profissionais preparados para enfrentar os desafios mais complexos do ambiente offshore.
            </p>
            <p className="text-muted-foreground leading-relaxed text-justify">
              Acreditamos que grandes resultados começam pelas pessoas. Por isso, investimos continuamente no desenvolvimento, na capacitação e no bem-estar dos nossos colaboradores, construindo relações de confiança que transformam desafios em soluções eficientes e sustentáveis. A Hunters é um time comprometido com evolução constante, inovação e excelência operacional.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 text-center">
                <div className="w-11 h-11 mx-auto rounded-lg bg-maritime-blue/10 flex items-center justify-center mb-3">
                  <s.icon className="h-5 w-5 text-maritime-blue" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
