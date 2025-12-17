import type { ExerciseAsset } from '../data/exerciseAssets';
import { normalizeMuscleGroup, type NormalizedMuscleGroup } from './muscleNormalization';

export interface MuscleContribution {
  muscle: string;
  sets: number;
}

const FULL_BODY_GROUPS: readonly NormalizedMuscleGroup[] = [
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
];

export const getMuscleContributionsFromAsset = (
  asset: ExerciseAsset,
  useGroups: boolean
): MuscleContribution[] => {
  const contributions: MuscleContribution[] = [];
  const primaryRaw = String(asset.primary_muscle ?? '').trim();

  if (!primaryRaw || /cardio/i.test(primaryRaw)) return contributions;

  const primary = useGroups ? normalizeMuscleGroup(primaryRaw) : primaryRaw;

  // Full Body: distribute to major groups in group mode; in detailed mode it's non-specific.
  if (primary === 'Full Body' || /full\s*body/i.test(primaryRaw)) {
    if (useGroups) {
      for (const grp of FULL_BODY_GROUPS) {
        contributions.push({ muscle: grp, sets: 1.0 });
      }
    }
    return contributions;
  }

  contributions.push({ muscle: primary, sets: 1.0 });

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
};
