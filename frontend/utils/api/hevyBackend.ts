import { mergeAnalyticsHeaders } from '../integrations/analyticsClientId';
import { buildBackendUrl, parseError, parseRetryAfterSeconds, type BackendSetsResponse } from './common';
import { browserCache } from '../storage/browserCache';

export interface BackendLoginResponse {
  auth_token: string;
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  expires_at?: string;
}

const throwBackendError = async (res: Response): Promise<never> => {
  // Clone before parseError() consumes the body so Agent A's ours-marker
  // (backend/src/index.ts limiter handler stamps source='our-loginLimiter' on
  // 429s) can be captured best-effort; absent on older deploys → undefined.
  let rateLimitSource: string | undefined;
  try {
    const body = (await res.clone().json()) as { source?: unknown };
    if (body && typeof body.source === 'string' && body.source) rateLimitSource = body.source;
  } catch {
    // Non-JSON body — no marker to capture.
  }
  const err = new Error(await parseError(res));
  (err as any).statusCode = res.status;
  if (rateLimitSource) (err as any).rateLimitSource = rateLimitSource;
  // B1: honor the server's Retry-After when present (the limiter handler
  // guarantees the header; express-rate-limit v8 also sets it). All
  // same-origin /api responses are ours by construction, so honor the header
  // whenever present and keep existing behavior otherwise.
  const retryAfterSeconds = parseRetryAfterSeconds(
    typeof res.headers?.get === 'function' ? res.headers.get('retry-after') : null
  );
  if (retryAfterSeconds != null) (err as any).retryAfterSeconds = retryAfterSeconds;
  if (res.status === 429 && retryAfterSeconds != null) {
    recordLoginRateLimitRetryAfter(retryAfterSeconds);
  }
  throw err;
};

// Login 5/min buckets (backend/src/index.ts createRouteLimiter — per-route,
// brute-force cap unchanged). A 429's Retry-After is stashed here so the login
// form's existing cooldown countdown can honor it; entries expire naturally
// (range-checked on read) so a stale stash can never block a later attempt.
const LOGIN_RETRY_AT_KEY = 'hevy_login_retry_at_ms';
const MAX_RATE_LIMIT_COOLDOWN_S = 120; // Matches the existing CredentialsContent ceiling.

export const recordLoginRateLimitRetryAfter = (retryAfterSeconds: number): void => {
  try {
    if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) return;
    const capped = Math.min(Math.ceil(retryAfterSeconds), MAX_RATE_LIMIT_COOLDOWN_S);
    window.localStorage.setItem(LOGIN_RETRY_AT_KEY, String(Date.now() + capped * 1000));
  } catch {
    // Storage unavailable — cooldown falls back to the existing default.
  }
};

export const getLoginRateLimitCooldownSeconds = (fallbackSeconds: number): number => {
  try {
    const raw = window.localStorage.getItem(LOGIN_RETRY_AT_KEY);
    if (!raw) return fallbackSeconds;
    const retryAt = Number(raw);
    if (!Number.isFinite(retryAt)) return fallbackSeconds;
    const remaining = Math.ceil((retryAt - Date.now()) / 1000);
    if (remaining < 1 || remaining > MAX_RATE_LIMIT_COOLDOWN_S) return fallbackSeconds;
    return remaining;
  } catch {
    return fallbackSeconds;
  }
};

// B2: cross-tab/reload in-flight login marker, one entry per account. Set when
// a /login request starts, cleared when it settles; a surviving entry means a
// login is (or was very recently) running in another tab or before a reload.
// TTL-bounded so a crashed tab can only suppress one auto-retry for ≤135s.
const LOGIN_INFLIGHT_PREFIX = 'hevy_login_inflight:';

const loginInflightKey = (account: string): string =>
  `${LOGIN_INFLIGHT_PREFIX}${account.trim().toLowerCase()}`;

export const isLoginInFlight = (account: string, maxAgeMs: number = BACKEND_TIMEOUT_MS): boolean => {
  try {
    const raw = window.localStorage.getItem(loginInflightKey(account));
    if (!raw) return false;
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt)) return false;
    return Date.now() - startedAt < maxAgeMs;
  } catch {
    return false;
  }
};

const markLoginInflight = (account: string): void => {
  try {
    window.localStorage.setItem(loginInflightKey(account), String(Date.now()));
  } catch {
    // ignore — dedup is best-effort
  }
};

const clearLoginInflight = (account: string): void => {
  try {
    window.localStorage.removeItem(loginInflightKey(account));
  } catch {
    // ignore
  }
};

const BACKEND_TIMEOUT_MS = (() => {
  const raw = Number(import.meta.env.VITE_BACKEND_TIMEOUT_MS ?? 135_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 135_000;
})();

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = BACKEND_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as any)?.name === 'AbortError') {
      const timeoutErr = new Error(`Request timed out after ${timeoutMs}ms`);
      (timeoutErr as any).statusCode = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const hevyBackendValidateAuthToken = async (authToken: string): Promise<boolean> => {
  let res: Response;
  try {
    res = await fetchWithTimeout(buildBackendUrl('/api/hevy/validate'), {
      method: 'POST',
      headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ auth_token: authToken }),
    });
  } catch (err) {
    console.error('Hevy auth token validation failed: network error', err);
    return false;
  }

  if (!res.ok) {
    const msg = await parseError(res);
    console.error('Hevy auth token validation failed:', msg);
    return false;
  }

  const data = (await res.json()) as { valid: boolean };
  return data.valid === true;
};


