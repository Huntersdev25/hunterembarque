import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireClient?: boolean;
  requireTI?: boolean;
  /**
   * A própria rota da trilha de cadastro passa isto para não ser
   * redirecionada para si mesma (evita loop infinito).
   */
  skipOnboardingGate?: boolean;
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-maritime-blue"></div>
  </div>
);

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireClient = false,
  requireTI = false,
  skipOnboardingGate = false,
}: ProtectedRouteProps) => {
  const { user, userRole, profileComplete, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se requer role específica mas ainda não temos role definido, aguardar
  if ((requireAdmin || requireClient || requireTI) && userRole === null) {
    return <Spinner />;
  }

  if (requireTI && userRole !== 'ti') {
    if (userRole === 'admin') {
      return <Navigate to="/a" replace />;
    }
    if (userRole === 'client') {
      return <Navigate to="/c/painel" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && userRole !== 'admin' && userRole !== 'ti') {
    if (userRole === 'client') {
      return <Navigate to="/c/painel" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (requireClient && userRole !== 'client' && userRole !== 'admin' && userRole !== 'ti') {
    return <Navigate to="/dashboard" replace />;
  }

  // Gate da trilha de cadastro: candidato com perfil incompleto é
  // levado à trilha e permanece bloqueado no resto do sistema.
  if (!skipOnboardingGate && userRole === 'candidate') {
    if (profileComplete === null) {
      return <Spinner />; // aguardando status do perfil
    }
    if (profileComplete === false) {
      return <Navigate to="/cadastro" replace />;
    }
  }

  return <>{children}</>;
};
