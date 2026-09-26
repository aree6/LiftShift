import express from 'express';
import { createHash } from 'node:crypto';
import { lyfatGetAllWorkouts, lyfatGetAllWorkoutSummaries, lyfatValidateApiKey } from '../lyfta';
import { mapLyfataWorkoutsToWorkoutSets } from '../mapLyfataWorkoutsToWorkoutSets';
import { getClientIP, getCountryFromIP } from '../geoLocation';
import { publicErrorMessage } from '../safeError';

const formatDuration = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const createLyftaRouter = (opts: {
  loginLimiter: express.RequestHandler;
  getCachedResponse: <T>(key: string, compute: () => Promise<T>) => Promise<T>;
}) => {
  const { loginLimiter, getCachedResponse } = opts;
  const router = express.Router();

  router.post('/validate', loginLimiter, async (req, res) => {
    const apiKey = String(req.body?.apiKey ?? '').trim();

    if (!apiKey) {
      return res.status(400).json({ error: 'Missing apiKey' });
    }

    try {
      const valid = await lyfatValidateApiKey(apiKey);
      res.json({ valid });
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Validation failed';
      console.error(`❌ Lyfta validation failed: ${message}`);
      res.status(status).json({ error: publicErrorMessage(status, message, 'Validation failed') });
    }
  });

  router.post('/sets', async (req, res) => {
    const apiKey = String(req.body?.apiKey ?? '').trim();
    const weightUnit: 'kg' | 'lbs' = req.body?.weightUnit === 'lbs' ? 'lbs' : 'kg';

    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

    const startedAt = Date.now();

    try {
      // Bind the key to the credential hash (never retain the raw secret) and
      // to weightUnit: mapped sets carry per-set weight_unit, so kg/lbs must
      // not share a cache entry.
      const keyId = createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
      const cacheKey = `lyftaSets:${keyId}:${weightUnit}`;
      const { workouts, sets, truncated } = await getCachedResponse(cacheKey, async () => {
        const [{ workouts, truncated: workoutsTruncated }, { summaries, truncated: summariesTruncated }] = await Promise.all([
          lyfatGetAllWorkouts(apiKey),
          lyfatGetAllWorkoutSummaries(apiKey),
        ]);

        const sets = mapLyfataWorkoutsToWorkoutSets(workouts, summaries, weightUnit);
        return { workouts, sets, truncated: workoutsTruncated || summariesTruncated };
      });

      const durationMs = Date.now() - startedAt;
      const username = workouts[0]?.user?.username || 'unknown';
      res.json({ sets, meta: { workouts: workouts.length, truncated }, username });

      // Logging only — must not block the response (geo lookup adds 1 RTT).
      void (async () => {
        try {
          const ipCountryCode = await getCountryFromIP(getClientIP(req));
          const countryInfo = ipCountryCode ? `[${ipCountryCode}] ` : '';
          console.log(`👤 ${username} ${countryInfo}✅ Lyfta sync successful: ${sets.length} sets (${formatDuration(durationMs)})`);
        } catch {
          // Silent fail
        }
      })();
    } catch (err) {
      const status = (err as any).statusCode ?? 500;
      const message = (err as Error).message || 'Failed to fetch sets';
      const durationMs = Date.now() - startedAt;
      console.error(`❌ Lyfta sync failed (${formatDuration(durationMs)}): ${message}`);
      res.status(status).json({ error: publicErrorMessage(status, message, 'Failed to fetch sets') });
    }
  });

  return router;
};
