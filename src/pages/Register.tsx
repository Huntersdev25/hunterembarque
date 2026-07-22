import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/ui/auth-layout";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { JobFunctionSelector } from "@/components/JobFunctionSelector";
import { formatPhoneBR } from "@/lib/phoneFormat";
import { PasswordRequirements, isPasswordValid } from "@/components/PasswordRequirements";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    desiredFunction: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();

  // Redirecionar usuários já autenticados
  useEffect(() => {
    if (!authLoading && user && userRole) {
      console.log('👤 Usuário já logado, redirecionando...', { userRole });
      
      // Usar setTimeout para evitar conflitos de estado durante a navegação
      const timer = setTimeout(() => {
        const redirectUrl = localStorage.getItem('redirectAfterRegister') || localStorage.getItem('redirectAfterLogin');
        
        if (redirectUrl) {
          localStorage.removeItem('redirectAfterRegister');
          localStorage.removeItem('redirectAfterLogin');
          console.log('🔄 Redirecionando para URL salva:', redirectUrl);
          navigate(redirectUrl, { replace: true });
        } else if (userRole === 'admin') {
          navigate('/a', { replace: true });
        } else if (userRole === 'candidate') {
          // Candidato recém-cadastrado entra direto na trilha de cadastro.
          // O gate da ProtectedRoute redireciona para /cadastro de qualquer forma,
          // mas navegar explicitamente evita um flash do dashboard.
          navigate('/cadastro', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, userRole, authLoading, navigate]);

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-maritime-blue"></div>
    </div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação client-side básica
    if (!formData.fullName || !formData.phone || !formData.email || !formData.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (!isPasswordValid(formData.password)) {
      toast({
        title: "Erro",
        description: "A senha não atende aos requisitos mínimos de segurança.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar se já existe conta com mesmo email ou telefone
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('email, phone, user_id')
        .or(`email.eq.${formData.email},phone.eq.${formData.phone}`);

      if (checkError) {
        console.error('Erro ao verificar perfis existentes:', checkError);
      }

      // Se encontrou perfis existentes, verificar conflitos
      if (existingProfiles && existingProfiles.length > 0) {
        const existingEmail = existingProfiles.find(p => p.email === formData.email);
        const existingPhone = existingProfiles.find(p => p.phone === formData.phone);

        if (existingEmail) {
          toast({
            title: "Email já cadastrado",
            description: "Já existe uma conta com este email. Tente fazer login ou use outro email.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (existingPhone) {
          toast({
            title: "Telefone já cadastrado",
            description: "Já existe uma conta com este número. Tente fazer login ou use outro número.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Prosseguir com o cadastro se não há conflitos
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: 'candidate',
            desired_function: formData.desiredFunction
          }
        }
      });

      if (error) {
        // Tratamento de erros específicos do Supabase Auth
        let errorMessage = "Erro ao criar conta. Tente novamente.";
        
        if (error.message?.includes('User already registered')) {
          errorMessage = "Este email já está cadastrado. Tente fazer login.";
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = "Email inválido. Verifique o formato do email.";
        } else if (error.message?.includes('Password')) {
          errorMessage = "Erro relacionado à senha. Verifique se atende aos critérios.";
        }

        toast({
          title: "Erro no cadastro",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      if (data.user) {
        // Verificar se a função desejada foi salva no perfil e atualizar se necessário
        if (formData.desiredFunction) {
          try {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ desired_function: formData.desiredFunction })
              .eq('user_id', data.user.id);
            
            if (updateError) {
              console.warn('Erro ao atualizar função desejada:', updateError);
            }
          } catch (updateErr) {
            console.warn('Erro inesperado ao atualizar função:', updateErr);
          }
        }

        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Sua conta foi criada. Redirecionando...",
          variant: "default"
        });

        // Não fazer redirecionamento manual - deixar o AuthContext lidar com isso
        // O AuthContext já vai verificar se há redirectAfterRegister no localStorage
      }
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Criar Conta" 
      description="Cadastre-se para acessar oportunidades no setor marítimo"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Seu nome completo"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            className="transition-all duration-300 focus:shadow-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+55 11 98765-4321"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneBR(e.target.value) }))}
            className="transition-all duration-300 focus:shadow-md"
          />
        </div>

        <div className="space-y-2">
          <JobFunctionSelector
            value={formData.desiredFunction}
            onChange={(value) => setFormData(prev => ({ ...prev, desiredFunction: value }))}
            label="Função Desejada"
            placeholder="Selecione sua função profissional"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="transition-all duration-300 focus:shadow-md"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="pr-10 transition-all duration-300 focus:shadow-md"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="transition-all duration-300 focus:shadow-md"
          />
        </div>

        <PasswordRequirements
          password={formData.password}
          confirmPassword={formData.confirmPassword}
          showMatchCheck
        />

        <Button type="submit" variant="maritime" className="w-full" disabled={loading || !isPasswordValid(formData.password) || formData.password !== formData.confirmPassword}>
          <UserPlus className="h-4 w-4 mr-2" />
          {loading ? "Criando conta..." : "Criar Conta"}
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Já possui uma conta?{" "}
            <Link 
              to="/login"
              onClick={() => {
                // Preservar redirecionamento no login também
                const redirectUrl = localStorage.getItem('redirectAfterRegister');
                if (redirectUrl) {
                  localStorage.setItem('redirectAfterLogin', redirectUrl);
                }
              }}
              className="text-maritime-blue hover:underline font-medium"
            >
              Faça login aqui
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}