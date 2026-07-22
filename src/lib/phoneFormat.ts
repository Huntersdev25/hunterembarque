/**
 * Formata um número de telefone brasileiro no padrão: +55 21 99712-0006
 * @param value - O valor de entrada (pode conter formatação)
 * @returns O número formatado
 */
export function formatPhoneBR(value: string): string {
  // Remove tudo que não é número
  const onlyNumbers = value.replace(/\D/g, '');
  // Limita a 13 dígitos (DDI 2 + DDD 2 + número 9)
  const limited = onlyNumbers.slice(0, 13);
  
  // Formata: +55 21 99712-0006
  let formatted = '';
  if (limited.length > 0) {
    formatted = '+' + limited.slice(0, 2); // DDI
  }
  if (limited.length > 2) {
    formatted += ' ' + limited.slice(2, 4); // DDD
  }
  if (limited.length > 4) {
    formatted += ' ' + limited.slice(4, 9); // Primeiros 5 dígitos
  }
  if (limited.length > 9) {
    formatted += '-' + limited.slice(9, 13); // Últimos 4 dígitos
  }
  
  return formatted;
}

/**
 * Remove a formatação do telefone e retorna apenas os números
 * @param value - O valor formatado
 * @returns Apenas os números
 */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida se o telefone brasileiro está completo (13 dígitos)
 * @param value - O valor do telefone (formatado ou não)
 * @returns true se o telefone está completo
 */
export function isPhoneComplete(value: string): boolean {
  const onlyNumbers = value.replace(/\D/g, '');
  return onlyNumbers.length === 13;
}
