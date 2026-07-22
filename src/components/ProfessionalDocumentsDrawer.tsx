import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Download, X, Eye, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizeStorageFileName } from "@/lib/storageFileName";

interface StorageFile {
  id: string;
  name: string;
  path: string;
  size?: string;
  created_at?: string;
}

interface ProfessionalDocumentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidateUserId: string;
  candidateName: string;
}

export function ProfessionalDocumentsDrawer({
  isOpen,
  onClose,
  candidateUserId,
  candidateName,
}: ProfessionalDocumentsDrawerProps) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen && candidateUserId) {
      void loadFiles();
    }
  }, [isOpen, candidateUserId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("feed-documents")
        .list(candidateUserId);

      if (error) throw error;

      const formatted = (data || [])
        .filter((f) => !!f.id)
        .map((f) => ({
          id: f.id || f.name,
          name: f.name,
          path: `${candidateUserId}/${f.name}`,
          size: f.metadata?.size
            ? `${(f.metadata.size / 1024 / 1024).toFixed(1)} MB`
            : undefined,
          created_at: f.updated_at || f.created_at,
        }));
      setFiles(formatted);
    } catch (error: any) {
      console.error("Error loading files:", error);
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 20MB");
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const safeFileName = sanitizeStorageFileName(file.name);
      const fileName = `${timestamp}_${safeFileName}`;
      const filePath = `${candidateUserId}/${fileName}`;

      const { error } = await supabase.storage
        .from("feed-documents")
        .upload(filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (error) throw error;

      toast.success("Documento anexado com sucesso");
      await loadFiles();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao anexar documento: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: StorageFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("feed-documents")
        .createSignedUrl(doc.path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("URL não gerada");

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast.error("Erro ao visualizar: " + error.message);
    }
  };

  const handleDownload = async (doc: StorageFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("feed-documents")
        .download(doc.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = globalThis.document.createElement("a");
      link.href = url;
      link.download = doc.name;
      globalThis.document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      globalThis.document.body.removeChild(link);
    } catch (error: any) {
      toast.error("Erro ao baixar: " + error.message);
    }
  };

  const handleDelete = async (doc: StorageFile) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      const { error } = await supabase.storage
        .from("feed-documents")
        .remove([doc.path]);

      if (error) throw error;

      toast.success("Documento excluído");
      setFiles((prev) => prev.filter((f) => f.id !== doc.id));
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Documentos do Profissional
          </SheetTitle>
          <SheetDescription>{candidateName}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>
              <Upload className="mr-1 inline h-4 w-4" />
              Anexar documento (máx 20MB)
            </Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.zip,.rar,.7z,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
                input.value = "";
              }}
              disabled={uploading}
            />
            {uploading && (
              <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              ) : files.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum documento anexado ainda.
                </p>
              ) : (
                files.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.name}</p>
                        {doc.size && (
                          <p className="text-xs text-muted-foreground">{doc.size}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleView(doc)} title="Visualizar" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Baixar" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Excluir" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
