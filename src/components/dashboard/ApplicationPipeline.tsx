import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Phone, Ship, XCircle, ArrowRight, Inbox } from "lucide-react";

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

interface ApplicationPipelineProps {
  applications: Application[];
}

const PIPELINE_STAGES = [
  { key: "lista_espera", label: "Enviada", icon: Clock, color: "bg-blue-500" },
  { key: "contato_realizado", label: "Em Análise", icon: Phone, color: "bg-amber-500" },
  { key: "aprovado", label: "Aprovado", icon: CheckCircle2, color: "bg-green-500" },
  { key: "finalizado", label: "Embarcado", icon: Ship, color: "bg-indigo-500" },
];

export function ApplicationPipeline({ applications }: ApplicationPipelineProps) {
  const activeApps = applications.filter(a => a.status !== "rejeitado");
  const rejectedCount = applications.filter(a => a.status === "rejeitado").length;

  if (applications.length === 0) return null;

  const getStageIndex = (status: string) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  // Group apps by their most advanced stage
  const stageCounts = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: activeApps.filter(a => a.status === stage.key).length,
  }));

  // Show the most recent apps with their pipeline status
  const recentApps = activeApps.slice(0, 3);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Inbox className="h-4 w-4 text-blue-600" />
          </div>
          Pipeline de Candidaturas
          <Badge variant="secondary" className="ml-auto text-xs">
            {activeApps.length} ativa{activeApps.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pipeline summary bar */}
        <div className="flex items-center gap-1 mb-5">
          {stageCounts.map((stage, i) => (
            <div key={stage.key} className="flex-1 flex items-center">
              <div className="flex-1">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <stage.icon className={`h-3 w-3 ${stage.count > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`} />
                  <span className={`text-[10px] font-medium ${stage.count > 0 ? '' : 'text-muted-foreground/40'}`}>
                    {stage.label}
                  </span>
                </div>
                <div className={`h-2 rounded-full ${stage.count > 0 ? stage.color : 'bg-muted'} transition-all`} />
                <p className="text-center text-xs font-bold mt-1">
                  {stage.count > 0 ? stage.count : '—'}
                </p>
              </div>
              {i < stageCounts.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/30 mx-0.5 flex-shrink-0 mt-[-8px]" />
              )}
            </div>
          ))}
        </div>

        {/* Recent applications with mini pipeline */}
        <div className="space-y-2">
          {recentApps.map((app) => {
            const stageIdx = getStageIndex(app.status);
            return (
              <div key={app.id} className="p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium truncate flex-1">{app.job?.title || "Vaga"}</p>
                  <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                    {app.job?.function_name}
                  </span>
                </div>
                {/* Mini pipeline dots */}
                <div className="flex items-center gap-1">
                  {PIPELINE_STAGES.map((stage, i) => (
                    <div key={stage.key} className="flex items-center flex-1">
                      <div
                        className={`h-2 flex-1 rounded-full transition-all ${
                          i <= stageIdx ? stage.color : 'bg-muted'
                        }`}
                      />
                      {i < PIPELINE_STAGES.length - 1 && <div className="w-0.5" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {rejectedCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <XCircle className="h-3 w-3 text-red-400" />
            {rejectedCount} candidatura{rejectedCount > 1 ? "s" : ""} não aprovada{rejectedCount > 1 ? "s" : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
