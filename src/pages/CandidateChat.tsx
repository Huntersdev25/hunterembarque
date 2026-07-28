/**
 * CandidateChat — a landing do profissional é um assistente de IA.
 *
 * Conversa sobre o perfil, certificações e vagas ativas (com elegibilidade
 * calculada). Reaproveita a edge function `profile-chat` (streaming SSE) e as
 * mesmas queries do dashboard clássico, que continua acessível em /painel.
 *
 * Visual inspirado no Claude: coluna centrada, texto do assistente sem "balão",
 * fundo neutro quente, mensagens do usuário em bolha suave, input limpo.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Anchor, Send, User, LayoutDashboard, Loader2, Plus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Config (fallback p/ produção onde as VITE_* podem não estar setadas) */
/* ------------------------------------------------------------------ */
const SUPA_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://augeppwihhzibvhzibxe.supabase.co";
const SUPA_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2VwcHdpaGh6aWJ2aHppYnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODA4NDUsImV4cCI6MjA2OTA1Njg0NX0.8RUaODHeXMdRmFSRMaAoWuhnUdH7G0yCLQukqpDdD7w";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
interface Message { role: "user" | "assistant"; content: string }

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

/* ------------------------------------------------------------------ */

export default function CandidateChat() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("candidate-chat-history");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ----- carregar contexto ----- */
  const fetchContext = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
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
      setContext((prev: any) => prev ?? {
        name: "Profissional", firstName: "Profissional",
        certifications: [], certSummary: { active: 0, expiring: 0, expired: 0 },
        jobs: [], applications: [], profileCompletion: 0, eligibleJobs: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchContext(); }, [fetchContext]);

  useEffect(() => {
    if (messages.length) localStorage.setItem("candidate-chat-history", JSON.stringify(messages.slice(-50)));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isStreaming]);

  /* ----- envio + streaming ----- */
  const send = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsStreaming(true);
    let soFar = "";

    try {
      const resp = await fetch(`${SUPA_URL}/functions/v1/profile-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPA_KEY}` },
        body: JSON.stringify({ messages: [...messages, userMsg], profileContext: context ?? {} }),
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
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    localStorage.removeItem("candidate-chat-history");
  };

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const cs = context?.certSummary ?? { active: 0, expiring: 0, expired: 0 };
  const empty = messages.length === 0;

  return (
    <DashboardLayout userType="candidate">
      <div className="flex h-[calc(100vh-6.5rem)] h-[calc(100dvh-6.5rem)] min-h-[520px] w-full flex-col bg-background text-foreground">
        {/* Barra superior enxuta */}
        <div className="flex shrink-0 items-center justify-between border-b bg-card/60 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-maritime text-white shadow-sm">
              <Anchor className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">Assistente Hunter Embarque</p>
              {context?.desiredFunction && (
                <p className="truncate text-xs text-muted-foreground">
                  {context.desiredFunction}{context?.city ? ` · ${context.city}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={newChat}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Nova conversa"
            >
              <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Nova conversa</span>
            </button>
            <Link
              to="/painel"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /><span className="hidden sm:inline">Painel</span>
            </Link>
          </div>
        </div>

        {/* Conversa */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
            {empty ? (
              <div className="flex min-h-[52vh] flex-col items-center justify-center gap-7 py-8 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-maritime text-white shadow-maritime">
                    <Anchor className="h-7 w-7" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Olá, {context?.firstName ?? "profissional"}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Converse sobre seu perfil, certificações e as vagas ativas. Eu conheço seus dados.
                  </p>
                  {!loading && (
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      {cs.active} certificações válidas
                      {cs.expired ? ` · ${cs.expired} vencida${cs.expired > 1 ? "s" : ""}` : ""}
                      {" · "}{context?.eligibleJobs ?? 0} vagas elegíveis
                      {" · "}perfil {context?.profileCompletion ?? 0}%
                    </p>
                  )}
                </div>

                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={isStreaming}
                      className="rounded-xl border bg-card px-4 py-3 text-left text-sm text-foreground/90 transition-colors hover:border-maritime-blue/40 hover:bg-muted disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-7 py-6">
                {messages.map((m, i) =>
                  m.role === "assistant" ? (
                    <div key={i} className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-maritime text-white shadow-sm">
                        <Anchor className="h-3.5 w-3.5" />
                      </span>
                      <div className="prose prose-sm max-w-none pt-0.5 text-[15px] leading-relaxed text-foreground dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:font-semibold prose-strong:text-foreground prose-a:text-maritime-blue [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-end gap-3">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-maritime-blue px-4 py-2.5 text-[15px] leading-relaxed text-white">
                        {m.content}
                      </div>
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-maritime-blue/10 text-maritime-blue">
                        <User className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  ),
                )}

                {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-maritime text-white shadow-sm">
                      <Anchor className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex items-center pt-1.5">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 px-4 pb-4 sm:px-6">
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm transition-colors focus-within:border-maritime-blue/50 focus-within:ring-2 focus-within:ring-maritime-blue/15">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autosize(e.target); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                rows={1}
                placeholder="Pergunte sobre seu perfil, certificações ou vagas…"
                disabled={isStreaming}
                className="max-h-48 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isStreaming}
                aria-label="Enviar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-maritime-blue text-white transition-colors hover:bg-maritime-blue/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              O assistente pode errar. Confira informações importantes no seu perfil.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
