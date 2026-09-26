import type express from 'express';
import { captureBackendEvent } from './posthog';
import { getClientIP } from '../geoLocation';

const CLIENT_ID_HEADER = 'x-liftshift-client-id';

// Scanner/bot probes for paths the app never defines (WP, PHP, .env, git...).
// These 404 correctly; they are not product errors and must not pollute
// api_response_error. api_request keeps them tagged (is_bot) so bot volume
// stays measurable in one place.
const BOT_PATH_PATTERNS: RegExp[] = [
  /\/\.env(\..*)?$/i,
  /wp-admin|wp-content|wp-includes|wp-json|\/wp(\/|$)/i,
  /wordpress|blog/i,
  /\.php$/i,
  /phpinfo|phpmyadmin/i,
  /\.git\//i,
  /\/robots\.txt$/i,
  /\/\.well-known\//i,
];

export const isBotProbePath = (path: string): boolean => {
  if (!path) return false;
  return BOT_PATH_PATTERNS.some((re) => re.test(path));
};

export const getAnalyticsDistinctId = (req: express.Request): string => {
  const raw = req.header(CLIENT_ID_HEADER);
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (id && id.length <= 128) return id;

  // Fallback: still provides some value for request-level analysis.
  const ip = String(req.ip ?? '').trim();
  if (ip) return `ip:${ip}`;

  return 'unknown';
};

export const getAnalyticsIP = (req: express.Request): string => {
  return getClientIP(req);
};

const getOriginHostname = (origin: string | undefined): string | undefined => {
  if (!origin) return undefined;
  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
};

export const analyticsRequestMiddleware: express.RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  const distinctId = getAnalyticsDistinctId(req);
  const clientIP = getAnalyticsIP(req);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;

    // Avoid capturing query strings to reduce the chance of sending user identifiers.
    const path = req.path;
    const isBot = isBotProbePath(path);

    const eventProperties: Record<string, unknown> = {
      method: req.method,
      path,
      status: res.statusCode,
      duration_ms: durationMs,
      origin_host: getOriginHostname(req.header('origin')),
      ua: req.header('user-agent')?.slice(0, 200),
      has_auth_token: Boolean(req.header('authorization')),
      is_bot: isBot,
    };

    // Pass IP to PostHog for automatic GeoIP resolution
    if (clientIP && !clientIP.startsWith('192.168.') && !clientIP.startsWith('10.') && !clientIP.startsWith('172.') && clientIP !== '127.0.0.1') {
      eventProperties.$ip = clientIP;
    }

    captureBackendEvent(distinctId, 'api_request', eventProperties);

    // Bot probes 404 by design — expected, not a product error. Skip so
    // api_response_error reflects real failures (cuts ~2/3 of its volume).
    if (isBot) return;

    if (res.statusCode >= 400) {
      captureBackendEvent(distinctId, 'api_response_error', {
        method: req.method,
        path,
        status: res.statusCode,
        duration_ms: durationMs,
        origin_host: getOriginHostname(req.header('origin')),
        ua: req.header('user-agent')?.slice(0, 200),
        is_bot: false,
      });
    }
  });

  next();
};
