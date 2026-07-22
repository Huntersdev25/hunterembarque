import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, CheckCircle2, XCircle, Eye, Pencil, Trash2, Plus,
  ListChecks, Users, Briefcase, Building2, Ship, FileText,
  BarChart3, Anchor, ClipboardList, Package, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Permission = "full" | "own" | "assigned" | "read" | "none";

interface ModulePermission {
  view: Permission;
  create: Permission;
  edit: Permission;
  delete: Permission;
  notes?: string;
}

interface RolePermissions {
  [module: string]: ModulePermission;
}

const ROLES = ["Diretor", "Coordenador de Operações", "Supervisor", "Analista"] as const;
type Role = (typeof ROLES)[number];

const MODULES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: "tarefas", label: "Tarefas", icon: ListChecks },
  { key: "candidatos", label: "Candidatos / Profissionais", icon: Users },
  { key: "vagas", label: "Vagas", icon: Briefcase },
  { key: "clientes", label: "Clientes", icon: Building2 },
  { key: "candidaturas", label: "Candidaturas", icon: FileText },
  { key: "embarque", label: "Controle de Embarque", icon: Ship },
  { key: "medicoes", label: "Medições", icon: BarChart3 },
  { key: "gestao_operacional", label: "Gestão Operacional", icon: ClipboardList },
  { key: "rancho", label: "Rancho", icon: Package },
  { key: "relatorios", label: "Relatórios / Exports", icon: FileText },
  { key: "admin_config", label: "Configurações Admin", icon: Shield },
];

const PERMISSIONS_MAP: Record<Role, RolePermissions> = {
  "Diretor": {
    tarefas: { view: "full", create: "full", edit: "full", delete: "full", notes: "Pode designar tarefas a qualquer usuário" },
    candidatos: { view: "full", create: "full", edit: "full", delete: "full" },
    vagas: { view: "full", create: "full", edit: "full", delete: "full" },
    clientes: { view: "full", create: "full", edit: "full", delete: "full" },
    candidaturas: { view: "full", create: "full", edit: "full", delete: "none" },
    embarque: { view: "full", create: "full", edit: "full", delete: "full" },
    medicoes: { view: "full", create: "full", edit: "full", delete: "full" },
    gestao_operacional: { view: "full", create: "full", edit: "full", delete: "full" },
    rancho: { view: "full", create: "full", edit: "full", delete: "full" },
    relatorios: { view: "full", create: "full", edit: "none", delete: "none" },
    admin_config: { view: "full", create: "full", edit: "full", delete: "full", notes: "Acesso total à administração" },
  },
  "Coordenador de Operações": {
    tarefas: { view: "full", create: "full", edit: "full", delete: "full", notes: "Pode designar tarefas a qualquer usuário" },
    candidatos: { view: "full", create: "full", edit: "full", delete: "none" },
    vagas: { view: "full", create: "full", edit: "full", delete: "none" },
    clientes: { view: "full", create: "none", edit: "full", delete: "none" },
    candidaturas: { view: "full", create: "full", edit: "full", delete: "none" },
    embarque: { view: "full", create: "full", edit: "full", delete: "full" },
    medicoes: { view: "full", create: "full", edit: "full", delete: "full" },
    gestao_operacional: { view: "full", create: "full", edit: "full", delete: "full" },
    rancho: { view: "full", create: "full", edit: "full", delete: "full" },
    relatorios: { view: "full", create: "full", edit: "none", delete: "none" },
    admin_config: { view: "read", create: "none", edit: "none", delete: "none" },
  },
  "Supervisor": {
    tarefas: { view: "full", create: "full", edit: "full", delete: "full", notes: "Pode designar tarefas a qualquer usuário" },
    candidatos: { view: "full", create: "full", edit: "full", delete: "none" },
    vagas: { view: "full", create: "none", edit: "none", delete: "none" },
    clientes: { view: "full", create: "none", edit: "none", delete: "none" },
    candidaturas: { view: "full", create: "full", edit: "full", delete: "none" },
    embarque: { view: "full", create: "full", edit: "full", delete: "none" },
    medicoes: { view: "full", create: "full", edit: "full", delete: "none" },
    gestao_operacional: { view: "full", create: "full", edit: "full", delete: "none" },
    rancho: { view: "full", create: "full", edit: "full", delete: "none" },
    relatorios: { view: "full", create: "full", edit: "none", delete: "none" },
    admin_config: { view: "none", create: "none", edit: "none", delete: "none" },
  },
  "Analista": {
    tarefas: { view: "own", create: "own", edit: "own", delete: "none", notes: "Visualiza e cria apenas tarefas próprias ou designadas a ele" },
    candidatos: { view: "full", create: "full", edit: "full", delete: "none" },
    vagas: { view: "full", create: "none", edit: "none", delete: "none" },
    clientes: { view: "full", create: "none", edit: "none", delete: "none" },
    candidaturas: { view: "full", create: "full", edit: "full", delete: "none" },
    embarque: { view: "full", create: "full", edit: "full", delete: "none" },
    medicoes: { view: "full", create: "full", edit: "full", delete: "none" },
    gestao_operacional: { view: "full", create: "full", edit: "full", delete: "none" },
    rancho: { view: "full", create: "full", edit: "full", delete: "none" },
    relatorios: { view: "full", create: "full", edit: "none", delete: "none" },
    admin_config: { view: "none", create: "none", edit: "none", delete: "none" },
  },
};