export const hevyBackendValidateProApiKey = async (apiKey: string): Promise<boolean> => {
  const url = buildBackendUrl('/api/hevy/api-key/validate');
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    const msg = await parseError(res);
    console.error('Hevy Pro API key validation failed:', { url, status: res.status, msg });
    if (res.status === 404) {
      const notFound = new Error(
        'Backend returned 404 for Hevy Pro API key validation. Check that VITE_BACKEND_URL is correct (no trailing /api) and that your backend has been redeployed to the latest version.'
      );
      (notFound as any).statusCode = res.status;
      throw notFound;
    }
    return false;
  }

  const data = (await res.json()) as { valid: boolean };
  return data.valid === true;
};

export const hevyBackendGetSetsWithProApiKey = async <TSet>(apiKey: string): Promise<BackendSetsResponse<TSet>> => {
  const cacheKey = browserCache.getCacheKey('hevyPro', apiKey);
  const cached = browserCache.getCached<BackendSetsResponse<TSet>>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = buildBackendUrl('/api/hevy/api-key/sets');
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    const msg = await parseError(res);
    console.error('Hevy Pro API key sets fetch failed:', { url, status: res.status, msg });
    if (res.status === 404) {
      const notFound = new Error(
        'Backend returned 404 for Hevy Pro API key sync. Check that VITE_BACKEND_URL is correct (no trailing /api) and that your backend has been redeployed to the latest version.'
      );
      (notFound as any).statusCode = res.status;
      throw notFound;
    }
    const httpErr = new Error(msg);
    (httpErr as any).statusCode = res.status;
    throw httpErr;
  }
  const data = (await res.json()) as BackendSetsResponse<TSet>;
  browserCache.setCache(cacheKey, data);
  return data;
};

export const hevyBackendLogin = async (emailOrUsername: string, password: string): Promise<BackendLoginResponse> => {
  const cacheKey = browserCache.getCacheKey('hevyLogin', emailOrUsername.toLowerCase());
  browserCache.clearCache('hevyLogin', emailOrUsername.toLowerCase());

  markLoginInflight(emailOrUsername);
  try {
    const res = await fetchWithTimeout(buildBackendUrl('/api/hevy/login'), {
      method: 'POST',
      headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ emailOrUsername, password }),
    });

    if (!res.ok) return throwBackendError(res);
    const data = (await res.json()) as BackendLoginResponse;

    if (data.auth_token) {
      browserCache.setCache(cacheKey, data);
    }

    return data;
  } finally {
    clearLoginInflight(emailOrUsername);
  }
};

export const hevyBackendWarmupSession = async (
  emailOrUsername: string,
  timeoutMs: number = 20_000
): Promise<boolean> => {
  const res = await fetchWithTimeout(
    buildBackendUrl('/api/hevy/recaptcha/session-warmup'),
    {
      method: 'POST',
      headers: mergeAnalyticsHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ emailOrUsername }),
    },
    timeoutMs
  );

  if (!res.ok) return false;
  const json = (await res.json()) as { warmed?: boolean };
  return Boolean(json.warmed);
};

export const hevyBackendRefresh = async (
  authToken: string | null,
  refreshToken: string,
  emailOrUsername?: string | null
): Promise<BackendLoginResponse> => {
  const cacheKey = browserCache.getCacheKey('hevyLogin', (emailOrUsername || 'unknown').toLowerCase());
  browserCache.clearCache('hevyLogin', (emailOrUsername || 'unknown').toLowerCase());
  
  const res = await fetchWithTimeout(buildBackendUrl('/api/hevy/refresh'), {
    method: 'POST',
    headers: mergeAnalyticsHeaders({
      'content-type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    }),
    body: JSON.stringify({
      auth_token: authToken || undefined,
      refresh_token: refreshToken,
      emailOrUsername: emailOrUsername?.trim() || undefined,
    }),
  });

  if (!res.ok) return throwBackendError(res);
  const data = (await res.json()) as BackendLoginResponse;
  
  if (data.auth_token) {
    browserCache.setCache(cacheKey, data);
  }
  
  return data;
};

export const hevyBackendGetAccount = async (authToken: string): Promise<{ username: string; email?: string }> => {
  const cacheKey = browserCache.getCacheKey('hevyAccount', authToken);
  const cached = browserCache.getCached<{ username: string; email?: string }>(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetchWithTimeout(buildBackendUrl('/api/hevy/account'), {
    method: 'GET',
    headers: {
      ...mergeAnalyticsHeaders({
        'content-type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      }),
    },
  });

  if (!res.ok) return throwBackendError(res);
  const json = (await res.json()) as { username?: string; email?: string };
  if (!json.username) throw new Error('Failed to read Hevy username from backend.');
  
  const data = { username: json.username, email: json.email };
  browserCache.setCache(cacheKey, data);
  return data;
};

export const hevyBackendGetSets = async <TSet>(authToken: string, username: string): Promise<BackendSetsResponse<TSet>> => {
  const cacheKey = browserCache.getCacheKey('hevySets', username);
  const cached = browserCache.getCached<BackendSetsResponse<TSet>>(cacheKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({ username });
  const res = await fetchWithTimeout(buildBackendUrl(`/api/hevy/sets?${params.toString()}`), {
    method: 'GET',
    headers: {
      ...mergeAnalyticsHeaders({
        'content-type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      }),
    },
  });

  if (!res.ok) return throwBackendError(res);
  const data = (await res.json()) as BackendSetsResponse<TSet>;
  browserCache.setCache(cacheKey, data);
  return data;
};
