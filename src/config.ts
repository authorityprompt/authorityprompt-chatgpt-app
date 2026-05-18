import "dotenv/config";

export interface AppConfig {
  apiUrl: string;
  defaultDomain: string;
  timeoutMs: number;
  cacheTtlSeconds: number;
  port: number;
}

export function loadConfig(env = process.env): AppConfig {
  return {
    apiUrl: normalizeApiUrl(env.AUTHORITYPROMPT_API_URL || "https://authorityprompt.com"),
    defaultDomain: validateDomain(env.AUTHORITYPROMPT_DEFAULT_DOMAIN || "authorityprompt.com"),
    timeoutMs: positiveInt(env.AUTHORITYPROMPT_TIMEOUT_MS, 10_000),
    cacheTtlSeconds: positiveInt(env.AUTHORITYPROMPT_CACHE_TTL_SECONDS, 300),
    port: positiveInt(env.PORT, 8787)
  };
}

export function validateDomain(domain: string): string {
  const value = String(domain || "").trim().toLowerCase();
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value)) {
    throw new Error("domain must be a bare domain like authorityprompt.com");
  }
  if (value.includes("://") || value.includes("/") || /[<>"'`]/.test(value)) {
    throw new Error("domain contains unsafe characters");
  }
  return value;
}

function normalizeApiUrl(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("AUTHORITYPROMPT_API_URL must use http or https");
  }
  return url.toString().replace(/\/$/, "");
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
