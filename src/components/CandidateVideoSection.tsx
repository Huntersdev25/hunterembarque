import { useState, useEffect } from "react";
import { formatDateBR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Lock, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CandidateVideo {
  id: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  title: string;
  description: string | null;
  created_at: string;
}

interface CandidateVideoSectionProps {
  candidateId: string;
  isBlocked?: boolean;
  canDelete?: boolean;
}

export function CandidateVideoSection({ candidateId, isBlocked = false, canDelete = false }: CandidateVideoSectionProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!video) return;
    if (!confirm("Tem certeza que deseja excluir este vídeo do candidato?")) return;
    setDeleting(true);
    try {
      if (video.file_path) {
        await supabase.storage.from('candidate-videos').remove([video.file_path]);
      }
      await (supabase as any).from('candidate_videos').delete().eq('id', video.id);
      toast.success("Vídeo excluído com sucesso");
      setVideo(null);
      setVideoUrl(null);
    } catch (error: any) {
      console.error('Erro ao excluir vídeo:', error);
      toast.error("Erro ao excluir vídeo: " + (error?.message || ""));
    } finally {
      setDeleting(false);
    }
  };

  const [video, setVideo] = useState<CandidateVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

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
        // Generate signed URL (bucket is private)
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownload = async () => {
    if (!video?.file_path) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('candidate-videos')
        .download(video.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = video.file_name || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro no download:', error);
    }
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
        <CardContent className="pt-0">
          <div className="animate-pulse bg-muted h-48 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isBlocked) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-base font-medium">
            <Video className="h-5 w-5 mr-3 text-muted-foreground" />
            Vídeo de Apresentação
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert className="bg-muted/50 border-dashed">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Vídeo de apresentação não disponível para visualização
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!video || !videoUrl) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-base font-medium">
            <Video className="h-5 w-5 mr-3 text-muted-foreground" />
            Vídeo de Apresentação
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum vídeo de apresentação disponível
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-base font-medium">
          <Video className="h-5 w-5 mr-3 text-muted-foreground" />
          {video.title || 'Vídeo de Apresentação'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
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
        
        {video.description && (
          <p className="text-sm text-muted-foreground mt-3">
            {video.description}
          </p>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDateBR(video.created_at)}</span>
            {video.file_size && (
              <>
                <span>•</span>
                <span>{formatFileSize(video.file_size)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleDownload}
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
