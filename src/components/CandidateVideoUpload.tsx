import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Video, Upload, Trash2, Loader2, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CandidateVideo {
  id: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  title: string;
  description: string | null;
  created_at: string;
}

interface CandidateVideoUploadProps {
  candidateId: string;
  candidateName?: string;
  onVideoChange?: () => void;
}

export function CandidateVideoUpload({ candidateId, candidateName, onVideoChange }: CandidateVideoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [video, setVideo] = useState<CandidateVideo | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("Apresentação");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchVideo();
  }, [candidateId]);

  const fetchVideo = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('candidate_videos')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar vídeo:', error);
      } else if (data && data.file_path) {
        setVideo(data);
        setTitle(data.title || "Apresentação");
        setDescription(data.description || "");
        
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from('candidate-videos')
          .createSignedUrl(data.file_path, 3600); // 1 hour expiry
        
        if (!signedError && signedUrlData) {
          setVideoUrl(signedUrlData.signedUrl);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar vídeo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Formatos aceitos: MP4, WebM, OGG, MOV, AVI"
      });
      return;
    }

    // Validar tamanho (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 100MB"
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simular progresso (storage não tem callback de progresso)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Gerar nome único para o arquivo
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${candidateId}/${Date.now()}.${fileExt}`;

      // Se já existe vídeo, deletar o anterior
      if (video?.file_path) {
        await supabase.storage
          .from('candidate-videos')
          .remove([video.file_path]);
        
        await (supabase as any)
          .from('candidate_videos')
          .delete()
          .eq('id', video.id);
      }

      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('candidate-videos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(95);

      // Salvar registro no banco
      const { error: dbError } = await (supabase as any)
        .from('candidate_videos')
        .insert({
          candidate_id: candidateId,
          file_path: fileName,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          title: title || "Apresentação",
          description: description || null,
          uploaded_by: user.id,
          is_active: true
        });

      if (dbError) throw dbError;

      setUploadProgress(100);

      toast({
        title: "Sucesso!",
        description: "Vídeo enviado com sucesso"
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await fetchVideo();
      onVideoChange?.();

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error.message || "Erro ao enviar o vídeo"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!video) return;

    setDeleting(true);

    try {
      // Deletar do storage
      if (video.file_path) {
        await supabase.storage
          .from('candidate-videos')
          .remove([video.file_path]);
      }

      // Deletar registro do banco
      await (supabase as any)
        .from('candidate_videos')
        .delete()
        .eq('id', video.id);

      toast({
        title: "Vídeo removido",
        description: "O vídeo foi excluído com sucesso"
      });

      setVideo(null);
      setVideoUrl(null);
      setTitle("Apresentação");
      setDescription("");
      onVideoChange?.();

    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir o vídeo"
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-base font-medium">
            <Video className="h-5 w-5 mr-3 text-muted-foreground" />
            Vídeo de Apresentação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-muted h-48 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-base font-medium">
          <Video className="h-5 w-5 mr-3 text-muted-foreground" />
          Vídeo de Apresentação
          {candidateName && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              - {candidateName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vídeo existente */}
        {video && videoUrl && (
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={videoUrl}
                controls
                className="absolute inset-0 w-full h-full object-contain"
                preload="metadata"
              >
                Seu navegador não suporta a tag de vídeo.
              </video>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium">{video.title}</p>
                <p className="text-muted-foreground text-xs">
                  {video.file_name} • {formatFileSize(video.file_size)}
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover vídeo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O vídeo será excluído permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Upload de novo vídeo */}
        {!video && (
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label htmlFor="video-title">Título</Label>
                <Input
                  id="video-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Apresentação profissional"
                />
              </div>
              
              <div>
                <Label htmlFor="video-description">Descrição (opcional)</Label>
                <Textarea
                  id="video-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do conteúdo do vídeo..."
                  rows={2}
                />
              </div>
            </div>

            <div 
              className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${selectedFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Play className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Enviando... {uploadProgress}%
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Vídeo
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <label htmlFor="video-upload" className="cursor-pointer block">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Clique para selecionar um vídeo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4, WebM, MOV, AVI • Máximo 100MB
                  </p>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Opção de substituir vídeo existente */}
        {video && (
          <div className="pt-2 border-t">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Substituir vídeo atual:</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                onChange={handleFileSelect}
                className="hidden"
                id="video-replace"
              />
              
              {selectedFile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Play className="h-5 w-5 text-primary" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        Enviando... {uploadProgress}%
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Substituir Vídeo
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <label htmlFor="video-replace" className="cursor-pointer">
                  <Button variant="outline" className="w-full" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar novo vídeo
                    </span>
                  </Button>
                </label>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
