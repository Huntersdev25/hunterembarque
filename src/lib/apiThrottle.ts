/**
 * API Governance: Frontend request throttling
 * Prevents excessive API calls from the client side.
 * This is a first line of defense — server-side rate limiting is the real enforcement.
 */

const requestTimestamps: Map<string, number[]> = new Map();

interface ThrottleOptions {
  /** Max requests allowed in the window */
  maxRequests?: number;
  /** Window duration in milliseconds */
  windowMs?: number;
}

const DEFAULTS: Required<ThrottleOptions> = {
  maxRequests: 10,
  windowMs: 60_000, // 1 minute
};

/**
 * Check if a request to the given endpoint should be throttled.
 * Returns true if the request is allowed, false if throttled.
 */
export function isRequestAllowed(
  endpoint: string,
  options?: ThrottleOptions
): boolean {
  const { maxRequests, windowMs } = { ...DEFAULTS, ...options };
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = requestTimestamps.get(endpoint) || [];
  const recent = timestamps.filter((t) => t > cutoff);

  if (recent.length >= maxRequests) {
    requestTimestamps.set(endpoint, recent);
    return false;
  }

  recent.push(now);
  requestTimestamps.set(endpoint, recent);
  return true;
}

/**
 * Wraps a supabase.functions.invoke call with client-side throttling.
 * Throws an error if throttled, so callers can show a toast.
 */
export function throttledInvoke(
  endpoint: string,
  options?: ThrottleOptions
): void {
  if (!isRequestAllowed(endpoint, options)) {
    throw new Error(
      'Muitas requisições em pouco tempo. Aguarde alguns segundos antes de tentar novamente.'
    );
  }
}

/** Preset limits for different endpoint categories */
export const API_LIMITS = {
  /** Chat / AI endpoints — more restrictive */
  chat: { maxRequests: 5, windowMs: 60_000 },
  /** CRUD operations */
  crud: { maxRequests: 15, windowMs: 60_000 },
  /** Reports / heavy queries */
  reports: { maxRequests: 3, windowMs: 60_000 },
  /** Auth-related */
  auth: { maxRequests: 5, windowMs: 300_000 },
  /** Webhooks */
  webhooks: { maxRequests: 10, windowMs: 60_000 },
} as const;
