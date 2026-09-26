import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { analyticsRequestMiddleware } from './analytics/requestTracking';
import { shutdownPosthog } from './analytics/posthog';
import { createPosthogAssetProxy, createPosthogProxy, posthogProxyPath } from './analytics/proxy';
import { shutdownRecaptchaSession, warmRecaptchaSession } from './hevyRecaptcha';
import { createHevyRouter } from './routes/hevyRoutes';
import { createHevyProRouter } from './routes/hevyProRoutes';
import { createLyftaRouter } from './routes/lyftaRoutes';

const PORT = Number(process.env.PORT ?? 5000);
const STARTUP_RECAPTCHA_WARMUP_ENABLED = false;

const app = express();

// Browser-based caching is primary. This wrapper dedups concurrent requests and
// keeps successful responses for a short TTL so sequential repeats (refresh,
// second tab, retry) don't replay full-history upstream fetches. Failures are
// never cached, so errors don't stick. Hits are deep-cloned so downstream
// handlers can't mutate the cached arrays in place and pollute later callers.
const inFlightRequests = new Map<string, Promise<unknown>>();
const completedResponses = new Map<string, { at: number; value: unknown }>();
const CACHE_TTL_MS = 60_000;
// Full-sync payloads are MBs (raw + mapped arrays); keep the entry cap small
// so a burst of distinct users can't pin GBs for the full TTL.
const CACHE_MAX_ENTRIES = 50;

const cloneCachedValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

const getCachedResponse = async <T>(key: string, compute: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  const hit = completedResponses.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    // LRU touch.
    completedResponses.delete(key);
    completedResponses.set(key, hit);
    return cloneCachedValue(hit.value as T);
  } else if (hit) {
    completedResponses.delete(key);
  }

  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = compute().then(
    (value) => {
      completedResponses.set(key, { at: Date.now(), value });
      if (completedResponses.size > CACHE_MAX_ENTRIES) {
        const oldest = completedResponses.keys().next();
        if (!oldest.done) completedResponses.delete(oldest.value);
      }
      return value;
    },
    (err) => {
      throw err;
    },
  ).finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
};

// Render/Cloudflare set X-Forwarded-For. Enabling trust proxy allows express-rate-limit
// to correctly identify clients and avoids ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
// We keep this enabled even if NODE_ENV isn't set, since hosted platforms commonly omit it.
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Minimal security headers (API backend, no static content).
// No helmet dependency needed for these three.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(analyticsRequestMiddleware);

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
    allowedHeaders: ['content-type', 'authorization', 'x-liftshift-client-id'],
    maxAge: 86400,
  })
);

// A3: per-route buckets. Each route keeps the same 5/min cap (brute-force
// protection never weakens — constraint 3; /login specifically is unchanged
// at 5/min), but a burst of fallback-chain retries on one route no longer
// burns the budget of the others (HANDOFF: 429s likely self-inflicted via
// one shared bucket + retry amplification; ~6-7 backend requests per action).
// A2: limiter rejections are stamped source=our-loginLimiter in the JSON body
// so clients can tell our 429s apart from upstream Hevy 429s. Retry-After is
// set by the middleware itself (express-rate-limit v8 sets it whenever
// standardHeaders/legacyHeaders are on); the handler below only backfills it
// if ever absent.
let limiterKeyLogged = false;
const createRouteLimiter = (route: string) => rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'RateLimitExceeded', message: 'Too many login attempts. Please wait 1 minute.' },
  keyGenerator: (req) => {
    // A3: verify trust-proxy hop count against the Cloudflare→Render chain.
    // Log once: resolved req.ip vs the raw X-Forwarded-For chain plus the
    // configured hop count. Value intentionally NOT changed here (trust
    // proxy 1 above, set for ERR_ERL_UNEXPECTED_X_FORWARDED_FOR): with 2+
    // proxies in the chain, changing it on unverified evidence would silently
    // re-key every bucket.
    if (!limiterKeyLogged) {
      limiterKeyLogged = true;
      const xff = req.headers['x-forwarded-for'];
      console.log(
        `[RateLimit:${route}] key=${req.ip} xff=${Array.isArray(xff) ? xff.join(';') : (xff ?? 'none')} ` +
        `trustProxy=${app.get('trust proxy')} (verify against Cloudflare→Render chain)`,
      );
    }
    // Delegate to the default helper (v8 validates custom keyGenerators that
    // skip it) — identical bucketing to before, just logged.
    return ipKeyGenerator(req.ip ?? '');
  },
  handler: (req, res, _next, options) => {
    if (!res.headersSent && !res.getHeader('Retry-After')) {
      res.setHeader('Retry-After', '60');
    }
    res.status(options.statusCode).json({
      error: 'RateLimitExceeded',
      message: 'Too many login attempts. Please wait 1 minute.',
      source: 'our-loginLimiter',
    });
  },
  skip: (req) => {
    // Don't rate limit warmup requests
    return req.path === '/api/hevy/recaptcha/session-warmup';
  },
});

