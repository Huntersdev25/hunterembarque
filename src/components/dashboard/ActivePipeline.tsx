import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface Application {
  id: string;
  job_id: string;
  status: string;
  applied_at: string;
  job: {
    id: string;
    title: string;
    function_name: string;
  };
}

interface ActivePipelineProps {
  applications: Application[];
}

const STAGES = [
  { key: "lista_espera", label: "Enviada" },
  { key: "contato_realizado", label: "Em análise" },
  { key: "aprovado", label: "Aprovado" },
  { key: "finalizado", label: "Embarcado" },
];

export function ActivePipeline({ applications }: ActivePipelineProps) {
  // Show most recent active application
  const active = applications.find(a => a.status !== "rejeitado");
  if (!active) return null;

  const currentIdx = STAGES.findIndex(s => s.key === active.status);

  return (
    <Card className="max-w-full overflow-hidden border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <p className="text-xs text-muted-foreground font-medium mb-1">Candidatura ativa</p>
        <p className="font-semibold text-foreground mb-1">{active.job?.title || "Vaga"}</p>
        <p className="text-sm text-muted-foreground mb-5">{active.job?.function_name}</p>

        {/* Pipeline */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          {STAGES.map((stage, i) => {
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;

            return (
              <div key={stage.key} className="flex min-w-0 items-center sm:flex-1 sm:last:flex-initial">
                <div className="flex min-w-0 flex-1 flex-col items-center">
                  {/* Circle */}
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "bg-foreground border-foreground"
                        : isCurrent
                          ? "border-[#E06000] bg-[#E06000]"
                          : "border-muted-foreground/30 bg-background"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-background" />
                    ) : (
                      <span
                        className={`text-xs font-bold ${
                          isCurrent ? "text-white" : "text-muted-foreground/50"
                        }`}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  {/* Label */}
                    <span
                    className={`text-[10px] mt-1.5 font-medium text-center ${
                      isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < STAGES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1.5 mt-[-18px] ${
                      i < currentIdx ? "bg-foreground" : "bg-muted-foreground/20"
                    } hidden sm:block`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
