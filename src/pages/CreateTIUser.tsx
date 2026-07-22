import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Server, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPhoneBR } from '@/lib/phoneFormat';

export default function CreateTIUser() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: ''
  });

  if (userRole !== 'ti') {
    navigate('/login');
    return null;
  }

  const generateSecurePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password, confirmPassword: password }));
    toast.success('Senha gerada com sucesso!');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.full_name || !formData.phone) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor, insira um email válido');
      return false;
    }

    if (formData.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const createTIUser = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      const { data: isTIUser, error: verifyError } = await supabase.rpc('is_ti', {
        user_uuid: user?.id
      });

      if (verifyError || !isTIUser) {
        toast.error('Acesso negado. Apenas usuários T.I podem criar outros usuários T.I.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-ti-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone,
          created_by: user?.id
        }
      });

      if (error) throw error;

      toast.success('Usuário T.I criado com sucesso!');
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: ''
      });
      navigate('/s/painel');
    } catch (error: any) {
      console.error('Erro ao criar usuário T.I:', error);
      toast.error(error.message || 'Erro ao criar usuário T.I');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/s/painel">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              <CardTitle>Criar Novo Usuário T.I</CardTitle>
            </div>
            <CardDescription>
              Crie um novo usuário com acesso total ao sistema
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Repita a senha"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={generateSecurePassword}
              className="w-full"
            >
              Gerar Senha Segura
            </Button>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                ⚠️ <strong>Atenção:</strong> Esta operação será registrada no log de auditoria do sistema.
              </p>
            </div>

            <Button
              onClick={createTIUser}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? 'Criando...' : 'Criar Usuário T.I'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
