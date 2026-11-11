/**
 * Maps CSV muscle names (from exercise data) to SVG muscle element IDs.
 * Used to highlight the correct body parts on the interactive body map.
 * Supports both generic names (Chest, Biceps) and anatomical names (deltoid_anterior, latissimus_dorsi).
 */
export const CSV_TO_SVG_MUSCLE_MAP: Record<string, string[]> = {
  // Generic muscle names (from original Hevy data)
  Abdominals: ['lower-abdominals', 'upper-abdominals'],
  Abductors: ['gluteus-medius'],
  Adductors: ['gluteus-maximus', 'gluteus-medius'],
  Biceps: ['long-head-bicep', 'short-head-bicep'],
  Calves: ['gastrocnemius', 'soleus', 'tibialis'],
  Chest: ['mid-lower-pectoralis', 'upper-pectoralis'],
  Forearms: ['wrist-extensors', 'wrist-flexors'],
  Glutes: ['gluteus-maximus', 'gluteus-medius'],
  Hamstrings: ['medial-hamstrings', 'lateral-hamstrings'],
  Lats: ['lats'],
  'Lower Back': ['lowerback'],
  Neck: ['neck'],
  Quadriceps: ['outer-quadricep', 'rectus-femoris', 'inner-quadricep', 'quads'],
  Shoulders: ['anterior-deltoid', 'lateral-deltoid', 'posterior-deltoid'],
  Traps: ['upper-trapezius', 'lower-trapezius', 'traps-middle'],
  Triceps: ['medial-head-triceps', 'long-head-triceps', 'lateral-head-triceps'],
  'Upper Back': ['lats', 'upper-trapezius', 'lower-trapezius', 'traps-middle', 'posterior-deltoid'],
  Obliques: ['obliques'],

  // Anatomical muscle names (from Lyfta/detailed datasets)
  // Chest
  chest_clavicular_head: ['upper-pectoralis'],
  chest_sternal_head: ['mid-lower-pectoralis'],
  pectoralis_major: ['mid-lower-pectoralis', 'upper-pectoralis'],
  pectoralis_minor: ['mid-lower-pectoralis'],

  // Shoulders / Deltoids
  deltoid_anterior: ['anterior-deltoid'],
  deltoid_lateral: ['lateral-deltoid'],
  deltoid_posterior: ['posterior-deltoid'],
  deltoids: ['anterior-deltoid', 'lateral-deltoid', 'posterior-deltoid'],
  anterior_deltoid: ['anterior-deltoid'],
  lateral_deltoid: ['lateral-deltoid'],
  posterior_deltoid: ['posterior-deltoid'],

  // Arms
  biceps_brachii: ['long-head-bicep', 'short-head-bicep'],
  triceps_brachii: ['medial-head-triceps', 'long-head-triceps', 'lateral-head-triceps'],
  brachialis: ['long-head-bicep', 'short-head-bicep'],
  brachioradialis: ['wrist-flexors'],

  // Back
  latissimus_dorsi: ['lats'],
  trapezius: ['upper-trapezius', 'lower-trapezius', 'traps-middle'],
  rhomboid_major: ['traps-middle'],
  rhomboid_minor: ['traps-middle'],
  rhomboids: ['traps-middle'],
  infraspinatus: ['posterior-deltoid'],
  supraspinatus: ['posterior-deltoid'],
  teres_major: ['lats'],
  teres_minor: ['posterior-deltoid'],
  erector_spinae: ['lowerback'],

  // Legs
  gluteus_maximus: ['gluteus-maximus'],
  gluteus_medius: ['gluteus-medius'],
  gluteus_minimus: ['gluteus-medius'],
  rectus_femoris: ['rectus-femoris'],
  vastus_lateralis: ['outer-quadricep'],
  vastus_medialis: ['inner-quadricep'],
  vastus_intermedius: ['rectus-femoris'],
  biceps_femoris: ['lateral-hamstrings'],
  semitendinosus: ['medial-hamstrings'],
  semimembranosus: ['medial-hamstrings'],
  gastrocnemius: ['gastrocnemius'],
  soleus: ['soleus'],
  tibialis_anterior: ['tibialis'],
  // The Lyfta/Gymvisual rows spell the tibialis group as "tibias".
  tibias: ['tibialis'],
  hip_adductors: ['gluteus-maximus', 'gluteus-medius'],
  hip_abductors: ['gluteus-medius'],
  sartorius: ['inner-quadricep'],
  gracilis: ['gluteus-maximus', 'gluteus-medius'],
  iliopsoas: ['lower-abdominals'],
  psoas: ['lower-abdominals'],

  // Core
  rectus_abdominis: ['lower-abdominals', 'upper-abdominals'],
  transverse_abdominis: ['lower-abdominals'],
  transversus_abdominis: ['lower-abdominals'],
  internal_oblique: ['obliques'],
  external_oblique: ['obliques'],
  serratus_anterior: ['obliques'],
};

const CSV_TO_SVG_MUSCLE_MAP_LOWER: Record<string, string[]> = Object.fromEntries(
  Object.entries(CSV_TO_SVG_MUSCLE_MAP).map(([k, v]) => [k.toLowerCase(), v])
);

export const getSvgIdsForCsvMuscleName = (muscleName: string | undefined): string[] => {
  const raw = String(muscleName ?? '').trim();
  if (!raw) return [];
  return CSV_TO_SVG_MUSCLE_MAP[raw] ?? CSV_TO_SVG_MUSCLE_MAP_LOWER[raw.toLowerCase()] ?? [];
};

/**
 * Reverse mapping: SVG muscle ID to CSV muscle names.
 * Auto-generated from CSV_TO_SVG_MUSCLE_MAP.
 */
export const SVG_TO_CSV_MUSCLE_MAP: Record<string, string[]> = {};
for (const [csvMuscle, svgMuscles] of Object.entries(CSV_TO_SVG_MUSCLE_MAP)) {
  for (const svgMuscle of svgMuscles) {
    if (!SVG_TO_CSV_MUSCLE_MAP[svgMuscle]) {
      SVG_TO_CSV_MUSCLE_MAP[svgMuscle] = [];
    }
    if (!SVG_TO_CSV_MUSCLE_MAP[svgMuscle].includes(csvMuscle)) {
      SVG_TO_CSV_MUSCLE_MAP[svgMuscle].push(csvMuscle);
    }
  }
}

export const CSV_TO_SVG_MUSCLE_MAP_LOWERCASE = CSV_TO_SVG_MUSCLE_MAP_LOWER;
