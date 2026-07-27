import { 
  Briefcase, 
  Users, 
  Settings, 
  MessageSquare, 
  Building2, 
  LayoutDashboard, 
  User, 
  LogOut, 
  Send, 
  Ship, 
  ClipboardList, 
  DollarSign,
  ChevronDown,
  ChevronRight,
  Bot,
  BarChart3
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, memo } from "react";
import { usePrefetch } from "@/hooks/usePrefetch";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppSidebarProps {
  userType: "candidate" | "admin" | "client";
  darkMode?: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

export const AppSidebar = memo(function AppSidebar({ userType, darkMode = false }: AppSidebarProps) {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { prefetchOnHover } = usePrefetch();
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [clientType, setClientType] = useState<"hunting" | "labor_supply" | null>(null);
  const [hasMultipleUsers, setHasMultipleUsers] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Menu"]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user || userType !== "client") return;

      console.log('🔍 AppSidebar: Verificando client_type para user:', user.id);

      // Primeiro tenta buscar como cliente principal (dono da empresa)
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, client_type")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log('📊 AppSidebar: clientData result:', { clientData, clientError });

      if (clientData) {
        console.log('✅ AppSidebar: É dono da empresa, client_type:', clientData.client_type);
        setIsCompanyAdmin(true);
        setClientType(clientData.client_type as "hunting" | "labor_supply");
        
        // Verificar se há mais usuários na empresa
        const { count } = await supabase
          .from("company_users")
          .select("*", { count: "exact", head: true })
          .eq("client_id", clientData.id)
          .eq("is_active", true);
        
        console.log('👥 AppSidebar: company_users count:', count);
        setHasMultipleUsers((count || 0) > 1);
        return;
      }

      // Se não for cliente principal, busca como company_user
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_users")
        .select(`
          role,
          client:client_id (
            id,
            client_type
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      console.log('📊 AppSidebar: companyUserData result:', { companyUserData, companyUserError });

      if (companyUserData) {
        const client = Array.isArray(companyUserData.client) 
          ? companyUserData.client[0] 
          : companyUserData.client;
        
        console.log('👤 AppSidebar: É company_user, role:', companyUserData.role, 'client:', client);
        
        if (companyUserData.role === 'company_admin') {
          setIsCompanyAdmin(true);
        }
        
        if (client) {
          console.log('✅ AppSidebar: Setando client_type:', client.client_type);
          setClientType(client.client_type as "hunting" | "labor_supply");
          
          // Verificar se há mais usuários na empresa
          const { count } = await supabase
            .from("company_users")
            .select("*", { count: "exact", head: true })
            .eq("client_id", client.id)
            .eq("is_active", true);
          
          console.log('👥 AppSidebar: company_users count:', count);
          setHasMultipleUsers((count || 0) > 1);
        }
      }
    };

    checkUserRole();
  }, [user, userType]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Hard redirect to ensure complete session teardown
      window.location.href = '/login';
    }
  }, [signOut]);

  const handleLogoClick = () => {
    if (userType === "admin") {
      navigate('/a');
    } else if (userType === "client") {
      navigate('/c/painel');
    } else {
      navigate('/dashboard');
    }
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => 
      prev.includes(label) 
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const candidateNavigation: NavItem[] = [
    { name: "Assistente IA", href: "/dashboard", icon: Bot },
    { name: "Painel", href: "/painel", icon: LayoutDashboard },
    { name: "Vagas", href: "/jobs", icon: Briefcase },
    { name: "Meu Perfil", href: "/profile", icon: User },
    { name: "Cadastro", href: "/settings", icon: Settings },
  ];

  const adminNavGroups: NavGroup[] = [
    {
      label: "Menu",
      icon: LayoutDashboard,
      items: [
        { name: "Dashboard", href: "/a", icon: MessageSquare },
        { name: "Gestão de Vagas", href: "/a/vagas", icon: Briefcase },
        { name: "Candidatos", href: "/a/profissionais", icon: Users },
        { name: "Configurações", href: "/a/config", icon: Settings },
      ]
    },
    {
      label: "Clientes",
      icon: Building2,
      items: [
        { name: "Lista de Clientes", href: "/a/empresas", icon: Building2 },
        { name: "Solicitações", href: "/a/solicitacoes", icon: Send },
        { name: "Profissionais Validados", href: "/a/validados", icon: Users },
        { name: "KPIs", href: "/a/kpis", icon: BarChart3 },
      ]
    },
    {
      label: "Hunters.IO",
      icon: Bot,
      items: [
        { name: "Central IA", href: "/a/central-ia", icon: Bot },
      ]
    },
  ];

  // Montar navegação do cliente dinamicamente baseado no tipo
  const getClientNavGroups = (): NavGroup[] => {
    console.log('🧭 AppSidebar: getClientNavGroups chamado com:', { 
      clientType, 
      isCompanyAdmin, 
      hasMultipleUsers 
    });

    const menuItems: NavItem[] = [
      { name: "Dashboard", href: "/c/painel", icon: LayoutDashboard },
    ];

    // Solicitações só aparece para labor_supply (fornecimento de mão de obra)
    if (clientType !== "hunting") {
      console.log('➕ AppSidebar: Adicionando Solicitações (clientType != hunting)');
      menuItems.push({ name: "Solicitações", href: "/c/solicitacoes", icon: Send });
    } else {
      console.log('➖ AppSidebar: Removendo Solicitações (clientType === hunting)');
    }

    menuItems.push({ name: "Minhas Vagas", href: "/c/minhas-vagas", icon: Briefcase });
    menuItems.push({ name: "Configurações", href: "/c/config", icon: Settings });

    // Candidatos por Usuário só aparece se:
    // - É admin da empresa
    // - É hunting E tem múltiplos usuários, OU não é hunting
    if (isCompanyAdmin && (clientType !== "hunting" || hasMultipleUsers)) {
      console.log('➕ AppSidebar: Adicionando Candidatos por Usuário');
      menuItems.push({ name: "Candidatos por Usuário", href: "/c/por-usuario", icon: Users });
    }

    console.log('📋 AppSidebar: menuItems final:', menuItems.map(i => i.name));

    return [
      {
        label: "Menu",
        icon: LayoutDashboard,
        items: menuItems
      },
    ];
  };

  const clientNavGroups = getClientNavGroups();

  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

  const renderNavItem = (item: NavItem, isSubItem = false, isDarkMode = false) => {
    const active = isActive(item.href);
    
    if (!open) {
      return (
        <Tooltip key={item.name} delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={item.href}
              className={cn(
                "flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 mx-auto",
                active
                  ? isDarkMode 
                    ? "bg-cyan-500 text-white shadow-md"
                    : "bg-foreground text-background shadow-md"
                  : isDarkMode
                    ? "hover:bg-gray-800 text-gray-400 hover:text-cyan-400"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <NavLink
        key={item.name}
        to={item.href}
        {...prefetchOnHover(item.href)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
          active
            ? isDarkMode
              ? "bg-cyan-500 text-white shadow-md font-medium"
              : "bg-foreground text-background shadow-md font-medium"
            : isDarkMode
              ? "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
              : "hover:bg-muted text-muted-foreground hover:text-foreground",
          isSubItem && "ml-6 text-sm"
        )}
      >
        <item.icon className={cn("h-5 w-5 flex-shrink-0", isSubItem && "h-4 w-4")} />
        <span className="truncate">{item.name}</span>
        {item.badge && (
          <span className={cn(
            "ml-auto px-2 py-0.5 text-xs font-semibold rounded-full",
            active ? "bg-background text-foreground" : "bg-maritime-blue text-white"
          )}>
            {item.badge}
          </span>
        )}
        {active && (
          <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
        )}
      </NavLink>
    );
  };

  const renderNavGroup = (group: NavGroup, isDarkMode = false) => {
    const isExpanded = expandedGroups.includes(group.label);
    const hasActiveItem = group.items.some(item => isActive(item.href));

    if (!open) {
      return (
        <div key={group.label} className="space-y-1">
          {group.items.map(item => renderNavItem(item, false, isDarkMode))}
        </div>
      );
    }

    return (
      <Collapsible
        key={group.label}
        open={isExpanded || hasActiveItem}
        onOpenChange={() => toggleGroup(group.label)}
      >
        <CollapsibleTrigger className={cn(
          "flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-200 group",
          isDarkMode 
            ? "hover:bg-gray-800 text-gray-300" 
            : "hover:bg-muted"
        )}>
          <div className="flex items-center gap-3">
            <group.icon className={cn(
              "h-5 w-5 transition-colors",
              isDarkMode 
                ? "text-gray-400 group-hover:text-cyan-400" 
                : "text-muted-foreground group-hover:text-foreground"
            )} />
            <span className={cn(
              "font-medium text-sm",
              isDarkMode ? "text-gray-200" : "text-foreground"
            )}>{group.label}</span>
          </div>
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isDarkMode ? "text-gray-500" : "text-muted-foreground",
              (isExpanded || hasActiveItem) && "rotate-180"
            )} 
          />
        </CollapsibleTrigger>
        <CollapsibleContent 
          className="space-y-1 mt-1 overflow-hidden"
          forceMount
          style={{
            display: (isExpanded || hasActiveItem) ? 'block' : 'none'
          }}
        >
          {group.items.map(item => renderNavItem(item, true, isDarkMode))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderCandidateNav = () => (
    <div className="space-y-1">
      {candidateNavigation.map(item => renderNavItem(item))}
    </div>
  );

  return (
    <Sidebar className={cn(
      "border-r-0 shadow-lg transition-colors duration-300",
      darkMode && "!bg-[#0d1a2d]"
    )}>
      {/* Header with Logo */}
      <SidebarHeader className={cn(
        "p-4 border-b transition-colors duration-300",
        darkMode ? "border-gray-800/50 bg-[#0d1a2d]" : "border-border/50"
      )}>
        <div 
          className="flex items-center justify-center cursor-pointer" 
          onClick={handleLogoClick}
        >
          {open ? (
            darkMode ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">Hunters<span className="text-cyan-400">.IO</span></span>
              </div>
            ) : (
              <img 
                src="/lovable-uploads/25395886-eba9-4c0a-9c0e-59af5a00eabc.png" 
                alt="Hunters Manpower" 
                className="h-10 w-auto"
              />
            )
          ) : (
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shadow-md",
              darkMode ? "bg-cyan-500" : "bg-foreground"
            )}>
              <img 
                src="/lovable-uploads/78dd61ce-1f0d-4f74-9acd-98bc74f7f023.png" 
                alt="Hunters" 
                className="h-6 w-6"
              />
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className={cn(
        "px-3 py-4 transition-colors duration-300",
        darkMode && "bg-[#0d1a2d]"
      )}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {userType === "admin" && adminNavGroups.map(group => (
                <SidebarMenuItem key={group.label}>
                  {renderNavGroup(group, darkMode)}
                </SidebarMenuItem>
              ))}
              
              {userType === "client" && clientNavGroups.map(group => (
                <SidebarMenuItem key={group.label}>
                  {renderNavGroup(group, darkMode)}
                </SidebarMenuItem>
              ))}
              
              {userType === "candidate" && (
                <SidebarMenuItem>
                  {renderCandidateNav()}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Logout */}
      <SidebarFooter className={cn(
        "p-4 border-t transition-colors duration-300",
        darkMode ? "border-gray-800/50 bg-[#0d1a2d]" : "border-border/50"
      )}>
        {open ? (
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 rounded-xl transition-all",
              darkMode 
                ? "text-gray-400 hover:bg-red-500/20 hover:text-red-400" 
                : "hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                className={cn(
                  "h-10 w-10 rounded-xl mx-auto transition-all",
                  darkMode 
                    ? "text-gray-400 hover:bg-red-500/20 hover:text-red-400" 
                    : "hover:bg-destructive/10 hover:text-destructive"
                )}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Sair
            </TooltipContent>
          </Tooltip>
        )}
      </SidebarFooter>
    </Sidebar>
  );
});
