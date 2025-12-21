/**
 * Muscle Analytics Module
 * 
 * Provides biologically-meaningful training volume metrics using rolling windows.
 * This replaces calendar-based aggregation with true weekly volume calculations
 * that can be compared against hypertrophy recommendations (10-20 sets/muscle/week).
 * 
 * Volume Calculation Rules:
 * - Primary muscle: 1 set
 * - Secondary muscle: 0.5 sets  
 * - Cardio: Ignored entirely
 * - Full Body: Distributes 1 set to each major muscle group
 * 
 * Period Semantics:
 * - Weekly: Rolling 7-day sum (true weekly volume snapshot)
 * - Monthly: Average weekly sets across the month
 * - Yearly: Average weekly sets across the year
 * 
 * Break Detection:
 * - Periods >7 consecutive days without workouts are excluded from averages
 * - This prevents artificially low averages from vacation/injury periods
 */

import { WorkoutSet } from '../../types';
import type { ExerciseAsset } from '../data/exerciseAssets';
import { buildTimeSeries } from '../analysis/aggregators';
import { format, startOfDay } from 'date-fns';
import { getMuscleContributionsFromAsset } from './muscleContributions';
import { isWarmupSet } from '../analysis/setClassification';
import { createExerciseNameResolver, type ExerciseNameResolver } from '../exercise/exerciseNameResolver';
import {
  getMuscleVolumeTimeSeriesRolling,
  getLatestRollingWeeklyVolume,
  VolumeTimeSeriesResult,
  VolumeTimeSeriesEntry,
  RollingWeeklyVolume,
  VolumePeriod,
} from './rollingVolumeCalculator';
import { roundTo } from '../format/formatters';
import { formatDayContraction, TimePeriod } from '../date/dateUtils';

export type { NormalizedMuscleGroup } from './muscleNormalization';
export { normalizeMuscleGroup } from './muscleNormalization';

// ============================================================================
// Re-exports from Rolling Volume Calculator
// ============================================================================

export type { VolumeTimeSeriesResult, VolumeTimeSeriesEntry, RollingWeeklyVolume };
export type { VolumePeriod };

// ============================================================================
// Type Definitions
// ============================================================================

/** Legacy interface for backwards compatibility */
export interface MuscleTimeSeriesEntry {
  timestamp: number;
  dateFormatted: string;
  [muscle: string]: number | string;
}

/** Legacy interface for backwards compatibility */
export interface MuscleTimeSeriesResult {
  data: MuscleTimeSeriesEntry[];
  keys: string[];
}

export interface MuscleCompositionEntry {
  subject: string;
  value: number;
}

export interface MuscleCompositionResult {
  data: MuscleCompositionEntry[];
  label: string;
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Gets muscle volume time series aggregated by muscle groups.
 * 
 * Period semantics (biologically meaningful):
 * - 'weekly': Rolling 7-day sum showing true weekly volume per muscle group
 * - 'monthly': Average weekly sets per muscle group for each month
 * - 'yearly': Average weekly sets per muscle group for each year
 * - 'daily': Raw daily volume (not rolling, for detailed analysis)
 * 
 * Break periods (>7 days without training) are automatically excluded from averages.
 * 
 * @param data - Workout set data
 * @param assetsMap - Exercise asset mappings for muscle lookups
 * @param period - Time period for aggregation
 * @returns Time series data with muscle group keys
 */
export const getMuscleVolumeTimeSeries = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'daily' | 'yearly' = 'weekly'
): MuscleTimeSeriesResult => {
  // Daily uses the old simple aggregation (no rolling needed)
  if (period === 'daily') {
    return buildSimpleDailyTimeSeries(data, assetsMap, true);
  }
  
  // Weekly/Monthly/Yearly use rolling window calculations
  return getMuscleVolumeTimeSeriesRolling(data, assetsMap, period as VolumePeriod, true);
};

