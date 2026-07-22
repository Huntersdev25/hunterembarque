import { Bot, GraduationCap, Anchor, Package, Cog, Play, ChevronRight, ChevronLeft, Settings, Upload, X, Activity, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect, useCallback } from "react";
import { HuntersIOSplash } from "./HuntersIOSplash";
import huntersIOHero from "@/assets/hunters-io-hero-new.jpg";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

// Import card images
import professorAiImg from "@/assets/ai-cards/professor-ai.jpg";
import aimbarcadoraImg from "@/assets/ai-cards/aimbarcadora.jpg";
import iassistenteCamaraImg from "@/assets/ai-cards/iassistente-camara.jpg";
import iassistenteLogisticaImg from "@/assets/ai-cards/iassistente-logistica.jpg";
import iassistenteOperacoesImg from "@/assets/ai-cards/iassistente-operacoes.jpg";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultImage: string;
}

const defaultAgents: AIAgent[] = [
  {
    id: "professor-ai",
    name: "ProfessorAI",
    description: "Treinamento e capacitação inteligente para equipes marítimas",
    icon: GraduationCap,
    color: "text-blue-400",
    defaultImage: professorAiImg
  },
  {
    id: "aimbarcadora",
    name: "AImbarcadora",
    description: "Gestão inteligente de embarques e rotações 28/28",
    icon: Anchor,
    color: "text-cyan-400",
    defaultImage: aimbarcadoraImg
  },
  {
    id: "iassistente-camara",
    name: "IAssistente de Câmara",
    description: "Suporte completo para serviços de câmara e hotelaria",
    icon: Bot,
    color: "text-purple-400",
    defaultImage: iassistenteCamaraImg
  },
  {
    id: "iassistente-logistica",
    name: "IAssistente de Logística",
    description: "Otimização de processos logísticos offshore",
    icon: Package,
    color: "text-orange-400",
    defaultImage: iassistenteLogisticaImg
  },
  {
    id: "iassistente-operacoes",
    name: "IAssistente de Operações",
    description: "Gestão completa de operações marítimas e offshore",
    icon: Cog,
    color: "text-emerald-400",
    defaultImage: iassistenteOperacoesImg
  }
];

import { useNavigate } from "react-router-dom";

