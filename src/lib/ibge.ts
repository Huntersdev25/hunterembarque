/**
 * Utilidades de localidades brasileiras (UFs e municípios) via API do IBGE.
 */

export interface UF {
  sigla: string;
  nome: string;
}

/** As 27 unidades federativas (ordenadas por nome). */
export const UFS: UF[] = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

const municipiosCache: Record<string, string[]> = {};

/** Converte "ANGRA DOS REIS" → "Angra dos Reis" (preposições em minúsculo). */
const titleCase = (s: string): string => {
  const minor = new Set(["da", "de", "do", "das", "dos", "e"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && minor.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
};

/** Fonte primária: IBGE (nomes já em capitalização correta). */
const fromIBGE = async (sigla: string): Promise<string[]> => {
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios?orderBy=nome`,
  );
  if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map((m: { nome: string }) => m.nome).filter(Boolean) : [];
};

/** Fallback: BrasilAPI (nomes em maiúsculas → normalizados). */
const fromBrasilApi = async (sigla: string): Promise<string[]> => {
  const res = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${sigla}`);
  if (!res.ok) throw new Error(`BrasilAPI HTTP ${res.status}`);
  const data = await res.json();
  const nomes: string[] = Array.isArray(data)
    ? data.map((m: { nome: string }) => (m.nome ? titleCase(m.nome) : "")).filter(Boolean)
    : [];
  return nomes.sort((a, b) => a.localeCompare(b, "pt-BR"));
};

/**
 * Retorna os municípios de uma UF (ordenados por nome).
 * Tenta o IBGE e, em caso de falha (indisponibilidade/lentidão), faz fallback
 * para a BrasilAPI. Só cacheia resultados não-vazios.
 */
export const fetchMunicipios = async (uf: string): Promise<string[]> => {
  const sigla = (uf || "").toUpperCase();
  if (!sigla) return [];
  if (municipiosCache[sigla]?.length) return municipiosCache[sigla];

  for (const source of [fromIBGE, fromBrasilApi]) {
    try {
      const nomes = await source(sigla);
      if (nomes.length) {
        municipiosCache[sigla] = nomes;
        return nomes;
      }
    } catch (error) {
      console.warn(`Falha ao buscar municípios (${source.name}) para ${sigla}:`, error);
    }
  }
  return [];
};
