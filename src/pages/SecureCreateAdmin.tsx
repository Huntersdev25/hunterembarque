import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Shield, AlertTriangle } from 'lucide-react';
import { formatPhoneBR } from '@/lib/phoneFormat';

export default function SecureCreateAdmin() {
  const { user, userRole } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [adminData, setAdminData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const { toast } = useToast();

  // Apenas super admins podem acessar esta página
  if (!user || userRole !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const generateSecurePassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    setAdminData(prev => ({ 
      ...prev, 
      password: password,
      confirmPassword: password 
    }));
  };

  const validateForm = () => {
    if (!adminData.email || !adminData.full_name || !adminData.phone || !adminData.password) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      });
      return false;
    }

    if (adminData.password !== adminData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return false;
    }

    if (adminData.password.length < 12) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 12 caracteres",
        variant: "destructive"
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminData.email)) {
      toast({
        title: "Erro",
        description: "Email inválido",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const createSecureAdmin = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    
    try {
      // Verificar se usuário atual é admin
      const { data: isAdminResult, error: adminCheckError } = await supabase
        .rpc('is_admin', { user_uuid: user.id });

      if (adminCheckError || !isAdminResult) {
        toast({
          title: "Erro",
          description: "Acesso negado. Apenas administradores podem criar novos admins.",
          variant: "destructive"
        });
        return;
      }

      // Criar o usuário usando a função edge
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: {
          email: adminData.email,
          password: adminData.password,
          full_name: adminData.full_name,
          phone: adminData.phone
        }
      });

      if (error) {
        console.error('Erro ao criar admin:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao criar administrador',
          variant: 'destructive'
        });
        return;
      }

      if (!data?.success) {
        toast({
          title: 'Erro',
          description: data?.error || 'Erro ao criar administrador',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Sucesso!',
        description: 'Administrador criado com sucesso!',
        variant: 'default'
      });

      // Limpar formulário
      setAdminData({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" />
            Criar Administrador Seguro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 p-3 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Atenção</p>
              <p className="text-muted-foreground">
                Esta operação será auditada e registrada no sistema.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={adminData.email}
              onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="admin@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              value={adminData.full_name}
              onChange={(e) => setAdminData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Nome do Administrador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={adminData.phone}
              onChange={(e) => setAdminData(prev => ({ ...prev, phone: formatPhoneBR(e.target.value) }))}
              placeholder="+55 11 98765-4321"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSecurePassword}
              >
                Gerar Senha Segura
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              value={adminData.password}
              onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Mínimo 12 caracteres"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={adminData.confirmPassword}
              onChange={(e) => setAdminData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Repita a senha"
            />
          </div>

          <Button 
            onClick={createSecureAdmin}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? 'Criando...' : 'Criar Administrador'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}