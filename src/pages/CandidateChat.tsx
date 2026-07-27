/**
 * CandidateChat — a landing do profissional é um assistente de IA.
 *
 * Conversa sobre o perfil, certificações e vagas ativas (com elegibilidade
 * calculada). Reaproveita a edge function `profile-chat` (streaming SSE) e as
 * mesmas queries do dashboard clássico, que continua acessível em /painel.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Anchor, Navigation, Bot, Send, User, Sparkles, LayoutDashboard,
  ShieldCheck, AlertTriangle, XCircle, Briefcase, Loader2, RefreshCw,
} from "lucide-react";

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
  { icon: ShieldCheck, text: "Quais certificações preciso renovar?" },
  { icon: Briefcase, text: "Quais vagas ativas combinam comigo?" },
  { icon: User, text: "O que falta para completar meu perfil?" },
  { icon: Anchor, text: "Como melhorar minha prontidão para embarque?" },
];

/* ------------------------------------------------------------------ */

export default function CandidateChat() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

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
    if (!user) { setLoading(false); return; }   // sem usuário: não trava no spinner
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

      // certificações que o profissional possui
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

      // completude do perfil
      const fields = ["full_name", "email", "phone", "birth_date", "cpf", "cep", "street",
        "neighborhood", "city", "state", "desired_function", "professional_experience"];
      const filled = fields.filter((f) => p[f] && String(p[f]).trim() !== "").length;
      const profileCompletion = Math.round((filled / fields.length) * 100);

      const appliedIds = new Set((appsRes.data ?? []).map((a: any) => a.job_id));

      // vagas ativas + elegibilidade por função e certificações
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

      setProfile(p);
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
      // Falha ao carregar dados não pode travar a tela — usa um contexto mínimo
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
    if (!text.trim() || isStreaming || !context) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    let soFar = "";

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], profileContext: context }),
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

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("candidate-chat-history");
  };

  const initials = useMemo(() => {
    const n = profile?.full_name ?? "";
    return n.split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase() || "U";
  }, [profile]);

  const cs = context?.certSummary ?? { active: 0, expiring: 0, expired: 0 };

  return (
    <DashboardLayout userType="candidate">
      <div className="flex h-[calc(100dvh-6.5rem)] min-h-[520px] w-full flex-col gap-4 px-2 py-2 sm:px-0">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-maritime-blue via-maritime-navy to-slate-900 p-4 sm:p-5">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 opacity-60 blur" />
              <Avatar className="relative h-14 w-14 border-2 border-white/20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-white/10 text-white font-bold">{initials}</AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Assistente Hunter Embarque</span>
              </div>
              <h1 className="truncate text-lg font-bold text-white sm:text-xl">
                Olá, {context?.firstName ?? "profissional"} 👋
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {context?.desiredFunction && (
                  <Badge className="border-white/20 bg-white/10 text-white backdrop-blur-sm">
                    <Anchor className="mr-1 h-3 w-3" />{context.desiredFunction}
                  </Badge>
                )}
                {context?.city && (
                  <Badge className="border-white/20 bg-white/10 text-white backdrop-blur-sm">
                    <Navigation className="mr-1 h-3 w-3" />{context.city}{context.state ? `, ${context.state}` : ""}
                  </Badge>
                )}
              </div>
            </div>
            <Link to="/painel" className="hidden sm:block">
              <Button variant="secondary" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                <LayoutDashboard className="mr-2 h-4 w-4" />Painel clássico
              </Button>
            </Link>
          </div>

          {/* Chips de status */}
          <div className="relative mt-3 flex flex-wrap gap-2">
            {loading && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">
                <Loader2 className="h-3 w-3 animate-spin" />Carregando seu perfil…
              </span>
            )}
            <StatChip icon={ShieldCheck} tone="emerald" label={`${cs.active} certificações válidas`} />
            {cs.expiring > 0 && <StatChip icon={AlertTriangle} tone="amber" label={`${cs.expiring} a vencer`} />}
            {cs.expired > 0 && <StatChip icon={XCircle} tone="rose" label={`${cs.expired} vencidas`} />}
            <StatChip icon={Briefcase} tone="cyan" label={`${context?.eligibleJobs ?? 0} vagas elegíveis`} />
            <StatChip icon={User} tone="violet" label={`Perfil ${context?.profileCompletion ?? 0}%`} />
          </div>
        </div>

        {/* Área do chat */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-lg">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Como posso te ajudar hoje?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pergunte sobre seu perfil, suas certificações ou as vagas ativas. Eu conheço seus dados.
                  </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="group flex items-center gap-3 rounded-xl border bg-muted/40 p-3 text-left text-sm transition-all hover:border-maritime-blue/40 hover:bg-muted"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-maritime-blue/10 text-maritime-blue group-hover:bg-maritime-blue/20">
                        <s.icon className="h-4 w-4" />
                      </span>
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[75%] ${
                    m.role === "user"
                      ? "rounded-br-md bg-maritime-blue text-white"
                      : "rounded-bl-md bg-muted"
                  }`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>ol]:my-1 [&>ul]:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-maritime-blue/10">
                      <User className="h-3.5 w-3.5 text-maritime-blue" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-card/80 p-3 backdrop-blur">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                rows={1}
                placeholder="Pergunte sobre seu perfil, certificações ou vagas…"
                disabled={isStreaming}
                className="max-h-32 flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-maritime-blue/50 focus:ring-2 focus:ring-maritime-blue/20 disabled:opacity-60"
              />
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={clearChat} title="Limpar conversa" disabled={isStreaming}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" onClick={() => send(input)} disabled={!input.trim() || isStreaming}
                className="h-10 w-10 flex-shrink-0 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
              O assistente pode errar. Confira informações importantes no seu perfil.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ */

const TONES: Record<string, string> = {
  emerald: "bg-emerald-400/15 text-emerald-100 border-emerald-300/20",
  amber: "bg-amber-400/15 text-amber-100 border-amber-300/20",
  rose: "bg-rose-400/15 text-rose-100 border-rose-300/20",
  cyan: "bg-cyan-400/15 text-cyan-100 border-cyan-300/20",
  violet: "bg-violet-400/15 text-violet-100 border-violet-300/20",
};

function StatChip({ icon: Icon, label, tone }: { icon: any; label: string; tone: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${TONES[tone]}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}
