/**
 * Trilha de Cadastro do Profissional (Onboarding Wizard)
 * -------------------------------------------------------
 * Fonte única de verdade para:
 *  - lista de certificações marítimas + metadados
 *  - definição de etapas e campos obrigatórios
 *  - lógica de completude por etapa e cálculo de prontidão
 *
 * Todos os campos e chaves espelham as colunas reais das tabelas
 * `profiles` e `certifications` no Supabase.
 */

/* ------------------------------------------------------------------ */
/* Certificações                                                       */
/* ------------------------------------------------------------------ */

export type CertCategory =
  | "documentos"
  | "seguranca"
  | "protecao"
  | "navios-tanque"
  | "tecnicas";

export interface CertificationMeta {
  id: string;
  name: string;
  description: string;
  category: CertCategory;
  hasDP?: boolean;
  hasSTCW?: boolean;
}

export const CERT_CATEGORY_LABELS: Record<CertCategory, string> = {
  documentos: "Documentos & Registro",
  seguranca: "Segurança & Sobrevivência",
  protecao: "STCW & Proteção do Navio",
  "navios-tanque": "Navios-tanque & Carga",
  tecnicas: "Rádio, DP & Técnicas",
};

/**
 * As 26 certificações reais persistidas na tabela `certifications`
 * (mesmos códigos usados em CandidateSettings / CertificationUpload).
 */
export const CERTIFICATIONS: CertificationMeta[] = [
  // Documentos & Registro
  { id: "cir", name: "CIR", description: "Carteira de Inscrição e Registro", category: "documentos" },
  { id: "caaq", name: "CAAQ", description: "Curso de Adaptação para Aquaviários", category: "documentos" },
  { id: "tbs1", name: "TBS-1", description: "Treinamento Básico de Segurança e Instrução", category: "documentos" },
  // Segurança & Sobrevivência
  { id: "cbsp", name: "CBSP", description: "Curso Básico de Segurança de Plataforma", category: "seguranca" },
  { id: "espe", name: "ESPE", description: "Especial básico de Sobrevivência Pessoal", category: "seguranca" },
  { id: "esrs", name: "ESRS", description: "Especial básico de Responsabilidade Social", category: "seguranca" },
  { id: "ebps", name: "EBPS", description: "Especial básico de Primeiros Socorros", category: "seguranca" },
  { id: "ecin", name: "ECIN", description: "Especial básico de Combate a Incêndio", category: "seguranca" },
  { id: "ecia_caci", name: "ECIA/CACI", description: "Especial Avançado de Combate a Incêndio", category: "seguranca" },
  { id: "cess", name: "CESS", description: "Curso Especial de Embarcações de Sobrevivência e Salvamento", category: "seguranca" },
  { id: "cerr", name: "CERR", description: "Curso Especial de Embarcação Rápida de Resgate", category: "seguranca" },
  { id: "thuet", name: "THUET", description: "Treinamento em Escape de Helicópteros Submersos em Águas Tropicais", category: "seguranca" },
  { id: "alph", name: "ALPH", description: "Curso de Manobra e Combate a Incêndio de Aviação", category: "seguranca" },
  // STCW & Proteção
  { id: "stcw", name: "STCW", description: "Convenção Internacional sobre Padrões de Treinamento, Certificação e Serviço de Quarto", category: "protecao", hasSTCW: true },
  { id: "eopn", name: "EOPN", description: "Especial para Oficiais de Proteção de Navio", category: "protecao" },
  { id: "ebcp", name: "EBCP", description: "Especial Básico de Conscientização Sobre Proteção de Navio", category: "protecao" },
  { id: "epsm", name: "EPSM", description: "Especial Avançado de Primeiros Socorros", category: "protecao" },
  // Navios-tanque & Carga
  { id: "efnt", name: "EFNT", description: "Especial de Familiarização de Navios-tanque", category: "navios-tanque" },
  { id: "ebpq", name: "EBPQ", description: "Especial Básico de Navios-tanque Petroleiros e para Produtos Químicos", category: "navios-tanque" },
  { id: "ebgl", name: "EBGL", description: "Especial Básico de Navio-tanque para Gás Liquefeito", category: "navios-tanque" },
  { id: "esop", name: "ESOP", description: "Especial de Segurança em Operações de Carga", category: "navios-tanque" },
  // Rádio, DP & Técnicas
  { id: "cns014", name: "CNS-014", description: "Rádio Operador", category: "tecnicas" },
  { id: "lpn", name: "LPN", description: "Licença de Pessoal de Navegação Aérea", category: "tecnicas" },
  { id: "gmdss", name: "GMDSS", description: "Rádio Comunicação", category: "tecnicas" },
  { id: "cft", name: "CFT", description: "Certificado de Formação Técnica", category: "tecnicas" },
  { id: "dp", name: "DP", description: "Dynamic Positioning", category: "tecnicas", hasDP: true },
];