const loginLimiter = createRouteLimiter('hevy-login');
const hevyProLimiter = createRouteLimiter('hevy-pro');
const lyftaLimiter = createRouteLimiter('lyfta');

const requireAuthTokenHeader = (req: express.Request): string => {
  const authHeader = req.header('authorization');
  if (!authHeader) {
    const err = new Error('Missing authorization header');
    (err as any).statusCode = 401;
    throw err;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error('Invalid authorization header');
    (err as any).statusCode = 401;
    throw err;
  }
  return match[1];
};

app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    },
    uptime: process.uptime(),
  });
});

app.get('/ping', (req, res) => {
  res.send('OK');
});

app.get('/', (req, res) => {
  res.redirect(301, 'https://liftshift.app/');
});

const posthogProxy = createPosthogProxy(posthogProxyPath);
const posthogAssetProxy = createPosthogAssetProxy();
const posthogStaticPath = `${posthogProxyPath}/static`;

app.options(posthogProxyPath, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.options(`${posthogStaticPath}/{*splat}`, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

app.use(posthogStaticPath, posthogAssetProxy);
app.use(posthogProxyPath, posthogProxy);

app.use('/api/hevy', createHevyRouter({ loginLimiter, requireAuthTokenHeader, getCachedResponse }));
app.use('/api/hevy', createHevyProRouter({ loginLimiter: hevyProLimiter, getCachedResponse }));
app.use('/api/lyfta', createLyftaRouter({ loginLimiter: lyftaLimiter, getCachedResponse }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  if (message === 'CORS blocked') return res.status(403).json({ error: message });

  const status = (err as any)?.statusCode ?? 500;
  // Never leak internal/dependency error text (Puppeteer paths, upstream HTML,
  // stack fragments) to clients. 4xx/504 messages are curated for UX and stay.
  if (status === 500) {
    console.error('[Server] Internal error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(status).json({ error: message });
});

const server = app.listen(PORT, () => {
  console.log(`🟢 LiftShift backend listening on :${PORT}`);

  if (STARTUP_RECAPTCHA_WARMUP_ENABLED) {
    const warmupTimer = setTimeout(() => {
      warmRecaptchaSession()
        .then(() => {
          console.log('[Puppeteer] Startup warmup complete');
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('[Puppeteer] Startup warmup failed:', message);
        });
    }, 500);
    warmupTimer.unref();
  }
});

let shuttingDown = false;

const shutdown = async (signal: string, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[Server] ⛔ Received ${signal}, shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error('[Server] 💀 Force exiting after shutdown timeout');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    console.log('[Server] 🔒 HTTP server closed');
  } catch (err) {
    console.error('[Server] Error closing HTTP server:', err);
  }

  try {
    await shutdownPosthog();
    console.log('[Server] 📊 PostHog shutdown complete');
  } catch (err) {
    console.error('[Server] Error during PostHog shutdown:', err);
  }

  try {
    await shutdownRecaptchaSession();
    console.log('[Server] 🤖 Recaptcha session shutdown complete');
  } catch (err) {
    console.error('[Server] Error during recaptcha session shutdown:', err);
  }

  console.log('[Server] 👋 Graceful shutdown complete');
  clearTimeout(forceExitTimer);
  process.exit(exitCode);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  shutdown('uncaughtException', 1).catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});
