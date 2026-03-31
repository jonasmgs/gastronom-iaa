const ALLOWED_ORIGINS = [
  "https://app.gastronomia.com.br",
  "https://www.gastronomia.com.br",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "capacitor://localhost",
  "http://localhost",
  "ionic://localhost",
];

const PRODUCTION_DOMAINS = ["gastronomia.com.br", "www.gastronomia.com.br"];

export function getAllowedOrigins(): string[] {
  return ALLOWED_ORIGINS;
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Allow requests without origin header (server-to-server)
  
  const normalizedOrigin = origin.replace(/\/$/, "");
  
  if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
    return true;
  }
  
  for (const domain of PRODUCTION_DOMAINS) {
    if (normalizedOrigin.includes(domain)) {
      return true;
    }
  }
  
  // Allow localhost in development
  if (normalizedOrigin.includes("localhost") || normalizedOrigin.includes("127.0.0.1")) {
    return true;
  }
  
  return false;
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-user-jwt, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 50;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  
  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(userId, newEntry);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: newEntry.resetAt,
    };
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  entry.count += 1;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}

export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredRateLimits, RATE_LIMIT_WINDOW_MS);
