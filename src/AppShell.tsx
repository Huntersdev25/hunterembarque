import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SecurityProvider } from "@/components/SecurityProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import { useSessionSecurity } from "@/hooks/useSessionSecurity";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const PublicJobs = lazy(() => import("./pages/PublicJobs"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SecureCreateAdmin = lazy(() => import("./pages/SecureCreateAdmin"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CandidateDashboard = lazy(() => import("./pages/CandidateDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminJobs = lazy(() => import("./pages/AdminJobs"));
const AdminCandidates = lazy(() => import("./pages/AdminCandidates"));
const ProfessionalDetails = lazy(() => import("./pages/ProfessionalDetails"));
const AdminCredentials = lazy(() => import("./pages/AdminCredentials"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminClients = lazy(() => import("./pages/AdminClients"));
const AdminClientDetail = lazy(() => import("./pages/AdminClientDetail"));
const AdminRequests = lazy(() => import("./pages/AdminRequests"));
const AdminValidatedProfessionals = lazy(() => import("./pages/AdminValidatedProfessionals"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientCandidates = lazy(() => import("./pages/ClientCandidates"));
const ClientCandidateView = lazy(() => import("./pages/ClientCandidateView"));
const ClientCandidatesByUser = lazy(() => import("./pages/ClientCandidatesByUser"));
const ClientMyJobs = lazy(() => import("./pages/ClientMyJobs"));
const ClientJobCandidates = lazy(() => import("./pages/ClientJobCandidates"));
const ClientRequests = lazy(() => import("./pages/ClientRequests"));
const ClientSettings = lazy(() => import("./pages/ClientSettings"));
const TIDashboard = lazy(() => import("./pages/TIDashboard"));
const CreateTIUser = lazy(() => import("./pages/CreateTIUser"));
const CreateFirstTIUser = lazy(() => import("./pages/CreateFirstTIUser"));
const TIUsers = lazy(() => import("./pages/TIUsers"));
const TIJobs = lazy(() => import("./pages/TIJobs"));
const TIDatabase = lazy(() => import("./pages/TIDatabase"));
const TILogs = lazy(() => import("./pages/TILogs"));
const TIAnalytics = lazy(() => import("./pages/TIAnalytics"));
const TISettings = lazy(() => import("./pages/TISettings"));
const TIVisibility = lazy(() => import("./pages/TIVisibility"));
const TIWebhooks = lazy(() => import("./pages/TIWebhooks"));
const TIClients = lazy(() => import("./pages/TIClients"));
const TINotifications = lazy(() => import("./pages/TINotifications"));
const TIIntegrations = lazy(() => import("./pages/TIIntegrations"));
const TIPermissions = lazy(() => import("./pages/TIPermissions"));
const CandidateProfile = lazy(() => import("./pages/CandidateProfile"));
const CandidateSettings = lazy(() => import("./pages/CandidateSettings"));
const CandidateApplications = lazy(() => import("./pages/CandidateApplications"));
const CandidateJobs = lazy(() => import("./pages/CandidateJobs"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const BoardingControl = lazy(() => import("./pages/BoardingControl"));
const AdminRequestControl = lazy(() => import("./pages/AdminRequestControl"));
const GestaoOperacional = lazy(() => import("./pages/GestaoOperacional"));
const Medicoes = lazy(() => import("./pages/Medicoes"));
const Rancho = lazy(() => import("./pages/Rancho"));
const AdminTasks = lazy(() => import("./pages/AdminTasks"));
const HuntersIO = lazy(() => import("./pages/HuntersIO"));
const HuntersIOAgentChat = lazy(() => import("./pages/HuntersIOAgentChat"));
const AdminClientKPIs = lazy(() => import("./pages/AdminClientKPIs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">Carregando...</span>
    </div>
  </div>
);

const SessionGuard = ({ children }: { children: React.ReactNode }) => {
  useSessionSecurity();
  return <>{children}</>;
};

export default function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SessionGuard>
            <SecurityProvider>
              <RealtimeProvider>
                <Toaster />
                <Sonner />
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/create-first-ti" element={<CreateFirstTIUser />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/cadastro" element={<ProtectedRoute skipOnboardingGate><Onboarding /></ProtectedRoute>} />
                    <Route path="/candidate" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><CandidateSettings /></ProtectedRoute>} />
                    <Route path="/applications" element={<ProtectedRoute><CandidateApplications /></ProtectedRoute>} />
                    <Route path="/jobs" element={<ProtectedRoute><CandidateJobs /></ProtectedRoute>} />
                    <Route path="/vagas" element={<PublicJobs />} />
                    <Route path="/vagas/:jobId" element={<JobDetails />} />
                    <Route path="/a" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/a/vagas" element={<ProtectedRoute requireAdmin><AdminJobs /></ProtectedRoute>} />
                    <Route path="/a/profissionais" element={<ProtectedRoute requireAdmin><AdminCandidates /></ProtectedRoute>} />
                    <Route path="/a/profissionais/:id" element={<ProtectedRoute requireAdmin><ProfessionalDetails /></ProtectedRoute>} />
                    <Route path="/a/credenciais" element={<ProtectedRoute requireAdmin><AdminCredentials /></ProtectedRoute>} />
                    <Route path="/a/empresas" element={<ProtectedRoute requireAdmin><AdminClients /></ProtectedRoute>} />
                    <Route path="/a/empresas/:clientId" element={<ProtectedRoute requireAdmin><AdminClientDetail /></ProtectedRoute>} />
                    <Route path="/a/solicitacoes" element={<ProtectedRoute requireAdmin><AdminRequests /></ProtectedRoute>} />
                    <Route path="/a/validados" element={<ProtectedRoute requireAdmin><AdminValidatedProfessionals /></ProtectedRoute>} />
                    <Route path="/a/config" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
                    <Route path="/a/embarque" element={<ProtectedRoute requireAdmin><BoardingControl /></ProtectedRoute>} />
                    <Route path="/a/controle" element={<ProtectedRoute requireAdmin><AdminRequestControl /></ProtectedRoute>} />
                    <Route path="/a/operacional" element={<ProtectedRoute requireAdmin><GestaoOperacional /></ProtectedRoute>} />
                    <Route path="/a/medicoes" element={<ProtectedRoute requireAdmin><Medicoes /></ProtectedRoute>} />
                    <Route path="/a/rancho" element={<ProtectedRoute requireAdmin><Rancho /></ProtectedRoute>} />
                    <Route path="/a/tarefas" element={<ProtectedRoute requireAdmin><AdminTasks /></ProtectedRoute>} />
                    <Route path="/a/central-ia" element={<ProtectedRoute requireAdmin><HuntersIO /></ProtectedRoute>} />
                    <Route path="/a/central-ia/chat/:agentId" element={<ProtectedRoute requireAdmin><HuntersIOAgentChat /></ProtectedRoute>} />
                    <Route path="/a/novo-admin" element={<ProtectedRoute requireAdmin><SecureCreateAdmin /></ProtectedRoute>} />
                    <Route path="/a/kpis" element={<ProtectedRoute requireAdmin><AdminClientKPIs /></ProtectedRoute>} />
                    <Route path="/c/painel" element={<ProtectedRoute requireClient><ClientDashboard /></ProtectedRoute>} />
                    <Route path="/c/solicitacoes" element={<ProtectedRoute requireClient><ClientRequests /></ProtectedRoute>} />
                    <Route path="/c/aprovados" element={<ProtectedRoute requireClient><ClientCandidates /></ProtectedRoute>} />
                    <Route path="/c/aprovados/:candidateId" element={<ProtectedRoute requireClient><ClientCandidateView /></ProtectedRoute>} />
                    <Route path="/c/minhas-vagas" element={<ProtectedRoute requireClient><ClientMyJobs /></ProtectedRoute>} />
                    <Route path="/c/minhas-vagas/:jobId" element={<ProtectedRoute requireClient><ClientJobCandidates /></ProtectedRoute>} />
                    <Route path="/c/embarque" element={<ProtectedRoute requireClient><BoardingControl /></ProtectedRoute>} />
                    <Route path="/c/por-usuario" element={<ProtectedRoute requireClient><ClientCandidatesByUser /></ProtectedRoute>} />
                    <Route path="/c/config" element={<ProtectedRoute requireClient><ClientSettings /></ProtectedRoute>} />
                    <Route path="/s/painel" element={<ProtectedRoute requireTI><TIDashboard /></ProtectedRoute>} />
                    <Route path="/s/novo-ti" element={<ProtectedRoute requireTI><CreateTIUser /></ProtectedRoute>} />
                    <Route path="/s/novo-admin" element={<ProtectedRoute requireTI><SecureCreateAdmin /></ProtectedRoute>} />
                    <Route path="/s/usuarios" element={<ProtectedRoute requireTI><TIUsers /></ProtectedRoute>} />
                    <Route path="/s/vagas" element={<ProtectedRoute requireTI><TIJobs /></ProtectedRoute>} />
                    <Route path="/s/banco" element={<ProtectedRoute requireTI><TIDatabase /></ProtectedRoute>} />
                    <Route path="/s/atividades" element={<ProtectedRoute requireTI><TILogs /></ProtectedRoute>} />
                    <Route path="/s/metricas" element={<ProtectedRoute requireTI><TIAnalytics /></ProtectedRoute>} />
                    <Route path="/s/config" element={<ProtectedRoute requireTI><TISettings /></ProtectedRoute>} />
                    <Route path="/s/visibilidade" element={<ProtectedRoute requireTI><TIVisibility /></ProtectedRoute>} />
                    <Route path="/s/hooks" element={<ProtectedRoute requireTI><TIWebhooks /></ProtectedRoute>} />
                    <Route path="/s/empresas" element={<ProtectedRoute requireTI><TIClients /></ProtectedRoute>} />
                    <Route path="/s/alertas" element={<ProtectedRoute requireTI><TINotifications /></ProtectedRoute>} />
                    <Route path="/s/conexoes" element={<ProtectedRoute requireTI><TIIntegrations /></ProtectedRoute>} />
                    <Route path="/s/permissoes" element={<ProtectedRoute requireTI><TIPermissions /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </RealtimeProvider>
            </SecurityProvider>
          </SessionGuard>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}