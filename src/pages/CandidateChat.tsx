/**
 * CandidateChat — a landing do profissional É a Hunters.IO.
 *
 * Depois do login o profissional fala com a MESMA copiloto do drawer de
 * cadastro: mesmo rosto, mesmo nome, mesma voz. Ela roda o agente
 * `onboarding-copilot` com as ferramentas do copiloto, então além de
 * responder sobre perfil, certificações e vagas ela também ATUALIZA o
 * cadastro na hora — o contexto do profissional vai junto nas instruções.
 *
 * O dashboard clássico continua acessível em /painel.
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
import { Send, User, LayoutDashboard, Loader2, Plus, Mic, Wand2 } from "lucide-react";
import { VoiceConversation } from "@/components/VoiceConversation";
import { destravarAudio, VOZ_HABILITADA } from "@/lib/speak";
import { HuntersFace } from "@/components/HuntersFace";
import { openAITools, runCopilotTool, certCatalogText } from "@/lib/copilotTools";

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
  content: "Oi! Eu sou a Hunters.IO. Posso falar do seu perfil, das suas certificações e das vagas abertas — e também atualizar seu cadastro na hora, é só me pedir. No que eu ajudo?",
};

/** Persona da landing: a mesma copiloto, com o contexto de vagas junto. */
const personaCompleta = (contexto: unknown) => `Você é a Hunters.IO, a copiloto do profissional na Hunters Manpower (recrutamento marítimo e offshore).

Você faz duas coisas, e é a MESMA assistente nas duas:
1. Responde sobre o perfil, as certificações, a prontidão para embarque e as vagas abertas, usando o CONTEXTO abaixo.
2. ATUALIZA o cadastro com as ferramentas quando o profissional pedir ou informar um dado novo. Se ele disser "renovei meu STCW, agora vence em 10/03/2028", registre na hora.

Como conversar:
- Português brasileiro, tom de colega de bordo: direto, cordial, sem jargão corporativo.
- Respostas curtas, de 1 a 3 frases. Uma pergunta por vez.
- Nunca invente vaga, certificação, data ou requisito. Só use o que está no contexto ou o que ele disser.
- Sobre elegibilidade, seja honesto: se falta certificação para uma vaga, diga qual falta.
- Não prometa contratação, salário nem prazo de embarque.
- Antes de afirmar o que falta no cadastro, use consultar_cadastro — o contexto abaixo é do carregamento da página e pode ter envelhecido.

Códigos de certificação: ${certCatalogText()}.

CONTEXTO ATUAL DO PROFISSIONAL (JSON):
${JSON.stringify(contexto ?? {})}`;

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
  /** Espelho do contexto para o agente ler sem depender do closure. */
  const contextRef = useRef<any>(null);
  useEffect(() => { contextRef.current = context; }, [context]);
  /** Confirmações de escrita ("Certificação X registrada"), mostradas como chips. */
  const [acoes, setAcoes] = useState<string[]>([]);

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

  /* ----- agente Hunters.IO: responde e, quando pedem, atualiza o cadastro ----- */

  /** Histórico no formato da OpenAI (inclui as mensagens de tool). */
  const oaiRef = useRef<any[]>([]);
  /** Tudo que o profissional disse — a trava anti-invenção usa isso. */
  const userSaidRef = useRef<string[]>([]);

  // A conversa é restaurada do localStorage; sem semear, o agente veria a tela
  // cheia de mensagens e a própria memória vazia.
  const memoriaSemeada = useRef(false);
  useEffect(() => {
    if (memoriaSemeada.current) return;
    memoriaSemeada.current = true;
    const anteriores = messages.filter((m) => m.content && m !== GREETING);
    oaiRef.current = anteriores.map((m) => ({ role: m.role, content: m.content }));
    userSaidRef.current = anteriores.filter((m) => m.role === "user").map((m) => m.content);
  }, [messages]);

  const callAgent = useCallback(async (): Promise<string> => {
    if (!user) return "";
    const instructions = personaCompleta(contextRef.current);

    for (let i = 0; i < 6; i++) {
      const resp = await fetch(`${SUPA_URL}/functions/v1/onboarding-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
        body: JSON.stringify({
          messages: oaiRef.current,
          tools: openAITools(),
          certCatalog: certCatalogText(),
          instructions,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.message) throw new Error(data.error || "Não consegui responder agora.");

      const msg = data.message;
      oaiRef.current.push(msg);

      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* noop */ }
          const result = await runCopilotTool(tc.function.name, args, user.id, { userSaid: userSaidRef.current });
          oaiRef.current.push({ role: "tool", tool_call_id: tc.id, content: result });
          if (tc.function.name !== "consultar_cadastro") setAcoes((a) => [...a, result]);
        }
        continue;
      }
      return msg.content || "";
    }
    return "";
  }, [user]);

  const send = async (text: string) => {
    const limpo = text.trim();
    if (!limpo || isLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: limpo }]);
    oaiRef.current.push({ role: "user", content: limpo });
    userSaidRef.current.push(limpo);
    setInput("");
    setIsLoading(true);
    try {
      const resposta = await callAgent();
      if (resposta) setMessages((prev) => [...prev, { role: "assistant", content: resposta }]);
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
    oaiRef.current = [];
    userSaidRef.current = [];
    setAcoes([]);
    localStorage.removeItem("candidate-chat-history");
  };

  /* ----- usado pelo modo de voz: recebe a fala e devolve a resposta ----- */
  const askAI = useCallback(async (msgs: Message[]): Promise<string> => {
    const ultima = msgs[msgs.length - 1];
    if (ultima?.role === "user") {
      oaiRef.current.push({ role: "user", content: ultima.content });
      userSaidRef.current.push(ultima.content);
    }
    return await callAgent();
  }, [callAgent]);

  const onVoiceExchange = (userText: string, aiText: string) =>
    setMessages((prev) => [...prev, { role: "user", content: userText }, { role: "assistant", content: aiText }]);

  const showSuggestions = messages.length <= 1 && !isLoading;

  return (
    <DashboardLayout userType="candidate">
      <div className="flex h-[calc(100vh-6.5rem)] h-[calc(100dvh-6.5rem)] min-h-[520px] w-full flex-col overflow-hidden rounded-xl border shadow-card">
        {/* Header (igual ao admin) */}
        <div className="flex shrink-0 items-center justify-between bg-maritime-blue p-4">
          <div className="flex min-w-0 items-center gap-3">
            <HuntersFace className="h-10 w-10 ring-2 ring-white/30" iconClass="h-5 w-5 text-white" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">Hunters.IO</h3>
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
                  <HuntersFace className="h-8 w-8 ring-1 ring-border" iconClass="h-4 w-4 text-white" />
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

            {/* O que ela gravou no cadastro durante a conversa */}
            {acoes.map((a, i) => (
              <div
                key={`acao-${i}`}
                className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700"
              >
                <Wand2 className="h-3 w-3" /> {a.split("\n")[0]}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start gap-2">
                <HuntersFace className="h-8 w-8 ring-1 ring-border" iconClass="h-4 w-4 text-white" />
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
            {VOZ_HABILITADA && (
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
            )}
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

      {VOZ_HABILITADA && (
        <VoiceConversation
          open={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          getHistory={() => messagesRef.current}
          onExchange={onVoiceExchange}
          askAI={askAI}
        />
      )}
    </DashboardLayout>
  );
}
