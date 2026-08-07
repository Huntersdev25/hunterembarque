/**
 * Rosto da Hunters.IO — avatar oficial da copiloto.
 *
 * A arte original (public/hunters-io.jpg) é um retrato 1:1 com o rosto na
 * metade superior, então o recorte circular aplica zoom + deslocamento para
 * enquadrar cabeça e capacete. Se a imagem não carregar, cai num ícone.
 */
import { useState } from "react";
import { Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

export const HUNTERS_FACE_SRC = "/hunters-io.jpg";

interface HuntersFaceProps {
  /** Classes de tamanho/borda do círculo (ex.: "h-9 w-9 border border-white/20"). */
  className?: string;
  /** Classes do ícone usado como fallback. */
  iconClass?: string;
}

export function HuntersFace({ className, iconClass }: HuntersFaceProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-maritime-blue",
          className,
        )}
      >
        <Anchor className={iconClass} />
      </span>
    );
  }

  return (
    <span className={cn("relative inline-block shrink-0 overflow-hidden rounded-full bg-[#0d2a38]", className)}>
      <img
        src={HUNTERS_FACE_SRC}
        alt="Hunters.IO"
        loading="lazy"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full translate-x-[5%] translate-y-[17%] scale-[1.35] object-cover"
      />
    </span>
  );
}
