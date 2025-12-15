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

import { WorkoutSet } from '../types';
import type { ExerciseAsset } from './exerciseAssets';
import { buildTimeSeries } from './aggregators';
import {
  getMuscleVolumeTimeSeriesRolling,
  getLatestRollingWeeklyVolume,
  VolumeTimeSeriesResult,
  VolumeTimeSeriesEntry,
  RollingWeeklyVolume,
  VolumePeriod,
} from './rollingVolumeCalculator';
import { roundTo } from './formatters';
import { formatDayContraction, TimePeriod } from './dateUtils';

// ============================================================================
// Re-exports from Rolling Volume Calculator
// ============================================================================

export type { VolumeTimeSeriesResult, VolumeTimeSeriesEntry, RollingWeeklyVolume };
export type { VolumePeriod };

// ============================================================================
// Type Definitions
// ============================================================================

/** Normalized muscle group categories */
export type NormalizedMuscleGroup = 
  | 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' 
  | 'Cardio' | 'Full Body' | 'Other';

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
// Muscle Group Normalization (kept for other modules that may use it)
// ============================================================================

const MUSCLE_GROUP_PATTERNS: ReadonlyArray<[NormalizedMuscleGroup, ReadonlyArray<string>]> = [
  ['Chest', ['chest', 'pec']],
  ['Back', ['lat', 'upper back', 'back', 'lower back']],
  ['Shoulders', ['shoulder', 'delto']],
  ['Arms', ['bicep', 'tricep', 'forearm', 'arms']],
  ['Legs', ['quad', 'hamstring', 'glute', 'calv', 'thigh', 'hip', 'adductor', 'abductor']],
  ['Core', ['abdom', 'core', 'waist', 'oblique']],
  ['Cardio', ['cardio']],
  ['Full Body', ['full body', 'full-body']],
];

const muscleGroupCache = new Map<string, NormalizedMuscleGroup>();

/**
 * Normalizes a raw muscle name to a standard muscle group.
 * Uses caching for efficient repeated lookups.
 */
export const normalizeMuscleGroup = (m?: string): NormalizedMuscleGroup => {
  if (!m) return 'Other';
  const key = String(m).trim().toLowerCase();
  if (key === 'none' || key === '') return 'Other';
  
  const cached = muscleGroupCache.get(key);
  if (cached) return cached;
  
  for (const [group, patterns] of MUSCLE_GROUP_PATTERNS) {
    for (const pattern of patterns) {
      if (key.includes(pattern) || key === pattern) {
        muscleGroupCache.set(key, group);
        return group;
      }
    }
  }
  
  muscleGroupCache.set(key, 'Other');
  return 'Other';
};

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
    const name = set.exercise_title || '';
    const asset = lookupAsset(name, assetsMap, lowerMap);
    if (!asset) return {};
    const contributions = extractMuscleContributions(asset, true);
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
    const name = set.exercise_title || '';
    const asset = lookupAsset(name, assetsMap, lowerMap);
    if (!asset) return {};
    const contributions = extractMuscleContributions(asset, false);
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

/** Full body muscle groups for distribution */
const FULL_BODY_GROUPS: readonly NormalizedMuscleGroup[] = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'
];

/** Cached lowercase asset map for case-insensitive lookups */
let cachedLowerMap: Map<string, ExerciseAsset> | null = null;
let cachedAssetsMapRef: Map<string, ExerciseAsset> | null = null;

function getLowerMap(assetsMap: Map<string, ExerciseAsset>): Map<string, ExerciseAsset> {
  if (cachedAssetsMapRef === assetsMap && cachedLowerMap) return cachedLowerMap;
  
  cachedLowerMap = new Map();
  assetsMap.forEach((v, k) => cachedLowerMap!.set(k.toLowerCase(), v));
  cachedAssetsMapRef = assetsMap;
  return cachedLowerMap;
}

function lookupAsset(
  name: string,
  assetsMap: Map<string, ExerciseAsset>,
  lowerMap: Map<string, ExerciseAsset>
): ExerciseAsset | undefined {
  return assetsMap.get(name) ?? lowerMap.get(name.toLowerCase());
}

interface MuscleContribution {
  muscle: string;
  sets: number;
}

/**
 * Extracts muscle contributions from an exercise asset.
 */
function extractMuscleContributions(
  asset: ExerciseAsset,
  useGroups: boolean
): MuscleContribution[] {
  const contributions: MuscleContribution[] = [];
  const primaryRaw = String(asset.primary_muscle ?? '').trim();
  
  // Skip cardio exercises
  if (!primaryRaw || /cardio/i.test(primaryRaw)) return contributions;
  
  const primary = useGroups ? normalizeMuscleGroup(primaryRaw) : primaryRaw;
  
  // Full body distributes to all major groups
  if (primary === 'Full Body' && useGroups) {
    for (const grp of FULL_BODY_GROUPS) {
      contributions.push({ muscle: grp, sets: 1.0 });
    }
    return contributions;
  }
  
  // For detailed view, skip full body (no specific muscle)
  if (/full\s*body/i.test(primaryRaw) && !useGroups) {
    return contributions;
  }
  
  contributions.push({ muscle: primary, sets: 1.0 });
  
  // Process secondary muscles (0.5 sets each)
  const secondaryRaw = String(asset.secondary_muscle ?? '').trim();
  if (secondaryRaw && !/none/i.test(secondaryRaw)) {
    for (const s of secondaryRaw.split(',')) {
      const trimmed = s.trim();
      if (!trimmed || /cardio/i.test(trimmed) || /full\s*body/i.test(trimmed)) continue;
      
      const secondary = useGroups ? normalizeMuscleGroup(trimmed) : trimmed;
      if (secondary === 'Cardio') continue;
      
      contributions.push({ muscle: secondary, sets: 0.5 });
    }
  }
  
  return contributions;
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
    
    const name = set.exercise_title || '';
    const asset = lookupAsset(name, assetsMap, lowerMap);
    if (!asset) continue;
    
    const contributions = extractMuscleContributions(asset, useGroups);
    if (contributions.length === 0) continue;

    const dateKey = set.parsedDate.toISOString().split('T')[0];
    const timestamp = new Date(dateKey).getTime();
    
    let bucket = grouped.get(dateKey);
    if (!bucket) {
      const d = new Date(dateKey);
      const label = formatDayContraction(d);
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