export const CERT_IDS: string[] = CERTIFICATIONS.map((c) => c.id);

/** Resposta do lead para uma certificação. */
export type CertAnswer = "unanswered" | "owned" | "not_owned";

/** Estado editável dos campos de uma certificação "Possuo". */
export interface CertFieldState {
  issueDate: string; // BR (DD/MM/AAAA)
  validityDate: string; // BR
  indeterminate: boolean;
  dpBasico: boolean;
  dpAvancado: boolean;
  dpIlimitado: boolean;
  filePath: string | null;
  fileName: string | null;
}

/** True quando uma cert "Possuo" tem emissão + validade(ou indeterminada) + anexo, sem data vencida. */
export const isOwnedCertValid = (f: CertFieldState): boolean => {
  const issue = parseBRDate(f.issueDate);
  const val = parseBRDate(f.validityDate);
  const okIssue = f.issueDate.length === 10 && !!issue;
  const okValidity = f.indeterminate || (f.validityDate.length === 10 && !!val);
  const okFile = Boolean(f.filePath);
  const notExpired = f.indeterminate || !isValidityExpired(f.validityDate);
  const notBeforeIssue = f.indeterminate || !(issue && val && val < issue);
  return okIssue && okValidity && okFile && notExpired && notBeforeIssue;
};

/* ------------------------------------------------------------------ */
/* Estrutura do progresso da trilha (coluna profiles.onboarding_data)  */
/* ------------------------------------------------------------------ */

