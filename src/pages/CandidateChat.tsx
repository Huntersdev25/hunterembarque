/**
 * CandidateChat — a landing do profissional é um assistente de IA.
 *
 * Visual idêntico ao chat do admin (AdminAIChat): header maritime-blue,
 * avatares Bot/User, balão branco do assistente e balão azul do usuário,
 * fundo bg-muted/30 e input com botão maritime-blue.
 *
 * Reaproveita a edge function `profile-chat` (streaming SSE) e as mesmas
 * queries do dashboard clássico, que continua acessível em /painel.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Send, User, LayoutDashboard, Loader2, Plus, Mic } from "lucide-react";
import { VoiceConversation } from "@/components/VoiceConversation";
import { destravarAudio } from "@/lib/speak";

/* Fallback p/ produção onde as VITE_* podem não estar setadas no build. */
const SUPA_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://augeppwihhzibvhzibxe.supabase.co";
const SUPA_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VwcHdpaGh6aWJ2aHppYnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODA4NDUsImV4cCI6MjA2OTA1Njg0NX0.8RUaODHeXMdRmFSRMaAoWuhnUdH7G0yCLQukqpDdD7w";

interface Message { role: "user" | "assistant"; content: string }

const GREETING: Message = {
  role: "assistant",
  content: "Olá! Sou o assistente da Hunters Manpower. Posso te ajudar com seu perfil, suas certificações e as vagas ativas. Como posso ajudar?",
};

const CERTS: { name: string; label: string; fullName: string }[] = [
  { name: "cir", label: "CIR", fullName: "Carteira de Inscrição e Registro" },
  { name: "stcw", label: "STCW", fullName: "Standards of Training, Certification and Watchkeeping" },
  { name: "caaq", label: "CAAQ", fullName: "Curso de Adaptação para Aquaviários" },
  { name: "tbs1", label: "TBS1", fullName: "Treinamento Básico de Segurança" },
  { name: "cbsp", label: "CBSP", fullName: "Curso Básico de Segurança de Plataforma" },
  { name: "thuet", label: "THUET", fullName: "Tropical Helicopter Underwater Escape Training" },
  { name: "alph", label: "ALPH", fullName: "Alfabetização de Plataforma e Helicóptero" },
  { name: "espe", label: "ESPE", fullName: "Especial Básico de Sobrevivência Pessoal" },
  { name: "esrs", label: "ESRS", fullName: "Especial Básico de Responsabilidade Social" },
  { name: "ebps", label: "EBPS", fullName: "Especial Básico de Primeiros Socorros" },
  { name: "ecin", label: "ECIN", fullName: "Especial de Combate a Incêndio" },
  { name: "ecia_caci", label: "ECIA/CACI", fullName: "Especial Avançado de Combate a Incêndio" },
  { name: "ebcp", label: "EBCP", fullName: "Especial Básico de Conscientização sobre Proteção" },
  { name: "eopn", label: "EOPN", fullName: "Especial para Oficiais de Proteção de Navio" },
  { name: "epsm", label: "EPSM", fullName: "Especial de Proteção e Segurança Marítima" },
  { name: "cess", label: "CESS", fullName: "Curso Especial de Segurança em Espaços Confinados" },
  { name: "cerr", label: "CERR", fullName: "Curso Especial de Radioperador Restrito" },
  { name: "efnt", label: "EFNT", fullName: "Especial de Familiarização em Navios Tanque" },
  { name: "ebpq", label: "EBPQ", fullName: "Especial Básico de Navios Tanques Petroleiros" },
  { name: "ebgl", label: "EBGL", fullName: "Especial Básico de Navios Tanques de Gás Liquefeito" },
  { name: "esop", label: "ESOP", fullName: "Especial de Segurança em Operações de Carga" },
  { name: "cns014", label: "CNS014", fullName: "Curso de Navegação Simulada" },
  { name: "lpn", label: "LPN", fullName: "Licença de Piloto de Navio" },
  { name: "gmdss", label: "GMDSS", fullName: "Global Maritime Distress and Safety System" },
  { name: "cft", label: "CFT", fullName: "Curso de Formação de Taifeiros" },
  { name: "dp", label: "DP", fullName: "Dynamic Positioning" },
];

