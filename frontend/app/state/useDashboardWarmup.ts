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
/** Hard ceiling so the overlay can never stick on a stuck warmup. */
const WARMUP_TIMEOUT_MS = 8000;

const yieldToUI = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

interface DashboardWarmupArgs {
  isAnalyzing: boolean;
  filteredData: WorkoutSet[];
  filterCacheKey: string;
  effectiveNow: Date;
  weightUnit: WeightUnit;
  secondarySetMultiplier: number;
}

/**
 * Precomputes the dashboard's expensive derivations (overview/PRs/volumes,
 * plateaus, weekly-sets heatmap, exercise assets, lazy chunks) while the boot
 * loading overlay is up, so the dashboard mounts onto warm cache and renders
 * complete on first paint instead of computing in front of the user.
 *
 * Each stage mirrors the exact cache key + inputs the dashboard memos use, so
 * mount-time getOrCompute calls become hits. Stages yield to the UI thread in
 * between, keeping the overlay animation alive. Minimal by design: charts do
 * fast linear passes on this warm foundation and are left to mount normally.
 *
 * Returns true while warming — the caller holds the loading overlay open.
 */
export function useDashboardWarmup({
  isAnalyzing,
  filteredData,
  filterCacheKey,
  effectiveNow,
  weightUnit,
  secondarySetMultiplier,
}: DashboardWarmupArgs): boolean {
  const [isWarming, setIsWarming] = useState(false);
  const warmedRef = useRef<{ key: string; data: WorkoutSet[] } | null>(null);
  const runIdRef = useRef(0);
  // Whoever raised the hold flag last owns lowering it. A cancelled run must
  // still release the flag when no successor took over — otherwise the overlay
  // wedges open forever (this stranded the app on the finishProgress path).
  const flagOwnerRef = useRef<number | null>(null);
  // Read live without subscribing: the run must SURVIVE the analyzing flag
  // flipping false mid-run (finishProgress fires ~250ms after data arrival,
  // long before a 1-2s warmup finishes) and keep holding the overlay until
  // the data is actually ready.
  const analyzingRef = useRef(isAnalyzing);
  analyzingRef.current = isAnalyzing;

  // NOTE: isAnalyzing is intentionally not a dep (see analyzingRef above).
  useEffect(() => {
    if (!analyzingRef.current || filteredData.length === 0) return;
    if (warmedRef.current?.key === filterCacheKey && warmedRef.current?.data === filteredData) return;

    const runId = ++runIdRef.current;
    flagOwnerRef.current = runId;
    const alive = (): boolean => flagOwnerRef.current === runId;
    const check = (): void => {
      if (!alive()) throw new Error('warmup superseded');
    };

    setIsWarming(true);

    const warm = async (): Promise<void> => {
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
        () => calculateDashboardInsights(filteredData, dailyData, effectiveNow),
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
          computeWeeklySetsDashboardData(filteredData, assetsMap, effectiveNow, '30d', 'muscles', secondarySetMultiplier),
        { ttl: TTL },
      );
      await yieldToUI();
      check();

      // 6. Lazy-chunk preloads so Suspense boundaries resolve instantly.
      await Promise.all([
        import('../../components/dashboard/ui/Dashboard'),
        import('../../components/dashboard/manifest/TrainingManifestCard'),
        import('../../components/dashboard/receipt/LifetimeLedgerPanel'),
      ]);
    };

    const timeout = new Promise<void>((_, reject) => {
      window.setTimeout(() => reject(new Error('warmup timeout')), WARMUP_TIMEOUT_MS);
    });

    const run = async (): Promise<void> => {
      try {
        await Promise.race([warm(), timeout]);
      } catch {
        // Superseded, timed out, or failed: the finally below releases the
        // hold if still ours; the dashboard falls back to computing on mount
        // (old behavior, no worse).
      } finally {
        if (flagOwnerRef.current === runId) {
          flagOwnerRef.current = null;
          warmedRef.current = { key: filterCacheKey, data: filteredData };
          setIsWarming(false);
        }
      }
    };
    void run();

    return () => {
      // Supersede: release ownership so the in-flight run aborts at its next
      // yield; the succeeding run (or nothing, on unmount) owns the flag.
      if (flagOwnerRef.current === runId) flagOwnerRef.current = null;
    };
  }, [filteredData, filterCacheKey, effectiveNow, weightUnit, secondarySetMultiplier]);

  return isWarming;
}
