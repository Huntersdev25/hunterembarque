import { TILayout } from "@/components/ti/TILayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import {
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Mail,
  Lock,
  RefreshCw,
  Save,
  Server
} from "lucide-react";

export default function TISettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    maintenanceMode: false,
    debugMode: false,
    autoBackup: true,
    twoFactorAuth: false,
    sessionTimeout: "30",
    maxLoginAttempts: "5"
  });

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <TILayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">Gerencie as configurações globais da plataforma</p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notificações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>Configure como os alertas são enviados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por E-mail</Label>
                  <p className="text-xs text-muted-foreground">Receber alertas importantes por e-mail</p>
                </div>
                <Switch 
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, emailNotifications: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Push</Label>
                  <p className="text-xs text-muted-foreground">Receber notificações no navegador</p>
                </div>
                <Switch 
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, pushNotifications: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>Configurações de segurança do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação em Dois Fatores</Label>
                  <p className="text-xs text-muted-foreground">Exigir 2FA para todos os admins</p>
                </div>
                <Switch 
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, twoFactorAuth: checked }))}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Timeout de Sessão (minutos)</Label>
                <Input 
                  type="number" 
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de Tentativas de Login</Label>
                <Input 
                  type="number" 
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings(s => ({ ...s, maxLoginAttempts: e.target.value }))}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Sistema
              </CardTitle>
              <CardDescription>Configurações gerais do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    Modo de Manutenção
                    {settings.maintenanceMode && <Badge variant="destructive">Ativo</Badge>}
                  </Label>
                  <p className="text-xs text-muted-foreground">Bloquear acesso de usuários comuns</p>
                </div>
                <Switch 
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, maintenanceMode: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo de Debug</Label>
                  <p className="text-xs text-muted-foreground">Habilitar logs detalhados</p>
                </div>
                <Switch 
                  checked={settings.debugMode}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, debugMode: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Banco de Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Banco de Dados
              </CardTitle>
              <CardDescription>Configurações de backup e manutenção</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Backup Automático</Label>
                  <p className="text-xs text-muted-foreground">Realizar backups diários</p>
                </div>
                <Switch 
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, autoBackup: checked }))}
                />
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Executar Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Versão</p>
                <p className="font-medium">v2.0.0</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ambiente</p>
                <Badge variant="secondary">Produção</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Região</p>
                <p className="font-medium">América do Sul</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Última Atualização</p>
                <p className="font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TILayout>
  );
}
