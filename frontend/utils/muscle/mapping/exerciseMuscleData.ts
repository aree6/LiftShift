import { createExerciseNameResolver, type ExerciseNameResolver } from '../../exercise/exerciseNameResolver';
import { stripExerciseSourceLabel } from '../../exercise/exerciseSourceLabel';
import { loadExerciseCatalog } from '../../exercise/exerciseCatalog';

export interface ExerciseMuscleData {
  name: string;
  equipment: string;
  primary_muscle: string;
  secondary_muscle: string;
}

let exerciseMuscleCache: Map<string, ExerciseMuscleData> | null = null;

export const loadExerciseMuscleData = async (): Promise<Map<string, ExerciseMuscleData>> => {
  if (exerciseMuscleCache) return exerciseMuscleCache;

  try {
    const catalog = await loadExerciseCatalog();
    const map = new Map<string, ExerciseMuscleData>();

    for (const row of catalog.rows) {
      const data: ExerciseMuscleData = {
        name: row.name,
        equipment: row.equipment ?? '',
        primary_muscle: row.primary_muscle ?? '',
        secondary_muscle: row.secondary_muscle ?? '',
      };

      // Keys are lowercase; register the normalized key and every observed
      // spelling so exact lookups resolve to the same canonical entry.
      map.set(row.key, data);
      for (const alias of row.aliases) {
        map.set(alias.toLowerCase(), data);
      }
    }

    exerciseMuscleCache = map;
    return map;
  } catch (error) {
    console.error('Failed to load exercise muscle data:', error);
    return new Map();
  }
};

// Cached resolver for fuzzy exercise name matching
let exerciseResolverCache: ExerciseNameResolver | null = null;
let exerciseResolverRef: Map<string, ExerciseMuscleData> | null = null;

const getExerciseResolver = (muscleData: Map<string, ExerciseMuscleData>): ExerciseNameResolver => {
  if (exerciseResolverRef === muscleData && exerciseResolverCache) {
    return exerciseResolverCache;
  }
  // Create resolver from the canonical names (values, not keys which are lowercased)
  const canonicalNames = Array.from(new Set(Array.from(muscleData.values()).map((d) => d.name)));
  exerciseResolverCache = createExerciseNameResolver(canonicalNames);
  exerciseResolverRef = muscleData;
  return exerciseResolverCache;
};

/**
 * Look up exercise muscle data with fuzzy name matching.
 * This handles variations in exercise names from different CSV sources.
 */
export const lookupExerciseMuscleData = (
  exerciseTitle: string,
  muscleData: Map<string, ExerciseMuscleData>
): ExerciseMuscleData | undefined => {
  if (!exerciseTitle) return undefined;

  const normalizedTitle = stripExerciseSourceLabel(exerciseTitle);

  // Try exact lowercase match first (fast path)
  const exactMatch = muscleData.get(normalizedTitle.toLowerCase());
  if (exactMatch) return exactMatch;

  // Use fuzzy resolver for non-exact matches
  const resolver = getExerciseResolver(muscleData);
  const resolution = resolver.resolve(normalizedTitle);

  if (resolution.method !== 'none' && resolution.name) {
    return muscleData.get(resolution.name.toLowerCase());
  }

  return undefined;
};
