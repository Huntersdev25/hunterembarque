import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  UserPlus,
  Shield,
  Building2,
  RefreshCw,
  Download,
  Database,
  Bell,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function QuickActionsCard() {
  const queryClient = useQueryClient();

  const handleRefreshCache = () => {
    queryClient.invalidateQueries();
    toast.success("Cache atualizado com sucesso!");
  };

  const handleCleanupOrphans = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-data');
      if (error) throw error;
      toast.success(`Limpeza concluída: ${data?.cleaned_profiles || 0} registros removidos`);
    } catch (error: any) {
      toast.error("Erro ao limpar dados órfãos: " + error.message);
    }
  };

  const actions = [
    { 
      label: "Criar Usuário T.I", 
      icon: UserPlus, 
      href: "/s/novo-ti",
      variant: "default" as const
    },
    { 
      label: "Criar Admin", 
      icon: Shield, 
      href: "/s/novo-admin",
      variant: "outline" as const
    },
    { 
      label: "Novo Cliente", 
      icon: Building2, 
      href: "/a/empresas",
      variant: "outline" as const
    },
    { 
      label: "Banco de Dados", 
      icon: Database, 
      href: "/s/banco",
      variant: "outline" as const
    },
  ];

  const utilityActions = [
    {
      label: "Atualizar Cache",
      icon: RefreshCw,
      onClick: handleRefreshCache
    },
    {
      label: "Limpar Órfãos",
      icon: Trash2,
      onClick: handleCleanupOrphans
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Link key={action.label} to={action.href}>
              <Button variant={action.variant} className="w-full justify-start" size="sm">
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
        
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">Utilitários</p>
          <div className="grid grid-cols-2 gap-2">
            {utilityActions.map((action) => (
              <Button 
                key={action.label} 
                variant="ghost" 
                className="justify-start" 
                size="sm"
                onClick={action.onClick}
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
