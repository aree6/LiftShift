/**
 * Rolling Volume Calculator
 * 
 * Computes biologically-meaningful training volume metrics using rolling windows
 * rather than calendar boundaries. This approach eliminates calendar artifacts
 * and provides accurate weekly set counts that can be compared against
 * hypertrophy recommendations (typically 10-20 sets per muscle per week).
 * 
 * Key concepts:
 * - Rolling 7-day window: Sums sets from the preceding 7 days for any given day
 * - Break detection: Periods >7 consecutive days without workouts are excluded
 * - Average weekly sets: Monthly/yearly metrics show average weekly volume, not totals
 * 
 * Set counting rules:
 * - Primary muscle: 1 set
 * - Secondary muscle: 0.5 sets
 * - Cardio: Ignored entirely
 * - Full Body: Adds 1 set to each major muscle group
 */

import { WorkoutSet } from '../../types';
import type { ExerciseAsset } from '../data/exerciseAssets';
import { startOfDay, differenceInDays, startOfMonth, startOfYear, format, subDays } from 'date-fns';
import { roundTo } from '../format/formatters';
import { getMuscleContributionsFromAsset } from './muscleContributions';
import { getSvgIdsForCsvMuscleName } from './muscleMapping';
import { isWarmupSet } from '../analysis/setClassification';
import { createExerciseNameResolver, type ExerciseNameResolver } from '../exercise/exerciseNameResolver';
import { normalizeMuscleGroup } from './muscleNormalization';
import { MUSCLE_GROUP_TO_SVG_IDS } from './muscleMappingConstants';
import { formatDayContraction, formatMonthYearContraction, formatYearContraction } from '../date/dateUtils';

// ============================================================================
// Constants
// ============================================================================

/** Days in a rolling week window */
const ROLLING_WINDOW_DAYS = 7;

/** Consecutive days without workouts that constitutes a training break */
const BREAK_THRESHOLD_DAYS = 7;

// ============================================================================
// Types
// ============================================================================

/** Represents daily muscle volume for a single workout day */
export interface DailyMuscleVolume {
  readonly date: Date;
  readonly dateKey: string;
  readonly muscles: ReadonlyMap<string, number>;
}

/** Rolling 7-day volume snapshot for a specific day */
export interface RollingWeeklyVolume {
  readonly date: Date;
  readonly dateKey: string;
  readonly muscles: ReadonlyMap<string, number>;
  readonly totalSets: number;
  readonly isInBreak: boolean;
}

/** Aggregated volume for a time period (month/year) */
export interface PeriodAverageVolume {
  readonly periodKey: string;
  readonly periodLabel: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly avgWeeklySets: ReadonlyMap<string, number>;
  readonly totalAvgSets: number;
  readonly trainingDaysCount: number;
  readonly weeksIncluded: number;
}

/** Time series entry for charting */
export interface VolumeTimeSeriesEntry {
  readonly timestamp: number;
  readonly dateFormatted: string;
  readonly [muscle: string]: number | string;
}

/** Result of time series computation */
export interface VolumeTimeSeriesResult {
  readonly data: VolumeTimeSeriesEntry[];
  readonly keys: string[];
}

type MuscleVolumeMap = Map<string, number>;

export interface KeyedContribution {
  readonly key: string;
  readonly sets: number;
}

// ============================================================================
// Muscle Contribution Extraction
// ============================================================================

// ============================================================================
// Daily Volume Computation
// ============================================================================

/** Cache for lowercase asset lookups */
let assetLowerCache: Map<string, ExerciseAsset> | null = null;
let assetCacheRef: Map<string, ExerciseAsset> | null = null;
let assetResolverCache: ExerciseNameResolver | null = null;
let assetResolverRef: Map<string, ExerciseAsset> | null = null;

/**
 * Gets or creates a lowercase-keyed version of the assets map for case-insensitive lookups.
 */
function getAssetLowerMap(assetsMap: Map<string, ExerciseAsset>): Map<string, ExerciseAsset> {
  if (assetCacheRef === assetsMap && assetLowerCache) return assetLowerCache;
  
  assetLowerCache = new Map();
  assetsMap.forEach((v, k) => assetLowerCache!.set(k.toLowerCase(), v));
  assetCacheRef = assetsMap;
  return assetLowerCache;
}

/**
 * Gets or creates a fuzzy resolver for exercise name matching.
 */
