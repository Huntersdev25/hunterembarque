import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  onAvatarChange?: (url: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({ 
  userId, 
  currentAvatarUrl, 
  onAvatarChange,
  size = 'lg'
}: AvatarUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [uploading, setUploading] = useState(false);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24', 
    lg: 'h-32 w-32'
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro", 
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('feed-media').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('feed-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('feed-media')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl } as any)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      onAvatarChange?.(publicUrl);

      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada com sucesso!",
      });

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      // Remove from storage if exists
      if (avatarUrl) {
        const filePath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('feed-media').remove([filePath]);
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null } as any)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(null);
      onAvatarChange?.(null);

      toast({
        title: "Sucesso", 
        description: "Foto de perfil removida com sucesso!",
      });

    } catch (error: any) {
      console.error('Erro ao remover avatar:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover a foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
    // Reset input value
    event.target.value = '';
  };

  const getUserInitials = (fullName?: string) => {
    if (!fullName) return 'U';
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return fullName[0].toUpperCase();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], "border-4 border-background shadow-lg")}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-maritime-blue text-white text-lg font-semibold">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Enviando...' : avatarUrl ? 'Alterar' : 'Adicionar'}
        </Button>

        {avatarUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeAvatar}
            disabled={uploading}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
            Remover
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB.
      </p>
    </div>
  );
}