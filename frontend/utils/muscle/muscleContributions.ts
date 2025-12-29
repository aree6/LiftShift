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

/**
 * Get muscle contributions from an exercise asset.
 * Primary muscle = 1.0 sets, Secondary muscles = 0.5 sets each.
 * 
 * Handles various data formats:
 * - Empty primary but secondary exists: treat first secondary as primary
 * - Comma-separated primary muscles: all get 1.0 sets
 * - Comma-separated secondary muscles: all get 0.5 sets
 * 
 * @param asset - The exercise asset with muscle data
 * @param useGroups - If true, normalizes muscles to major groups (Chest, Back, etc.)
 * @returns Array of muscle contributions (deduplicated by muscle group)
 */
export const getMuscleContributionsFromAsset = (
  asset: ExerciseAsset | undefined | null,
  useGroups: boolean
): MuscleContribution[] => {
  if (!asset) return [];
  
  const contributions: MuscleContribution[] = [];
  let primaryRaw = String(asset.primary_muscle ?? '').trim();
  let secondaryRaw = String(asset.secondary_muscle ?? '').trim();

  // Handle case where primary is empty but secondary has muscles
  // This is common in anatomical datasets where all muscles are listed together
  if ((!primaryRaw || /^(none|other)$/i.test(primaryRaw)) && secondaryRaw) {
    const secondaryParts = secondaryRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (secondaryParts.length > 0) {
      // Use first secondary as primary
      primaryRaw = secondaryParts[0];
      // Remaining as secondary
      secondaryRaw = secondaryParts.slice(1).join(', ');
    }
  }

  // Skip if no primary muscle or if it's cardio
  if (!primaryRaw || /^cardio$/i.test(primaryRaw)) return contributions;
  
  // Skip "Other" or "None" as they don't contribute to muscle volume
  if (/^(other|none)$/i.test(primaryRaw)) return contributions;

  // Track which muscles we've already added (avoid double-counting)
  const addedMuscles = new Set<string>();
  
  // Helper to add a muscle contribution
  const addContribution = (rawMuscle: string, sets: number) => {
    const trimmed = rawMuscle.trim();
    if (!trimmed) return;
    
    // Skip cardio, full body, none, other
    if (/^(cardio|full[\s-]*body|none|other)$/i.test(trimmed)) return;
    
    const muscle = useGroups ? normalizeMuscleGroup(trimmed) : trimmed;
    
    // Skip if normalized to Cardio or Other
    if (muscle === 'Cardio' || muscle === 'Other') return;
    
    // Avoid duplicates
    const key = muscle.toLowerCase();
    if (addedMuscles.has(key)) return;
    addedMuscles.add(key);
    
    contributions.push({ muscle, sets });
  };

  // Parse primary muscles (may be comma-separated, e.g., "biceps, brachialis")
  const primaryParts = primaryRaw.split(',').map(s => s.trim()).filter(Boolean);
  
  // Check if any primary is Full Body
  const hasFullBody = primaryParts.some(p => /full[\s-]*body/i.test(p));
  if (hasFullBody) {
    if (useGroups) {
      for (const grp of FULL_BODY_GROUPS) {
        contributions.push({ muscle: grp, sets: 1.0 });
      }
    }
    return contributions;
  }
  
  // Add all primary muscles with 1.0 sets
  for (const p of primaryParts) {
    addContribution(p, 1.0);
  }

  // Add secondary muscles with 0.5 sets
  if (secondaryRaw && !/^none$/i.test(secondaryRaw)) {
    for (const s of secondaryRaw.split(',')) {
      addContribution(s, 0.5);
    }
  }

  return contributions;
};

/**
 * Parse primary and secondary muscles from raw strings.
 * Handles comma-separated values and empty primary with secondary fallback.
 */
export const parseMuscleFields = (
  primaryRaw: string | undefined | null,
  secondaryRaw: string | undefined | null
): { primaries: string[]; secondaries: string[] } => {
  let primaries = String(primaryRaw ?? '')
    .split(',')
    .map(m => m.trim())
    .filter(m => m && !/^(none|other)$/i.test(m));
  
  let secondaries = String(secondaryRaw ?? '')
    .split(',')
    .map(m => m.trim())
    .filter(m => m && !/^none$/i.test(m));
  
  // Handle case where primary is empty but secondary has muscles
  if (primaries.length === 0 && secondaries.length > 0) {
    primaries = [secondaries[0]];
    secondaries = secondaries.slice(1);
  }
  
  return { primaries, secondaries };
};

/**
 * Get the normalized primary muscle group(s) for an exercise.
 * Handles comma-separated primaries and empty primary with secondary fallback.
 * Returns the first valid normalized group (for single-group usage) and all groups.
 */
export const getNormalizedPrimaryGroups = (
  primaryRaw: string | undefined | null,
  secondaryRaw: string | undefined | null
): { primary: NormalizedMuscleGroup; allPrimaries: NormalizedMuscleGroup[] } => {
  const { primaries } = parseMuscleFields(primaryRaw, secondaryRaw);
  
  if (primaries.length === 0) {
    return { primary: 'Other', allPrimaries: [] };
  }
  
  const allPrimaries: NormalizedMuscleGroup[] = [];
  for (const p of primaries) {
    const group = normalizeMuscleGroup(p);
    if (group !== 'Other' && !allPrimaries.includes(group)) {
      allPrimaries.push(group);
    }
  }
  
  return {
    primary: allPrimaries[0] ?? 'Other',
    allPrimaries,
  };
};
