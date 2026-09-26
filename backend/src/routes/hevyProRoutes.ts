import express from 'express';
import { createHash } from 'node:crypto';
import { hevyProGetAllWorkouts, hevyProGetUserInfo, hevyProValidateApiKey } from '../hevyProApi';
import { mapHevyProWorkoutsToWorkoutSets } from '../mapHevyProWorkoutsToWorkoutSets';
import { getClientIP, getCountryFromIP } from '../geoLocation';
import { publicErrorMessage } from '../safeError';

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const extractUsernameFromUrl = (url: string): string => {
  const match = url.match(/\/user\/([^/]+)$/);
  return match ? match[1] : 'unknown';
};

export const createHevyProRouter = (opts: {
  loginLimiter: express.RequestHandler;
  getCachedResponse: <T>(key: string, compute: () => Promise<T>) => Promise<T>;
}) => {
  const { loginLimiter, getCachedResponse } = opts;
  const router = express.Router();

  router.post('/api-key/validate', loginLimiter, async (req, res) => {
    const apiKey = String(req.body?.apiKey ?? '').trim();

    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

    try {
      const valid = await hevyProValidateApiKey(apiKey);
      res.json({ valid });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Validate failed';
      console.error(`❌ Hevy Pro validation failed: ${message}`);
      res.status(status).json({ error: publicErrorMessage(status, message, 'Validate failed') });
    }
  });

  router.post('/api-key/sets', async (req, res) => {
    const apiKey = String(req.body?.apiKey ?? '').trim();
    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

    const startedAt = Date.now();

    try {
      const userInfo = await hevyProGetUserInfo(apiKey);
      const username = extractUsernameFromUrl(userInfo.data.url);

      // Hash the credential so the raw API key is never retained in memory.
      const keyId = createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
      const cacheKey = `hevyProSets:${keyId}`;
      const { workouts, sets, truncated } = await getCachedResponse(cacheKey, async () => {
        const { workouts, truncated } = await hevyProGetAllWorkouts(apiKey);
        const sets = mapHevyProWorkoutsToWorkoutSets(workouts);
        return { workouts, sets, truncated };
      });

      const durationMs = Date.now() - startedAt;
      res.json({ sets, meta: { workouts: workouts.length, truncated }, username });

      // Logging only — must not block the response (geo lookup adds 1 RTT).
      void (async () => {
        try {
          const ipCountryCode = await getCountryFromIP(getClientIP(req));
          const countryInfo = ipCountryCode ? `[${ipCountryCode}] ` : '';
          console.log(`👤 ${userInfo.data.name || username} ${countryInfo}| ${userInfo.data.url} ✅ Sync successful: ${sets.length} sets (${formatDuration(durationMs)})`);
        } catch {
          // Silent fail
        }
      })();
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Failed to fetch sets';
      const durationMs = Date.now() - startedAt;
      console.error(`❌ Hevy Pro sync failed (${formatDuration(durationMs)}): ${message}`);
      res.status(status).json({ error: publicErrorMessage(status, message, 'Failed to fetch sets') });
    }
  });

  return router;
};