function getAssetResolver(assetsMap: Map<string, ExerciseAsset>): ExerciseNameResolver {
  if (assetResolverRef === assetsMap && assetResolverCache) return assetResolverCache;
  
  const names = Array.from(assetsMap.keys());
  assetResolverCache = createExerciseNameResolver(names);
  assetResolverRef = assetsMap;
  return assetResolverCache;
}

/**
 * Looks up an exercise asset by name with fuzzy matching.
 * This handles variations in exercise names from different CSV sources.
 */
function lookupExerciseAsset(
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
  const resolver = getAssetResolver(assetsMap);
  const resolution = resolver.resolve(name);
  
  if (resolution.method !== 'none' && resolution.name) {
    return assetsMap.get(resolution.name) ?? lowerMap.get(resolution.name.toLowerCase());
  }
  
  return undefined;
}

/**
 * Groups workout sets by day and computes muscle volume for each day.
 * 
 * This is the foundation for all rolling calculations - we first need to know
 * exactly how much volume was done on each individual training day.
 * 
 * @param data - All workout sets
 * @param getContributions - Function to get contributions for each set
 * @returns Sorted array of daily volumes (ascending by date)
 */
export function computeDailyKeyedVolumes(
  data: readonly WorkoutSet[],
  getContributions: (set: WorkoutSet) => ReadonlyArray<KeyedContribution> | null | undefined
): DailyMuscleVolume[] {
  const dailyMap = new Map<string, { date: Date; muscles: MuscleVolumeMap }>();

  for (const set of data) {
    if (!set.parsedDate) continue;
    if (isWarmupSet(set)) continue;

    const contributions = getContributions(set);
    if (!contributions || contributions.length === 0) continue;

    // Normalize to start of day for grouping
    const dayStart = startOfDay(set.parsedDate);
    const dateKey = format(dayStart, 'yyyy-MM-dd');

    let dayEntry = dailyMap.get(dateKey);
    if (!dayEntry) {
      dayEntry = { date: dayStart, muscles: new Map() };
      dailyMap.set(dateKey, dayEntry);
    }

    // Accumulate set contributions
    for (const { key, sets } of contributions) {
      const current = dayEntry.muscles.get(key) ?? 0;
      dayEntry.muscles.set(key, current + sets);
    }
  }

  // Convert to sorted array (ascending by date)
  const dailyVolumes: DailyMuscleVolume[] = Array.from(dailyMap.entries())
    .map(([dateKey, entry]) => ({
      date: entry.date,
      dateKey,
      muscles: entry.muscles as ReadonlyMap<string, number>,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return dailyVolumes;
}

/**
 * Groups workout sets by day and computes muscle volume for each day.
 * 
 * This is the foundation for all rolling calculations - we first need to know
 * exactly how much volume was done on each individual training day.
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data for muscle lookups
 * @param useGroups - Whether to group into muscle groups or use detailed muscles
 * @returns Sorted array of daily volumes (ascending by date)
 */
export function computeDailyMuscleVolumes(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  useGroups: boolean
): DailyMuscleVolume[] {
  const lowerMap = getAssetLowerMap(assetsMap);

  return computeDailyKeyedVolumes(data, (set) => {
    const exerciseName = set.exercise_title || '';
    const asset = lookupExerciseAsset(exerciseName, assetsMap, lowerMap);
    if (!asset) return null;

    const contributions = getMuscleContributionsFromAsset(asset, useGroups);
    if (contributions.length === 0) return null;

    return contributions.map((c) => ({ key: c.muscle, sets: c.sets }));
  });
}

/**
 * Groups workout sets by day and computes volumes keyed by SVG muscle IDs.
 * 
 * This matches how the Muscle View selects muscles (SVG IDs like "upper-pectoralis")
 * while still using the asset-based contribution rules:
 * - Primary: 1 set
 * - Secondary: 0.5 sets
 * - Cardio: ignored
 * - Full Body: contributes 1 set to each major muscle group (then mapped to SVG IDs)
 */
export function computeDailySvgMuscleVolumes(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>
): DailyMuscleVolume[] {
  const lowerMap = getAssetLowerMap(assetsMap);

  return computeDailyKeyedVolumes(data, (set) => {
    const exerciseName = set.exercise_title || '';
    const asset = lookupExerciseAsset(exerciseName, assetsMap, lowerMap);
    if (!asset) return null;

    const primaryGroup = normalizeMuscleGroup(asset.primary_muscle);
    const useGroupsForContributions = primaryGroup === 'Full Body';

    const contributions = getMuscleContributionsFromAsset(asset, useGroupsForContributions);
    if (contributions.length === 0) return null;

    const out: KeyedContribution[] = [];
    for (const c of contributions) {
      let svgIds = getSvgIdsForCsvMuscleName(c.muscle);
      if (svgIds.length === 0) {
        const group = normalizeMuscleGroup(c.muscle);
        const groupSvgIds = (MUSCLE_GROUP_TO_SVG_IDS as any)[group] as readonly string[] | undefined;
        svgIds = groupSvgIds ? [...groupSvgIds] : [];
      }
      if (svgIds.length === 0) continue;
      for (const svgId of svgIds) {
        out.push({ key: svgId, sets: c.sets });
      }
    }

    return out;
  });
}

// ============================================================================
// Break Detection
// ============================================================================

/**
 * Identifies training breaks in the workout history.
 * A break is defined as >7 consecutive days without any workouts.
 * 
 * @param dailyVolumes - Sorted daily volumes (ascending)
 * @returns Set of date keys that fall within a break period
 */
export function identifyBreakPeriods(
  dailyVolumes: readonly DailyMuscleVolume[]
): Set<string> {
  const breakDateKeys = new Set<string>();
  
  if (dailyVolumes.length < 2) return breakDateKeys;
  
  for (let i = 1; i < dailyVolumes.length; i++) {
    const prevDay = dailyVolumes[i - 1].date;
    const currDay = dailyVolumes[i].date;
    const gapDays = differenceInDays(currDay, prevDay);
    
    // If gap > 7 days, mark the first workout back as "returning from break"
    // The gap period itself has no workouts, so nothing to mark there
    if (gapDays > BREAK_THRESHOLD_DAYS) {
      // Mark the current day as coming out of a break
      // Rolling calculations for this day should be treated carefully
      breakDateKeys.add(dailyVolumes[i].dateKey);
    }
  }
  
  return breakDateKeys;
}

// ============================================================================
// Rolling 7-Day Window Calculation
// ============================================================================

/**
 * Computes rolling 7-day volume for each training day.
 * 
 * For each workout day, this sums all sets from that day and the preceding 6 days,
 * giving a true "weekly volume" snapshot that isn't affected by calendar boundaries.
 * 
 * @param dailyVolumes - Sorted daily volumes (ascending)
 * @param breakDates - Set of date keys that are affected by breaks
 * @returns Array of rolling weekly volumes for each training day
 */
export function computeRollingWeeklyVolumes(
  dailyVolumes: readonly DailyMuscleVolume[],
  breakDates: Set<string>
): RollingWeeklyVolume[] {
  const rollingVolumes: RollingWeeklyVolume[] = [];
  const muscleAccum = new Map<string, number>();
  let totalSets = 0;
  let startIdx = 0;

  for (let i = 0; i < dailyVolumes.length; i++) {
    const currentDay = dailyVolumes[i];

    for (const [muscle, sets] of currentDay.muscles) {
      muscleAccum.set(muscle, (muscleAccum.get(muscle) ?? 0) + sets);
      totalSets += sets;
    }

    const windowStart = startOfDay(subDays(currentDay.date, ROLLING_WINDOW_DAYS - 1));
    while (startIdx <= i && dailyVolumes[startIdx].date < windowStart) {
      const expiredDay = dailyVolumes[startIdx];
      for (const [muscle, sets] of expiredDay.muscles) {
        const next = (muscleAccum.get(muscle) ?? 0) - sets;
        if (next <= 1e-9) muscleAccum.delete(muscle);
        else muscleAccum.set(muscle, next);
        totalSets -= sets;
      }
      startIdx += 1;
    }

    rollingVolumes.push({
      date: currentDay.date,
      dateKey: currentDay.dateKey,
      muscles: new Map(muscleAccum) as ReadonlyMap<string, number>,
      totalSets: roundTo(totalSets, 1),
      isInBreak: breakDates.has(currentDay.dateKey),
    });
  }

  return rollingVolumes;
}

// ============================================================================
// Period Aggregation (Monthly/Yearly Averages)
// ============================================================================

type PeriodType = 'monthly' | 'yearly';

/**
 * Gets the period key for grouping (e.g., "2024-01" for monthly, "2024" for yearly).
 */
function getPeriodKey(date: Date, periodType: PeriodType): string {
  return periodType === 'monthly'
    ? format(date, 'yyyy-MM')
    : format(date, 'yyyy');
}

/**
 * Gets a human-readable label for the period.
 */
function getPeriodLabel(date: Date, periodType: PeriodType): string {
  return periodType === 'monthly'
    ? formatMonthYearContraction(date)
    : formatYearContraction(date);
}

/**
 * Gets the start date of the period.
 */
function getPeriodStart(date: Date, periodType: PeriodType): Date {
  return periodType === 'monthly' ? startOfMonth(date) : startOfYear(date);
}

/**
 * Aggregates rolling weekly volumes into monthly or yearly averages.
 * 
 * This computes the AVERAGE weekly sets per muscle for the period, which is
 * the biologically-meaningful metric for comparing against hypertrophy recommendations.
 * 
 * Key behaviors:
 * - Excludes rolling volumes from days returning from breaks (>7 day gaps)
 * - Averages are computed only from valid training weeks
 * - Empty periods are not included in results
 * 
 * @param rollingVolumes - Rolling weekly volumes for each training day
 * @param periodType - 'monthly' or 'yearly'
 * @returns Array of period averages sorted by date
 */
export function computePeriodAverageVolumes(
  rollingVolumes: readonly RollingWeeklyVolume[],
  periodType: PeriodType
): PeriodAverageVolume[] {
  // Group rolling volumes by period
  const periodGroups = new Map<string, {
    startDate: Date;
    label: string;
    volumes: RollingWeeklyVolume[];
  }>();
  
  for (const rv of rollingVolumes) {
    // Skip days returning from breaks - they have incomplete rolling windows
    if (rv.isInBreak) continue;
    
    const periodKey = getPeriodKey(rv.date, periodType);
    
    let group = periodGroups.get(periodKey);
    if (!group) {
      group = {
        startDate: getPeriodStart(rv.date, periodType),
        label: getPeriodLabel(rv.date, periodType),
        volumes: [],
      };
      periodGroups.set(periodKey, group);
    }
    
    group.volumes.push(rv);
  }
  
  // Compute averages for each period
  const periodAverages: PeriodAverageVolume[] = [];
  
  for (const [periodKey, group] of periodGroups) {
    if (group.volumes.length === 0) continue;
    
    // Collect all muscles seen in this period
    const allMuscles = new Set<string>();
    for (const rv of group.volumes) {
      for (const muscle of rv.muscles.keys()) {
        allMuscles.add(muscle);
      }
    }
    
    // Compute average for each muscle
    const avgMuscles = new Map<string, number>();
    let totalAvg = 0;
    
    for (const muscle of allMuscles) {
      let sum = 0;
      for (const rv of group.volumes) {
        sum += rv.muscles.get(muscle) ?? 0;
      }
      // Average across all sampled days
      const avg = sum / group.volumes.length;
      avgMuscles.set(muscle, roundTo(avg, 1));
      totalAvg += avg;
    }
    
    // Find date range
    const dates = group.volumes.map(v => v.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    periodAverages.push({
      periodKey,
      periodLabel: group.label,
      startDate: minDate,
      endDate: maxDate,
      avgWeeklySets: avgMuscles as ReadonlyMap<string, number>,
      totalAvgSets: roundTo(totalAvg, 1),
      trainingDaysCount: group.volumes.length,
      weeksIncluded: Math.ceil(group.volumes.length / 7), // Approximate weeks
    });
  }
  
  // Sort by period key (chronological)
  periodAverages.sort((a, b) => a.periodKey.localeCompare(b.periodKey));
  
  return periodAverages;
}

// ============================================================================
// Time Series Builders (for Charts)
// ============================================================================

/**
 * Builds a time series of rolling weekly volumes for charting.
 * Each point represents the rolling 7-day volume as of that training day.
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data
 * @param useGroups - Use muscle groups (true) or detailed muscles (false)
 * @returns Time series data and keys for charting
 */
export function buildRollingWeeklyTimeSeries(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  useGroups: boolean
): VolumeTimeSeriesResult {
  const dailyVolumes = computeDailyMuscleVolumes(data, assetsMap, useGroups);
  const breakDates = identifyBreakPeriods(dailyVolumes);
  const rollingVolumes = computeRollingWeeklyVolumes(dailyVolumes, breakDates);
  
  // Collect all muscle keys
  const keysSet = new Set<string>();
  for (const rv of rollingVolumes) {
    for (const muscle of rv.muscles.keys()) {
      keysSet.add(muscle);
    }
  }
  const keys = Array.from(keysSet);
  
  // Build time series entries
  const seriesData: VolumeTimeSeriesEntry[] = rollingVolumes
    .filter(rv => !rv.isInBreak) // Exclude break recovery days from display
    .map(rv => {
      const entry: Record<string, number | string> = {
        timestamp: rv.date.getTime(),
        dateFormatted: formatDayContraction(rv.date),
      };
      
      for (const k of keys) {
        entry[k] = rv.muscles.get(k) ?? 0;
      }
      
      return entry as VolumeTimeSeriesEntry;
    });
  
  return { data: seriesData, keys };
}

/**
 * Builds a time series of period-averaged volumes for charting.
 * Monthly/yearly views show average weekly sets per muscle.
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data
 * @param periodType - 'monthly' or 'yearly'
 * @param useGroups - Use muscle groups (true) or detailed muscles (false)
 * @returns Time series data and keys for charting
 */
export function buildPeriodAverageTimeSeries(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  periodType: 'monthly' | 'yearly',
  useGroups: boolean
): VolumeTimeSeriesResult {
  const dailyVolumes = computeDailyMuscleVolumes(data, assetsMap, useGroups);
  const breakDates = identifyBreakPeriods(dailyVolumes);
  const rollingVolumes = computeRollingWeeklyVolumes(dailyVolumes, breakDates);
  const periodAverages = computePeriodAverageVolumes(rollingVolumes, periodType);
  
  // Collect all muscle keys
  const keysSet = new Set<string>();
  for (const pa of periodAverages) {
    for (const muscle of pa.avgWeeklySets.keys()) {
      keysSet.add(muscle);
    }
  }
  const keys = Array.from(keysSet);
  
  // Build time series entries
  const seriesData: VolumeTimeSeriesEntry[] = periodAverages.map(pa => {
    const entry: Record<string, number | string> = {
      timestamp: pa.startDate.getTime(),
      dateFormatted: pa.periodLabel,
    };
    
    for (const k of keys) {
      entry[k] = pa.avgWeeklySets.get(k) ?? 0;
    }
    
    return entry as VolumeTimeSeriesEntry;
  });
  
  return { data: seriesData, keys };
}

/**
 * Builds a time series of rolling weekly volumes for charting, keyed by SVG muscle IDs.
 * Each point represents the rolling 7-day volume as of that training day.
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data
 * @returns Time series data and keys for charting
 */
export function buildRollingWeeklySvgMuscleTimeSeries(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>
): VolumeTimeSeriesResult {
  const dailyVolumes = computeDailySvgMuscleVolumes(data, assetsMap);
  const breakDates = identifyBreakPeriods(dailyVolumes);
  const rollingVolumes = computeRollingWeeklyVolumes(dailyVolumes, breakDates);
  
  // Collect all muscle keys
  const keysSet = new Set<string>();
  for (const rv of rollingVolumes) {
    for (const muscle of rv.muscles.keys()) {
      keysSet.add(muscle);
    }
  }
  const keys = Array.from(keysSet);
  
  // Build time series entries
  const seriesData: VolumeTimeSeriesEntry[] = rollingVolumes
    .filter(rv => !rv.isInBreak) // Exclude break recovery days from display
    .map(rv => {
      const entry: Record<string, number | string> = {
        timestamp: rv.date.getTime(),
        dateFormatted: formatDayContraction(rv.date),
      };
      
      for (const k of keys) {
        entry[k] = rv.muscles.get(k) ?? 0;
      }
      
      return entry as VolumeTimeSeriesEntry;
    });
  
  return { data: seriesData, keys };
}

/**
 * Builds a time series of period-averaged volumes for charting, keyed by SVG muscle IDs.
 * Monthly/yearly views show average weekly sets per muscle.
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data
 * @param periodType - 'monthly' or 'yearly'
 * @returns Time series data and keys for charting
 */
export function buildPeriodAverageSvgMuscleTimeSeries(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  periodType: 'monthly' | 'yearly'
): VolumeTimeSeriesResult {
  const dailyVolumes = computeDailySvgMuscleVolumes(data, assetsMap);
  const breakDates = identifyBreakPeriods(dailyVolumes);
  const rollingVolumes = computeRollingWeeklyVolumes(dailyVolumes, breakDates);
  const periodAverages = computePeriodAverageVolumes(rollingVolumes, periodType);
  
  // Collect all muscle keys
  const keysSet = new Set<string>();
  for (const pa of periodAverages) {
    for (const muscle of pa.avgWeeklySets.keys()) {
      keysSet.add(muscle);
    }
  }
  const keys = Array.from(keysSet);
  
  // Build time series entries
  const seriesData: VolumeTimeSeriesEntry[] = periodAverages.map(pa => {
    const entry: Record<string, number | string> = {
      timestamp: pa.startDate.getTime(),
      dateFormatted: pa.periodLabel,
    };
    
    for (const k of keys) {
      entry[k] = pa.avgWeeklySets.get(k) ?? 0;
    }
    
    return entry as VolumeTimeSeriesEntry;
  });
  
  return { data: seriesData, keys };
}

// ============================================================================
// Public API - Main Entry Points
// ============================================================================

export type VolumePeriod = 'weekly' | 'monthly' | 'yearly';

/**
 * Gets muscle volume time series for the specified period.
 * 
 * This is the main entry point for volume calculations:
 * - Weekly: Rolling 7-day sums (true weekly volume per muscle)
 * - Monthly: Average weekly sets per muscle for each month
 * - Yearly: Average weekly sets per muscle for each year
 * 
 * All calculations exclude break periods (>7 consecutive days without training).
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data for muscle lookups
 * @param period - 'weekly', 'monthly', or 'yearly'
 * @param useGroups - If true, aggregate to muscle groups; if false, use detailed muscles
 * @returns Time series data suitable for charting
 */
export function getMuscleVolumeTimeSeriesRolling(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: VolumePeriod = 'weekly',
  useGroups: boolean = true
): VolumeTimeSeriesResult {
  if (period === 'weekly') {
    return buildRollingWeeklyTimeSeries(data, assetsMap, useGroups);
  }
  
  return buildPeriodAverageTimeSeries(data, assetsMap, period, useGroups);
}

/**
 * Gets SVG-muscle volume time series for the specified period.
 * 
 * This is the main entry point for volume calculations:
 * - Weekly: Rolling 7-day sums (true weekly volume per muscle)
 * - Monthly: Average weekly sets per muscle for each month
 * - Yearly: Average weekly sets per muscle for each year
 * 
 * All calculations exclude break periods (>7 consecutive days without training).
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data
 * @param period - 'weekly', 'monthly', or 'yearly'
 * @returns Time series data suitable for charting
 */
export function getSvgMuscleVolumeTimeSeriesRolling(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  period: VolumePeriod = 'weekly'
): VolumeTimeSeriesResult {
  if (period === 'weekly') {
    return buildRollingWeeklySvgMuscleTimeSeries(data, assetsMap);
  }
  
  return buildPeriodAverageSvgMuscleTimeSeries(data, assetsMap, period);
}

/**
 * Gets the latest rolling weekly volume (most recent training day).
 * Useful for displaying current weekly muscle volume status.
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data
 * @param useGroups - Use muscle groups or detailed muscles
 * @returns Latest rolling weekly volume, or null if no data
 */
export function getLatestRollingWeeklyVolume(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  useGroups: boolean = true
): RollingWeeklyVolume | null {
  const dailyVolumes = computeDailyMuscleVolumes(data, assetsMap, useGroups);
  if (dailyVolumes.length === 0) return null;
  
  const breakDates = identifyBreakPeriods(dailyVolumes);
  const rollingVolumes = computeRollingWeeklyVolumes(dailyVolumes, breakDates);
  
  // Return the most recent non-break volume
  for (let i = rollingVolumes.length - 1; i >= 0; i--) {
    if (!rollingVolumes[i].isInBreak) {
      return rollingVolumes[i];
    }
  }
  
  // If all are in breaks, return the most recent anyway
  return rollingVolumes[rollingVolumes.length - 1] ?? null;
}

/**
 * Gets the latest rolling weekly volume keyed by SVG muscle IDs.
 * 
 * @param data - All workout sets
 * @param assetsMap - Exercise asset data
 * @returns Latest rolling weekly volume, or null if no data
 */
export function getLatestRollingWeeklySvgMuscleVolume(
  data: readonly WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>
): RollingWeeklyVolume | null {
  const dailyVolumes = computeDailySvgMuscleVolumes(data, assetsMap);
  if (dailyVolumes.length === 0) return null;

  const breakDates = identifyBreakPeriods(dailyVolumes);
  const rollingVolumes = computeRollingWeeklyVolumes(dailyVolumes, breakDates);

  for (let i = rollingVolumes.length - 1; i >= 0; i--) {
    if (!rollingVolumes[i].isInBreak) {
      return rollingVolumes[i];
    }
  }

  return rollingVolumes[rollingVolumes.length - 1] ?? null;
}
