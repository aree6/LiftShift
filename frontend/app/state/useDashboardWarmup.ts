import { useEffect, useRef, useState } from 'react';
import type { WorkoutSet } from '../../types';
import type { WeightUnit } from '../../utils/storage/localStorage';
import { getDailySummaries, getExerciseStats } from '../../utils/analysis/core';
import { calculateDashboardInsights, detectPlateaus } from '../../utils/analysis/insights';
import { computeWeeklySetsDashboardData } from '../../utils/muscle/analytics';
import { getExerciseAssets } from '../../utils/data/exerciseAssets';
import { computationCache } from '../../utils/storage/computationCache';
import { cacheKeys, dashboardCacheKeys } from '../../utils/storage/cacheKeys';

const TTL = 10 * 60 * 1000;
/** Hard ceiling so a stuck warmup can never run forever. */
const WARMUP_TIMEOUT_MS = 8000;

const yieldToUI = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

interface DashboardWarmupArgs {
  filteredData: WorkoutSet[];
  filterCacheKey: string;
  effectiveNow: Date;
  weightUnit: WeightUnit;
  secondarySetMultiplier: number;
}

/**
 * Background precompute of the dashboard's expensive derivations (overview /
 * PRs / volumes, plateaus, weekly-sets heatmap, exercise assets, lazy chunks)
 * so the dashboard mounts onto warm cache and renders complete on first
 * paint instead of computing in front of the user.
 *
 * Each stage mirrors the exact cache key + inputs the dashboard memos use, so
 * mount-time getOrCompute calls become hits. Stages yield to the UI thread in
 * between, keeping the UI responsive. Minimal by design: charts do fast
 * linear passes on this warm foundation and are left to mount normally.
 *
 * Best-effort only: it NEVER gates the boot overlay. A previous revision held
 * the overlay open until warm, which wedged Hevy/Lyfta credential login on an
 * infinite loading screen (finishProgress flips isAnalyzing false ~250ms
 * after data arrival while warmup is still running, stranding the hold).
 *
 * Returns true while warming (informational only — the caller must not use it
 * to block navigation or overlay dismissal).
 */
export function useDashboardWarmup({
  filteredData,
  filterCacheKey,
  effectiveNow,
  weightUnit,
  secondarySetMultiplier,
}: DashboardWarmupArgs): boolean {
  const [isWarming, setIsWarming] = useState(false);
  const warmedRef = useRef<{ key: string; data: WorkoutSet[] } | null>(null);
  const runIdRef = useRef(0);
  // Whoever raised the flag last owns lowering it. A cancelled run must
  // still release when no successor took over — otherwise the flag wedges on.
  const flagOwnerRef = useRef<number | null>(null);
  // Read the Date live without subscribing to its identity: callers memoize
  // their Date, but a fresh-but-equal Date must not restart a multi-second
  // warmup by itself. The numeric timestamp below is the restart trigger.
  const effectiveNowRef = useRef(effectiveNow);
  effectiveNowRef.current = effectiveNow;
  const effectiveNowTime = effectiveNow?.getTime() ?? 0;

  useEffect(() => {
    if (filteredData.length === 0) return;
    if (warmedRef.current?.key === filterCacheKey && warmedRef.current?.data === filteredData) return;

    const runId = ++runIdRef.current;
    flagOwnerRef.current = runId;
    const alive = (): boolean => flagOwnerRef.current === runId;
    const check = (): void => {
      if (!alive()) throw new Error('warmup superseded');
    };

    setIsWarming(true);

    const warm = async (): Promise<void> => {
      const now = effectiveNowRef.current;
      // 1. Foundation everything else reads.
      const dailyData = computationCache.getOrCompute(cacheKeys.dailySummaries(filterCacheKey), filteredData, () =>
        getDailySummaries(filteredData),
      { ttl: TTL });
      const stats = computationCache.getOrCompute(cacheKeys.exerciseStats(filterCacheKey), filteredData, () =>
        getExerciseStats(filteredData),
      { ttl: TTL });
      await yieldToUI();
      check();

      // 2. Overview / PRs / volume rollups (the single heaviest key).
      computationCache.getOrCompute(
        dashboardCacheKeys.dashboardInsights(filterCacheKey),
        filteredData,
        () => calculateDashboardInsights(filteredData, dailyData, now),
        { ttl: TTL },
      );
      await yieldToUI();
      check();

      // 3. Plateaus.
      computationCache.getOrCompute(
        dashboardCacheKeys.plateauAnalysis(filterCacheKey),
        filteredData,
        () => detectPlateaus(filteredData, stats, weightUnit, 'reactive'),
        { ttl: TTL },
      );
      await yieldToUI();
      check();

      // 4. Exercise assets (async by nature; warms the module cache so the
      // dashboard's post-mount fetch resolves instantly — no muscle/body pop).
      const assetsMap = await getExerciseAssets();
      check();

      // 5. Weekly-sets heatmap. Both dashboard windows share the 30d/muscles
      // key at boot defaults, so one entry covers them.
      computationCache.getOrCompute(
        dashboardCacheKeys.weeklySets(filterCacheKey, '30d', 'muscles', secondarySetMultiplier),
        filteredData,
        () =>
          computeWeeklySetsDashboardData(filteredData, assetsMap, now, '30d', 'muscles', secondarySetMultiplier),
        { ttl: TTL },
      );
      await yieldToUI();
      check();

      // 6. Lazy-chunk preloads deferred to idle AFTER the core derivations,
      // so chunk fetch/parse never contends with warmup compute. Fire-and-
      // forget: Suspense still covers a miss.
      const scheduleIdle = (fn: () => void): void => {
        const w = window as any;
        if (typeof w.requestIdleCallback === 'function') {
          w.requestIdleCallback(fn, { timeout: 3000 });
        } else {
          window.setTimeout(fn, 1500);
        }
      };
      scheduleIdle(() => {
        void Promise.all([
          import('../../components/dashboard/ui/Dashboard'),
          import('../../components/dashboard/manifest/TrainingManifestCard'),
          import('../../components/dashboard/receipt/LifetimeLedgerPanel'),
        ]).catch(() => {});
      });
    };

    let timeoutId = 0;
    const timeout = new Promise<void>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('warmup timeout')), WARMUP_TIMEOUT_MS);
    });

    const run = async (): Promise<void> => {
      try {
        await Promise.race([warm(), timeout]);
      } catch {
        // Superseded, timed out, or failed: the finally below releases the
        // flag if still ours; the dashboard falls back to computing on mount
        // (pre-warmup behavior, no worse).
      } finally {
        window.clearTimeout(timeoutId);
        if (flagOwnerRef.current === runId) {
          flagOwnerRef.current = null;
          warmedRef.current = { key: filterCacheKey, data: filteredData };
          setIsWarming(false);
        }
      }
    };
    void run();

    return () => {
      // Supersede: the in-flight run aborts at its next yield. Release the
      // flag here unconditionally when still ours — a succeeding run re-raises
      // it synchronously in the same commit (batched, no flicker), and with no
      // successor this release is the only one (otherwise the flag wedges).
      window.clearTimeout(timeoutId);
      if (flagOwnerRef.current === runId) {
        flagOwnerRef.current = null;
        setIsWarming(false);
      }
    };
  }, [filteredData, filterCacheKey, effectiveNowTime, weightUnit, secondarySetMultiplier]);

  return isWarming;
}
