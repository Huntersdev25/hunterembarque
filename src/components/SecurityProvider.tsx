import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityContextType {
  reportSecurityIssue: (issue: string) => void;
}

const SecurityContext = createContext<SecurityContextType>({
  reportSecurityIssue: () => {},
});

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  const { user } = useAuth();

  // Implementar CSP via JavaScript como fallback
  useEffect(() => {
    // Adicionar headers de segurança básicos via meta tags
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;";
    document.head.appendChild(cspMeta);

    // Detectar e bloquear tentativas de XSS
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (originalInnerHTML) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value: string) {
          if (typeof value === 'string' && /<script|javascript:|on\w+=/i.test(value)) {
            console.warn('🚨 Tentativa de XSS detectada e bloqueada');
            return;
          }
          if (originalInnerHTML.set) {
            originalInnerHTML.set.call(this, value);
          }
        },
        get: originalInnerHTML.get,
        configurable: true,
        enumerable: true
      });
    }

    return () => {
      document.head.removeChild(cspMeta);
      if (originalInnerHTML) {
        Object.defineProperty(Element.prototype, 'innerHTML', originalInnerHTML);
      }
    };
  }, []);

  const reportSecurityIssue = (issue: string) => {
    console.warn('🚨 Problema de segurança reportado:', issue);
    
    // Em produção, isso deveria enviar para um sistema de monitoramento
    if (user) {
      fetch('/api/security-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          issue,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Silently fail - não queremos quebrar a aplicação
      });
    }
  };

  const value = {
    reportSecurityIssue,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};