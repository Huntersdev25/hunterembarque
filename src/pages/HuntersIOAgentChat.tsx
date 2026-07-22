import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, MessageSquare, Zap, FileText, Loader2, Bot, GraduationCap, Anchor, Package, Cog, Menu, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAgent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const agents: Record<string, AIAgent> = {
  "professor-ai": {
    id: "professor-ai",
    name: "ProfessorAI",
    description: "Treinamento e capacitação inteligente para equipes marítimas",
    icon: GraduationCap,
    color: "text-blue-400"
  },
  "aimbarcadora": {
    id: "aimbarcadora",
    name: "AImbarcadora",
    description: "Gestão inteligente de embarques e rotações 28/28",
    icon: Anchor,
    color: "text-cyan-400"
  },
  "iassistente-camara": {
    id: "iassistente-camara",
    name: "IAssistente de Câmara",
    description: "Suporte completo para serviços de câmara e hotelaria",
    icon: Bot,
    color: "text-purple-400"
  },
  "iassistente-logistica": {
    id: "iassistente-logistica",
    name: "IAssistente de Logística",
    description: "Otimização de processos logísticos offshore",
    icon: Package,
    color: "text-orange-400"
  },
  "iassistente-operacoes": {
    id: "iassistente-operacoes",
    name: "IAssistente de Operações",
    description: "Gestão completa de operações marítimas e offshore",
    icon: Cog,
    color: "text-emerald-400"
  }
};

const suggestionsByAgent: Record<string, { icon: React.ElementType; text: string }[]> = {
  "professor-ai": [
    { icon: FileText, text: "Criar plano de treinamento para novos marítimos" },
    { icon: Zap, text: "Gerar quiz sobre normas STCW" },
    { icon: MessageSquare, text: "Explicar procedimentos de segurança" }
  ],
  "aimbarcadora": [
    { icon: FileText, text: "Organizar escala de embarque 28/28" },
    { icon: Zap, text: "Otimizar rotação de equipe offshore" },
    { icon: MessageSquare, text: "Planejar logística de embarque" }
  ],
  "iassistente-camara": [
    { icon: FileText, text: "Criar checklist de limpeza de cabines" },
    { icon: Zap, text: "Otimizar gestão de suprimentos" },
    { icon: MessageSquare, text: "Planejar serviço de hotelaria" }
  ],
  "iassistente-logistica": [
    { icon: FileText, text: "Rastrear carga em trânsito" },
    { icon: Zap, text: "Otimizar rota de entregas" },
    { icon: MessageSquare, text: "Gerar relatório de inventário" }
  ],
  "iassistente-operacoes": [
    { icon: FileText, text: "Criar relatório de operações diárias" },
    { icon: Zap, text: "Analisar KPIs de produção" },
    { icon: MessageSquare, text: "Planejar manutenção preventiva" }
  ]
};

