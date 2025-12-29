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

/**
 * Patterns for normalizing granular anatomical muscle names to high-level groups.
 * Order matters - more specific patterns should come first.
 * Supports both generic names (Chest, Biceps) and anatomical names (deltoid_anterior, latissimus_dorsi).
 */
const MUSCLE_GROUP_PATTERNS: ReadonlyArray<[NormalizedMuscleGroup, ReadonlyArray<string>]> = [
  // Chest - pectoralis major/minor, chest variations
  ['Chest', [
    'chest', 'pec', 'pectoralis', 'pectoralis_major', 'pectoralis_minor',
    'chest_clavicular', 'chest_sternal', 'clavicular_head', 'sternal_head'
  ]],
  
  // Back - lats, traps, rhomboids, erectors, teres, infraspinatus
  ['Back', [
    'lat', 'lats', 'latissimus', 'latissimus_dorsi',
    'upper back', 'back', 'lower back', 'lower_back', 'lowerback',
    'trap', 'trapezius', 'traps',
    'rhomboid', 'rhomboids', 'rhomboid_major', 'rhomboid_minor',
    'erector', 'erector_spinae', 'spinal_erector',
    'teres', 'teres_major', 'teres_minor',
    'infraspinatus', 'supraspinatus',
    'rear delt', 'rear_delt', 'posterior_deltoid'
  ]],
  
  // Shoulders - deltoids (anterior, lateral, posterior), rotator cuff
  ['Shoulders', [
    'shoulder', 'shoulders',
    'delt', 'delts', 'deltoid', 'deltoids',
    'deltoid_anterior', 'deltoid_lateral', 'deltoid_posterior',
    'anterior_deltoid', 'lateral_deltoid', 'posterior_deltoid',
    'front_delt', 'side_delt', 'rear_delt',
    'rotator', 'rotator_cuff'
  ]],
  
  // Arms - biceps, triceps, forearms, brachialis, brachioradialis
  ['Arms', [
    'bicep', 'biceps', 'biceps_brachii',
    'tricep', 'triceps', 'triceps_brachii',
    'forearm', 'forearms',
    'brachialis', 'brachioradialis',
    'arms', 'arm',
    'wrist', 'wrist_flexor', 'wrist_extensor',
    'pronator', 'supinator',
    'extensor', 'flexor'
  ]],
  
  // Legs - quads, hamstrings, glutes, calves, adductors, abductors, hip
  ['Legs', [
    'quad', 'quads', 'quadriceps', 'quadricep',
    'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'vastus_intermedius',
    'hamstring', 'hamstrings', 'biceps_femoris', 'semitendinosus', 'semimembranosus',
    'glute', 'glutes', 'gluteus', 'gluteus_maximus', 'gluteus_medius', 'gluteus_minimus',
    'calf', 'calves', 'gastrocnemius', 'soleus', 'tibialis', 'tibialis_anterior',
    'thigh', 'thighs',
    'hip', 'hips', 'hip_flexor', 'hip_flexors', 'iliopsoas', 'psoas',
    'adductor', 'adductors', 'hip_adductor', 'hip_adductors',
    'abductor', 'abductors', 'hip_abductor', 'hip_abductors',
    'leg', 'legs',
    'sartorius', 'gracilis', 'tensor', 'tensor_fasciae_latae',
    'piriformis', 'popliteus'
  ]],
  
  // Core - abs, obliques, serratus, transverse
  ['Core', [
    'abdom', 'abs', 'abdominal', 'abdominals',
    'rectus_abdominis', 'transverse_abdominis', 'transversus_abdominis',
    'core', 'waist',
    'oblique', 'obliques', 'internal_oblique', 'external_oblique',
    'serratus', 'serratus_anterior',
    'transverse'
  ]],
  
  // Cardio
  ['Cardio', ['cardio', 'cardiovascular', 'aerobic']],
  
  // Full Body
  ['Full Body', ['full body', 'full-body', 'fullbody', 'compound', 'total body', 'whole body']],
];

const cache = new Map<string, NormalizedMuscleGroup>();

/**
 * Normalizes a muscle name (or comma-separated list) to a high-level muscle group.
 * When given a comma-separated list, returns the first valid group found.
 * 
 * Examples:
 * - "biceps" → "Arms"
 * - "biceps, brachialis" → "Arms" (first valid group)
 * - "deltoid_anterior" → "Shoulders"
 * - "" or undefined → "Other"
 */
export const normalizeMuscleGroup = (m?: string): NormalizedMuscleGroup => {
  if (!m) return 'Other';
  const raw = String(m).trim();
  if (raw === '' || /^none$/i.test(raw)) return 'Other';

  // Check cache first
  const cached = cache.get(raw.toLowerCase());
  if (cached) return cached;

  // Handle comma-separated muscles - normalize each and return first valid group
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  
  for (const part of parts) {
    const key = part.toLowerCase();
    if (key === 'none' || key === 'other') continue;
    
    // Check if this individual part is cached
    const partCached = cache.get(key);
    if (partCached && partCached !== 'Other') {
      cache.set(raw.toLowerCase(), partCached);
      return partCached;
    }
    
    // Try to match patterns
    for (const [group, patterns] of MUSCLE_GROUP_PATTERNS) {
      for (const pattern of patterns) {
        if (key.includes(pattern) || key === pattern) {
          cache.set(key, group);
          cache.set(raw.toLowerCase(), group);
          return group;
        }
      }
    }
  }

  cache.set(raw.toLowerCase(), 'Other');
  return 'Other';
};
