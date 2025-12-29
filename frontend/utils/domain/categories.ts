/**
 * Muscle group type for exercise name-based categorization.
 * Note: For CSV-based muscle data normalization, use NormalizedMuscleGroup from muscleAnalytics.ts
 */
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Other';

const MUSCLE_KEYWORDS: ReadonlyArray<[MuscleGroup, ReadonlyArray<string>]> = [
  ['Chest', ['bench', 'chest', 'pec', 'fly', 'push-up', 'pushup']],
  ['Back', ['lat', 'row', 'pull-up', 'pullup', 'chin-up', 'back extension', 'face pull']],
  ['Legs', ['squat', 'leg', 'calf', 'lunge', 'deadlift', 'glute']],
  ['Shoulders', ['shoulder', 'overhead', 'military', 'lateral raise', 'upright row', 'deltoid']],
  ['Arms', ['curl', 'tricep', 'dip', 'skull', 'hammer', 'bicep', 'arm']],
  ['Core', ['crunch', 'plank', 'sit-up', 'core', 'ab']],
];

const muscleGroupCache = new Map<string, MuscleGroup>();

/**
 * Categorizes an exercise by its title using keyword matching.
 * For CSV muscle data normalization, use normalizeMuscleGroup from muscleAnalytics.ts
 */
export const getMuscleGroup = (title: string): MuscleGroup => {
  const key = title.toLowerCase();
  
  const cached = muscleGroupCache.get(key);
  if (cached) return cached;
  
  for (const [group, keywords] of MUSCLE_KEYWORDS) {
    for (const keyword of keywords) {
      if (key.includes(keyword)) {
        muscleGroupCache.set(key, group);
        return group;
      }
    }
  }
  
  muscleGroupCache.set(key, 'Other');
  return 'Other';
};

export const MUSCLE_GROUPS: readonly MuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other'];

export const MUSCLE_COLORS: Readonly<Record<MuscleGroup, string>> = {
  Chest: '#ef4444',
  Back: '#3b82f6',
  Legs: '#10b981',
  Shoulders: '#f59e0b',
  Arms: '#8b5cf6',
  Core: '#ec4899',
  Other: '#64748b',
};

export const MUSCLE_FILL_COLORS: Readonly<Record<MuscleGroup, string>> = {
  Chest: '#7f1d1d',
  Back: '#1e3a8a',
  Legs: '#064e3b',
  Shoulders: '#78350f',
  Arms: '#4c1d95',
  Core: '#831843',
  Other: '#334155',
};