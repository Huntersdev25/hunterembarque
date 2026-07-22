import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Save, Database, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhoneBR } from "@/lib/phoneFormat";

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfileData({
        full_name: data.full_name || "",
        email: data.email || "",
        phone: data.phone || ""
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados do perfil"
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualizar email no Auth se mudou
      if (profileData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email
        });

        if (emailError) throw emailError;
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso"
      });
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso"
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao alterar senha"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOrphanedData = async () => {
    if (!confirm("Tem certeza que deseja limpar dados órfãos? Esta ação removerá todos os dados sem usuário válido.")) {
      return;
    }

    setCleanupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-data');

      if (error) {
        console.error('❌ Erro na limpeza:', error);
        throw new Error(error.message || 'Erro ao executar limpeza');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao executar limpeza');
      }

      toast({
        title: "Limpeza Concluída",
        description: `Removidos: ${data.result.cleaned_profiles} perfis, ${data.result.cleaned_certifications} certificações, ${data.result.cleaned_applications} candidaturas`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('❌ Erro na limpeza:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao executar limpeza de dados"
      });
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-maritime-blue">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais e configurações da conta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações do Perfil */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="+55 11 98765-4321"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: formatPhoneBR(e.target.value) })}
                    required
                  />
                </div>

                <Button type="submit" variant="maritime" disabled={loading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova Senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" variant="maritime" disabled={loading} className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  {loading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Manutenção do Banco de Dados */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Manutenção do Banco de Dados
            </CardTitle>
            <CardDescription>
              Ferramentas para limpeza e manutenção dos dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleCleanupOrphanedData}
              disabled={cleanupLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {cleanupLoading ? "Limpando..." : "Limpar Dados Órfãos"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Remove dados de perfis, certificações e candidaturas que não possuem usuário válido no sistema de autenticação.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}