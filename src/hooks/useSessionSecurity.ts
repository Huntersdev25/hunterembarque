import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Hook that monitors user activity and forces logout after prolonged inactivity.
 * Also cleans up sensitive data on session end.
 */
export function useSessionSecurity() {
  const { user, signOut } = useAuth();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleIdleLogout = useCallback(async () => {
    if (!user) return;
    console.warn('⏰ Sessão expirada por inatividade. Fazendo logout...');
    
    // Clear all sensitive local data
    cleanupSessionData();
    
    await signOut();
    window.location.href = '/login';
  }, [user, signOut]);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    if (user) {
      idleTimerRef.current = setTimeout(handleIdleLogout, IDLE_TIMEOUT_MS);
    }
  }, [user, handleIdleLogout]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    // Start the idle timer
    resetIdleTimer();

    const onActivity = () => resetIdleTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [user, resetIdleTimer]);

  // Listen for auth state changes to clean up on logout/token errors
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          cleanupSessionData();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cross-tab session sync: if user logs out in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes('supabase') && e.key.includes('auth') && e.newValue === null) {
        console.warn('🔒 Sessão encerrada em outra aba. Redirecionando...');
        cleanupSessionData();
        window.location.href = '/login';
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}

/**
 * Removes all sensitive data from local/session storage on logout.
 */
function cleanupSessionData() {
  // Remove app-specific cached data
  const keysToRemove = ['redirectAfterLogin', 'redirectAfterRegister'];
  keysToRemove.forEach(k => localStorage.removeItem(k));
  
  // Clear sessionStorage entirely
  sessionStorage.clear();
}
