import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { hevyGetAccount, hevyGetWorkoutsPaged, hevyLogin, hevyValidateAuthToken } from './hevyApi';
import { hevyOfficialValidateApiKey, hevyOfficialGetAllWorkouts, hevyOfficialGetWorkoutCount } from './hevyOfficialApi';
import { lyfatGetAllWorkouts, lyfatValidateApiKey } from './lyfta';
import { mapHevyWorkoutsToWorkoutSets } from './mapToWorkoutSets';
import { mapOfficialWorkoutsToWorkoutSets } from './mapOfficialWorkoutsToWorkoutSets';
import { mapLyfataWorkoutsToWorkoutSets } from './mapLyfataWorkoutsToWorkoutSets';

const PORT = Number(process.env.PORT ?? 5000);
const isProd = process.env.NODE_ENV === 'production';

const app = express();

// Render/Cloudflare set X-Forwarded-For. Enabling trust proxy allows express-rate-limit
// to correctly identify clients and avoids ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
// We keep this enabled even if NODE_ENV isn't set, since hosted platforms commonly omit it.
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const isPrivateLanOrigin = (origin: string): boolean => {
  try {
    const u = new URL(origin);
    const host = u.hostname;

    if (host === 'localhost' || host === '127.0.0.1') return true;
    // RFC1918 private ranges.
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;

    return false;
  } catch {
    return false;
  }
};

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Allow private LAN origins in both dev and prod for local development against hosted backend
      if (isPrivateLanOrigin(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'auth-token', 'api-key'],
    maxAge: 86400,
  })
);

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const requireAuthTokenHeader = (req: express.Request): string => {
  const token = req.header('auth-token');
  if (!token) {
    const err = new Error('Missing auth-token header');
    (err as any).statusCode = 401;
    throw err;
  }
  return token;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/hevy/login', loginLimiter, async (req, res) => {
  const emailOrUsername = String(req.body?.emailOrUsername ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Missing emailOrUsername or password' });
  }

  try {
    const data = await hevyLogin(emailOrUsername, password);
    res.json({ auth_token: data.auth_token, user_id: data.user_id, expires_at: data.expires_at });
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    const message = (err as Error).message || 'Login failed';
    if (status === 401) {
      return res.status(401).json({
        error: `${message}.`,
      });
    }
    res.status(status).json({ error: message });
  }
});

app.post('/api/hevy/validate', async (req, res) => {
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

app.get('/api/hevy/account', async (req, res) => {
  try {
    const token = requireAuthTokenHeader(req);
    const data = await hevyGetAccount(token);
    res.json(data);
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message || 'Failed to fetch account' });
  }
});

app.get('/api/hevy/workouts', async (req, res) => {
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

app.get('/api/hevy/sets', async (req, res) => {
  const username = String(req.query.username ?? '').trim();
  const maxPages = req.query.maxPages != null ? Number(req.query.maxPages) : undefined;

  if (!username) return res.status(400).json({ error: 'Missing username' });
  if (maxPages != null && (!Number.isFinite(maxPages) || maxPages <= 0)) {
    return res.status(400).json({ error: 'Invalid maxPages' });
  }

  try {
    const token = requireAuthTokenHeader(req);

    const allWorkouts = [] as any[];
    let offset = 0;
    let page = 0;

    while (true) {
      if (maxPages != null && page >= maxPages) break;

      const data = await hevyGetWorkoutsPaged(token, { username, offset });
      const workouts = data.workouts ?? [];
      if (workouts.length === 0) break;

      allWorkouts.push(...workouts);
      offset += 5;
      page += 1;
    }

    const sets = mapHevyWorkoutsToWorkoutSets(allWorkouts);
    res.json({ sets, meta: { workouts: allWorkouts.length } });
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message || 'Failed to fetch sets' });
  }
});

// ============================================================================
// Official Hevy API endpoints (uses user's personal API key)
// ============================================================================

const requireApiKeyHeader = (req: express.Request): string => {
  const apiKey = req.header('api-key');
  if (!apiKey) {
    const err = new Error('Missing api-key header');
    (err as any).statusCode = 401;
    throw err;
  }
  return apiKey;
};

app.post('/api/hevy/apikey/validate', loginLimiter, async (req, res) => {
  const apiKey = String(req.body?.apiKey ?? '').trim();

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing apiKey' });
  }

  try {
    const valid = await hevyOfficialValidateApiKey(apiKey);
    res.json({ valid });
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message || 'Validation failed' });
  }
});

app.get('/api/hevy/apikey/count', async (req, res) => {
  try {
    const apiKey = requireApiKeyHeader(req);
    const count = await hevyOfficialGetWorkoutCount(apiKey);
    res.json({ workout_count: count });
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message || 'Failed to fetch workout count' });
  }
});

app.get('/api/hevy/apikey/sets', async (req, res) => {
  const maxPages = req.query.maxPages != null ? Number(req.query.maxPages) : undefined;

  if (maxPages != null && (!Number.isFinite(maxPages) || maxPages <= 0)) {
    return res.status(400).json({ error: 'Invalid maxPages' });
  }

  try {
    const apiKey = requireApiKeyHeader(req);
    const workouts = await hevyOfficialGetAllWorkouts(apiKey, maxPages);
    const sets = mapOfficialWorkoutsToWorkoutSets(workouts);
    res.json({ sets, meta: { workouts: workouts.length } });
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message || 'Failed to fetch sets' });
  }
});

// Lyfta API endpoints
app.post('/api/lyfta/validate', loginLimiter, async (req, res) => {
  const apiKey = String(req.body?.apiKey ?? '').trim();

  if (!apiKey) {
    return res.status(400).json({ error: 'Missing apiKey' });
  }

  try {
    const valid = await lyfatValidateApiKey(apiKey);
    res.json({ valid });
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message || 'Validation failed' });
  }
});

app.post('/api/lyfta/sets', async (req, res) => {
  const apiKey = String(req.body?.apiKey ?? '').trim();

  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

  try {
    const workouts = await lyfatGetAllWorkouts(apiKey);
    const sets = mapLyfataWorkoutsToWorkoutSets(workouts);
    res.json({ sets, meta: { workouts: workouts.length } });
  } catch (err) {
    const status = (err as any).statusCode ?? 500;
    res.status(status).json({ error: (err as Error).message || 'Failed to fetch sets' });
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  if (message === 'CORS blocked') return res.status(403).json({ error: message });

  const status = (err as any)?.statusCode ?? 500;
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`LiftShift backend listening on :${PORT}`);
});
