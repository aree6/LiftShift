import express from 'express';
import { createHash } from 'node:crypto';
import { hevyGetAccount, hevyGetWorkoutsPaged, hevyLogin, hevyRefreshToken, hevyValidateAuthToken } from '../hevyApi';
import { warmRecaptchaSession } from '../hevyRecaptcha';
import { mapHevyWorkoutsToWorkoutSets } from '../mapToWorkoutSets';
import { getClientIP, getCountryFromIP } from '../geoLocation';

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

// Overall ceiling for the credential-login flow (captcha browser + upstream).
// Must stay under the frontend's 135s abort so users get a readable error
// from us instead of a dropped connection. Previously a stuck captcha wait
// parked this request for 210s+.
const LOGIN_ROUTE_TIMEOUT_MS = 120_000;

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string, statusCode: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(message);
      (err as any).statusCode = statusCode;
      reject(err);
    }, ms);
    timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

export const createHevyRouter = (opts: {
  loginLimiter: express.RequestHandler;
  requireAuthTokenHeader: (req: express.Request) => string;
  getCachedResponse: <T>(key: string, compute: () => Promise<T>) => Promise<T>;
}) => {
  const { loginLimiter, requireAuthTokenHeader, getCachedResponse } = opts;
  const router = express.Router();

  router.post('/login', loginLimiter, async (req, res) => {
    const startedAt = Date.now();
    const emailOrUsername = String(req.body?.emailOrUsername ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!emailOrUsername || !password) {
      console.log(`👤 ${emailOrUsername || 'unknown'} ❌ Missing credentials`);
      return res.status(400).json({ error: 'Missing emailOrUsername or password' });
    }

    try {
      const data = await withTimeout(
        hevyLogin(emailOrUsername, password),
        LOGIN_ROUTE_TIMEOUT_MS,
        'Login verification timed out. Please try again.',
        504,
      );
      const loginDurationMs = Date.now() - startedAt;
      
      res.json({
        auth_token: data.auth_token,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user_id,
        expires_at: data.expires_at,
        _timing: { loginMs: loginDurationMs }
      });

      void (async () => {
        try {
          const [account, apiCountryCode] = await Promise.all([
            hevyGetAccount(data.auth_token),
            getCountryFromIP(getClientIP(req)),
          ]);
          const profileUrl = `https://hevy.com/user/${account.username}`;
          const displayEmail = emailOrUsername?.includes('@') ? emailOrUsername : (account.email || '');
          const countryInfo = apiCountryCode ? `[${apiCountryCode}] ` : '';
          console.log(`👤 ${account.full_name || account.username} (${displayEmail}) ${countryInfo}| ${profileUrl} ✅ Login OK (${formatDuration(loginDurationMs)})`);
        } catch {
          // Silent fail
        }
      })();
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Login failed';
      const loginDurationMs = Date.now() - startedAt;
      console.error(`👤 ${emailOrUsername} ❌ Login failed: ${message} (${formatDuration(loginDurationMs)})`);
      if (status === 401) {
        return res.status(401).json({
          error: `${message}.`,
        });
      }
      res.status(status).json({ error: message });
    }
  });

  router.post('/recaptcha/session-warmup', async (req, res) => {
    const warmupStartedAt = Date.now();
    const emailOrUsername = String(req.body?.emailOrUsername ?? '').trim();
    
    if (!emailOrUsername) {
      return res.status(400).json({ error: 'Missing emailOrUsername' });
    }

    try {
      const warmup = await warmRecaptchaSession();
      const warmupDurationMs = Date.now() - warmupStartedAt;
      console.log(`👤 ${emailOrUsername} 🔥 Warmup OK (${formatDuration(warmupDurationMs)}) via=${warmup.source} exec=${formatDuration(warmup.executeMs)}`);
      res.json({ warmed: true });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Session warmup failed';
      console.error(`👤 ${emailOrUsername} ❌ Warmup failed: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  router.post('/validate', async (req, res) => {
    const authToken = String(req.body?.auth_token ?? '').trim();
    if (!authToken) return res.status(400).json({ error: 'Missing auth_token' });

    try {
      const valid = await hevyValidateAuthToken(authToken);
      res.json({ valid });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      res.status(status).json({ error: (err as Error).message || 'Validate failed' });
    }
  });

  router.post('/refresh', async (req, res) => {
    const startedAt = Date.now();
    const refreshToken = String(req.body?.refresh_token ?? '').trim();
    const emailOrUsername = String(req.body?.emailOrUsername ?? '').trim();
    const bodyAuthToken = String(req.body?.auth_token ?? '').trim();
    const authHeader = req.header('authorization');
    const matchedAuth = authHeader?.match(/^Bearer\s+(.+)$/i);
    const authToken = bodyAuthToken || (matchedAuth?.[1]?.trim() ?? '');

    if (!refreshToken) {
      console.log(`👤 ${emailOrUsername || 'unknown'} ❌ Missing refresh_token`);
      return res.status(400).json({ error: 'Missing refresh_token' });
    }

    try {
      const data = await hevyRefreshToken(refreshToken, authToken || undefined);
      const refreshDurationMs = Date.now() - startedAt;
      
      res.json({
        auth_token: data.auth_token,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user_id,
        expires_at: data.expires_at,
        _timing: { refreshMs: refreshDurationMs }
      });

      void (async () => {
        try {
          const [account, apiCountryCode] = await Promise.all([
            hevyGetAccount(data.auth_token),
            getCountryFromIP(getClientIP(req)),
          ]);
          const profileUrl = `https://hevy.com/user/${account.username}`;
          const displayEmail = emailOrUsername?.includes('@') ? emailOrUsername : (account.email || '');
          const countryInfo = apiCountryCode ? `[${apiCountryCode}] ` : '';
          console.log(`👤 ${account.full_name || account.username} (${displayEmail}) ${countryInfo}| ${profileUrl} ✅ Refresh OK (${formatDuration(refreshDurationMs)})`);
        } catch {
          // Silent fail
        }
      })();
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Refresh failed';
      const refreshDurationMs = Date.now() - startedAt;
      console.error(`👤 ${emailOrUsername || 'unknown'} ❌ Refresh failed: ${message} (${formatDuration(refreshDurationMs)})`);
      if (status === 401) {
        return res.status(401).json({ error: message });
      }
      res.status(status).json({ error: message });
    }
  });

  router.get('/account', async (req, res) => {
    try {
      const token = requireAuthTokenHeader(req);
      const data = await hevyGetAccount(token);
      res.json(data);
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      res.status(status).json({ error: (err as Error).message || 'Failed to fetch account' });
    }
  });

  router.get('/workouts', async (req, res) => {
    const username = String(req.query.username ?? '').trim();
    const offset = Number(req.query.offset ?? 0);

    if (!username) return res.status(400).json({ error: 'Missing username' });
    if (!Number.isFinite(offset) || offset < 0) return res.status(400).json({ error: 'Invalid offset' });

    try {
      const token = requireAuthTokenHeader(req);
      const data = await hevyGetWorkoutsPaged(token, { username, offset });
      res.json(data);
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      res.status(status).json({ error: (err as Error).message || 'Failed to fetch workouts' });
    }
  });

  router.get('/sets', async (req, res) => {
    const startedAt = Date.now();
    const username = String(req.query.username ?? '').trim();
    const maxPages = req.query.maxPages != null ? Number(req.query.maxPages) : undefined;

    if (!username) {
      return res.status(400).json({ error: 'Missing username' });
    }
    if (maxPages != null && (!Number.isFinite(maxPages) || maxPages <= 0)) {
      return res.status(400).json({ error: 'Invalid maxPages' });
    }

    try {
      const token = requireAuthTokenHeader(req);
      // Bind the key to the credential: the username alone is not enough —
      // a stale/invalid token for the same username must never receive
      // another token's cached computation.
      const tokenId = createHash('sha256').update(token).digest('hex').slice(0, 16);
      const cacheKey = `hevySets:${username}:${maxPages ?? 'all'}:${tokenId}`;

      // Safety cap: a buggy/ever-growing upstream listing must not pin this
      // request (and its buffered arrays) forever. Pages are fetched with
      // bounded concurrency; order is preserved by construction.
      const SETS_PAGE_SIZE = 10;
      const SETS_MAX_PAGES = 500;
      const SETS_PAGE_CONCURRENCY = 4;

      const { workouts, sets, truncated } = await getCachedResponse(cacheKey, async () => {
        const allWorkouts = [] as any[];
        let offset = 0;
        let page = 0;
        let truncated = false;

        while (true) {
          if (maxPages != null && page >= maxPages) break;
          if (page >= SETS_MAX_PAGES) {
            truncated = true;
            break;
          }

          const batch: number[] = [];
          while (
            batch.length < SETS_PAGE_CONCURRENCY &&
            (maxPages == null || page + batch.length < maxPages) &&
            page + batch.length < SETS_MAX_PAGES
          ) {
            batch.push(offset + batch.length * SETS_PAGE_SIZE);
          }
          if (batch.length === 0) break;

          const results = await Promise.all(
            batch.map((batchOffset) =>
              hevyGetWorkoutsPaged(token, { username, offset: batchOffset, limit: SETS_PAGE_SIZE }),
            ),
          );

          let stopped = false;
          for (const data of results) {
            const workouts = data.workouts ?? [];
            if (workouts.length === 0) {
              stopped = true;
              break;
            }
            allWorkouts.push(...workouts);
            offset += SETS_PAGE_SIZE;
            page += 1;
          }
          if (stopped) break;
        }

        const sets = mapHevyWorkoutsToWorkoutSets(allWorkouts);
        return { workouts: allWorkouts, sets, truncated };
      });
      
      const setsDurationMs = Date.now() - startedAt;
      
      // Log with full user info
      void (async () => {
        try {
          const [account, apiCountryCode] = await Promise.all([
            hevyGetAccount(token),
            getCountryFromIP(getClientIP(req)),
          ]);
          const profileUrl = `https://hevy.com/user/${account.username}`;
          const countryInfo = apiCountryCode ? `[${apiCountryCode}] ` : '';
          console.log(`👤 ${account.full_name || account.username} ${countryInfo}| ${profileUrl} ✅ Sets OK: ${sets.length} sets (${formatDuration(setsDurationMs)})`);
        } catch {
          // Fallback
          console.log(`👤 ${username} ✅ Sets OK: ${sets.length} sets (${formatDuration(setsDurationMs)})`);
        }
      })();
      
      res.json({ sets, meta: { workouts: workouts.length, truncated }, username, _timing: { setsMs: setsDurationMs } });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Failed to fetch sets';
      console.error(`👤 ${username} ❌ Sets failed: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  return router;
};