/**
 * Gets muscle volume time series with detailed individual muscles.
 * 
 * Same period semantics as getMuscleVolumeTimeSeries but returns
 * individual muscle names instead of aggregated groups.
 * 
 * @param data - Workout set data
 * @param assetsMap - Exercise asset mappings
 * @param period - Time period for aggregation
 * @returns Time series data with individual muscle keys
 */
export const getMuscleVolumeTimeSeriesDetailed = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'daily' | 'yearly' = 'weekly'
): MuscleTimeSeriesResult => {
  if (period === 'daily') {
    return buildSimpleDailyTimeSeries(data, assetsMap, false);
  }
  
  return getMuscleVolumeTimeSeriesRolling(data, assetsMap, period as VolumePeriod, false);
};

export const getMuscleVolumeTimeSeriesCalendar = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'daily' | 'yearly' = 'weekly'
): MuscleTimeSeriesResult => {
  const lowerMap = getLowerMap(assetsMap);
  const result = buildTimeSeries<WorkoutSet>(data, period as TimePeriod, (set) => {
    if (isWarmupSet(set)) return {};
    const name = set.exercise_title || '';
    const asset = lookupAsset(name, assetsMap, lowerMap);
    if (!asset) return {};
    const contributions = getMuscleContributionsFromAsset(asset, true);
    if (contributions.length === 0) return {};
    const out: Record<string, number> = {};
    for (const c of contributions) {
      out[c.muscle] = (out[c.muscle] || 0) + c.sets;
    }
    return out;
  });
  return { data: result.data as MuscleTimeSeriesEntry[], keys: result.keys };
};

export const getMuscleVolumeTimeSeriesDetailedCalendar = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'daily' | 'yearly' = 'weekly'
): MuscleTimeSeriesResult => {
  const lowerMap = getLowerMap(assetsMap);
  const result = buildTimeSeries<WorkoutSet>(data, period as TimePeriod, (set) => {
    if (isWarmupSet(set)) return {};
    const name = set.exercise_title || '';
    const asset = lookupAsset(name, assetsMap, lowerMap);
    if (!asset) return {};
    const contributions = getMuscleContributionsFromAsset(asset, false);
    if (contributions.length === 0) return {};
    const out: Record<string, number> = {};
    for (const c of contributions) {
      out[c.muscle] = (out[c.muscle] || 0) + c.sets;
    }
    return out;
  });
  return { data: result.data as MuscleTimeSeriesEntry[], keys: result.keys };
};

/**
 * Gets the latest rolling weekly muscle composition.
 * Shows current 7-day volume per muscle, useful for radar/heatmap displays.
 * 
 * @param data - Workout set data
 * @param assetsMap - Exercise asset mappings
 * @param period - Period hint (weekly recommended for meaningful comparison)
 * @returns Composition data sorted by volume (descending)
 */
