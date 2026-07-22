import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Bot, MessageSquare, ExternalLink, Settings, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function TIIntegrations() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['ti-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_covers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const agentNames: Record<string, { name: string; description: string }> = {
    'iassistente-logistica': { 
      name: 'iAssistente Logística', 
      description: 'Assistente especializado em logística marítima e planejamento de embarques'
    },
    'iassistente-camara': { 
      name: 'iAssistente Câmara', 
      description: 'Assistente para gestão de documentação e processos da câmara'
    },
    'iassistente-operacoes': { 
      name: 'iAssistente Operações', 
      description: 'Assistente para controle operacional e gestão de equipes'
    },
    'aimbarcadora': { 
      name: 'AIMbarcadora', 
      description: 'Assistente principal para recrutamento e seleção de profissionais'
    },
    'professor-ai': { 
      name: 'Professor AI', 
      description: 'Assistente educacional para treinamentos e certificações'
    },
  };

  const integrations = [
    {
      name: 'n8n',
      description: 'Plataforma de automação para workflows e integrações',
      status: 'active',
      icon: Zap,
      color: 'emerald'
    },
    {
      name: 'Edge Functions',
      description: 'Funções serverless para processamento backend',
      status: 'active',
      icon: Play,
      color: 'cyan'
    },
    {
      name: 'Supabase Realtime',
      description: 'Sincronização em tempo real de dados',
      status: 'active',
      icon: MessageSquare,
      color: 'purple'
    }
  ];

  return (
    <TILayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <Zap className="h-6 w-6 text-emerald-400" />
              Integrações & Agentes IA
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Gerencie agentes de IA e integrações do sistema
            </p>
          </div>
          <Link to="/s/hooks">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Settings className="h-4 w-4 mr-2" />
              Configurar Webhooks
            </Button>
          </Link>
        </div>

        {/* System Integrations */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Integrações do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.name} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-lg bg-${integration.color}-500/20 flex items-center justify-center`}>
                        <integration.icon className={`h-6 w-6 text-${integration.color}-400`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-100">{integration.name}</h3>
                        <p className="text-xs text-zinc-500">{integration.description}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Ativo
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Agents */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Agentes de IA</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents?.map((agent) => {
                const info = agentNames[agent.agent_id] || { 
                  name: agent.agent_id, 
                  description: 'Agente de IA personalizado' 
                };
                
                return (
                  <Card key={agent.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                      <img 
                        src={agent.cover_url} 
                        alt={info.name}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-zinc-100">{info.name}</h3>
                          <p className="text-xs text-zinc-500 mt-1">{info.description}</p>
                        </div>
                        <Bot className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                        <Badge className={
                          agent.webhook_url 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-700 text-zinc-400"
                        }>
                          {agent.webhook_url ? 'Webhook Ativo' : 'Sem Webhook'}
                        </Badge>
                        <Link to="/hunters-io/chat">
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TILayout>
  );
}
