import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, X, Eye, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CandidateDocument {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  notes: string | null;
  created_at: string;
}

interface CandidateDocumentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientCandidateId: string;
  candidateName: string;
}

export function CandidateDocumentsDrawer({
  isOpen,
  onClose,
  clientCandidateId,
  candidateName,
}: CandidateDocumentsDrawerProps) {
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen && clientCandidateId) {
      loadDocuments();
    }
  }, [isOpen, clientCandidateId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("client_candidate_documents")
        .select("*")
        .eq("client_candidate_id", clientCandidateId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error loading documents:", error);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const fileName = `cc_${clientCandidateId}_${timestamp}.${fileExt}`;
      const filePath = `client-candidates/${clientCandidateId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("feed-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("client_candidate_documents")
        .insert({
          client_candidate_id: clientCandidateId,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          document_type: "other",
        });

      if (dbError) throw dbError;

      toast.success("Documento anexado com sucesso");
      loadDocuments();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao anexar documento: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: CandidateDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("feed-documents")
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("URL não gerada");

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast.error("Erro ao visualizar: " + error.message);
    }
  };

  const handleDownload = async (doc: CandidateDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("feed-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = globalThis.document.createElement("a");
      link.href = url;
      link.download = doc.file_name;
      globalThis.document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      globalThis.document.body.removeChild(link);
    } catch (error: any) {
      toast.error("Erro ao baixar: " + error.message);
    }
  };

  const handleDelete = async (doc: CandidateDocument) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      // Delete from storage
      await supabase.storage.from("feed-documents").remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase
        .from("client_candidate_documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;

      toast.success("Documento excluído");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
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
            Documentos do Candidato
          </SheetTitle>
          <SheetDescription>{candidateName}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Upload */}
          <div className="space-y-2">
            <Label>
              <Upload className="h-4 w-4 inline mr-1" />
              Anexar documento (máx 20MB)
            </Label>
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              disabled={uploading}
            />
            {uploading && (
              <p className="text-sm text-blue-600">Enviando arquivo...</p>
            )}
          </div>

          {/* Documents list */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum documento anexado ainda.
                </p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(doc)}
                        title="Visualizar"
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        title="Baixar"
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc)}
                        title="Excluir"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
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
