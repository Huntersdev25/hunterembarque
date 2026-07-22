import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/ui/auth-layout";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && userRole) {
      const mustChangePassword = user.user_metadata?.must_change_password === true;
      
      if (mustChangePassword) {
        setShowChangePassword(true);
        return;
      }

      const timer = setTimeout(() => {
        handleRedirect();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, userRole, authLoading, navigate]);

  const handleRedirect = () => {
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    
    if (redirectUrl) {
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl, { replace: true });
    } else if (userRole === 'ti') {
      navigate('/s/painel', { replace: true });
    } else if (userRole === 'admin') {
      navigate('/a', { replace: true });
    } else if (userRole === 'client') {
      navigate('/c/painel', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    toast({
      title: "Senha alterada!",
      description: "Você será redirecionado...",
    });
    setTimeout(() => {
      handleRedirect();
    }, 500);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Acesse sua conta" 
      description="Digite suas credenciais para continuar."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="h-12 bg-white border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
          />
        </div>
        
        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Senha
            </Label>
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Esqueceu a senha?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="h-12 bg-white border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 pr-12 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors group"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Entrando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>Entrar</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          )}
        </Button>

        {/* Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Não possui uma conta?{" "}
            <Link 
              to="/register" 
              onClick={() => {
                const redirectUrl = localStorage.getItem('redirectAfterLogin');
                if (redirectUrl) {
                  localStorage.setItem('redirectAfterRegister', redirectUrl);
                }
              }}
              className="text-slate-900 font-semibold hover:underline underline-offset-2 transition-all"
            >
              Cadastre-se
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="pt-8 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Hunters Manpower. Todos os direitos reservados.
          </p>
        </div>
      </form>

      <ChangePasswordModal 
        open={showChangePassword} 
        onSuccess={handlePasswordChanged} 
      />
      <ForgotPasswordModal
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </AuthLayout>
  );
}
