import { useCallback } from 'react';

// Map of routes to their lazy-loaded modules
const routeModules: Record<string, () => Promise<any>> = {
  // Candidate
  '/candidate': () => import('@/pages/CandidateDashboard'),
  '/dashboard': () => import('@/pages/CandidateDashboard'),
  '/profile': () => import('@/pages/CandidateProfile'),
  '/settings': () => import('@/pages/CandidateSettings'),
  '/applications': () => import('@/pages/CandidateApplications'),
  '/jobs': () => import('@/pages/CandidateJobs'),
  '/vagas': () => import('@/pages/PublicJobs'),

  // Admin
  '/a': () => import('@/pages/AdminDashboard'),
  '/a/vagas': () => import('@/pages/AdminJobs'),
  '/a/profissionais': () => import('@/pages/AdminCandidates'),
  '/a/credenciais': () => import('@/pages/AdminCredentials'),
  '/a/empresas': () => import('@/pages/AdminClients'),
  '/a/solicitacoes': () => import('@/pages/AdminRequests'),
  '/a/validados': () => import('@/pages/AdminValidatedProfessionals'),
  '/a/config': () => import('@/pages/AdminSettings'),
  '/a/embarque': () => import('@/pages/BoardingControl'),
  '/a/controle': () => import('@/pages/AdminRequestControl'),
  '/a/operacional': () => import('@/pages/GestaoOperacional'),
  '/a/medicoes': () => import('@/pages/Medicoes'),
  '/a/rancho': () => import('@/pages/Rancho'),
  '/a/tarefas': () => import('@/pages/AdminTasks'),
  '/a/central-ia': () => import('@/pages/HuntersIO'),
  '/a/kpis': () => import('@/pages/AdminClientKPIs'),

  // Client
  '/c/painel': () => import('@/pages/ClientDashboard'),
  '/c/solicitacoes': () => import('@/pages/ClientRequests'),
  '/c/aprovados': () => import('@/pages/ClientCandidates'),
  '/c/minhas-vagas': () => import('@/pages/ClientMyJobs'),
  '/c/embarque': () => import('@/pages/BoardingControl'),
  '/c/por-usuario': () => import('@/pages/ClientCandidatesByUser'),
  '/c/config': () => import('@/pages/ClientSettings'),

  // TI
  '/s/painel': () => import('@/pages/TIDashboard'),
  '/s/usuarios': () => import('@/pages/TIUsers'),
  '/s/vagas': () => import('@/pages/TIJobs'),
  '/s/banco': () => import('@/pages/TIDatabase'),
  '/s/atividades': () => import('@/pages/TILogs'),
  '/s/metricas': () => import('@/pages/TIAnalytics'),
  '/s/config': () => import('@/pages/TISettings'),
  '/s/visibilidade': () => import('@/pages/TIVisibility'),
  '/s/hooks': () => import('@/pages/TIWebhooks'),
  '/s/empresas': () => import('@/pages/TIClients'),
  '/s/alertas': () => import('@/pages/TINotifications'),
  '/s/conexoes': () => import('@/pages/TIIntegrations'),
  '/s/permissoes': () => import('@/pages/TIPermissions'),
};

// Cache for already prefetched routes
const prefetchedRoutes = new Set<string>();

function schedulePrefetch(href: string) {
  const moduleLoader = routeModules[href];
  if (!moduleLoader) return;
  if (prefetchedRoutes.has(href)) return;
  prefetchedRoutes.add(href);

  const run = () => {
    moduleLoader().catch(() => {
      prefetchedRoutes.delete(href);
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 100);
  }
}

export function usePrefetch() {
  const prefetch = useCallback((href: string) => {
    const normalizedHref = href.split('?')[0].split('#')[0];
    schedulePrefetch(normalizedHref);
  }, []);

  const prefetchOnHover = useCallback((href: string) => {
    return {
      onMouseEnter: () => prefetch(href),
      onFocus: () => prefetch(href),
      onTouchStart: () => prefetch(href),
    };
  }, [prefetch]);

  return { prefetch, prefetchOnHover };
}

// Prefetch agressivo após login: pré-carrega rotas prováveis do papel do usuário em idle
export function prefetchRoleRoutes(role: 'admin' | 'client' | 'candidate' | 'ti' | null) {
  if (!role) return;
  const map: Record<string, string[]> = {
    admin: ['/a', '/a/profissionais', '/a/empresas', '/a/vagas', '/a/solicitacoes'],
    client: ['/c/painel', '/c/aprovados', '/c/minhas-vagas', '/c/solicitacoes'],
    candidate: ['/dashboard', '/profile', '/jobs', '/applications'],
    ti: ['/s/painel', '/s/usuarios', '/s/empresas'],
  };
  (map[role] || []).forEach(schedulePrefetch);
}
