import type {
  HevyAccountResponse,
  HevyLoginResponse,
  HevyPagedWorkoutsResponse,
} from './types';
import { clearTokenCache, getRecaptchaToken } from './hevyRecaptcha';
import { timeoutSignal } from './abortSignal';

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

const HEVY_BASE_URL = process.env.HEVY_BASE_URL ?? 'https://api.hevyapp.com';

const HEVY_LOGIN_TIMEOUT_MS = 130_000;
const HEVY_REFRESH_TIMEOUT_MS = 60_000;
const HEVY_REFRESH_PATH = '/auth/refresh_token';

type HevyRequestContext = {
  traceId?: string;
};

// Build headers for OAuth2 Bearer token authentication
const buildHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': requireEnv('HEVY_X_API_KEY'),
    'Origin': 'https://www.hevy.com',
    'Referer': 'https://www.hevy.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Hevy-Platform': 'web',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return headers;
};

const mapOAuthResponse = (data: HevyLoginResponse): HevyLoginResponse => {
  if (data.access_token && !data.auth_token) {
    data.auth_token = data.access_token;
  }
  return data;
};

const parseErrorBody = async (res: Response): Promise<string> => {
  try {
    const text = await res.text();
    return text || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
};

const buildEndpointUrl = (path: string): string => (
  path.startsWith('/') ? `${HEVY_BASE_URL}${path}` : `${HEVY_BASE_URL}/${path}`
);

export const hevyLogin = async (
  emailOrUsername: string,
  password: string,
  context: HevyRequestContext = {}
): Promise<HevyLoginResponse> => {
  const startedAt = Date.now();
  const tokenResult = await getRecaptchaToken();
  const { token: recaptchaToken, usedCache } = tokenResult;
  const tokenMs = Date.now() - startedAt;

  if (usedCache) {
    clearTokenCache();
  }

  const attemptLogin = async (token: string): Promise<{ res: Response; token: string }> => {
    const headers = buildHeaders();
    const body = { emailOrUsername, password, recaptchaToken: token, useAuth2_0: true };

    let res: Response;
    try {
      res = await fetch(buildEndpointUrl('/login'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: timeoutSignal(HEVY_LOGIN_TIMEOUT_MS),
      });
    } catch (err) {
      throw err;
    }
    
    return { res, token };
  };

  const upstreamStart = Date.now();
  let { res } = await attemptLogin(recaptchaToken);

  if (res.status === 400) {
    const freshResult = await getRecaptchaToken();
    const retryResult = await attemptLogin(freshResult.token);
    res = retryResult.res;
    
    if (freshResult.usedCache) {
      clearTokenCache();
    }
  }
  const upstreamMs = Date.now() - upstreamStart;

  // Stage-split timing: `acquire` covers queue waiting AND browser launch +
  // page load on the cold path (see RecaptchaTokenResult), so a login that
  // queued behind a concurrent warmup shows up here instead of hiding inside
  // the route total.
  console.log(
    `🔐 ${emailOrUsername} stages: via=${tokenResult.source} ` +
    `acquire=${formatDuration(tokenResult.acquireMs)} ` +
    `qpos=${tokenResult.queuePosition} exec=${formatDuration(tokenResult.executeMs)} ` +
    `upstream=${formatDuration(upstreamMs)} total=${formatDuration(Date.now() - startedAt)}`
  );

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  const payload = mapOAuthResponse(await res.json() as HevyLoginResponse);
  return payload;
};

export const hevyRefreshToken = async (
  refreshToken: string,
  accessToken?: string,
  context: HevyRequestContext = {}
): Promise<HevyLoginResponse> => {
  const startedAt = Date.now();
  const trimmedRefreshToken = String(refreshToken ?? '').trim();
  if (!trimmedRefreshToken) {
    const err = new Error('Missing refresh_token');
    (err as any).statusCode = 400;
    throw err;
  }

  const headers = buildHeaders(accessToken);
  const body = { refresh_token: trimmedRefreshToken };
  const refreshUrl = buildEndpointUrl(HEVY_REFRESH_PATH);

  let res: Response;
  try {
    res = await fetch(refreshUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: timeoutSignal(HEVY_REFRESH_TIMEOUT_MS),
    });
  } catch (err) {
    throw err;
  }

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  const payload = mapOAuthResponse(await res.json() as HevyLoginResponse);
  return payload;
};

// Validate token by checking expiry or making a test request
export const hevyValidateAuthToken = async (accessToken: string): Promise<boolean> => {
  try {
    await hevyGetAccount(accessToken);
    return true;
  } catch (err) {
    const status = (err as any)?.statusCode;
    if (status === 401) return false;
    throw err;
  }
};

export const hevyGetAccount = async (accessToken: string): Promise<HevyAccountResponse> => {
  const res = await fetch(`${HEVY_BASE_URL}/user/account`, {
    method: 'GET',
    headers: buildHeaders(accessToken),
    // Fail fast: a hung upstream must not park the Express request (and its
    // buffered history) until the client's own timeout fires.
    signal: timeoutSignal(20_000),
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  return (await res.json()) as HevyAccountResponse;
};

export const hevyGetWorkoutsPaged = async (
  accessToken: string,
  opts: { username: string; offset: number; limit?: number }
): Promise<HevyPagedWorkoutsResponse> => {
  const limit = Math.min(Math.max(opts.limit ?? 5, 1), 10);
  const chunkSize = 5;
  const maxChunks = Math.ceil(limit / chunkSize);
  const workouts: HevyPagedWorkoutsResponse['workouts'] = [];

  for (let i = 0; i < maxChunks; i += 1) {
    const chunkOffset = opts.offset + (i * chunkSize);
    const params = new URLSearchParams({
      username: opts.username,
      offset: String(chunkOffset),
    });

    const res = await fetch(`${HEVY_BASE_URL}/user_workouts_paged?${params.toString()}`, {
      method: 'GET',
      headers: buildHeaders(accessToken),
      signal: timeoutSignal(20_000),
    });

    if (!res.ok) {
      const msg = await parseErrorBody(res);
      const err = new Error(msg);
      (err as any).statusCode = res.status;
      throw err;
    }

    const data = (await res.json()) as HevyPagedWorkoutsResponse;
    const chunkWorkouts = data.workouts ?? [];
    workouts.push(...chunkWorkouts);

    if (chunkWorkouts.length < chunkSize) break;
    if (workouts.length >= limit) break;
  }

  return { workouts: workouts.slice(0, limit) };
};
