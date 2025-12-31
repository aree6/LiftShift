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

export const getBackendBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const normalized = normalizeBaseUrl(envUrl.trim());
    // In dev, prefer same-origin + Vite proxy so the app works on LAN devices.
    if ((import.meta as any).env?.DEV && isLocalhostUrl(normalized)) return '';

    // If you built with a localhost backend URL and then open the app from another device
    // (e.g. phone on LAN), "localhost" will point at the phone. Rewrite to the current
    // page hostname to keep local preview/testing functional.
    if (isLocalhostUrl(normalized) && !isWindowLocalhost()) {
      return rewriteLocalhostToWindowHostname(normalized);
    }

    return normalized;
  }
  if ((import.meta as any).env?.DEV) return '';
  return '';
};

const parseError = async (res: Response): Promise<string> => {
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

export interface BackendLoginResponse {
  auth_token: string;
  user_id: string;
  expires_at?: string;
}

export interface BackendSetsResponse<TSet> {
  sets: TSet[];
  meta?: {
    workouts?: number;
  };
}

const buildBackendUrl = (path: string): string => {
  const base = getBackendBaseUrl();
  if (!base && !(import.meta as any).env?.DEV) throw new Error('Missing VITE_BACKEND_URL (backend API).');
  return base ? `${base}${path}` : path;
};

export const hevyBackendLogin = async (emailOrUsername: string, password: string): Promise<BackendLoginResponse> => {
  const res = await fetch(buildBackendUrl('/api/hevy/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as BackendLoginResponse;
};

export const hevyBackendGetAccount = async (authToken: string): Promise<{ username: string }> => {
  const res = await fetch(buildBackendUrl('/api/hevy/account'), {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'auth-token': authToken,
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { username?: string };
  if (!json.username) throw new Error('Failed to read Hevy username from backend.');
  return { username: json.username };
};

export const hevyBackendGetSets = async <TSet>(authToken: string, username: string): Promise<BackendSetsResponse<TSet>> => {
  const params = new URLSearchParams({ username });
  const res = await fetch(buildBackendUrl(`/api/hevy/sets?${params.toString()}`), {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'auth-token': authToken,
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as BackendSetsResponse<TSet>;
};

// ============================================================================
// Official Hevy API (API Key authentication)
// ============================================================================

export const hevyBackendValidateApiKey = async (apiKey: string): Promise<{ valid: boolean }> => {
  const res = await fetch(buildBackendUrl('/api/hevy/apikey/validate'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { valid: boolean };
};

export const hevyBackendGetWorkoutCount = async (apiKey: string): Promise<{ workout_count: number }> => {
  const res = await fetch(buildBackendUrl('/api/hevy/apikey/count'), {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'api-key': apiKey,
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { workout_count: number };
};

export const hevyBackendGetSetsWithApiKey = async <TSet>(apiKey: string): Promise<BackendSetsResponse<TSet>> => {
  const res = await fetch(buildBackendUrl('/api/hevy/apikey/sets'), {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'api-key': apiKey,
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as BackendSetsResponse<TSet>;
};