export function HuntersIOTab() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [agents] = useState(defaultAgents);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
  const [webhookInput, setWebhookInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Embla Carousel with autoplay and loop
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: "start",
      dragFree: false,
      containScroll: "trimSnaps",
      slidesToScroll: 1
    },
    [Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }) as any]
  );

  // Update selected index on scroll
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollToIndex = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Load custom images and webhook URLs from Supabase
  useEffect(() => {
    const loadCovers = async () => {
      const { data, error } = await supabase
        .from('agent_covers')
        .select('agent_id, cover_url');
      
      if (!error && data) {
        const images: Record<string, string> = {};
        data.forEach((item: any) => {
          images[item.agent_id] = item.cover_url;
        });
        setCustomImages(images);
      }

      // Webhook URLs loaded separately (admin-only via RLS)
      const { data: webhookData } = await supabase
        .from('agent_covers')
        .select('agent_id, webhook_url')
        .not('webhook_url', 'is', null);
      
      if (webhookData) {
        const webhooks: Record<string, string> = {};
        webhookData.forEach((item: any) => {
          if (item.webhook_url) {
            webhooks[item.agent_id] = item.webhook_url;
          }
        });
        setWebhookUrls(webhooks);
      }
    };
    loadCovers();
  }, []);

  const handleOpenChat = (agent: AIAgent) => {
    navigate(`/a/central-ia/chat/${agent.id}`);
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
    setTimeout(() => setContentVisible(true), 100);
  };

  const handleOpenConfig = (agent: AIAgent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAgent(agent);
    setWebhookInput(webhookUrls[agent.id] || "");
    setConfigOpen(true);
  };

  const handleSaveWebhook = async () => {
    if (!selectedAgent) return;

    setSavingWebhook(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('agent_covers')
        .select('id')
        .eq('agent_id', selectedAgent.id)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('agent_covers')
          .update({ 
            webhook_url: webhookInput || null,
            updated_by: (await supabase.auth.getUser()).data.user?.id 
          })
          .eq('agent_id', selectedAgent.id);
        
        if (error) throw error;
      } else {
        // Insert new record with just webhook
        const { error } = await supabase
          .from('agent_covers')
          .insert({
            agent_id: selectedAgent.id,
            cover_url: selectedAgent.defaultImage,
            webhook_url: webhookInput || null,
            updated_by: (await supabase.auth.getUser()).data.user?.id
          });
        
        if (error) throw error;
      }

      setWebhookUrls(prev => ({
        ...prev,
        [selectedAgent.id]: webhookInput
      }));

      toast.success("Webhook salvo com sucesso!");
    } catch (error: any) {
      console.error("Save webhook error:", error);
      toast.error("Erro ao salvar webhook: " + error.message);
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAgent) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedAgent.id}-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('agent-covers')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('agent-covers')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('agent_covers')
        .upsert({
          agent_id: selectedAgent.id,
          cover_url: publicUrl,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        }, { onConflict: 'agent_id' });

      if (dbError) throw dbError;

      setCustomImages(prev => ({
        ...prev,
        [selectedAgent.id]: publicUrl
      }));

      toast.success("Imagem atualizada com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeCustomImage = async () => {
    if (!selectedAgent) return;

    setUploading(true);
    try {
      // Delete from database
      const { error } = await supabase
        .from('agent_covers')
        .delete()
        .eq('agent_id', selectedAgent.id);

      if (error) throw error;

      setCustomImages(prev => {
        const newImages = { ...prev };
        delete newImages[selectedAgent.id];
        return newImages;
      });

      toast.success("Imagem removida!");
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getAgentImage = (agent: AIAgent) => {
    return customImages[agent.id] || agent.defaultImage;
  };

  if (showSplash) {
    return <HuntersIOSplash onComplete={handleSplashComplete} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-4 md:p-0 bg-[#0a1628] min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Hero Section - Same pattern as AdminDashboard header */}
      <div className={`relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-700 ${
        contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {/* Hero image container */}
        <div className="relative w-full h-[180px] sm:h-[220px] md:h-[280px] lg:h-[320px]">
          <img 
            src={huntersIOHero} 
            alt="Hunters.IO Hero" 
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/95 via-[#0a1628]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-[#0a1628]/30" />
        </div>
        
        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-6 md:p-8">
          <div className={`mb-2 transition-all duration-500 delay-100 ${
            contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] sm:text-xs">
              <Anchor className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              Ferramentas Internas
            </Badge>
          </div>

          <h1 className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 tracking-tight leading-tight transition-all duration-500 delay-200 ${
            contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}>
            Central de <span className="text-cyan-400">Assistentes IA</span>
          </h1>
          
          <p className={`text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4 max-w-xs sm:max-w-md transition-all duration-500 delay-300 ${
            contentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}>
            Acesse os assistentes de IA da Hunters para otimizar seu trabalho diário.
          </p>

          <div className={`flex flex-wrap gap-2 transition-all duration-500 delay-400 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Button 
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-xs sm:text-sm"
            >
              <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 fill-current" />
              Iniciar Assistente
            </Button>
            <Button 
              size="sm"
              variant="outline" 
              className="border-gray-600 text-white hover:bg-white/10 font-semibold text-xs sm:text-sm bg-gray-800/50"
            >
              Documentação
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Agents Gallery - Carousel */}
      <div className={`transition-all duration-700 delay-300 ${
        contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white">
              Assistentes Disponíveis
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={scrollPrev}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-gray-700"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={scrollNext}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-gray-700"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden -mx-3 sm:-mx-4 md:mx-0" ref={emblaRef}>
          <div className="flex touch-pan-y px-3 sm:px-4 md:px-0">
            {agents.map((agent, index) => (
              <div 
                key={agent.id} 
                className="flex-[0_0_65%] sm:flex-[0_0_45%] md:flex-[0_0_32%] lg:flex-[0_0_23%] pr-3 sm:pr-4 min-w-0"
              >
                <AgentCard 
                  agent={agent} 
                  image={getAgentImage(agent)}
                  onConfig={(e) => handleOpenConfig(agent, e)}
                  onClick={() => handleOpenChat(agent)}
                  animationDelay={index * 100}
                  visible={contentVisible}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-1 mt-3 justify-center">
          {agents.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === selectedIndex ? 'w-5 sm:w-6 bg-cyan-500' : 'w-1.5 bg-gray-700 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Charts Section - Matching AdminDashboard exactly */}
      <div className={`space-y-3 sm:space-y-4 transition-all duration-700 delay-500 ${
        contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        
        {/* Produtividade Semanal - Full width card like AdminDashboard */}
        <Card className="bg-[#0f1d32] border-gray-800/50 rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                <h4 className="text-sm sm:text-base font-semibold text-white">Produtividade Semanal</h4>
              </div>
              <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                {(["1S", "2S", "1M", "3M"] as const).map((period, idx) => (
                  <button
                    key={period}
                    className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                      idx === 2
                        ? "bg-cyan-500 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[200px] sm:h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={[
                    { day: 'Seg', tasks: 45, automated: 32 },
                    { day: 'Ter', tasks: 52, automated: 38 },
                    { day: 'Qua', tasks: 48, automated: 42 },
                    { day: 'Qui', tasks: 61, automated: 55 },
                    { day: 'Sex', tasks: 55, automated: 48 },
                    { day: 'Sáb', tasks: 32, automated: 28 },
                    { day: 'Dom', tasks: 18, automated: 15 }
                  ]} 
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAutomated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => value}
                  />
                  <Area type="monotone" dataKey="tasks" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTasks)" />
                  <Area type="monotone" dataKey="automated" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAutomated)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-xs sm:text-sm text-gray-400">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs sm:text-sm text-gray-400">Automatizadas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eficiência IA - Full width card */}
        <Card className="bg-[#0f1d32] border-gray-800/50 rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3">
              <h4 className="text-sm sm:text-base font-semibold text-white">Eficiência IA</h4>
              <p className="text-xs text-gray-500">Performance por assistente</p>
            </div>
            <div className="h-[140px] sm:h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="55%" 
                  innerRadius="35%" 
                  outerRadius="85%" 
                  barSize={8} 
                  data={[
                    { name: 'Operações', value: 95, fill: '#10b981' },
                    { name: 'Logística', value: 88, fill: '#f97316' },
                    { name: 'Câmara', value: 92, fill: '#a855f7' },
                    { name: 'Embarque', value: 97, fill: '#06b6d4' },
                    { name: 'Professor', value: 85, fill: '#3b82f6' }
                  ]}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar background dataKey="value" cornerRadius={4} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center">
                <p className="text-base sm:text-lg font-bold text-cyan-400">97%</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Embarque</p>
              </div>
              <div className="text-center">
                <p className="text-base sm:text-lg font-bold text-emerald-400">95%</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Operações</p>
              </div>
              <div className="text-center">
                <p className="text-base sm:text-lg font-bold text-purple-400">92%</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Câmara</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uso por Departamento - Full width card */}
        <Card className="bg-[#0f1d32] border-gray-800/50 rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3">
              <h4 className="text-sm sm:text-base font-semibold text-white">Uso por Departamento</h4>
              <p className="text-xs text-gray-500">Interações este mês</p>
            </div>
            <div className="h-[140px] sm:h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[
                    { dept: 'Operações', value: 245, fill: '#06b6d4' },
                    { dept: 'Logística', value: 189, fill: '#10b981' },
                    { dept: 'RH', value: 156, fill: '#a855f7' },
                    { dept: 'Financeiro', value: 98, fill: '#f97316' }
                  ]} 
                  layout="vertical" 
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis type="category" dataKey="dept" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={65} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tempo de Resposta - Full width card */}
        <Card className="bg-[#0f1d32] border-gray-800/50 rounded-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-white">Tempo de Resposta</h4>
                <p className="text-xs text-gray-500">Média em segundos por hora</p>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs w-fit">
                Média: 1.2s
              </Badge>
            </div>
            <div className="h-[140px] sm:h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={[
                    { hour: '08h', time: 1.2 },
                    { hour: '10h', time: 0.9 },
                    { hour: '12h', time: 1.8 },
                    { hour: '14h', time: 1.4 },
                    { hour: '16h', time: 1.1 },
                    { hour: '18h', time: 0.8 },
                    { hour: '20h', time: 0.6 }
                  ]} 
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 2]} />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="url(#lineGradient)" 
                    strokeWidth={2}
                    dot={{ fill: '#0f1d32', stroke: '#06b6d4', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#06b6d4', stroke: '#0f1d32', strokeWidth: 2, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="bg-[#1a2744] border-gray-700 text-white w-[calc(100%-2rem)] max-w-md mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
              Configurar {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs sm:text-sm">
              Personalize a imagem de capa e configure o webhook do n8n
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            {/* Current/Preview image */}
            <div className="relative aspect-[3/4] w-full max-w-[180px] sm:max-w-[200px] mx-auto rounded-xl overflow-hidden border border-gray-700">
              <img 
                src={selectedAgent ? getAgentImage(selectedAgent) : ''} 
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {selectedAgent && customImages[selectedAgent.id] && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8"
                  onClick={removeCustomImage}
                  disabled={uploading}
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>

            {/* Upload button */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs sm:text-sm">Nova imagem de capa</Label>
              <div 
                className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400 mx-auto mb-1 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 mx-auto mb-1" />
                )}
                <p className="text-xs text-gray-400">
                  {uploading ? "Fazendo upload..." : "Clique para fazer upload"}
                </p>
                <p className="text-[10px] text-gray-500">PNG, JPG até 5MB</p>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs sm:text-sm">URL do Webhook n8n</Label>
              <Input
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://n8n.example.com/webhook/..."
                className="bg-[#0f1d32] border-gray-600 text-white placeholder-gray-500 focus:border-cyan-500 text-sm h-10"
              />
              <p className="text-[10px] sm:text-xs text-gray-500">
                Cole a URL do webhook do n8n que irá processar as mensagens deste agente
              </p>
              <Button 
                onClick={handleSaveWebhook}
                disabled={savingWebhook}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 sm:h-11 min-h-[44px]"
              >
                {savingWebhook ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Salvar Webhook
              </Button>
            </div>

            <Button 
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 h-10 sm:h-11 min-h-[44px]"
              onClick={() => setConfigOpen(false)}
              disabled={uploading || savingWebhook}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentCard({ 
  agent, 
  image,
  onConfig,
  onClick,
  animationDelay,
  visible
}: { 
  agent: AIAgent; 
  image: string;
  onConfig: (e: React.MouseEvent) => void;
  onClick: () => void;
  animationDelay: number;
  visible: boolean;
}) {
  const Icon = agent.icon;
  
  return (
    <Card 
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer group
        w-full aspect-[3/4]
        bg-[#0f1d32] border-gray-800 hover:border-cyan-500/50 transition-all duration-300
        active:scale-[0.98] sm:hover:scale-[1.02] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${400 + animationDelay}ms` }}
    >
      <CardContent className="p-0 h-full flex flex-col relative">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={image} 
            alt={agent.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/50 to-transparent" />
        </div>

        {/* Config Button */}
        <button
          onClick={onConfig}
          className="absolute top-2 right-2 z-20 p-1.5 sm:p-2 bg-black/50 rounded-lg backdrop-blur-sm 
            sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-black/70"
        >
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
        </button>

        {/* Icon Badge */}
        <div className="absolute top-2 left-2 z-10">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-gray-700/50">
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${agent.color}`} />
          </div>
        </div>

        {/* Play Button */}
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-500 
            flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all
            hover:bg-cyan-500/40 active:scale-95 sm:hover:scale-110">
            <Play className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 fill-cyan-400 ml-0.5" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-2.5 sm:p-3 md:p-4">
          <h3 className="text-xs sm:text-sm md:text-base font-bold text-white leading-tight mb-0.5 truncate">
            {agent.name}
          </h3>
          
          <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-2">
            {agent.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
