import { useState } from "react";
import { StepShell } from "@/components/onboarding/StepShell";
import type { StepComponentProps } from "@/components/onboarding/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle2, X, Loader2, Upload } from "lucide-react";

export function StepDocuments({ progress, userId, onNext, onBack, onSaveAndExit }: StepComponentProps) {
  const { profile, saving } = progress;
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [cvPath, setCvPath] = useState<string | null>(profile?.cv_file_path ?? null);
  const [cvName, setCvName] = useState<string | null>(profile?.cv_file_name ?? null);

  const handleCvUpload = async (file: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast({ variant: "destructive", title: "Formato inválido", description: "Envie PDF, JPG ou PNG." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo grande", description: "Máximo de 5MB." });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/cv_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("feed-documents").upload(path, file);
      if (error) throw error;
      if (cvPath) await supabase.storage.from("feed-documents").remove([cvPath]);
      await progress.saveProfilePatch({ cv_file_path: path, cv_file_name: file.name });
      setCvPath(path);
      setCvName(file.name);
      toast({ title: "Currículo anexado", description: file.name });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: err?.message || "Tente novamente." });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCv = async () => {
    if (cvPath) {
      try {
        await supabase.storage.from("feed-documents").remove([cvPath]);
      } catch {
        /* ignore */
      }
    }
    await progress.saveProfilePatch({ cv_file_path: null, cv_file_name: null });
    setCvPath(null);
    setCvName(null);
  };

  const handleNext = () => {
    if (!cvPath) {
      toast({ variant: "destructive", title: "Currículo obrigatório", description: "Anexe seu currículo para continuar." });
      return;
    }
    onNext();
  };

  return (
    <StepShell
      title="Documentos"
      description="Currículo é obrigatório. Foto e vídeo aumentam suas chances."
      icon={<FileText className="h-6 w-6" />}
      onNext={handleNext}
      onBack={onBack}
      onSaveAndExit={onSaveAndExit}
      saving={saving}
    >
      <div className="space-y-6">
        {/* Currículo */}
        <div className="rounded-xl border p-4 space-y-3">
          <Label className="text-sm font-semibold">Currículo (CV) *</Label>
          {cvPath ? (
            <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-sm text-foreground flex-1 truncate">{cvName || "Currículo anexado"}</span>
              <Button type="button" size="sm" variant="ghost" onClick={handleRemoveCv} className="h-8 text-destructive hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCvUpload(f);
                  e.target.value = "";
                }}
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Upload className="h-3 w-3" /> PDF, JPG ou PNG — máx 5MB.
          </p>
        </div>

        {/* Foto de perfil (opcional) */}
        <div className="rounded-xl border p-4 space-y-3">
          <div>
            <Label className="text-sm font-semibold">Foto de perfil <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <p className="text-xs text-muted-foreground">Perfis com foto recebem mais atenção — mas você pode adicionar depois.</p>
          </div>
          <AvatarUpload userId={userId} currentAvatarUrl={profile?.avatar_url ?? undefined} size="md" />
        </div>
      </div>
    </StepShell>
  );
}
