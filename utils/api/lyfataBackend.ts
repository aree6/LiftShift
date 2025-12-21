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
    if ((import.meta as any).env?.DEV && isLocalhostUrl(normalized)) return '';
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

export interface BackendLyfatLoginResponse {
  api_key: string;
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

export const lyfatBackendValidateApiKey = async (apiKey: string): Promise<boolean> => {
  const res = await fetch(buildBackendUrl('/api/lyfta/validate'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    const msg = await parseError(res);
    console.error('Lyfta API key validation failed:', msg);
    return false;
  }

  const data = (await res.json()) as { valid: boolean };
  return data.valid === true;
};

export const lyfatBackendGetSets = async <TSet>(apiKey: string): Promise<BackendSetsResponse<TSet>> => {
  const res = await fetch(buildBackendUrl('/api/lyfta/sets'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as BackendSetsResponse<TSet>;
};
