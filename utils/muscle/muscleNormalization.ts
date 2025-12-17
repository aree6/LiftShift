export type NormalizedMuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Cardio'
  | 'Full Body'
  | 'Other';

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

const cache = new Map<string, NormalizedMuscleGroup>();

export const normalizeMuscleGroup = (m?: string): NormalizedMuscleGroup => {
  if (!m) return 'Other';
  const key = String(m).trim().toLowerCase();
  if (key === 'none' || key === '') return 'Other';

  const cached = cache.get(key);
  if (cached) return cached;

  for (const [group, patterns] of MUSCLE_GROUP_PATTERNS) {
    for (const pattern of patterns) {
      if (key.includes(pattern) || key === pattern) {
        cache.set(key, group);
        return group;
      }
    }
  }

  cache.set(key, 'Other');
  return 'Other';
};