export interface OnboardingData {
  /** Códigos de certificação já endereçados (marcados possuo OU não possuo). */
  certs_answered?: string[];
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Etapas                                                              */
/* ------------------------------------------------------------------ */

export type StepId =
  | "welcome"
  | "personal"
  | "address"
  | "professional"
  | "certifications"
  | "documents"
  | "review";

export interface StepMeta {
  id: StepId;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const STEPS: StepMeta[] = [
  { id: "welcome", index: 0, label: "Boas-vindas", shortLabel: "Início", description: "Como funciona a trilha" },
  { id: "personal", index: 1, label: "Dados Pessoais", shortLabel: "Pessoal", description: "Seus dados básicos" },
  { id: "address", index: 2, label: "Endereço", shortLabel: "Endereço", description: "Onde você mora" },
  { id: "professional", index: 3, label: "Perfil Profissional", shortLabel: "Profissional", description: "Experiência e função" },
  { id: "certifications", index: 4, label: "Certificações", shortLabel: "Certificações", description: "Suas certificações marítimas" },
  { id: "documents", index: 5, label: "Documentos", shortLabel: "Documentos", description: "Currículo, foto e vídeo" },
  { id: "review", index: 6, label: "Revisão", shortLabel: "Revisão", description: "Confira e conclua" },
];

export const TOTAL_STEPS = STEPS.length;

/** Etapas que contam para o cálculo de prontidão (exclui welcome/review). */
const SCORED_STEPS: StepId[] = ["personal", "address", "professional", "certifications", "documents"];

/* ------------------------------------------------------------------ */
/* Campos obrigatórios por etapa                                       */
/* ------------------------------------------------------------------ */

export interface FieldMeta {
  key: string;
  label: string;
}

export const PERSONAL_REQUIRED: FieldMeta[] = [
  { key: "full_name", label: "Nome completo" },
  { key: "cpf", label: "CPF" },
  { key: "birth_date", label: "Data de nascimento" },
  { key: "gender", label: "Sexo" },
  { key: "phone", label: "Telefone" },
];

export const ADDRESS_REQUIRED: FieldMeta[] = [
  { key: "cep", label: "CEP" },
  { key: "street", label: "Logradouro" },
  { key: "address_number", label: "Número" },
  { key: "neighborhood", label: "Bairro" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado" },
];

export const PROFESSIONAL_REQUIRED: FieldMeta[] = [
  { key: "desired_function", label: "Função desejada" },
  { key: "vessel_type", label: "Tipo de embarcação" },
  { key: "professional_experience", label: "Experiência profissional" },
];

/* ------------------------------------------------------------------ */
/* Tipos genéricos das linhas                                          */
/* ------------------------------------------------------------------ */

export type ProfileRow = Record<string, any> | null | undefined;
export type CertRow = Record<string, any> | null | undefined;

export interface StepStatus {
  id: StepId;
  complete: boolean;
  /** Rótulos de itens ainda pendentes (para exibição). */
  missing: string[];
}

/* ------------------------------------------------------------------ */
/* Helpers de valor                                                    */
/* ------------------------------------------------------------------ */

const hasValue = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return !Number.isNaN(v);
  return true;
};

const missingFields = (row: ProfileRow, fields: FieldMeta[]): string[] =>
  fields.filter((f) => !hasValue(row?.[f.key])).map((f) => f.label);

/* ------------------------------------------------------------------ */
/* Completude de certificações                                         */
/* ------------------------------------------------------------------ */

/** Uma certificação marcada "Possuo" precisa de emissão + (validade OU indeterminada) + arquivo. */
export const isOwnedCertComplete = (certs: CertRow, id: string): boolean => {
  const owned = certs?.[id] === true;
  if (!owned) return true; // "não possuo" já é uma resposta completa
  const hasIssue = hasValue(certs?.[`${id}_issue_date`]);
  const hasValidity = hasValue(certs?.[`${id}_validity`]) || certs?.[`${id}_indeterminate`] === true;
  const hasFile = hasValue(certs?.[`${id}_file_path`]);
  return hasIssue && hasValidity && hasFile;
};

/** Retorna quantas das 26 certs foram endereçadas (respondidas). */
export const countAnsweredCerts = (data: OnboardingData | null | undefined): number => {
  const answered = new Set(data?.certs_answered ?? []);
  return CERT_IDS.filter((id) => answered.has(id)).length;
};

export const getCertificationsStatus = (
  certs: CertRow,
  data: OnboardingData | null | undefined,
): StepStatus => {
  const answered = new Set(data?.certs_answered ?? []);
  const notAnswered = CERT_IDS.filter((id) => !answered.has(id));
  const incompleteOwned = CERT_IDS.filter((id) => answered.has(id) && !isOwnedCertComplete(certs, id));

  const missing: string[] = [];
  if (notAnswered.length > 0) {
    missing.push(`${notAnswered.length} certificação(ões) sem resposta`);
  }
  if (incompleteOwned.length > 0) {
    const names = incompleteOwned
      .map((id) => CERTIFICATIONS.find((c) => c.id === id)?.name ?? id)
      .join(", ");
    missing.push(`Dados/arquivo pendentes: ${names}`);
  }

  return {
    id: "certifications",
    complete: notAnswered.length === 0 && incompleteOwned.length === 0,
    missing,
  };
};

/* ------------------------------------------------------------------ */
/* Completude por etapa                                                */
/* ------------------------------------------------------------------ */

export const getStepStatus = (
  stepId: StepId,
  profile: ProfileRow,
  certs: CertRow,
  data: OnboardingData | null | undefined,
): StepStatus => {
  switch (stepId) {
    case "personal": {
      const missing = missingFields(profile, PERSONAL_REQUIRED);
      return { id: "personal", complete: missing.length === 0, missing };
    }
    case "address": {
      const missing = missingFields(profile, ADDRESS_REQUIRED);
      return { id: "address", complete: missing.length === 0, missing };
    }
    case "professional": {
      const missing = missingFields(profile, PROFESSIONAL_REQUIRED);
      return { id: "professional", complete: missing.length === 0, missing };
    }
    case "certifications":
      return getCertificationsStatus(certs, data);
    case "documents": {
      const missing: string[] = [];
      if (!hasValue(profile?.cv_file_path)) missing.push("Currículo (CV)");
      return { id: "documents", complete: missing.length === 0, missing };
    }
    // welcome / review não têm requisitos próprios
    default:
      return { id: stepId, complete: true, missing: [] };
  }
};

export const getAllStepStatuses = (
  profile: ProfileRow,
  certs: CertRow,
  data: OnboardingData | null | undefined,
): Record<StepId, StepStatus> => {
  const result = {} as Record<StepId, StepStatus>;
  STEPS.forEach((s) => {
    result[s.id] = getStepStatus(s.id, profile, certs, data);
  });
  return result;
};

/** Percentual de prontidão (0-100) baseado nas etapas pontuáveis. */
export const computeReadiness = (
  profile: ProfileRow,
  certs: CertRow,
  data: OnboardingData | null | undefined,
): number => {
  const done = SCORED_STEPS.filter((id) => getStepStatus(id, profile, certs, data).complete).length;
  return Math.round((done / SCORED_STEPS.length) * 100);
};

/** True quando o perfil está pronto para contratação (todas as etapas pontuáveis completas). */
export const isReadyToComplete = (
  profile: ProfileRow,
  certs: CertRow,
  data: OnboardingData | null | undefined,
): boolean => SCORED_STEPS.every((id) => getStepStatus(id, profile, certs, data).complete);

/** Índice da primeira etapa incompleta (para retomada); cai em "documents" se tudo ok. */
export const firstIncompleteStepIndex = (
  profile: ProfileRow,
  certs: CertRow,
  data: OnboardingData | null | undefined,
): number => {
  for (const id of SCORED_STEPS) {
    if (!getStepStatus(id, profile, certs, data).complete) {
      return STEPS.find((s) => s.id === id)!.index;
    }
  }
  return STEPS.find((s) => s.id === "review")!.index;
};

/* ------------------------------------------------------------------ */
/* Conversão de datas (compartilhado com CandidateSettings)            */
/* ------------------------------------------------------------------ */

/** DD/MM/YYYY → YYYY-MM-DD (idempotente para valores já ISO). */
export const brToISO = (br: string | null | undefined): string | null => {
  if (!br) return null;
  const iso = br.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return br;
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return br;
};

/** YYYY-MM-DD → DD/MM/YYYY (idempotente para valores já BR). */
export const isoToBR = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
};

/** Aplica a máscara DD/MM/YYYY sobre a digitação livre. */
export const maskDateBR = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/** Converte uma data BR completa (DD/MM/YYYY) em Date, ou null se inválida. */
export const parseBRDate = (br: string | null | undefined): Date | null => {
  if (!br) return null;
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  // Rejeita datas impossíveis (ex.: 31/02) que o Date "corrige".
  if (d.getFullYear() !== Number(m[3]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) {
    return null;
  }
  return d;
};

/** True se a data de validade (DD/MM/YYYY) já passou (é anterior a hoje). */
export const isValidityExpired = (br: string | null | undefined): boolean => {
  const d = parseBRDate(br);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};
