import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, X, CheckCircle2, Eye } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DocumentType {
  id: string;
  name: string;
  description: string;
  required?: boolean;
}

const DOCUMENT_TYPES: DocumentType[] = [
  { id: 'rg', name: 'RG', description: 'Registro Geral', required: false },
  { id: 'cpf', name: 'CPF', description: 'Cadastro de Pessoa Física', required: false },
  { id: 'passport', name: 'Passaporte', description: 'Documento de viagem internacional' },
  { id: 'driver_license', name: 'CNH', description: 'Carteira Nacional de Habilitação' },
  { id: 'medical_certificate', name: 'Atestado Médico', description: 'Certificado de aptidão física' },
  { id: 'cv', name: 'Currículo', description: 'Curriculum Vitae atualizado' },
  { id: 'references', name: 'Cartas de Referência', description: 'Referências profissionais' },
  { id: 'other', name: 'Outros', description: 'Outros documentos relevantes' }
];

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  userId: string;
  onDocumentsChange?: (documents: UploadedDocument[]) => void;
}

export function DocumentUpload({ userId, onDocumentsChange }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExistingDocuments();
  }, [userId]);

  const loadExistingDocuments = async () => {
    try {
      setLoading(true);
      
      // List files from user's folder in storage
      const { data: files, error } = await supabase.storage
        .from('feed-documents')
        .list(`${userId}/documents`, {
          limit: 100,
          offset: 0
        });

      if (error) throw error;

      if (files) {
        const documentList: UploadedDocument[] = files
          .filter(file => file.name !== '.emptyFolderPlaceholder')
          .map(file => ({
            id: file.id || file.name,
            name: file.name,
            type: getDocumentTypeFromFileName(file.name),
            url: `${userId}/documents/${file.name}`,
            uploadedAt: file.created_at || new Date().toISOString()
          }));

        setDocuments(documentList);
        onDocumentsChange?.(documentList);
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast.error("Erro ao carregar documentos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeFromFileName = (fileName: string): string => {
    const name = fileName.toLowerCase();
    if (name.includes('rg')) return 'rg';
    if (name.includes('cpf')) return 'cpf';
    if (name.includes('passport') || name.includes('passaporte')) return 'passport';
    if (name.includes('cnh') || name.includes('habilitacao')) return 'driver_license';
    if (name.includes('medico') || name.includes('atestado')) return 'medical_certificate';
    if (name.includes('cv') || name.includes('curriculo')) return 'cv';
    if (name.includes('referencia') || name.includes('reference')) return 'references';
    return 'other';
  };

  const getDocumentTypeInfo = (typeId: string): DocumentType => {
    return DOCUMENT_TYPES.find(type => type.id === typeId) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];
  };

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!file) return;

    // Validate file size (20MB max for documents)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 20MB");
      return;
    }

    setUploading(documentType);

    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${documentType}_${timestamp}.${fileExt}`;
      const filePath = `${userId}/documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('feed-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Add to local state
      const newDocument: UploadedDocument = {
        id: `${documentType}_${timestamp}`,
        name: fileName,
        type: documentType,
        url: filePath,
        uploadedAt: new Date().toISOString()
      };

      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      toast.success("Documento enviado com sucesso");

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Erro ao enviar documento: " + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleView = async (document: UploadedDocument) => {
    try {
      // Verificar se o caminho já está formatado corretamente
      let filePath = document.url;
      
      // Remover barras duplicadas ou prefixos inválidos
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }

      console.log('Viewing file at path:', filePath);

      const { data, error } = await supabase.storage
        .from('feed-documents')
        .createSignedUrl(filePath, 3600); // URL válida por 1 hora

      if (error) {
        console.error('Signed URL error:', error);
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error('URL assinada não foi gerada');
      }

      // Abrir em nova aba
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('View error:', error);
      toast.error("Erro ao visualizar arquivo: " + error.message);
    }
  };

  const handleDownload = async (document: UploadedDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('feed-documents')
        .download(document.url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = document.name;
      globalThis.document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      globalThis.document.body.removeChild(link);

      toast.success("Download iniciado");

    } catch (error: any) {
      console.error('Download error:', error);
      toast.error("Erro ao fazer download: " + error.message);
    }
  };

  const handleDelete = async (document: UploadedDocument) => {
    if (!confirm('Tem certeza que deseja remover este documento? Esta ação não pode ser desfeita.')) return;

    try {
      // Verificar se o caminho já está formatado corretamente
      let filePath = document.url;
      
      // Remover barras duplicadas ou prefixos inválidos
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }

      console.log('Deleting file at path:', filePath);

      const { error } = await supabase.storage
        .from('feed-documents')
        .remove([filePath]);

      if (error) {
        console.error('Storage delete error:', error);
        throw error;
      }

      const updatedDocuments = documents.filter(doc => doc.id !== document.id);
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      toast.success("Documento removido com sucesso");

    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error("Erro ao remover documento: " + error.message);
    }
  };

  const getDocumentsByType = (typeId: string): UploadedDocument[] => {
    return documents.filter(doc => doc.type === typeId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>Carregando documentos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Documentos</CardTitle>
        <CardDescription>
          Faça upload e gerencie seus documentos profissionais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {DOCUMENT_TYPES.map((docType) => {
          const userDocs = getDocumentsByType(docType.id);
          const isUploading = uploading === docType.id;

          return (
            <div key={docType.id} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">{docType.name}</Label>
                    {docType.required && (
                      <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                    )}
                    {userDocs.length > 0 && (
                      <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {userDocs.length} arquivo(s)
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{docType.description}</p>
                </div>
              </div>

              {/* Upload area */}
              <div className="space-y-2">
                <Label htmlFor={`file_${docType.id}`}>
                  <Upload className="h-4 w-4 inline mr-1" />
                  Adicionar arquivo (qualquer formato - máx 20MB)
                </Label>
                <Input
                  id={`file_${docType.id}`}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(docType.id, file);
                    }
                  }}
                  disabled={isUploading}
                />
                {isUploading && (
                  <p className="text-sm text-blue-600">Enviando arquivo...</p>
                )}
              </div>

              {/* Existing documents */}
              {userDocs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Arquivos enviados:</Label>
                  {userDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{doc.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(doc)}
                          title="Visualizar arquivo"
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          title="Baixar arquivo"
                          className="h-8 w-8"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                          title="Excluir arquivo"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