export default function HuntersIOAgentChatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agent = agentId ? agents[agentId] : null;

  useEffect(() => {
    if (!agent) {
      navigate("/a/central-ia");
    }
  }, [agent, navigate]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!agent) return null;

  const Icon = agent.icon;
  const suggestions = suggestionsByAgent[agent.id] || suggestionsByAgent["professor-ai"];

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the edge function - webhook URL and userId are fetched server-side
      const { data, error } = await supabase.functions.invoke('n8n-chat', {
        body: {
          message: content.trim(),
          agentId: agent.id,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao chamar a função');
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || data.message || data.output || data.text || JSON.stringify(data),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);

      const detailsFromFn =
        error?.context?.body?.n8n_body ||
        error?.context?.body?.error ||
        error?.context?.body ||
        null;

      const detailsText = detailsFromFn
        ? `\n\nDetalhes do n8n:\n${typeof detailsFromFn === 'string' ? detailsFromFn : JSON.stringify(detailsFromFn, null, 2)}`
        : "";

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Erro ao enviar mensagem: ${error.message}\n\nVerifique se o webhook está funcionando corretamente.${detailsText}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Erro ao enviar mensagem para o agente");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-[#060d19]">
        <AppSidebar userType="admin" darkMode />
        
        <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
          {/* Animated background effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
            
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
                                 linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
              }} />
            </div>

            {/* Floating particles */}
            <div className="absolute top-20 left-[20%] w-1 h-1 bg-cyan-400/40 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute top-40 right-[30%] w-1.5 h-1.5 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: "4s", animationDelay: "1s" }} />
            <div className="absolute bottom-40 left-[40%] w-1 h-1 bg-purple-400/30 rounded-full animate-ping" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }} />
          </div>

          {/* Header */}
          <header className="relative z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-800/50 bg-[#0a1628]/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/a/central-ia")}
                className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 shadow-lg shadow-cyan-500/5`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${agent.color}`} />
                </div>
                <div>
                  <h1 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">
                    {agent.name}
                    <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-medium bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                      BETA
                    </span>
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">{agent.description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-400 font-medium hidden sm:inline">Online</span>
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <ScrollArea className="flex-1 relative z-10">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
              {messages.length === 0 ? (
                /* Welcome state */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center py-12">
                  {/* Agent avatar */}
                  <div className="relative mb-8">
                    <div className="relative">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 flex items-center justify-center shadow-2xl shadow-cyan-500/10`}>
                        <Icon className={`h-10 w-10 sm:h-12 sm:w-12 ${agent.color}`} />
                      </div>
                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${agent.color.replace('text-', 'from-')}/20 to-transparent blur-xl opacity-50`} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[#060d19] flex items-center justify-center shadow-lg">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Olá! 👋
                  </h2>
                  <p className="text-gray-400 mb-10 max-w-lg text-sm sm:text-base">
                    Sou o <span className={`font-semibold ${agent.color}`}>{agent.name}</span>. Como posso ajudar você hoje?
                  </p>

                  {/* Suggestion cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl">
                    {suggestions.map((suggestion, index) => {
                      const SuggIcon = suggestion.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(suggestion.text)}
                          className="group p-4 sm:p-5 bg-[#0a1628]/80 border border-gray-800/50 rounded-2xl text-left 
                            hover:border-cyan-500/30 hover:bg-[#0f1d32] transition-all duration-300
                            hover:shadow-lg hover:shadow-cyan-500/5 hover:scale-[1.02]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 
                            flex items-center justify-center mb-4 group-hover:from-cyan-500/20 group-hover:to-cyan-500/10 transition-all">
                            <SuggIcon className="h-5 w-5 text-cyan-400" />
                          </div>
                          <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                            {suggestion.text}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Messages */
                <div className="space-y-6 py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] p-4 sm:p-5 rounded-2xl ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-br-md shadow-lg shadow-cyan-500/20"
                            : "bg-[#0f1d32] border border-gray-800/50 text-gray-200 rounded-bl-md"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-gray-800/50">
                              <Icon className={`h-4 w-4 ${agent.color}`} />
                            </div>
                            <span className="text-xs font-medium text-gray-400">{agent.name}</span>
                          </div>
                        )}
                        <p className="text-sm sm:text-base leading-relaxed">{message.content}</p>
                        <p className={`text-[10px] sm:text-xs mt-3 ${
                          message.role === "user" ? "text-cyan-200/70" : "text-gray-500"
                        }`}>
                          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#0f1d32] border border-gray-800/50 text-gray-200 p-4 sm:p-5 rounded-2xl rounded-bl-md">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-sm text-gray-400">Pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="relative z-10 p-4 sm:p-6 border-t border-gray-800/50 bg-[#0a1628]/80 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte qualquer coisa..."
                    className="w-full bg-[#0f1d32] border border-gray-700/50 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-white placeholder-gray-500 
                      resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all 
                      min-h-[52px] sm:min-h-[60px] max-h-[160px]"
                    rows={1}
                  />
                </div>
                <Button
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-2xl 
                    h-[52px] sm:h-[60px] w-[52px] sm:w-[60px] disabled:opacity-50 disabled:cursor-not-allowed 
                    shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600 text-center mt-4">
                {agent.name} pode apresentar erros. Verifique informações importantes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
