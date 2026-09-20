import { useMemo } from 'react';

import type { ExerciseStats, WorkoutSet } from '../../../types';
import { calculatePRInsights, calculateStreakInfo, type PRInsights, type StreakInfo } from '../../../utils/analysis/insights';
import { getExerciseStats } from '../../../utils/analysis/core';
import { convertWeight } from '../../../utils/format/units';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { ExerciseAssetLookup } from '../../../utils/exercise/exerciseAssetLookup';
import type { FlexTopPRExercise } from '../utils/flexViewTypes';
import { getLoadProgressionDirection } from '../../../utils/exercise/loadProgression';
import { computationCache } from '../../../utils/storage/computationCache';
import { flexCacheKeys } from '../../../utils/storage/cacheKeys';

interface UseFlexInsightsArgs {
  data: WorkoutSet[];
  effectiveNow: Date;
  weightUnit: WeightUnit;
  assetLookup: ExerciseAssetLookup;
  exerciseStats?: ExerciseStats[];
  /** Shares cache entries with History→Flex prefetch when provided. */
  filterCacheKey?: string;
}

interface UseFlexInsightsResult {
  streakInfo: StreakInfo;
  prInsights: PRInsights;
  topPRExercises: FlexTopPRExercise[];
}

export const useFlexInsights = ({
  data,
  effectiveNow,
  weightUnit,
  assetLookup,
  exerciseStats,
  filterCacheKey,
}: UseFlexInsightsArgs): UseFlexInsightsResult => {
  // Routed through the shared computation cache (canonical keys) so the
  // History→Flex prefetch turns this mount into a cache hit. Persists across
  // tab unmount/remount, unlike a bare useMemo.
  const cacheKey = filterCacheKey ?? 'all';
  const streakInfo = useMemo(
    () => computationCache.getOrCompute(flexCacheKeys.streakInfo(cacheKey), data, () => calculateStreakInfo(data, effectiveNow), { ttl: 10 * 60 * 1000 }),
    [data, effectiveNow, cacheKey]
  );

  const prInsights = useMemo(
    () => computationCache.getOrCompute(flexCacheKeys.prInsights(cacheKey), data, () => calculatePRInsights(data, effectiveNow), { ttl: 10 * 60 * 1000 }),
    [data, effectiveNow, cacheKey]
  );

  const topPRExercises = useMemo(() => {
    if (data.length === 0) return [] as FlexTopPRExercise[];
    const assetCache = new Map<string, ReturnType<ExerciseAssetLookup['getAsset']>>();
    const getAssetForExercise = (name: string): ReturnType<ExerciseAssetLookup['getAsset']> | undefined => {
      if (!name) return undefined;
      if (assetCache.has(name)) return assetCache.get(name);
      const asset = assetLookup.getAsset(name);
      assetCache.set(name, asset);
      return asset;
    };
    const stats = exerciseStats ?? getExerciseStats(data);
    return stats
      .filter((s) => s.prCount > 0)
      .sort((a, b) => b.prCount - a.prCount)
      .slice(0, 2)
      .map((s) => {
        const asset = getAssetForExercise(s.name);
        const isLowerWeightBetter = getLoadProgressionDirection(s.name) === 'lower';
        return {
          name: s.name,
          weight: convertWeight(Math.abs(s.maxWeight), weightUnit),
          isLowerWeightBetter,
          thumbnail: asset?.thumbnail,
        };
      });
  }, [data, weightUnit, assetLookup, exerciseStats]);

  return { streakInfo, prInsights, topPRExercises };
};
