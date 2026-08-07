/**
 * Camada de "tools" do Copiloto de Cadastro.
 *
 * Define as ferramentas que a IA pode chamar para PREENCHER o cadastro do
 * profissional, e o executor que aplica cada chamada no Supabase (usando a
 * sessão do próprio usuário). Compartilhado pelo modo texto (chat completions)
 * e pelo modo voz (Realtime API).
 *
 * Após cada escrita, dispara `onboarding:refresh` para a trilha atualizar ao vivo.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  CERT_IDS,
  CERTIFICATIONS,
  getAllStepStatuses,
  computeReadiness,
  brToISO,
  type OnboardingData,
} from "@/lib/onboarding";

/* ------------------------------------------------------------------ */
/* Definição canônica das tools                                        */
/* ------------------------------------------------------------------ */

interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

const genderEnum = ["masculino", "feminino", "outro"];

export const COPILOT_TOOLS: ToolDef[] = [
  {
    name: "consultar_cadastro",
    description:
      "Lê o estado atual do cadastro do profissional: o que já está preenchido, o que falta em cada etapa e o percentual de prontidão. Use SEMPRE no início para saber o que já existe antes de perguntar algo.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "atualizar_dados_pessoais",
    description: "Preenche/atualiza os dados pessoais. Envie apenas os campos que o usuário informou.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Nome completo" },
        cpf: { type: "string", description: "CPF (com ou sem máscara)" },
        birth_date: { type: "string", description: "Data de nascimento no formato YYYY-MM-DD" },
        gender: { type: "string", enum: genderEnum },
        phone: { type: "string", description: "Telefone/WhatsApp com DDD" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "atualizar_endereco",
    description: "Preenche/atualiza o endereço. Se o usuário der só o CEP, você pode preencher o resto pelo CEP.",
    parameters: {
      type: "object",
      properties: {
        cep: { type: "string" },
        street: { type: "string", description: "Logradouro/rua" },
        address_number: { type: "string", description: "Número" },
        neighborhood: { type: "string", description: "Bairro" },
        city: { type: "string", description: "Cidade" },
        state: { type: "string", description: "UF (2 letras)" },
        address_complement: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "atualizar_profissional",
    description: "Preenche/atualiza o perfil profissional (função desejada, funções que exerce, tipo de embarcação, experiência).",
    parameters: {
      type: "object",
      properties: {
        desired_function: { type: "string", description: "Função desejada (nome do catálogo, ex.: 'MNC - Marinheiro de Convés')" },
        functions: { type: "array", items: { type: "string" }, description: "Todas as funções que o profissional exerce" },
        vessel_type: { type: "string", description: "Tipo de embarcação (ex.: PSV, AHTS, FPSO)" },
        professional_experience: { type: "string", description: "Resumo da experiência profissional" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "definir_certificacao",
    description:
      "Registra uma certificação. Informe se o profissional possui (owned). Se possuir, inclua emissão e validade (ou indeterminate=true se não vence). Chame uma vez por certificação.",
    parameters: {
      type: "object",
      properties: {
        cert_id: { type: "string", enum: CERT_IDS, description: "Código da certificação" },
        owned: { type: "boolean", description: "true = possui; false = não possui" },
        issue_date: { type: "string", description: "Emissão em YYYY-MM-DD (se possuir)" },
        validity: { type: "string", description: "Validade em YYYY-MM-DD (se possuir e tiver vencimento)" },
        indeterminate: { type: "boolean", description: "true se a validade é indeterminada (não vence)" },
      },
      required: ["cert_id", "owned"],
      additionalProperties: false,
    },
  },
];

/** Formato para a Chat Completions API (tools). */
export const openAITools = () =>
  COPILOT_TOOLS.map((t) => ({ type: "function", function: t }));

/** Formato para a Realtime API (tools no session config). */
export const realtimeTools = () =>
  COPILOT_TOOLS.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.parameters }));

/** Lista de certificações (código + nome) para o system prompt. */
export const certCatalogText = () =>
  CERTIFICATIONS.map((c) => `${c.id} = ${c.name}`).join("; ");

/* ------------------------------------------------------------------ */
/* Leitura do estado atual                                             */
/* ------------------------------------------------------------------ */

export async function readCadastroState(userId: string): Promise<string> {
  const [{ data: profile }, { data: certs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("certifications").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const data = ((profile as any)?.onboarding_data as OnboardingData) ?? {};
  const statuses = getAllStepStatuses(profile as any, certs as any, data);
  const readiness = computeReadiness(profile as any, certs as any, data);

  const missing: Record<string, string[]> = {};
  Object.values(statuses).forEach((s) => { if (!s.complete && s.missing.length) missing[s.id] = s.missing; });

  return JSON.stringify({
    prontidao: `${readiness}%`,
    dados_pessoais: {
      full_name: (profile as any)?.full_name ?? null,
      cpf: (profile as any)?.cpf ?? null,
      birth_date: (profile as any)?.birth_date ?? null,
      gender: (profile as any)?.gender ?? null,
      phone: (profile as any)?.phone ?? null,
    },
    endereco: {
      cep: (profile as any)?.cep ?? null, city: (profile as any)?.city ?? null, state: (profile as any)?.state ?? null,
    },
    profissional: {
      desired_function: (profile as any)?.desired_function ?? null,
      functions: (profile as any)?.functions ?? [],
      vessel_type: (profile as any)?.vessel_type ?? null,
    },
    certificacoes_respondidas: (data.certs_answered ?? []).length,
    faltando: missing,
  });
}

/* ------------------------------------------------------------------ */
/* Saudação falada                                                     */
/* ------------------------------------------------------------------ */

const LABEL_ETAPA: Record<string, string> = {
  personal: "seus dados pessoais",
  address: "o endereço",
  professional: "o perfil profissional",
  certifications: "as certificações",
  documents: "os documentos",
};

/** Junta em linguagem natural: "a, b e c". */
const listar = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;

/**
 * Texto com que a Hunters.IO se apresenta ao abrir o chat.
 *
 * Montado localmente a partir do cadastro (sem chamar a IA) para a fala sair
 * na hora — o gesto de clique do usuário autoriza o áudio, e esperar uma
 * ida ao modelo faria perder essa janela.
 */
export async function buildGreeting(userId: string): Promise<string> {
  try {
    const s = JSON.parse(await readCadastroState(userId));
    const primeiro = String(s.dados_pessoais?.full_name ?? "").trim().split(/\s+/)[0];
    const ola = primeiro ? `Oi, ${primeiro}!` : "Oi!";
    const pct = parseInt(String(s.prontidao ?? "0"), 10) || 0;

    if (pct === 0) {
      return `${ola} Eu sou a Hunters.IO, sua copiloto de cadastro. Me conta sobre você que eu preencho a trilha inteira — pode ser por texto ou por voz.`;
    }
    if (pct >= 100) {
      return `${ola} Aqui é a Hunters.IO. Seu cadastro já está completo. Se quiser atualizar uma certificação ou trocar algum dado, é só me falar.`;
    }
    const etapas = Object.keys(s.faltando ?? {}).map((k) => LABEL_ETAPA[k] ?? k);
    const falta = etapas.length ? ` Ainda falta ${listar(etapas)}.` : "";
    return `${ola} Aqui é a Hunters.IO. Seu cadastro está em ${pct}%.${falta} Quer continuar de onde parou?`;
  } catch {
    return "Oi! Eu sou a Hunters.IO, sua copiloto de cadastro. Me conta sobre você que eu preencho a trilha pra você.";
  }
}

/* ------------------------------------------------------------------ */
/* Execução das tools                                                  */
/* ------------------------------------------------------------------ */

const refresh = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("onboarding:refresh"));
};

/**
 * Toda gravação devolve o estado recalculado junto do resultado.
 *
 * Sem isso o modelo continua raciocinando com o retrato que leu no início da
 * conversa e afirma coisas como "só falta o CPF" quando ainda falta meio
 * cadastro. Devolver a verdade a cada escrita é mais confiável do que pedir
 * no prompt que ele reconsulte.
 */
async function comEstado(userId: string, msg: string): Promise<string> {
  try {
    const s = JSON.parse(await readCadastroState(userId));
    const falta = Object.entries(s.faltando ?? {})
      .map(([etapa, itens]) => `${etapa}: ${(itens as string[]).join(", ")}`)
      .join(" | ");
    return `${msg}\n[estado agora — prontidão ${s.prontidao}${falta ? `; ainda falta → ${falta}` : "; nada faltando"}]`;
  } catch {
    return msg;
  }
}

/**
 * Só aceita data completa. O modelo às vezes manda "2027" ou "03/2027" quando a
 * pessoa fala só o ano — gravar isso quebraria a coluna `date`, então devolvemos
 * null e avisamos o modelo para perguntar o dia e o mês.
 */
const isoDate = (v?: string): string | null => {
  if (!v) return null;
  const iso = brToISO(String(v).trim());
  return iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
};

/** Contexto da conversa usado para validar o que a IA tenta gravar. */
export interface ToolContext {
  /** Tudo que o profissional efetivamente disse (texto digitado ou transcrito). */
  userSaid?: string[];
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * A IA presume: pergunta "tem HUET?", a pessoa fala de outra coisa e ela grava
 * "não possui". Nenhuma instrução de prompt segurou isso de forma confiável, então
 * exigimos evidência: a certificação precisa ter sido citada pelo próprio
 * profissional (pela sigla, pelo nome ou pela descrição) para poder ser gravada.
 */
function foiCitada(certId: string, userSaid: string[]): boolean {
  const texto = ` ${normalize(userSaid.join(" "))} `;
  const meta = CERTIFICATIONS.find((c) => c.id === certId);
  const termos = [certId, meta?.name ?? "", meta?.description ?? ""]
    .map(normalize)
    .filter((t) => t.length >= 3);
  return termos.some((t) => texto.includes(` ${t} `));
}

export async function runCopilotTool(
  name: string,
  args: any,
  userId: string,
  ctx?: ToolContext,
): Promise<string> {
  try {
    switch (name) {
      case "consultar_cadastro":
        return await readCadastroState(userId);

      case "atualizar_dados_pessoais": {
        const patch: Record<string, any> = {};
        if (args.full_name) patch.full_name = args.full_name;
        if (args.cpf) patch.cpf = String(args.cpf).replace(/\D/g, "");
        if (args.gender) patch.gender = args.gender;
        if (args.phone) patch.phone = args.phone;

        let aviso = "";
        if (args.birth_date) {
          const d = isoDate(args.birth_date);
          if (d) patch.birth_date = d;
          else aviso = " A data de nascimento veio incompleta e NÃO foi gravada — pergunte o dia, o mês e o ano.";
        }

        if (!Object.keys(patch).length) return "Nada a gravar." + aviso;
        const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
        if (error) throw error;
        refresh();
        return comEstado(userId, "Dados pessoais atualizados: " + Object.keys(patch).join(", ") + "." + aviso);
      }

      case "atualizar_endereco": {
        const keys = ["cep", "street", "address_number", "neighborhood", "city", "state", "address_complement"];
        const patch: Record<string, any> = {};
        keys.forEach((k) => { if (args[k]) patch[k] = args[k]; });
        const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
        if (error) throw error;
        refresh();
        return comEstado(userId, "Endereço atualizado: " + Object.keys(patch).join(", "));
      }

      case "atualizar_profissional": {
        const patch: Record<string, any> = {};
        if (args.desired_function) patch.desired_function = args.desired_function;
        if (Array.isArray(args.functions)) patch.functions = args.functions;
        if (args.vessel_type) patch.vessel_type = args.vessel_type;
        if (args.professional_experience) patch.professional_experience = args.professional_experience;
        const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
        if (error) {
          // coluna functions pode não estar migrada: tenta sem ela
          if (patch.functions) {
            delete patch.functions;
            const retry = await supabase.from("profiles").update(patch).eq("user_id", userId);
            if (retry.error) throw retry.error;
          } else throw error;
        }
        refresh();
        return comEstado(userId, "Perfil profissional atualizado: " + Object.keys(patch).join(", "));
      }

      case "definir_certificacao": {
        const id = String(args.cert_id);
        if (!CERT_IDS.includes(id)) return `Certificação desconhecida: ${id}`;

        const said = ctx?.userSaid ?? [];
        if (said.length && !foiCitada(id, said)) {
          const nomeCert = CERTIFICATIONS.find((c) => c.id === id)?.name ?? id;
          return `NÃO gravei ${nomeCert}: o profissional não falou dessa certificação em momento nenhum. Você não pode registrar o que ele não respondeu — pergunte primeiro e só grave depois da resposta dele.`;
        }

        const owned = !!args.owned;
        const certPatch: Record<string, any> = { user_id: userId, [id]: owned };
        const pendentes: string[] = [];
        if (owned) {
          if (args.issue_date) {
            const d = isoDate(args.issue_date);
            if (d) certPatch[`${id}_issue_date`] = d;
            else pendentes.push("a data de emissão");
          }
          if (args.indeterminate) {
            certPatch[`${id}_indeterminate`] = true;
          } else if (args.validity) {
            const d = isoDate(args.validity);
            if (d) certPatch[`${id}_validity`] = d;
            else pendentes.push("a validade");
          }
        }
        const { error } = await supabase.from("certifications").upsert(certPatch as any, { onConflict: "user_id" });
        if (error) throw error;

        // marca como respondida em onboarding_data.certs_answered
        const { data: prof } = await supabase.from("profiles").select("onboarding_data").eq("user_id", userId).maybeSingle();
        const od = (((prof as any)?.onboarding_data) as OnboardingData) ?? {};
        const answered = new Set(od.certs_answered ?? []);
        answered.add(id);
        await supabase.from("profiles").update({ onboarding_data: { ...od, certs_answered: Array.from(answered) } }).eq("user_id", userId);

        refresh();
        const nome = CERTIFICATIONS.find((c) => c.id === id)?.name ?? id;
        const base = owned
          ? `Certificação ${nome} registrada como "possui".`
          : `Certificação ${nome} registrada como "não possui".`;
        return comEstado(
          userId,
          pendentes.length
            ? `${base} Faltou ${pendentes.join(" e ")}: veio sem dia/mês, então NÃO foi gravada — pergunte a data completa.`
            : base,
        );
      }

      default:
        return `Ferramenta desconhecida: ${name}`;
    }
  } catch (e: any) {
    return `Erro ao executar ${name}: ${e?.message || e}`;
  }
}
