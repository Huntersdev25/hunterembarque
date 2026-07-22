import { useEffect, useState } from 'react';
import { Anchor } from 'lucide-react';

interface HuntersIOSplashProps {
  onComplete: () => void;
}

export function HuntersIOSplash({ onComplete }: HuntersIOSplashProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    // Trigger fade out and complete
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 bg-[#0a1628] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated Background Grid */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Floating tech elements */}
        <div className="absolute inset-0">
          {/* Animated circles */}
          <div className="absolute top-[15%] left-[10%] w-24 h-24 border border-cyan-500/30 rounded-full animate-pulse" />
          <div className="absolute top-[20%] left-[12%] w-16 h-16 border border-cyan-400/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          
          <div className="absolute bottom-[25%] right-[15%] w-32 h-32 border border-blue-500/20 rounded-full animate-pulse" style={{ animationDuration: '2.5s' }} />
          <div className="absolute bottom-[30%] right-[18%] w-20 h-20 border border-cyan-400/30 rounded-full animate-ping" style={{ animationDuration: '4s' }} />

          {/* Geometric shapes */}
          <div className="absolute top-[40%] left-[5%] w-8 h-8 border border-cyan-500/40 rotate-45 animate-pulse" />
          <div className="absolute bottom-[15%] left-[20%] w-6 h-6 border border-blue-400/30 rotate-45 animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="absolute top-[60%] right-[8%] w-10 h-10 border border-cyan-400/30 rotate-45 animate-pulse" style={{ animationDuration: '3s' }} />

          {/* Tech text overlays */}
          <span className="absolute top-[8%] left-[8%] text-cyan-500/20 text-xs font-mono tracking-widest">HUNTERS_SYS</span>
          <span className="absolute top-[12%] right-[12%] text-blue-400/20 text-xs font-mono tracking-widest">OFFSHORE_01</span>
          <span className="absolute bottom-[18%] left-[15%] text-cyan-400/15 text-xs font-mono tracking-widest">MARITIME</span>
          <span className="absolute top-[35%] right-[5%] text-blue-500/20 text-xs font-mono tracking-widest">IA_CORE</span>
          <span className="absolute bottom-[35%] left-[3%] text-cyan-500/15 text-xs font-mono tracking-widest">AUTOMATION</span>
          <span className="absolute top-[70%] right-[20%] text-blue-400/15 text-xs font-mono tracking-widest">STREAM_02</span>
          <span className="absolute bottom-[8%] right-[8%] text-cyan-400/20 text-xs font-mono tracking-widest">NODE_ACTIVE</span>
          <span className="absolute top-[25%] left-[40%] text-blue-500/10 text-xs font-mono tracking-widest">INIT_SEQUENCE</span>

          {/* Connecting lines */}
          <svg className="absolute inset-0 w-full h-full">
            <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="rgba(34, 211, 238, 0.1)" strokeWidth="1" />
            <line x1="70%" y1="15%" x2="85%" y2="35%" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" />
            <line x1="15%" y1="70%" x2="35%" y2="85%" stroke="rgba(34, 211, 238, 0.1)" strokeWidth="1" />
            <line x1="65%" y1="75%" x2="90%" y2="60%" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" />
            <line x1="50%" y1="10%" x2="50%" y2="30%" stroke="rgba(34, 211, 238, 0.08)" strokeWidth="1" />
            <line x1="45%" y1="80%" x2="55%" y2="95%" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1" />
          </svg>

          {/* Glowing dots */}
          <div className="absolute top-[30%] left-[25%] w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" />
          <div className="absolute top-[50%] right-[30%] w-1 h-1 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50" style={{ animationDuration: '1.5s' }} />
          <div className="absolute bottom-[40%] left-[40%] w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-lg shadow-cyan-500/50" style={{ animationDuration: '2s' }} />
          <div className="absolute top-[65%] left-[15%] w-1 h-1 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50" />
          <div className="absolute bottom-[25%] right-[35%] w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" style={{ animationDuration: '2.5s' }} />
        </div>

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-[#0a1628]/50 to-[#0a1628]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-6">
        {/* Logo/Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full scale-150 animate-pulse" />
            <div className="relative p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 backdrop-blur-sm">
              <Anchor className="h-12 w-12 text-cyan-400" />
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-3 tracking-tight animate-fade-in">
          <span className="text-cyan-400">HUNTERS</span>
          <span className="text-white">.IO</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Central de Inteligência Artificial para Operações Marítimas
        </p>

        {/* Loading indicator */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-sm font-mono tracking-wider">INICIALIZANDO SISTEMA</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-64 sm:w-80 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-2 font-mono">{progress}%</p>
        </div>
      </div>
    </div>
  );
}