import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { prefetchRoleRoutes } from '@/hooks/usePrefetch';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'candidate' | 'client' | 'ti' | null;
  /** Se o perfil do candidato já concluiu a trilha de cadastro. null = ainda desconhecido. */
  profileComplete: boolean | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Recarrega o status de conclusão do perfil (usado ao final da trilha). */
  refreshProfileStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userRole: null,
  profileComplete: null,
  loading: true,
  signOut: async () => {},
  refreshProfileStatus: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'candidate' | 'client' | 'ti' | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Busca o status de conclusão do perfil do candidato.
   * Para perfis inexistentes (admin/TI/client sem row) assume-se "completo"
   * para que o gate da trilha nunca bloqueie esses papéis.
   */
  const fetchProfileComplete = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_complete')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Erro ao buscar profile_complete:', error);
        setProfileComplete(true); // fail-open: não prender o usuário por erro de leitura
        return;
      }

      // Sem row de perfil (papéis não-candidato) → não aplicar gate
      setProfileComplete(data ? Boolean(data.profile_complete) : true);
    } catch (err) {
      console.error('❌ Erro inesperado ao buscar profile_complete:', err);
      setProfileComplete(true);
    }
  };

  const refreshProfileStatus = async () => {
    if (user?.id) {
      await fetchProfileComplete(user.id);
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      // SECURITY: Always fetch role from server via RPC — never trust client-side cache
      console.log('🔍 Buscando role para user_id:', userId);
      
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { user_uuid: userId });

      console.log('📊 Role query result:', { roleData, roleError });

      if (!roleError && roleData) {
        console.log('✅ Role determinado:', roleData);
        setUserRole(roleData);
        setLoading(false);
        prefetchRoleRoutes(roleData);
        fetchProfileComplete(userId);
        return;
      }

      console.log('⚠️ Erro ao determinar role, definindo como candidato');
      setUserRole('candidate');
      setLoading(false);
      prefetchRoleRoutes('candidate');
      fetchProfileComplete(userId);
    } catch (error) {
      console.error('❌ Error fetching user role:', error);
      setUserRole('candidate');
      setLoading(false);
      fetchProfileComplete(userId);
    }
  };

  const signOut = async () => {
    // Clear state first to prevent any authenticated actions during logout
    setUser(null);
    setSession(null);
    setUserRole(null);
    setProfileComplete(null);
    sessionStorage.clear();

    try {
      // Try local signout first (always works), then attempt global
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setProfileComplete(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('🔄 Fetching role for existing session...');
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    userRole,
    profileComplete,
    loading,
    signOut,
    refreshProfileStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};