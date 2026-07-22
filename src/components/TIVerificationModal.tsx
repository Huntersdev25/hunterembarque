import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, RefreshCw, Loader2 } from "lucide-react";

interface TIVerificationModalProps {
  open: boolean;
  userId: string;
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TIVerificationModal = ({ 
  open, 
  userId, 
  email, 
  onSuccess, 
  onCancel 
}: TIVerificationModalProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Por favor, digite o código de 6 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-ti-verification-code', {
        body: { userId, code },
        headers: { 'Content-Type': 'application/json' }
      });

      // Add query param for action
      const response = await fetch(
        `https://augeppwihhzibvhzibxe.supabase.co/functions/v1/send-ti-verification-code?action=verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ userId, code }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Código inválido');
      }

      toast({
        title: "Verificação concluída!",
        description: "Acesso liberado ao painel administrativo.",
      });
      
      // Store verification in session
      sessionStorage.setItem(`ti_verified_${userId}`, 'true');
      onSuccess();
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Erro na verificação",
        description: error.message || "Código inválido ou expirado.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch(
        `https://augeppwihhzibvhzibxe.supabase.co/functions/v1/send-ti-verification-code?action=send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ userId, email }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao reenviar código');
      }

      toast({
        title: "Código reenviado!",
        description: "Verifique sua caixa de entrada.",
      });
      setCountdown(60);
      setCode("");
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: "Erro ao reenviar",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    onCancel();
  };

  // Mask email for display
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-white border-slate-200" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Verificação de Segurança
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Acesso administrativo TI requer autenticação em duas etapas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Mail className="w-5 h-5 text-slate-500" />
            <div className="text-sm">
              <p className="text-slate-500">Código enviado para:</p>
              <p className="font-medium text-slate-900">{maskedEmail}</p>
            </div>
          </div>

          {/* OTP Input */}
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              value={code}
              onChange={setCode}
              maxLength={6}
              disabled={loading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-xl font-semibold border-slate-300" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl font-semibold border-slate-300" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl font-semibold border-slate-300" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl font-semibold border-slate-300" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl font-semibold border-slate-300" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl font-semibold border-slate-300" />
              </InputOTPGroup>
            </InputOTP>

            <p className="text-xs text-slate-500">
              O código expira em 10 minutos
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar e Acessar"
              )}
            </Button>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resending || countdown > 0}
                className="text-slate-600 hover:text-slate-900"
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
