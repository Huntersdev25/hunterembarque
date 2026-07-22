/**
 * SurrealJobCard - Card de vaga com design elegante e efeitos visuais
 * Usa cores do design system para consistência visual
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Anchor, 
  Send, 
  Eye, 
  CheckCircle2,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Job {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  function_name: string;
  created_at: string;
  cover_image_url?: string;
  required_certifications_list: string[];
}

interface SurrealJobCardProps {
  job: Job;
  applied?: boolean;
  onApply: (jobId: string) => void;
  isApplying?: boolean;
  profileId?: string;
  disabled?: boolean;
  index?: number;
}

export function SurrealJobCard({ 
  job, 
  applied = false, 
  onApply, 
  isApplying = false,
  profileId,
  disabled = false,
  index = 0 
}: SurrealJobCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow Effect on Hover */}
      <div 
        className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500`}
      />
      
      {/* Main Card */}
      <div 
        className={`relative overflow-hidden rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm shadow-lg transition-all duration-300 ${isHovered ? 'transform -translate-y-1 shadow-xl border-primary/30' : ''}`}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              {/* Function Badge */}
              <div className="flex items-center gap-2 mb-3">
                <Badge 
                  variant="secondary"
                  className="bg-primary/10 text-primary border border-primary/20 px-3 py-1"
                >
                  <Anchor className="h-3 w-3 mr-1.5" />
                  {job.function_name}
                </Badge>
                {applied && (
                  <Badge className="bg-success/15 text-success border border-success/25">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aplicado
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {job.title}
              </h3>
            </div>

          </div>

          {/* Description - mostra exatamente o que o admin digitou */}
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed whitespace-pre-wrap">
            {job.description}
          </p>

          {/* Certifications Preview */}
          {job.required_certifications_list && job.required_certifications_list.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {job.required_certifications_list.slice(0, 3).map((cert, idx) => (
                <span 
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                >
                  {cert.toUpperCase()}
                </span>
              ))}
              {job.required_certifications_list.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  +{job.required_certifications_list.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border mb-4" />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(job.created_at), "dd MMM", { locale: ptBR })}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/vagas/${job.id}`)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                Detalhes
              </Button>
              
              {!applied && (
                <Button
                  size="sm"
                  onClick={() => onApply(job.id)}
                  disabled={isApplying || disabled}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {isApplying ? 'Enviando...' : 'Cadastrar'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
