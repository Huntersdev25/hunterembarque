import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a date string safely, treating date-only strings (YYYY-MM-DD) as local time
 * instead of UTC to prevent the "one day behind" bug in negative UTC offsets (e.g. Brazil).
 */
export function parseDateLocal(dateString: string): Date {
  if (!dateString) return new Date(NaN);
  // Date-only format: YYYY-MM-DD (10 chars, no T)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
}

/**
 * Formats a date string to pt-BR locale (dd/mm/yyyy), handling timezone correctly.
 * Use this everywhere instead of `new Date(str).toLocaleDateString('pt-BR')`.
 */
export function formatDateBR(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = parseDateLocal(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}