const PERMISSION_LABELS: Record<Permission, { label: string; color: string; icon: React.ElementType }> = {
  full: { label: "Total", color: "text-green-600", icon: CheckCircle2 },
  own: { label: "Próprio", color: "text-amber-600", icon: Eye },
  assigned: { label: "Atribuído", color: "text-blue-600", icon: Eye },
  read: { label: "Leitura", color: "text-sky-600", icon: Eye },
  none: { label: "—", color: "text-muted-foreground/40", icon: XCircle },
};

function PermissionCell({ permission }: { permission: Permission }) {
  const config = PERMISSION_LABELS[permission];
  const Icon = config.icon;
  return (
    <div className={cn("flex items-center justify-center gap-1", config.color)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}

function PermissionMatrix({ role }: { role: Role }) {
  const perms = PERMISSIONS_MAP[role];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-[200px]">Módulo</th>
            <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              <div className="flex items-center justify-center gap-1"><Eye className="h-3.5 w-3.5" /> Ver</div>
            </th>
            <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              <div className="flex items-center justify-center gap-1"><Plus className="h-3.5 w-3.5" /> Criar</div>
            </th>
            <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              <div className="flex items-center justify-center gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</div>
            </th>
            <th className="text-center py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              <div className="flex items-center justify-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Excluir</div>
            </th>
            <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Obs.</th>
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod) => {
            const mp = perms[mod.key];
            const Icon = mod.icon;
            return (
              <tr key={mod.key} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground text-sm">{mod.label}</span>
                  </div>
                </td>
                <td className="py-3 px-3"><PermissionCell permission={mp.view} /></td>
                <td className="py-3 px-3"><PermissionCell permission={mp.create} /></td>
                <td className="py-3 px-3"><PermissionCell permission={mp.edit} /></td>
                <td className="py-3 px-3"><PermissionCell permission={mp.delete} /></td>
                <td className="py-3 px-4">
                  {mp.notes && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[250px]">
                          <p className="text-xs">{mp.notes}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TIPermissions() {
  return (
    <TILayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Matriz de Permissões
          </h1>
          <p className="text-muted-foreground mt-1">
            Referência completa de permissões por cargo em todos os módulos do sistema
          </p>
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legenda:</span>
              {(Object.entries(PERMISSION_LABELS) as [Permission, typeof PERMISSION_LABELS[Permission]][]).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className={cn("flex items-center gap-1.5 text-xs", config.color)}>
                    <Icon className="h-3.5 w-3.5" />
                    <span className="font-medium">{config.label}</span>
                    {key === "full" && <span className="text-muted-foreground">= Acesso total</span>}
                    {key === "own" && <span className="text-muted-foreground">= Apenas o que criou/foi atribuído</span>}
                    {key === "assigned" && <span className="text-muted-foreground">= Apenas atribuídos a ele</span>}
                    {key === "read" && <span className="text-muted-foreground">= Somente leitura</span>}
                    {key === "none" && <span className="text-muted-foreground">= Sem acesso</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Role-specific info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map((role) => {
            const fullCount = MODULES.filter(m => {
              const p = PERMISSIONS_MAP[role][m.key];
              return p.view === "full" && p.create === "full" && p.edit === "full" && p.delete === "full";
            }).length;
            return (
              <Card key={role} className="border-border/60">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{role}</p>
                      <p className="text-xs text-muted-foreground">{fullCount} módulos com acesso total</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {MODULES.map((mod) => {
                      const p = PERMISSIONS_MAP[role][mod.key];
                      const isFullAccess = p.view === "full" && p.create === "full" && p.edit === "full" && p.delete === "full";
                      const hasNoAccess = p.view === "none" && p.create === "none" && p.edit === "none" && p.delete === "none";
                      return (
                        <TooltipProvider key={mod.key}>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                isFullAccess ? "bg-green-500" : hasNoAccess ? "bg-muted" : "bg-amber-500"
                              )} />
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">{mod.label}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Permissions Tabs by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Permissões Detalhadas por Cargo</CardTitle>
            <CardDescription>Selecione um cargo para visualizar a matriz completa de permissões</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="Diretor">
              <TabsList className="mb-4">
                {ROLES.map(role => (
                  <TabsTrigger key={role} value={role} className="text-xs">
                    {role}
                  </TabsTrigger>
                ))}
              </TabsList>
              {ROLES.map(role => (
                <TabsContent key={role} value={role}>
                  <ScrollArea className="w-full">
                    <PermissionMatrix role={role} />
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-2 text-sm text-foreground/80">
                <p><strong>Usuários T.I</strong> possuem acesso irrestrito a todos os módulos e configurações do sistema, incluindo esta matriz de referência.</p>
                <p><strong>Candidatos/Profissionais</strong> acessam apenas seu próprio perfil, candidaturas e tarefas designadas a eles.</p>
                <p><strong>Usuários de Empresas (Clientes)</strong> visualizam apenas os profissionais atribuídos à sua empresa conforme as regras de visibilidade configuradas.</p>
                <p className="text-xs text-muted-foreground mt-2">Esta matriz é uma referência das políticas de segurança (RLS) aplicadas no banco de dados. Alterações requerem atualização das políticas pelo T.I.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TILayout>
  );
}
