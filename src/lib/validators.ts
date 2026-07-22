/**
 * Validadores de documentos brasileiros: CPF e RG.
 *
 * CPF — validação AUTORITATIVA via dígitos verificadores (módulo 11).
 * RG  — o RG NÃO possui padrão nacional nem checksum universal (cada SSP
 *       estadual emite no seu próprio formato). Portanto oferecemos:
 *         - `isValidRG`: validação de FORMATO/plausibilidade (tamanho + não repetido)
 *         - `isValidRGSP`: dígito verificador específico do RG emitido em SP (SSP-SP)
 *       Use RG como aviso ("parece inválido"), não como bloqueio absoluto.
 */

const onlyDigits = (v: string): string => (v ?? "").replace(/\D/g, "");

/* ------------------------------------------------------------------ */
/* CPF                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Valida um CPF pelos dígitos verificadores (algoritmo oficial, módulo 11).
 * Aceita entrada formatada ou não. Rejeita tamanho ≠ 11 e sequências repetidas.
 */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11) return false;
  // Rejeita CPFs com todos os dígitos iguais (ex.: 111.111.111-11), que passam
  // no cálculo mas são inválidos.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 || rest === 11 ? 0 : rest;
  };

  if (checkDigit(9) !== digits[9]) return false;
  if (checkDigit(10) !== digits[10]) return false;

  return true;
}

/** Formata um CPF para 000.000.000-00 (parcial enquanto digita). */
export function formatCPF(value: string): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/* ------------------------------------------------------------------ */
/* RG                                                                  */
/* ------------------------------------------------------------------ */

/** Normaliza RG: só dígitos + um eventual "X" verificador (maiúsculo) no fim. */
const normalizeRG = (value: string): string =>
  (value ?? "").toUpperCase().replace(/[^0-9X]/g, "").replace(/X(?=.)/g, ""); // X só é válido no fim

/**
 * Validação de FORMATO/plausibilidade do RG (NÃO é autoritativa).
 * O RG não tem padrão nacional — cada estado emite no seu formato e o
 * comprimento varia. Consideramos válido quando tem de 7 a 14 caracteres
 * (dígitos, com possível "X" verificador no fim) e não é uma sequência
 * de caracteres repetidos. Use apenas como aviso, nunca como bloqueio duro.
 */
export function isValidRG(value: string): boolean {
  const rg = normalizeRG(value);
  if (rg.length < 7 || rg.length > 14) return false;
  // "X" só pode aparecer como último caractere (verificador)
  if (/X/.test(rg.slice(0, -1))) return false;
  // Rejeita repetições óbvias (ex.: 000000000, 999999999)
  if (/^(.)\1+$/.test(rg)) return false;
  return true;
}

/**
 * Valida o dígito verificador do RG emitido em São Paulo (SSP-SP).
 * Formato esperado: 8 dígitos-base + 1 verificador (0-9 ou X), total 9.
 * Observação: aplicável apenas a RGs de SP — outros estados não seguem esta regra.
 */
export function isValidRGSP(value: string): boolean {
  const rg = normalizeRG(value);
  if (rg.length !== 9) return false;
  if (/X/.test(rg.slice(0, -1))) return false;

  const base = rg.slice(0, 8).split("").map(Number);
  if (base.some(Number.isNaN)) return false;

  // Pesos 2..9 aplicados aos 8 dígitos-base.
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += base[i] * (i + 2);
  }
  const rest = sum % 11;
  const expected = rest === 10 ? "X" : String(rest);

  return rg[8] === expected;
}

/**
 * Sanitiza a digitação do RG sem impor um formato estadual específico.
 * Mantém apenas dígitos e um eventual "X" verificador no fim, com um limite
 * generoso (14) para não truncar RGs mais longos. NÃO aplica pontuação, pois
 * o formato varia entre estados.
 */
export function formatRG(value: string): string {
  const raw = (value ?? "").toUpperCase().replace(/[^0-9X]/g, "").slice(0, 14);
  // Remove qualquer "X" que não esteja na última posição.
  return raw.replace(/X(?=.)/g, "");
}

/** Formata um RG no padrão SP 00.000.000-0 (apenas para RGs de SP, se desejado). */
export function formatRGSP(value: string): string {
  const rg = (value ?? "").toUpperCase().replace(/[^0-9X]/g, "").slice(0, 9);
  return rg
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})([0-9X])/, "$1.$2.$3-$4");
}
