import type { WorkoutSet } from '../../types';
import type { ExerciseAsset } from '../data/exerciseAssets';
import { computationCache } from '../storage/computationCache';
import { cacheKeys, flexCacheKeys, muscleCacheKeys } from '../storage/cacheKeys';
import { getExerciseStats } from '../analysis/core';
import { buildHistorySessions } from '../../components/historyView/utils';
import { calculateStreakInfo, calculatePRInsights } from '../analysis/insights';
import { computeWeeklySetsDashboardData } from '../muscle/analytics';
import { getMuscleVolumeTimeSeries } from '../muscle/analytics';
import type { WeeklySetsWindow, WeeklySetsGrouping } from '../muscle/analytics';

/**
 * Prefetch strategies for predictive loading
 * 
 * Each function prefetches data for the NEXT view while user is on CURRENT view
 * Uses the same cache keys as regular computations for automatic sharing
 * Silent failures - doesn't break if prefetch fails
 */

const PREFETCH_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Idle-gated prefetch scheduler. Runs the (synchronous, cache-warming)
 * prefetch work when the browser is idle instead of on a fixed timer that
 * can fire mid-scroll/filter. Falls back to a delayed timer where
 * requestIdleCallback is unavailable. Returns a cancel function.
 */
export const schedulePrefetch = (fn: () => void): (() => void) => {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(fn, { timeout: 3000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const timer = window.setTimeout(fn, 3000);
  return () => window.clearTimeout(timer);
};

/**
 * Prefetch Exercise view data
 * Called when user is on Dashboard for 3+ seconds
 */
export const prefetchExerciseData = (
  filterCacheKey: string,
  data: WorkoutSet[]
): void => {
  try {
    // Prefetch exercise stats (lightweight, but ensures it's cached)
    computationCache.getOrCompute(
      cacheKeys.exerciseStats(filterCacheKey),
      data,
      () => getExerciseStats(data),
      { ttl: PREFETCH_TTL }
    );
  } catch (e) {
    // Silent fail - prefetch is optimization, not requirement
    console.debug('Prefetch exercise data failed:', e);
  }
};

/**
 * Prefetch Muscle Analysis view data
 * Called when user is on Exercise view for 3+ seconds
 */
export const prefetchMuscleData = (
  filterCacheKey: string,
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset> | null,
  effectiveNow: Date,
  secondarySetMultiplier: number = 0.5
): void => {
  if (!assetsMap) return;

  try {
    // Prefetch weekly sets for muscles mode (30d window is default)
    computationCache.getOrCompute(
      muscleCacheKeys.weeklySets(filterCacheKey, '30d', 'muscles', secondarySetMultiplier),
      data,
      () => computeWeeklySetsDashboardData(data, assetsMap, effectiveNow, '30d', 'muscles', secondarySetMultiplier),
      { ttl: PREFETCH_TTL }
    );

    // Prefetch weekly sets for groups mode
    computationCache.getOrCompute(
      muscleCacheKeys.weeklySets(filterCacheKey, '30d', 'groups', secondarySetMultiplier),
      data,
      () => computeWeeklySetsDashboardData(data, assetsMap, effectiveNow, '30d', 'groups', secondarySetMultiplier),
      { ttl: PREFETCH_TTL }
    );

    // Prefetch muscle series for groups (used in trend charts)
    computationCache.getOrCompute(
      muscleCacheKeys.muscleSeries(filterCacheKey, 'groups', secondarySetMultiplier),
      data,
      () => getMuscleVolumeTimeSeries(data, assetsMap, 'weekly', secondarySetMultiplier),
      { ttl: PREFETCH_TTL }
    );

    // Prefetch muscle series for muscles
    computationCache.getOrCompute(
      muscleCacheKeys.muscleSeries(filterCacheKey, 'muscles', secondarySetMultiplier),
      data,
      () => getMuscleVolumeTimeSeries(data, assetsMap, 'weekly', secondarySetMultiplier),
      { ttl: PREFETCH_TTL }
    );
  } catch (e) {
    console.debug('Prefetch muscle data failed:', e);
  }
};

/**
 * Prefetch History view data
 * Called when user is on Muscle Analysis view for 3+ seconds
 */
export const prefetchHistoryData = (
  filterCacheKey: string,
  data: WorkoutSet[],
  effectiveNow: Date
): void => {
  try {
    // Prefetch history sessions (first page)
    computationCache.getOrCompute(
      `historySessions:v2:${filterCacheKey}`,
      data,
      () => buildHistorySessions(data),
      { ttl: PREFETCH_TTL }
    );
  } catch (e) {
    console.debug('Prefetch history data failed:', e);
  }
};

/**
 * Prefetch Flex view data
 * Called when user is on History view for 3+ seconds
 */
export const prefetchFlexData = (
  filterCacheKey: string,
  data: WorkoutSet[],
  effectiveNow: Date
): void => {
  try {
    // Prefetch streak info (canonical key so History→Flex navigation hits)
    computationCache.getOrCompute(
      flexCacheKeys.streakInfo(filterCacheKey),
      data,
      () => calculateStreakInfo(data, effectiveNow),
      { ttl: PREFETCH_TTL }
    );

    // Prefetch PR insights (canonical key)
    computationCache.getOrCompute(
      flexCacheKeys.prInsights(filterCacheKey),
      data,
      () => calculatePRInsights(data, effectiveNow),
      { ttl: PREFETCH_TTL }
    );
  } catch (e) {
    console.debug('Prefetch flex data failed:', e);
  }
};
