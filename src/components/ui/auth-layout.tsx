import { ReactNode } from "react";
import offshorePlatform from "@/assets/offshore-platform-modern.jpg";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-20 xl:px-28 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-12">
            <img 
              src="/lovable-uploads/25395886-eba9-4c0a-9c0e-59af5a00eabc.png" 
              alt="Hunters Manpower" 
              className="h-10 w-auto"
            />
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-semibold text-slate-900 mb-3 tracking-tight">
              {title}
            </h1>
            <p className="text-slate-500 text-base">
              {description}
            </p>
          </div>

          {/* Form */}
          {children}
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-900">
        {/* Image */}
        <img 
          src={offshorePlatform}
          alt="Offshore Operations" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-blue-900/40" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-16">
          {/* Top - Tagline */}
          <div />
          
          {/* Bottom - Info */}
          <div className="space-y-6">
            <div className="w-12 h-1 bg-blue-500 rounded-full" />
            <h2 className="text-3xl xl:text-4xl font-semibold text-white leading-tight max-w-md">
              Conectando talentos às melhores oportunidades offshore
            </h2>
            <p className="text-slate-300 text-base max-w-md leading-relaxed">
              Plataforma líder em recrutamento e gestão de profissionais para o setor marítimo brasileiro.
            </p>
            
            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <div className="text-2xl font-semibold text-white">500+</div>
                <div className="text-sm text-slate-400">Profissionais</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">50+</div>
                <div className="text-sm text-slate-400">Empresas</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">10+</div>
                <div className="text-sm text-slate-400">Anos</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