const SUGGESTIONS = [
  "Quais vagas ativas combinam comigo?",
  "Quais certificações preciso renovar?",
  "O que falta para completar meu perfil?",
  "Como melhorar minha prontidão para embarque?",
];

export default function CandidateChat() {
  const { user } = useAuth();
  const [context, setContext] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("candidate-chat-history");
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && parsed.length ? parsed : [GREETING];
    } catch { return [GREETING]; }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  /* ----- carregar contexto do perfil ----- */
  const fetchContext = useCallback(async () => {
    if (!user) return;
    try {
      const [prof, cert, jobsRes, appsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("certifications").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("applications").select("*, job:jobs(*)").eq("candidate_id", user.id),
      ]);

      const p: any = prof.data ?? {};
      const c: any = cert.data ?? {};
      const today = new Date();
      const soon = new Date(today.getTime() + 30 * 864e5);

      const held = CERTS.filter((k) => c[k.name]).map((k) => {
        const validity = c[`${k.name}_validity`] as string | null;
        const indet = c[`${k.name}_indeterminate`] as boolean | null;
        let isExpired = false, isExpiringSoon = false;
        if (validity && !indet) {
          const d = new Date(validity);
          isExpired = d < today;
          isExpiringSoon = !isExpired && d <= soon;
        }
        return {
          label: k.label, fullName: k.fullName, validity: validity ?? null,
          isExpired, isExpiringSoon,
          hasAttachment: !!(c[`${k.name}_file_path`] && c[`${k.name}_file_name`]),
        };
      });
      const heldValidLabels = new Set(held.filter((h) => !h.isExpired).map((h) => h.label));

      const fields = ["full_name", "email", "phone", "birth_date", "cpf", "cep", "street",
        "neighborhood", "city", "state", "desired_function", "professional_experience"];
      const filled = fields.filter((f) => p[f] && String(p[f]).trim() !== "").length;
      const profileCompletion = Math.round((filled / fields.length) * 100);

      const appliedIds = new Set((appsRes.data ?? []).map((a: any) => a.job_id));

      const jobs = (jobsRes.data ?? []).map((j: any) => {
        const req: string[] = Array.isArray(j.required_certifications_list)
          ? j.required_certifications_list
          : j.required_certifications_list ? JSON.parse(j.required_certifications_list) : [];
        const missing = req.filter((r) => !heldValidLabels.has(r));
        const sameFunction = !p.desired_function ||
          p.desired_function.toLowerCase().trim() === (j.function_name ?? "").toLowerCase().trim();
        return {
          title: j.title, function: j.function_name,
          requiredCerts: req, missingCerts: missing,
          eligible: sameFunction && missing.length === 0,
          alreadyApplied: appliedIds.has(j.id),
        };
      });

      const applications = (appsRes.data ?? []).map((a: any) => ({
        title: a.job?.title ?? "—", status: a.status, appliedAt: a.applied_at,
      }));

      setContext({
        name: p.full_name ?? "Profissional",
        firstName: (p.full_name ?? "Profissional").split(" ")[0],
        email: p.email ?? null, phone: p.phone ?? null,
        desiredFunction: p.desired_function ?? null,
        city: p.city ?? null, state: p.state ?? null,
        profileCompletion,
        availableFrom: p.available_from ?? null, availableUntil: p.available_until ?? null,
        certifications: held,
        certSummary: {
          active: held.filter((h) => !h.isExpired).length,
          expiring: held.filter((h) => h.isExpiringSoon).length,
          expired: held.filter((h) => h.isExpired).length,
        },
        jobs, applications,
        totalJobs: jobs.length, totalApplications: applications.length,
        eligibleJobs: jobs.filter((j: any) => j.eligible && !j.alreadyApplied).length,
      });
    } catch (err) {
      console.error("Erro ao carregar contexto do chat:", err);
    }
  }, [user]);

  useEffect(() => { fetchContext(); }, [fetchContext]);

  useEffect(() => {
    if (messages.length) localStorage.setItem("candidate-chat-history", JSON.stringify(messages.slice(-50)));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  /* ----- envio + streaming ----- */
  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    let soFar = "";

    try {
      const resp = await fetch(`${SUPA_URL}/functions/v1/profile-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_KEY}` },
        body: JSON.stringify({ messages: updated, profileContext: context ?? {} }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Não consegui responder agora. Tente de novo.");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const upsert = (chunk: string) => {
        soFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant")
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: soFar } : m));
          return [...prev, { role: "assistant", content: soFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: e.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const newChat = () => {
    setMessages([GREETING]);
    localStorage.removeItem("candidate-chat-history");
  };

  /* ----- usado pelo modo de voz: envia e devolve a resposta completa ----- */
  const askAI = useCallback(async (msgs: Message[]): Promise<string> => {
    const resp = await fetch(`${SUPA_URL}/functions/v1/profile-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_KEY}` },
      body: JSON.stringify({ messages: msgs, profileContext: context ?? {} }),
    });
    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Não consegui responder agora.");
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          const c = parsed.choices?.[0]?.delta?.content;
          if (c) out += c;
        } catch { buffer = line + "\n" + buffer; break; }
      }
    }
    return out.trim();
  }, [context]);

  const onVoiceExchange = (userText: string, aiText: string) =>
    setMessages((prev) => [...prev, { role: "user", content: userText }, { role: "assistant", content: aiText }]);

  const showSuggestions = messages.length <= 1 && !isLoading;

  return (
    <DashboardLayout userType="candidate">
      <div className="flex h-[calc(100vh-6.5rem)] h-[calc(100dvh-6.5rem)] min-h-[520px] w-full flex-col overflow-hidden rounded-xl border shadow-card">
        {/* Header (igual ao admin) */}
        <div className="flex shrink-0 items-center justify-between bg-maritime-blue p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">Assistente Hunter Embarque</h3>
              <p className="truncate text-xs text-white/70">
                {context?.desiredFunction ? context.desiredFunction : "Assistente virtual"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="sm"
              className="h-8 gap-1.5 px-2.5 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={newChat} title="Nova conversa"
            >
              <Plus className="h-4 w-4" /><span className="hidden sm:inline text-xs">Nova conversa</span>
            </Button>
            <Link to="/painel">
              <Button
                variant="ghost" size="sm"
                className="h-8 gap-1.5 px-2.5 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline text-xs">Painel</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Mensagens (igual ao admin) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/30 p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maritime-blue/10">
                    <Bot className="h-4 w-4 text-maritime-blue" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    m.role === "user"
                      ? "rounded-br-md bg-maritime-blue text-white"
                      : "rounded-bl-md border bg-card shadow-sm",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:font-semibold prose-strong:text-foreground prose-a:text-maritime-blue [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maritime-blue">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Sugestões (só na abertura) */}
            {showSuggestions && (
              <div className="grid grid-cols-1 gap-2 pl-10 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border bg-card px-4 py-2.5 text-left text-sm text-foreground/90 shadow-sm transition-colors hover:border-maritime-blue/40 hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-maritime-blue/10">
                  <Bot className="h-4 w-4 text-maritime-blue" />
                </div>
                <div className="rounded-2xl rounded-bl-md border bg-card px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-maritime-blue" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input (igual ao admin) */}
        <div className="shrink-0 border-t bg-background p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Button
              onClick={() => { destravarAudio(); setVoiceOpen(true); }}
              disabled={isLoading}
              size="icon"
              variant="outline"
              title="Conversar por voz"
              aria-label="Conversar por voz"
              className="shrink-0 border-maritime-blue/30 text-maritime-blue hover:bg-maritime-blue/10"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre seu perfil, certificações ou vagas..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-maritime-blue hover:bg-maritime-navy"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
            O assistente pode errar. Confira informações importantes no seu perfil.
          </p>
        </div>
      </div>

      <VoiceConversation
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        getHistory={() => messagesRef.current}
        onExchange={onVoiceExchange}
        askAI={askAI}
      />
    </DashboardLayout>
  );
}
