import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Database,
  Settings,
  Activity,
  Server,
  Eye,
  Bell,
  BarChart3,
  Globe,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { title: "Dashboard", href: "/s/painel", icon: LayoutDashboard },
      { title: "Analytics", href: "/s/metricas", icon: BarChart3 },
      { title: "Atividades", href: "/s/atividades", icon: Activity },
    ]
  },
  {
    title: "Usuários",
    items: [
      { title: "Gerenciar Usuários", href: "/s/usuarios", icon: Users },
      { title: "Criar T.I", href: "/s/novo-ti", icon: Server },
    ]
  },
  {
    title: "Sistema",
    items: [
      { title: "Clientes", href: "/s/empresas", icon: Building2 },
      { title: "Vagas", href: "/s/vagas", icon: Briefcase },
      { title: "Banco de Dados", href: "/s/banco", icon: Database },
    ]
  },
  {
    title: "Integrações",
    items: [
      { title: "Webhooks", href: "/s/hooks", icon: Globe },
      { title: "Agentes IA", href: "/s/conexoes", icon: Zap },
      { title: "Visibilidade", href: "/s/visibilidade", icon: Eye },
    ]
  },
  {
    title: "Configurações",
    items: [
      { title: "Permissões", href: "/s/permissoes", icon: Shield },
      { title: "Notificações", href: "/s/alertas", icon: Bell },
      { title: "Sistema", href: "/s/config", icon: Settings },
    ]
  }
];

interface TISidebarProps {
  onNavigate?: () => void;
}

export function TISidebar({ onNavigate }: TISidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      toast.success('Logout realizado com sucesso!');
      window.location.href = '/login';
    }
  };

  const handleNavigation = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Server className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground">T.I Control</span>
              <p className="text-xs text-muted-foreground">Hunters Embarque</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <h3 className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/s/painel' && location.pathname.startsWith(item.href));
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={handleNavigation}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive && "text-primary"
                      )} />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && item.badge !== undefined && (
                        <span className="ml-auto bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
