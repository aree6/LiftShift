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
  Chest: '#dc2626',    // Bright red
  Back: '#1e40af',     // Deep blue
  Legs: '#059669',     // Emerald green
  Shoulders: '#ea580c', // Bright orange
  Arms: '#7c3aed',     // Violet purple
  Core: '#db2777',     // Hot pink
  Other: '#64748b',    // Slate gray
};

// Individual muscle colors for muscle-level analysis
export const INDIVIDUAL_MUSCLE_COLORS: Readonly<Record<string, string>> = {
  // Chest muscles
  'chest': '#dc2626',
  'pec': '#b91c1c',
  'pectoralis': '#991b1b',
  
  // Back muscles - distinct shades
  'lats': '#1e40af',
  'lat': '#1d4ed8',
  'latissimus': '#2563eb',
  'upper back': '#0891b2',
  'traps': '#0e7490',
  'trapezius': '#155e75',
  'lower back': '#134e4a',
  
  // Shoulder muscles
  'shoulders': '#ea580c',
  'front delt': '#dc2626',
  'side delt': '#ea580c',
  'rear delt': '#ca8a04',
  'anterior deltoid': '#b91c1c',
  'lateral deltoid': '#ea580c',
  'posterior deltoid': '#a16207',
  
  // Arm muscles - very distinct colors
  'biceps': '#7c3aed',
  'bicep': '#8b5cf6',
  'triceps': '#dc2626',
  'tricep': '#ef4444',
  'forearms': '#059669',
  'forearm': '#10b981',
  
  // Leg muscles
  'quads': '#059669',
  'quadriceps': '#047857',
  'hamstrings': '#0891b2',
  'glutes': '#ea580c',
  'calves': '#7c3aed',
  
  // Core muscles
  'abs': '#db2777',
  'obliques': '#be185d',
  
  // Default fallback
  'other': '#64748b',
};

export const MUSCLE_FILL_COLORS: Readonly<Record<MuscleGroup, string>> = {
  Chest: '#991b1b',    // Darker red
  Back: '#1e3a8a',     // Darker blue
  Legs: '#064e3b',     // Darker green
  Shoulders: '#9a3412', // Darker orange
  Arms: '#4c1d95',     // Darker violet
  Core: '#9f1239',     // Darker pink
  Other: '#334155',    // Darker slate
};