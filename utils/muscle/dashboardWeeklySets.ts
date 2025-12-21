import { differenceInCalendarDays, subDays } from 'date-fns';
import type { WorkoutSet } from '../../types';
import type { ExerciseAsset } from '../data/exerciseAssets';
import { MUSCLE_GROUP_TO_SVG_IDS, SVG_TO_MUSCLE_GROUP } from './muscleMappingConstants';
import { getSvgIdsForCsvMuscleName } from './muscleMapping';
import { getMuscleContributionsFromAsset } from './muscleContributions';
import { normalizeMuscleGroup } from './muscleNormalization';
import { isWarmupSet } from '../analysis/setClassification';
import { createExerciseNameResolver, type ExerciseNameResolver } from '../exercise/exerciseNameResolver';

export type WeeklySetsWindow = 'all' | '7d' | '30d' | '365d';
export type WeeklySetsGrouping = 'groups' | 'muscles';

export interface WeeklySetsCompositionEntry {
  subject: string;
  value: number;
}

export interface WeeklySetsHeatmapResult {
  volumes: Map<string, number>;
  maxVolume: number;
}

export interface WeeklySetsDashboardResult {
  composition: WeeklySetsCompositionEntry[];
  heatmap: WeeklySetsHeatmapResult;
  weeks: number;
  windowStart: Date;
}

const getWindowStart = (data: WorkoutSet[], now: Date, window: WeeklySetsWindow): Date | null => {
  if (window === '7d') return subDays(now, 7);
  if (window === '30d') return subDays(now, 30);
  if (window === '365d') return subDays(now, 365);

  let start: Date | null = null;
  for (const s of data) {
    const d = s.parsedDate;
    if (!d) continue;
    if (!start || d < start) start = d;
  }
  return start;
};

export const computeWeeklySetsDashboardData = (
  data: WorkoutSet[],
  assetsMap: Map<string, ExerciseAsset>,
  now: Date,
  window: WeeklySetsWindow,
  grouping: WeeklySetsGrouping
): WeeklySetsDashboardResult => {
  const windowStart = getWindowStart(data, now, window);
  if (!windowStart) {
    return {
      composition: [],
      heatmap: { volumes: new Map(), maxVolume: 1 },
      weeks: 1,
      windowStart: now,
    };
  }

  const lowerMap = new Map<string, ExerciseAsset>();
  assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));

  // Create fuzzy resolver for exercise name matching
  const allNames = Array.from(assetsMap.keys());
  const resolver = allNames.length > 0 ? createExerciseNameResolver(allNames) : null;

  const lookupAsset = (name: string): ExerciseAsset | undefined => {
    // Try exact match first
    let asset = assetsMap.get(name) || lowerMap.get(name.toLowerCase());
    if (asset) return asset;
    // Fuzzy fallback
    if (resolver) {
      const resolved = resolver.resolve(name);
      if (resolved) {
        const resolvedName = resolved.name;
        asset = assetsMap.get(resolvedName) || lowerMap.get(resolvedName.toLowerCase());
      }
    }
    return asset;
  };

  const totals = new Map<string, number>();
  for (const s of data) {
    if (isWarmupSet(s)) continue;
    const d = s.parsedDate;
    if (!d) continue;
    if (d < windowStart || d > now) continue;

    const name = s.exercise_title || '';
    const asset = lookupAsset(name);
    if (!asset) continue;

    const primaryGroup = normalizeMuscleGroup(asset.primary_muscle);
    const useGroups = grouping === 'groups' || primaryGroup === 'Full Body';
    const contributions = getMuscleContributionsFromAsset(asset, useGroups);
    if (contributions.length === 0) continue;

    for (const c of contributions) {
      totals.set(c.muscle, (totals.get(c.muscle) ?? 0) + c.sets);
    }
  }

  const days = Math.max(1, differenceInCalendarDays(now, windowStart) + 1);
  const weeks = Math.max(1, days / 7);

  const weeklyRates = new Map<string, number>();
  for (const [k, v] of totals.entries()) {
    weeklyRates.set(k, Number((v / weeks).toFixed(1)));
  }

  const composition: WeeklySetsCompositionEntry[] = Array.from(weeklyRates.entries())
    .map(([subject, value]) => ({ subject, value }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 16);

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
    for (const [muscleName, val] of weeklyRates.entries()) {
      const svgIds = getSvgIdsForCsvMuscleName(muscleName);
      if (svgIds.length === 0) continue;
      for (const svgId of svgIds) {
        volumes.set(svgId, val);
      }
      if (val > maxVolume) maxVolume = val;
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
    composition,
    heatmap: { volumes, maxVolume: Math.max(maxVolume, 1) },
    weeks,
    windowStart,
  };
};
