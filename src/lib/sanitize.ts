/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 * All user inputs should be sanitized before being sent to the server or rendered.
 */

/**
 * Strip HTML tags and dangerous characters from a string.
 * Use this for all text inputs before sending to the server.
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-like patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize an email address - only allows valid email characters.
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.@_+-]/g, '')
    .slice(0, 255);
}

/**
 * Sanitize a phone number - only allows digits, +, spaces, dashes and parentheses.
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[^0-9+\-() ]/g, '')
    .slice(0, 20);
}

/**
 * Sanitize a name - removes non-alphabetic characters except spaces, hyphens and accented chars.
 */
export function sanitizeName(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{M}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Sanitize a CPF/RG - only digits and dots/dashes.
 */
export function sanitizeDocument(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[^0-9.\-/]/g, '').slice(0, 20);
}

/**
 * Sanitize a URL - validates basic URL structure.
 */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  
  // Block javascript: and data: protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
  
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize a generic object recursively - applies sanitizeText to all string values.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeText(value, 5000);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return sanitized;
}
