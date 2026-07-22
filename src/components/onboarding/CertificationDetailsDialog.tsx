import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { STCWRules } from "@/components/STCWRules";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { maskDateBR, parseBRDate, isValidityExpired, type CertificationMeta, type CertFieldState } from "@/lib/onboarding";
import { Upload, CheckCircle2, X, Loader2, AlertCircle } from "lucide-react";

interface CertificationDetailsDialogProps {
  cert: CertificationMeta | null;
  fields?: CertFieldState;
  stcwRules?: any;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFieldChange: (patch: Partial<CertFieldState>) => void;
  onStcwChange?: (rules: any) => void;
}

export function CertificationDetailsDialog({
  cert,
  fields,
  stcwRules,
  userId,
  open,
  onOpenChange,
  onFieldChange,
  onStcwChange,
}: CertificationDetailsDialogProps) {
  const [uploading, setUploading] = useState(false);

  if (!cert || !fields) return null;

  const validityExpired = !fields.indeterminate && isValidityExpired(fields.validityDate);
  const issueD = parseBRDate(fields.issueDate);
  const validityD = parseBRDate(fields.validityDate);
  const validityBeforeIssue = !fields.indeterminate && !!issueD && !!validityD && validityD < issueD;

  const okIssue = fields.issueDate.length === 10 && !!issueD;
  const okValidity = fields.indeterminate || (fields.validityDate.length === 10 && !!validityD);
  const okFile = Boolean(fields.filePath);
  const canFinish = okIssue && okValidity && okFile && !validityExpired && !validityBeforeIssue;

  const handleFileUpload = async (file: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Apenas PDF, JPG ou PNG são aceitos.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${cert.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("feed-documents").upload(path, file);
      if (error) throw error;
      if (fields.filePath) await supabase.storage.from("feed-documents").remove([fields.filePath]);
      onFieldChange({ filePath: path, fileName: file.name });
      toast.success(`Documento de ${cert.name} anexado.`);
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error("Erro ao enviar documento: " + (err?.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async () => {
    if (!fields.filePath) return;
    try {
      await supabase.storage.from("feed-documents").remove([fields.filePath]);
    } catch {
      /* ignore */
    }
    onFieldChange({ filePath: null, fileName: null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-maritime-blue px-2 py-0.5 text-xs font-bold text-white">
              {cert.name}
            </span>
          </DialogTitle>
          <DialogDescription className="text-left">{cert.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Níveis DP */}
          {cert.hasDP && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <Label className="text-sm font-medium">Níveis de DP</Label>
              <div className="flex flex-wrap gap-4">
                {([
                  ["dpBasico", "Básico"],
                  ["dpAvancado", "Avançado"],
                  ["dpIlimitado", "Ilimitado"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(fields as any)[key]}
                      onCheckedChange={(c) => onFieldChange({ [key]: Boolean(c) } as any)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Regras STCW */}
          {cert.hasSTCW && onStcwChange && <STCWRules rules={stcwRules ?? {}} onChange={onStcwChange} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Data de emissão *</Label>
              <Input
                value={fields.issueDate}
                onChange={(e) => onFieldChange({ issueDate: maskDateBR(e.target.value) })}
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Validade {fields.indeterminate ? "" : "*"}</Label>
              <Input
                value={fields.validityDate}
                onChange={(e) => onFieldChange({ validityDate: maskDateBR(e.target.value) })}
                placeholder={fields.indeterminate ? "Indeterminada" : "DD/MM/AAAA"}
                inputMode="numeric"
                maxLength={10}
                disabled={fields.indeterminate}
                aria-invalid={validityExpired || validityBeforeIssue}
                className={validityExpired || validityBeforeIssue ? "border-destructive focus-visible:ring-destructive" : undefined}
              />
            </div>
          </div>

          {validityExpired && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Certificação vencida — a validade já passou.
            </p>
          )}
          {!validityExpired && validityBeforeIssue && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> A validade não pode ser anterior à emissão.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={fields.indeterminate}
              onCheckedChange={(c) => onFieldChange({ indeterminate: Boolean(c), validityDate: c ? "" : fields.validityDate })}
            />
            Validade indeterminada
          </label>

          {/* Upload */}
          <div className="space-y-1.5">
            <Label className="text-sm">Documento (PDF, JPG, PNG — máx 5MB) *</Label>
            {fields.filePath ? (
              <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="text-sm text-foreground flex-1 truncate">{fields.fileName || "Documento anexado"}</span>
                <Button type="button" size="sm" variant="ghost" onClick={handleRemoveFile} className="h-8 text-destructive hover:text-destructive">
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
                    if (f) handleFileUpload(f);
                    e.target.value = "";
                  }}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
              </div>
            )}
            {!fields.filePath && !uploading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" /> Anexe o certificado para comprovar.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={!canFinish}
            className={cn("w-full sm:w-auto")}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