export const getDetailedMuscleCompositionLatest = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: 'weekly' | 'monthly' | 'yearly' = 'weekly'
): MuscleCompositionResult => {
  const latestVolume = getLatestRollingWeeklyVolume(data, assetsMap, false);
  
  if (!latestVolume) {
    return { data: [], label: '' };
  }
  
  const arr: MuscleCompositionEntry[] = Array.from(latestVolume.muscles.entries())
    .map(([subject, value]) => ({ subject, value: roundTo(value, 1) }))
    .filter(entry => entry.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const label = period === 'weekly' 
    ? 'Current Week (Rolling)' 
    : `Latest ${period.charAt(0).toUpperCase() + period.slice(1)}`;
  
  return { data: arr, label };
};

// ============================================================================
// Internal Helpers
// ============================================================================

/** Cached lowercase asset map for case-insensitive lookups */
let cachedLowerMap: Map<string, ExerciseAsset> | null = null;
let cachedAssetsMapRef: Map<string, ExerciseAsset> | null = null;

/** Cached fuzzy resolver for exercise name matching */
let cachedResolver: ExerciseNameResolver | null = null;
let cachedResolverRef: Map<string, ExerciseAsset> | null = null;

function getLowerMap(assetsMap: Map<string, ExerciseAsset>): Map<string, ExerciseAsset> {
  if (cachedAssetsMapRef === assetsMap && cachedLowerMap) return cachedLowerMap;
  
  cachedLowerMap = new Map();
  assetsMap.forEach((v, k) => cachedLowerMap!.set(k.toLowerCase(), v));
  cachedAssetsMapRef = assetsMap;
  return cachedLowerMap;
}

function getResolver(assetsMap: Map<string, ExerciseAsset>): ExerciseNameResolver {
  if (cachedResolverRef === assetsMap && cachedResolver) return cachedResolver;
  
  const names = Array.from(assetsMap.keys());
  cachedResolver = createExerciseNameResolver(names);
  cachedResolverRef = assetsMap;
  return cachedResolver;
}

/**
 * Look up an exercise asset with fuzzy name matching.
 * This handles variations in exercise names from different CSV sources.
 */
function lookupAsset(
  name: string,
  assetsMap: Map<string, ExerciseAsset>,
  lowerMap: Map<string, ExerciseAsset>
): ExerciseAsset | undefined {
  if (!name) return undefined;
  
  // Fast path: exact match
  const exact = assetsMap.get(name);
  if (exact) return exact;
  
  // Fast path: case-insensitive match
  const lower = lowerMap.get(name.toLowerCase());
  if (lower) return lower;
  
  // Fallback: fuzzy matching
  const resolver = getResolver(assetsMap);
  const resolution = resolver.resolve(name);
  
  if (resolution.method !== 'none' && resolution.name) {
    return assetsMap.get(resolution.name) ?? lowerMap.get(resolution.name.toLowerCase());
  }
  
  return undefined;
}

/**
 * Builds a simple daily time series (no rolling, just per-day totals).
 * Used for the 'daily' period option.
 */
function buildSimpleDailyTimeSeries(
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  useGroups: boolean
): MuscleTimeSeriesResult {
  const lowerMap = getLowerMap(assetsMap);
  const grouped = new Map<string, {
    timestamp: number;
    label: string;
    volumes: Map<string, number>;
  }>();

  for (const set of data) {
    if (!set.parsedDate) continue;
    if (isWarmupSet(set)) continue;
    
    const name = set.exercise_title || '';
    const asset = lookupAsset(name, assetsMap, lowerMap);
    if (!asset) continue;
    
    const contributions = getMuscleContributionsFromAsset(asset, useGroups);
    if (contributions.length === 0) continue;

    const dayStart = startOfDay(set.parsedDate);
    const dateKey = format(dayStart, 'yyyy-MM-dd');
    const timestamp = dayStart.getTime();
    
    let bucket = grouped.get(dateKey);
    if (!bucket) {
      const label = formatDayContraction(dayStart);
      bucket = { timestamp, label, volumes: new Map() };
      grouped.set(dateKey, bucket);
    }

    for (const { muscle, sets } of contributions) {
      bucket.volumes.set(muscle, (bucket.volumes.get(muscle) ?? 0) + sets);
    }
  }

  // Sort by timestamp and extract keys
  const entries = Array.from(grouped.values()).sort((a, b) => a.timestamp - b.timestamp);
  const keysSet = new Set<string>();
  for (const e of entries) {
    for (const k of e.volumes.keys()) keysSet.add(k);
  }
  const keys = Array.from(keysSet);

  const series: MuscleTimeSeriesEntry[] = entries.map(e => {
    const row: MuscleTimeSeriesEntry = {
      timestamp: e.timestamp,
      dateFormatted: e.label,
    };
    for (const k of keys) {
      row[k] = roundTo(e.volumes.get(k) ?? 0, 1);
    }
    return row;
  });

  return { data: series, keys };
}
