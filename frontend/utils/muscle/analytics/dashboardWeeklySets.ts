import { differenceInCalendarDays, subDays } from 'date-fns';
import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../data/exerciseAssets';
import { MUSCLE_GROUP_TO_SVG_IDS, SVG_TO_MUSCLE_GROUP, MUSCLE_ID_TO_DETAILED_SVG_IDS } from '../mapping/muscleMappingConstants';
import { getSvgIdsForCsvMuscleName } from '../mapping/muscleMapping';
import { getMuscleContributionsFromAsset } from './muscleContributions';
import { isWarmupSet, getWeeklyVolumeSetWeight } from '../../analysis/classification';
import { createExerciseAssetLookup } from '../../exercise/exerciseAssetLookup';
import { DETAILED_SVG_ID_TO_MUSCLE_ID } from '../mapping/muscleSvgMappings';

export type WeeklySetsWindow = 'all' | '7d' | '30d' | '365d';
export type WeeklySetsGrouping = 'groups' | 'muscles';

export interface WeeklySetsHeatmapResult {
  volumes: Map<string, number>;
  maxVolume: number;
}

export interface WeeklySetsDashboardResult {
  heatmap: WeeklySetsHeatmapResult;
  weeklyRatesBySubject: Map<string, number>;
  weeks: number;
  windowStart: Date;
}

const getWindowStart = (data: WorkoutSet[], now: Date, window: WeeklySetsWindow): Date | null => {
  // Earliest known workout date across all sets.
  // We use this to avoid diluting averages for users with <1y history.
  let earliest: Date | null = null;
  for (const s of data) {
    const d = s.parsedDate;
    if (!d) continue;
    if (!earliest || d < earliest) earliest = d;
  }
  if (!earliest) return null;

  if (window === 'all') return earliest;

  const candidate =
    window === '7d'
      ? subDays(now, 7)
      : window === '30d'
        ? subDays(now, 30)
        : subDays(now, 365);

  // Only clamp to earliest workout for yearly view.
  // For 7d and 30d, use exact rolling windows for predictable behavior.
  if (window === '365d') {
    // Clamp to the user's first workout date so we don't include pre-history empty time.
    return earliest > candidate ? earliest : candidate;
  }

  return candidate;
};

export const computeWeeklySetsDashboardData = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  now: Date,
  window: WeeklySetsWindow,
  grouping: WeeklySetsGrouping,
  secondarySetMultiplier: number = 0.5
): WeeklySetsDashboardResult => {
  const windowStart = getWindowStart(data, now, window);
  if (!windowStart) {
    return {
      heatmap: { volumes: new Map(), maxVolume: 1 },
      weeklyRatesBySubject: new Map(),
      weeks: 1,
      windowStart: now,
    };
  }

  const lookup = createExerciseAssetLookup(assetsMap);

  const totals = new Map<string, number>();
  const muscleTotals = new Map<string, { primary: number; secondary: number }>();
  for (const s of data) {
    if (isWarmupSet(s)) continue;
    const d = s.parsedDate;
    if (!d) continue;
    if (d < windowStart || d > now) continue;

    const name = s.exercise_title || '';
    const asset = lookup.getAsset(name);
    if (!asset) continue;

    // Full Body expands inside `getMuscleContributionsFromAsset` for both
    // modes, so the grouping alone decides the shape of the contributions.
    const useGroups = grouping === 'groups';
    const contributions = getMuscleContributionsFromAsset(asset, useGroups, { secondarySetMultiplier });
    if (contributions.length === 0) continue;

    const factor = getWeeklyVolumeSetWeight(s);
    if (factor <= 0) continue;

    // Per-set dedup: track which muscles already got primary/secondary
    const setPrimaries = new Set<string>();
    const setSecondaries = new Set<string>();

    for (const c of contributions) {
      totals.set(c.muscle, (totals.get(c.muscle) ?? 0) + c.sets * factor);

      // Map raw muscle name to muscle ID for deduplicated aggregate
      const svgIds = getSvgIdsForCsvMuscleName(c.muscle);
      for (const svgId of svgIds) {
        const muscleId = (DETAILED_SVG_ID_TO_MUSCLE_ID as any)[svgId];
        if (!muscleId) continue;
        const cur = muscleTotals.get(muscleId) || { primary: 0, secondary: 0 };

        const isPrimary = c.sets >= 1; // 1.0 = primary, < 1 = secondary
        if (isPrimary) {
          if (!setPrimaries.has(muscleId)) {
            setPrimaries.add(muscleId);
            cur.primary += factor;
          }
        } else {
          if (!setPrimaries.has(muscleId) && !setSecondaries.has(muscleId)) {
            setSecondaries.add(muscleId);
            cur.secondary += c.sets * factor;
          }
        }
        muscleTotals.set(muscleId, cur);
      }
    }
  }

  const clampedSpanDays = Math.max(1, differenceInCalendarDays(now, windowStart));
  const windowDays =
    window === 'all' || window === '365d'
      ? clampedSpanDays
      : parseInt(window, 10);
  const weeks = Math.max(1, windowDays / 7);

  const weeklyRates = new Map<string, number>();
  for (const [k, v] of totals.entries()) {
    weeklyRates.set(k, Number((v / weeks).toFixed(1)));
  }

  const muscleRates = new Map<string, number>();
  for (const [muscleId, { primary, secondary }] of muscleTotals.entries()) {
    muscleRates.set(muscleId, Number(((primary + secondary) / weeks).toFixed(1)));
  }

  const volumes = new Map<string, number>();
  let maxVolume = 0;

  if (grouping === 'groups') {
    for (const [group, val] of weeklyRates.entries()) {
      const svgIds = (MUSCLE_GROUP_TO_SVG_IDS as any)[group] as readonly string[] | undefined;
      if (!svgIds || svgIds.length === 0) continue;
      for (const svgId of svgIds) {
        volumes.set(svgId, val);
      }
      if (val > maxVolume) maxVolume = val;
    }
  } else {
    for (const [muscleId, rate] of muscleRates.entries()) {
      const svgIds = (MUSCLE_ID_TO_DETAILED_SVG_IDS as any)[muscleId] as readonly string[] | undefined;
      if (!svgIds || svgIds.length === 0) continue;
      for (const svgId of svgIds) {
        volumes.set(svgId, (volumes.get(svgId) ?? 0) + rate);
      }
      // maxVolume: each sub-part gets the same rate via distribution,
      // but different muscles may partially overlap svgIds.
      for (const svgId of svgIds) {
        const next = volumes.get(svgId) ?? 0;
        if (next > maxVolume) maxVolume = next;
      }
    }
  }

  // Ensure all interactive ids used by the bodymap resolve to a group label when in group view.
  // This keeps hover labels stable for IDs like 'chest' / 'back'.
  if (grouping === 'groups') {
    for (const [svgId, group] of Object.entries(SVG_TO_MUSCLE_GROUP)) {
      if (volumes.has(svgId)) continue;
      const groupVal = weeklyRates.get(group) ?? 0;
      if (groupVal > 0) volumes.set(svgId, groupVal);
    }
  }

  return {
    heatmap: { volumes, maxVolume: Math.max(maxVolume, 1) },
    weeklyRatesBySubject: grouping === 'muscles' ? muscleRates : weeklyRates,
    weeks,
    windowStart,
  };
};
