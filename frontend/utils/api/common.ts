import { mergeAnalyticsHeaders } from '../integrations/analyticsClientId';

export interface BackendSetsResponse<TSet> {
  sets: TSet[];
  meta?: {
    workouts?: number;
    truncated?: boolean;
  };
  username?: string;
}

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/g, '');

const isLocalhostUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const getWindowHostname = (): string | null => {
  try {
    return typeof window !== 'undefined' ? window.location.hostname : null;
  } catch {
    return null;
  }
};

const isPrivateLanHostname = (hostname: string): boolean => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
};

const isWindowLocalhost = (): boolean => {
  const host = getWindowHostname();
  return host === 'localhost' || host === '127.0.0.1';
};

const rewriteLocalhostToWindowHostname = (url: string): string => {
  try {
    const u = new URL(url);
    const host = getWindowHostname();
    if (!host || isWindowLocalhost()) return url;
    if (!isPrivateLanHostname(host)) return url;
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return url;
    u.hostname = host;
    return u.toString().replace(/\/+$/g, '');
  } catch {
    return url;
  }
};

const stripTrailingApiPath = (url: string): string => {
  const normalized = normalizeBaseUrl(url);
  try {
    const u = new URL(normalized);
    if (u.pathname === '/api') {
      u.pathname = '';
      return normalizeBaseUrl(u.toString());
    }
    return normalized;
  } catch {
    return normalized.replace(/\/api$/g, '');
  }
};

const getRuntimeEnvUrl = (): string | undefined => {
  try {
    const w = window as unknown as { __LIFTSHIFT_ENV__?: { VITE_BACKEND_URL?: unknown } };
    const v = w.__LIFTSHIFT_ENV__?.VITE_BACKEND_URL;
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  } catch {
    return undefined;
  }
};

export const getBackendBaseUrl = (): string => {
  // Docker runtime injection wins over build-time Vite env so one image
  // works everywhere without rebuilding (see frontend/public/env.js).
  const envUrl = getRuntimeEnvUrl() ?? (import.meta.env.VITE_BACKEND_URL as string | undefined);
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const normalized = stripTrailingApiPath(envUrl.trim());
    // In dev, prefer same-origin + Vite proxy so the app works on LAN devices.
    if (import.meta.env.DEV && isLocalhostUrl(normalized)) return '';

    // If you built with a localhost backend URL and then open the app from another device
    // (e.g. phone on LAN), "localhost" will point at the phone. Rewrite to the current
    // page hostname to keep local preview/testing functional.
    if (isLocalhostUrl(normalized) && !isWindowLocalhost()) {
      return rewriteLocalhostToWindowHostname(normalized);
    }

    return normalized;
  }
  if (import.meta.env.DEV) return '';
  return '';
};

export const parseError = async (res: Response): Promise<string> => {
  try {
    const data = await res.json();
    const msg = (data && (data.error || data.detail)) as string | undefined;
    return msg || `${res.status} ${res.statusText}`;
  } catch {
    try {
      const text = await res.text();
      return text || `${res.status} ${res.statusText}`;
    } catch {
      return `${res.status} ${res.statusText}`;
    }
  }
};

export const buildBackendUrl = (path: string): string => {
  const base = getBackendBaseUrl();
  // Empty base = same-origin /api (Vite dev proxy or Docker Nginx proxy).
  // This keeps `docker compose up` working without a rebuild.
  return base ? `${base}${path}` : path;
};

/**
 * Parse a `Retry-After` header value into seconds.
 * Handles delta-seconds ("60") and HTTP-date forms; returns null when the
 * header is absent or unparseable so callers fall back to existing behavior.
 */
export const parseRetryAfterSeconds = (value: string | null | undefined): number | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.floor(asNumber);
  }
  const when = Date.parse(trimmed);
  if (Number.isFinite(when)) {
    return Math.max(0, Math.floor((when - Date.now()) / 1000));
  }
  return null;
};
