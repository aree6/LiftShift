import type { WorkoutSet } from '../../types';
import type { ExerciseAsset } from '../data/exerciseAssets';
import { isWarmupSet } from '../analysis/setClassification';
import { createExerciseNameResolver } from '../exercise/exerciseNameResolver';
import { parseMuscleFields } from './muscleContributions';
import { normalizeMuscleGroup, type NormalizedMuscleGroup } from './muscleNormalization';
import { getSvgIdsForCsvMuscleName } from './muscleMapping';
import { FULL_BODY_TARGET_GROUPS } from './muscleMappingConstants';

export type WindowedBreakdownGrouping = 'groups' | 'muscles';

export type WindowedExerciseBreakdown = {
  totalSetsInWindow: number;
  exercises: Map<string, { sets: number; primarySets: number; secondarySets: number }>;
};

type LookupAsset = (name: string) => ExerciseAsset | undefined;

const createAssetLookup = (assetsMap: Map<string, ExerciseAsset>): LookupAsset => {
  const lowerMap = new Map<string, ExerciseAsset>();
  assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));

  const allNames = Array.from(assetsMap.keys());
  const resolver = allNames.length > 0 ? createExerciseNameResolver(allNames) : null;

  return (name: string) => {
    const raw = String(name ?? '').trim();
    if (!raw) return undefined;

    const direct = assetsMap.get(raw) || lowerMap.get(raw.toLowerCase());
    if (direct) return direct;

    if (!resolver) return undefined;
    const resolved = resolver.resolve(raw);
    if (!resolved?.name) return undefined;
    return assetsMap.get(resolved.name) || lowerMap.get(resolved.name.toLowerCase());
  };
};

const addExerciseInc = (
  exerciseMap: Map<string, { sets: number; primarySets: number; secondarySets: number }>,
  exerciseName: string,
  inc: { sets: number; primarySets: number; secondarySets: number }
) => {
  const prev = exerciseMap.get(exerciseName) || { sets: 0, primarySets: 0, secondarySets: 0 };
  prev.sets += inc.sets;
  prev.primarySets += inc.primarySets;
  prev.secondarySets += inc.secondarySets;
  exerciseMap.set(exerciseName, prev);
};

const toSelectedSet = (selected: readonly string[] | null | undefined): Set<string> | null => {
  if (!selected || selected.length === 0) return null;
  return new Set(selected.map((s) => String(s).toLowerCase()));
};

const isSelectedHit = (selected: Set<string> | null, key: string): boolean => {
  if (!selected) return true;
  return selected.has(String(key).toLowerCase());
};

const computeGroupHitsForAsset = (asset: ExerciseAsset) => {
  const { primaries, secondaries } = parseMuscleFields(asset.primary_muscle, asset.secondary_muscle);

  const primaryGroups = primaries
    .map((m) => normalizeMuscleGroup(m))
    .filter((g): g is NormalizedMuscleGroup => g !== 'Other' && g !== 'Cardio');
  const secondaryGroups = secondaries
    .map((m) => normalizeMuscleGroup(m))
    .filter((g): g is NormalizedMuscleGroup => g !== 'Other' && g !== 'Cardio');

  return { primaryGroups, secondaryGroups, isFullBody: primaries.some((m) => /full[\s-]*body/i.test(m)) };
};

const computeSvgHitsForAsset = (asset: ExerciseAsset) => {
  const { primaries, secondaries } = parseMuscleFields(asset.primary_muscle, asset.secondary_muscle);

  const isFullBody = primaries.some((m) => /full[\s-]*body/i.test(m));
  if (isFullBody) {
    const svgIds = FULL_BODY_TARGET_GROUPS.flatMap((g) => getSvgIdsForCsvMuscleName(g));
    return { primarySvgIds: svgIds, secondarySvgIds: [] as string[], isFullBody };
  }

  const primarySvgIds = primaries.flatMap((m) => getSvgIdsForCsvMuscleName(m));
  const secondarySvgIds = secondaries.flatMap((m) => getSvgIdsForCsvMuscleName(m));
  return { primarySvgIds, secondarySvgIds, isFullBody };
};

/**
 * Computes a windowed per-exercise breakdown for either:
 * - `groups`: Chest/Back/Legs/etc (normalized)
 * - `muscles`: individual SVG muscle ids (anterior-deltoid, lats, etc)
 *
 * Selection behavior:
 * - If `selectedSubjects` is empty/null: counts all subjects.
 * - If provided: only counts contributions that hit one of the selected subjects.
 */
export const computeWindowedExerciseBreakdown = (params: {
  data: WorkoutSet[];
  assetsMap: Map<string, ExerciseAsset>;
  start: Date;
  end: Date;
  grouping: WindowedBreakdownGrouping;
  selectedSubjects?: readonly string[] | null;
}): WindowedExerciseBreakdown => {
  const { data, assetsMap, start, end, grouping, selectedSubjects } = params;

  const lookupAsset = createAssetLookup(assetsMap);
  const selected = toSelectedSet(selectedSubjects);

  let total = 0;
  const exercises = new Map<string, { sets: number; primarySets: number; secondarySets: number }>();

  for (const s of data) {
    if (isWarmupSet(s)) continue;
    const d = s.parsedDate;
    if (!d) continue;
    if (d < start || d > end) continue;

    const exerciseName = s.exercise_title || '';
    const asset = lookupAsset(exerciseName);
    if (!asset) continue;

    if (grouping === 'groups') {
      const { primaryGroups, secondaryGroups, isFullBody } = computeGroupHitsForAsset(asset);

      let inc = 0;
      let pInc = 0;
      let sInc = 0;

      if (isFullBody) {
        for (const g of FULL_BODY_TARGET_GROUPS) {
          if (!isSelectedHit(selected, g)) continue;
          inc += 1;
          pInc += 1;
        }
      } else {
        for (const g of primaryGroups) {
          if (!isSelectedHit(selected, g)) continue;
          inc += 1;
          pInc += 1;
        }
        for (const g of secondaryGroups) {
          if (!isSelectedHit(selected, g)) continue;
          inc += 0.5;
          sInc += 0.5;
        }
      }

      if (inc <= 0) continue;
      total += inc;
      addExerciseInc(exercises, exerciseName, { sets: inc, primarySets: pInc, secondarySets: sInc });
      continue;
    }

    const { primarySvgIds, secondarySvgIds } = computeSvgHitsForAsset(asset);

    let inc = 0;
    let pInc = 0;
    let sInc = 0;

    for (const svgId of primarySvgIds) {
      if (!isSelectedHit(selected, svgId)) continue;
      inc += 1;
      pInc += 1;
    }

    for (const svgId of secondarySvgIds) {
      if (!isSelectedHit(selected, svgId)) continue;
      inc += 0.5;
      sInc += 0.5;
    }

    if (inc <= 0) continue;

    total += inc;
    addExerciseInc(exercises, exerciseName, { sets: inc, primarySets: pInc, secondarySets: sInc });
  }

  return { totalSetsInWindow: total, exercises };
};
