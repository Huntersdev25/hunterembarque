import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Server, Shield, Loader2, CheckCircle } from 'lucide-react';
import { formatPhoneBR } from '@/lib/phoneFormat';

export default function CreateFirstTIUser() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [tiUsersExist, setTiUsersExist] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    checkExistingTIUsers();
  }, []);

  const checkExistingTIUsers = async () => {
    try {
      const { count, error } = await supabase
        .from('ti_users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Erro ao verificar usuários T.I:', error);
        // Se der erro de permissão, provavelmente já existem usuários
        setTiUsersExist(true);
      } else {
        setTiUsersExist((count || 0) > 0);
      }
    } catch (error) {
      console.error('Erro ao verificar usuários T.I:', error);
      setTiUsersExist(true);
    } finally {
      setIsChecking(false);
    }
  };

  const createFirstTIUser = async () => {
    if (!formData.email || !formData.password || !formData.full_name || !formData.phone) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-first-ti-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Primeiro usuário T.I criado com sucesso! Você pode fazer login agora.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao criar primeiro usuário T.I:', error);
      toast.error(error.message || 'Erro ao criar primeiro usuário T.I');
    } finally {
      setIsCreating(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando configuração do sistema...</p>
        </div>
      </div>
    );
  }

  if (tiUsersExist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle>Sistema já configurado</CardTitle>
              <CardDescription>
                Já existem usuários T.I no sistema. Use o login para acessar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✅ O sistema já possui usuários T.I configurados. Para criar novos usuários T.I, faça login com uma conta T.I existente e acesse a área de gerenciamento de usuários.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Ir para Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <Server className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Criar Primeiro Usuário T.I</CardTitle>
            <CardDescription>
              Configure o primeiro usuário com acesso total ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome completo do usuário"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneBR(e.target.value) })}
                placeholder="+55 11 98765-4321"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                ℹ️ <strong>Importante:</strong> Esta página só pode ser usada para criar o primeiro usuário T.I do sistema. Após isso, use a área administrativa para criar novos usuários.
              </p>
            </div>

            <Button
              onClick={createFirstTIUser}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? 'Criando...' : 'Criar Primeiro Usuário T.I'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
