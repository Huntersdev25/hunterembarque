/**
 * Serviço para integração com a API ViaCEP
 * Permite buscar informações de endereço através do CEP
 */

export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/** Consulta o ViaCEP. Retorna dados, null (não encontrado) ou lança em falha de rede. */
const fetchFromViaCep = async (cleanCep: string): Promise<CepData | null> => {
  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  if (!response.ok) throw new Error(`ViaCEP HTTP ${response.status}`);
  const data = await response.json();
  // Quando não encontra, o ViaCEP devolve { "erro": "true" } (string) ou { "erro": true }.
  if (data?.erro) return null;
  return {
    cep: data.cep ?? '',
    logradouro: data.logradouro ?? '',
    complemento: data.complemento ?? '',
    bairro: data.bairro ?? '',
    localidade: data.localidade ?? '',
    uf: data.uf ?? '',
  };
};

/** Consulta a BrasilAPI (fallback, domínio/fonte diferentes). */
const fetchFromBrasilApi = async (cleanCep: string): Promise<CepData | null> => {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
  if (response.status === 404) return null; // não encontrado
  if (!response.ok) throw new Error(`BrasilAPI HTTP ${response.status}`);
  const data = await response.json();
  return {
    cep: data.cep ?? '',
    logradouro: data.street ?? '',
    complemento: '',
    bairro: data.neighborhood ?? '',
    localidade: data.city ?? '',
    uf: data.state ?? '',
  };
};

/**
 * Busca dados do endereço através do CEP.
 * Tenta o ViaCEP e, em caso de falha (indisponibilidade, throttling, bloqueio),
 * faz fallback para a BrasilAPI. Só retorna null quando AMBOS confirmam que o
 * CEP não existe. Assim um CEP válido não é reportado como "não encontrado" por
 * uma falha transitória de uma das APIs.
 * @param cep - CEP no formato 12345-678 ou 12345678
 * @returns dados do endereço, ou null se realmente não encontrado
 */
export const fetchCepData = async (cep: string): Promise<CepData | null> => {
  const cleanCep = (cep ?? '').replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  let viaCepSaidNotFound = false;

  // 1) ViaCEP
  try {
    const data = await fetchFromViaCep(cleanCep);
    if (data) return data;
    viaCepSaidNotFound = true; // encontrou resposta, mas CEP inexistente
  } catch (error) {
    console.warn('ViaCEP indisponível, tentando BrasilAPI...', error);
  }

  // 2) Fallback BrasilAPI
  try {
    const data = await fetchFromBrasilApi(cleanCep);
    if (data) return data;
  } catch (error) {
    console.warn('BrasilAPI indisponível.', error);
    // Se a BrasilAPI falhou por rede mas o ViaCEP já dissera "não encontrado",
    // confiamos no ViaCEP. Caso contrário, não conseguimos confirmar.
    if (!viaCepSaidNotFound) return null;
  }

  return null;
};

/**
 * Formata CEP para o padrão brasileiro (12345-678)
 * @param cep - CEP sem formatação
 * @returns CEP formatado
 */
export const formatCep = (cep: string): string => {
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Valida o FORMATO do CEP (8 dígitos). Verificação síncrona e barata,
 * usada para liberar a chamada à API.
 * @param cep - CEP a ser validado
 * @returns true se o formato é válido
 */
export const isValidCep = (cep: string): boolean => {
  const cleanCep = cep.replace(/\D/g, '');
  return cleanCep.length === 8;
};

/**
 * Valida a EXISTÊNCIA do CEP consultando a API do ViaCEP.
 * Retorna true apenas quando o CEP tem formato válido E é encontrado.
 * Use para validação autoritativa (o formato sozinho não garante que o CEP existe).
 * @param cep - CEP a ser validado
 */
export const validateCep = async (cep: string): Promise<boolean> => {
  if (!isValidCep(cep)) return false;
  const data = await fetchCepData(cep);
  return data !== null;
};