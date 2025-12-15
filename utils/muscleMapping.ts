import { WorkoutSet } from '../types';
import { startOfWeek, endOfWeek, format, eachWeekOfInterval, subWeeks } from 'date-fns';
import { getEffectiveNowFromWorkoutData } from './dateUtils';
import {
  INTERACTIVE_MUSCLE_IDS,
  MUSCLE_GROUP_TO_SVG_IDS,
  FULL_BODY_TARGET_GROUPS,
} from './muscleMappingConstants';

/**
 * Maps CSV muscle names (from exercise data) to SVG muscle element IDs.
 * Used to highlight the correct body parts on the interactive body map.
 */
export const CSV_TO_SVG_MUSCLE_MAP: Record<string, string[]> = {
  'Abdominals': ['lower-abdominals', 'upper-abdominals'],
  'Abductors': ['gluteus-medius'],
  'Adductors': ['inner-thigh'],
  'Biceps': ['long-head-bicep', 'short-head-bicep'],
  'Calves': ['gastrocnemius', 'soleus', 'tibialis'],
  'Chest': ['mid-lower-pectoralis', 'upper-pectoralis'],
  'Forearms': ['wrist-extensors', 'wrist-flexors'],
  'Glutes': ['gluteus-maximus', 'gluteus-medius'],
  'Hamstrings': ['medial-hamstrings', 'lateral-hamstrings'],
  'Lats': ['lats'],
  'Lower Back': ['lowerback'],
  'Neck': ['neck'],
  'Quadriceps': ['outer-quadricep', 'rectus-femoris', 'inner-quadricep'],
  'Shoulders': ['anterior-deltoid', 'lateral-deltoid', 'posterior-deltoid'],
  'Traps': ['upper-trapezius', 'lower-trapezius', 'traps-middle'],
  'Triceps': ['medial-head-triceps', 'long-head-triceps', 'lateral-head-triceps'],
  'Upper Back': ['lats', 'upper-trapezius', 'lower-trapezius', 'traps-middle', 'posterior-deltoid'],
  'Obliques': ['obliques'],
};

/**
 * Maps granular SVG muscle IDs to their parent muscle group name for display.
 * When a user selects any part of a muscle group, the group name is shown.
 */
export const SVG_MUSCLE_GROUPS: Record<string, string> = {
  // Shoulders group
  'anterior-deltoid': 'Shoulders',
  'lateral-deltoid': 'Shoulders',
  'posterior-deltoid': 'Shoulders',
  // Chest group
  'mid-lower-pectoralis': 'Chest',
  'upper-pectoralis': 'Chest',
  // Biceps group
  'long-head-bicep': 'Biceps',
  'short-head-bicep': 'Biceps',
  // Triceps group
  'medial-head-triceps': 'Triceps',
  'long-head-triceps': 'Triceps',
  'lateral-head-triceps': 'Triceps',
  // Abs group
  'lower-abdominals': 'Abdominals',
  'upper-abdominals': 'Abdominals',
  // Quads group
  'outer-quadricep': 'Quadriceps',
  'rectus-femoris': 'Quadriceps',
  'inner-quadricep': 'Quadriceps',
  // Hamstrings group
  'medial-hamstrings': 'Hamstrings',
  'lateral-hamstrings': 'Hamstrings',
  // Glutes group
  'gluteus-maximus': 'Glutes',
  'gluteus-medius': 'Glutes',
  // Calves group
  'gastrocnemius': 'Calves',
  'soleus': 'Calves',
  'tibialis': 'Calves',
  // Traps group
  'upper-trapezius': 'Traps',
  'lower-trapezius': 'Traps',
  'traps-middle': 'Traps',
  // Forearms group
  'wrist-extensors': 'Forearms',
  'wrist-flexors': 'Forearms',
  // Single muscles
  'lats': 'Lats',
  'lowerback': 'Lower Back',
  'obliques': 'Obliques',
  'neck': 'Neck',
  'inner-thigh': 'Adductors',
};

/**
 * Maps SVG muscle IDs to human-readable display names.
 */
export const SVG_MUSCLE_NAMES: Record<string, string> = {
  // Calves
  'gastrocnemius': 'Calves',
  'soleus': 'Calves',
  'tibialis': 'Calves',
  // Quads
  'outer-quadricep': 'Quadriceps',
  'rectus-femoris': 'Quadriceps',
  'inner-quadricep': 'Quadriceps',
  // Abs
  'lower-abdominals': 'Abdominals',
  'upper-abdominals': 'Abdominals',
  'obliques': 'Obliques',
  // Chest
  'mid-lower-pectoralis': 'Chest',
  'upper-pectoralis': 'Chest',
  // Biceps
  'long-head-bicep': 'Biceps',
  'short-head-bicep': 'Biceps',
  // Forearms
  'wrist-extensors': 'Forearms',
  'wrist-flexors': 'Forearms',
  // Shoulders
  'anterior-deltoid': 'Shoulders',
  'lateral-deltoid': 'Shoulders',
  'posterior-deltoid': 'Shoulders',
  // Traps
  'upper-trapezius': 'Traps',
  'lower-trapezius': 'Traps',
  'traps-middle': 'Traps',
  // Back
  'lats': 'Lats',
  'lowerback': 'Lower Back',
  // Hamstrings
  'medial-hamstrings': 'Hamstrings',
  'lateral-hamstrings': 'Hamstrings',
  // Glutes
  'gluteus-maximus': 'Glutes',
  'gluteus-medius': 'Glutes',
  // Triceps
  'medial-head-triceps': 'Triceps',
  'long-head-triceps': 'Triceps',
  'lateral-head-triceps': 'Triceps',
  // Other
  'neck': 'Neck',
  'inner-thigh': 'Adductors',
};

/** All interactive SVG muscle IDs */
export const ALL_SVG_MUSCLES = Object.keys(SVG_MUSCLE_NAMES);

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

/** @deprecated Use FULL_BODY_TARGET_GROUPS from muscleMappingConstants.ts */
export const FULL_BODY_MUSCLES = FULL_BODY_TARGET_GROUPS;

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
    const response = await fetch(`${import.meta.env.BASE_URL}exercises_muscles_and_thumbnail_data.csv`);
    const text = await response.text();
    const lines = text.split('\n');
    const map = new Map<string, ExerciseMuscleData>();
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handling commas in values)
      const parts = parseCSVLine(line);
      if (parts.length >= 4) {
        const name = parts[0].trim();
        map.set(name.toLowerCase(), {
          name,
          equipment: parts[1] || '',
          primary_muscle: parts[2] || '',
          secondary_muscle: parts[3] || '',
        });
      }
    }
    
    exerciseMuscleCache = map;
    return map;
  } catch (error) {
    console.error('Failed to load exercise muscle data:', error);
    return new Map();
  }
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export interface MuscleVolumeEntry {
  muscle: string;
  svgId: string;
  sets: number;
  exercises: Map<string, { sets: number; primarySets: number; secondarySets: number }>;
}

export interface WeeklyMuscleVolume {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  muscles: Map<string, MuscleVolumeEntry>;
  totalSets: number;
}

export const calculateMuscleVolume = async (
  data: WorkoutSet[],
  exerciseMuscleData: Map<string, ExerciseMuscleData>
): Promise<Map<string, MuscleVolumeEntry>> => {
  const muscleVolume = new Map<string, MuscleVolumeEntry>();
  
  // Initialize all muscles
  for (const svgId of ALL_SVG_MUSCLES) {
    muscleVolume.set(svgId, {
      muscle: SVG_MUSCLE_NAMES[svgId],
      svgId,
      sets: 0,
      exercises: new Map(),
    });
  }
  
  for (const set of data) {
    if (!set.exercise_title || !set.parsedDate) continue;
    
    const exerciseData = exerciseMuscleData.get(set.exercise_title.toLowerCase());
    if (!exerciseData) continue;
    
    const primaryMuscle = exerciseData.primary_muscle;
    const secondaryMuscles = exerciseData.secondary_muscle
      .split(',')
      .map(m => m.trim())
      .filter(m => m && m !== 'None');
    
    // Skip Cardio entirely
    if (primaryMuscle === 'Cardio') continue;
    
    // Handle Full Body - add 1 set to every muscle group
    if (primaryMuscle === 'Full Body') {
      for (const muscleName of FULL_BODY_MUSCLES) {
        const svgIds = CSV_TO_SVG_MUSCLE_MAP[muscleName];
        if (!svgIds) continue;
        
        for (const svgId of svgIds) {
          const entry = muscleVolume.get(svgId);
          if (entry) {
            entry.sets += 1;
            const exerciseEntry = entry.exercises.get(set.exercise_title) || { sets: 0, primarySets: 0, secondarySets: 0 };
            exerciseEntry.sets += 1;
            exerciseEntry.primarySets += 1;
            entry.exercises.set(set.exercise_title, exerciseEntry);
          }
        }
      }
      continue;
    }
    
    // Handle primary muscle (counts as 1 set)
    const primarySvgIds = CSV_TO_SVG_MUSCLE_MAP[primaryMuscle];
    if (primarySvgIds) {
      for (const svgId of primarySvgIds) {
        const entry = muscleVolume.get(svgId);
        if (entry) {
          entry.sets += 1;
          const exerciseEntry = entry.exercises.get(set.exercise_title) || { sets: 0, primarySets: 0, secondarySets: 0 };
          exerciseEntry.sets += 1;
          exerciseEntry.primarySets += 1;
          entry.exercises.set(set.exercise_title, exerciseEntry);
        }
      }
    }
    
    // Handle secondary muscles (each counts as 0.5 sets)
    for (const secondaryMuscle of secondaryMuscles) {
      const secondarySvgIds = CSV_TO_SVG_MUSCLE_MAP[secondaryMuscle];
      if (secondarySvgIds) {
        for (const svgId of secondarySvgIds) {
          const entry = muscleVolume.get(svgId);
          if (entry) {
            entry.sets += 0.5;
            const exerciseEntry = entry.exercises.get(set.exercise_title) || { sets: 0, primarySets: 0, secondarySets: 0 };
            exerciseEntry.sets += 0.5;
            exerciseEntry.secondarySets += 1;
            entry.exercises.set(set.exercise_title, exerciseEntry);
          }
        }
      }
    }
  }
  
  return muscleVolume;
};

export const getWeeklyMuscleVolume = async (
  data: WorkoutSet[],
  exerciseMuscleData: Map<string, ExerciseMuscleData>,
  weeksBack: number = 12,
  now?: Date
): Promise<WeeklyMuscleVolume[]> => {
  const effectiveNow = now ?? getEffectiveNowFromWorkoutData(data, new Date(0));
  const startDate = subWeeks(startOfWeek(effectiveNow, { weekStartsOn: 1 }), weeksBack - 1);
  const endDate = endOfWeek(effectiveNow, { weekStartsOn: 1 });
  
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
  
  const weeklyData: WeeklyMuscleVolume[] = [];
  
  for (const weekStart of weeks) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekLabel = format(weekStart, 'MMM d');
    
    // Filter data for this week
    const weekData = data.filter(set => {
      if (!set.parsedDate) return false;
      return set.parsedDate >= weekStart && set.parsedDate <= weekEnd;
    });
    
    const muscles = await calculateMuscleVolume(weekData, exerciseMuscleData);
    
    let totalSets = 0;
    muscles.forEach(entry => {
      totalSets += entry.sets;
    });
    
    weeklyData.push({
      weekStart,
      weekEnd,
      weekLabel,
      muscles,
      totalSets,
    });
  }
  
  return weeklyData;
};

// Get volume intensity color based on sets
export const getVolumeIntensity = (sets: number, maxSets: number): string => {
  if (sets === 0) return 'text-slate-600';
  const ratio = sets / Math.max(maxSets, 1);
  if (ratio >= 0.8) return 'text-red-500';
  if (ratio >= 0.6) return 'text-orange-500';
  if (ratio >= 0.4) return 'text-yellow-500';
  if (ratio >= 0.2) return 'text-emerald-500';
  return 'text-emerald-700';
};


export const getVolumeColor = (sets: number, maxSets: number): string => {
  if (sets === 0) return 'hsla(0, 0%, 100%, 1)';

  const ratio = sets / Math.max(maxSets, 1);
  const lightness = 84 - ratio * 64; // 84% → 20%

  return `hsl(5, 75%, ${lightness}%)`;
};

// Generate muscle volumes for a specific exercise based on its primary/secondary muscles
export const getExerciseMuscleVolumes = (
  exerciseData: ExerciseMuscleData | undefined
): { volumes: Map<string, number>; maxVolume: number } => {
  const volumes = new Map<string, number>();
  
  if (!exerciseData) {
    return { volumes, maxVolume: 1 };
  }
  
  const primary = exerciseData.primary_muscle;
  const secondaries = exerciseData.secondary_muscle
    .split(',')
    .map(m => m.trim())
    .filter(m => m && m !== 'None');

  // Skip Cardio entirely
  if (primary === 'Cardio') {
    return { volumes, maxVolume: 1 };
  }

  // Handle Full Body - add 1 set to every muscle group
  if (primary === 'Full Body') {
    for (const muscleName of FULL_BODY_MUSCLES) {
      const svgIds = CSV_TO_SVG_MUSCLE_MAP[muscleName] || [];
      for (const svgId of svgIds) {
        volumes.set(svgId, 1);
      }
    }
    return { volumes, maxVolume: 1 };
  }
  
  // Primary muscle gets 1
  const primarySvgIds = CSV_TO_SVG_MUSCLE_MAP[primary] || [];
  for (const svgId of primarySvgIds) {
    volumes.set(svgId, 1);
  }
  
  // Secondary muscles get 0.5
  for (const secondary of secondaries) {
    const secondarySvgIds = CSV_TO_SVG_MUSCLE_MAP[secondary] || [];
    for (const svgId of secondarySvgIds) {
      if (!volumes.has(svgId)) {
        volumes.set(svgId, 0.5);
      }
    }
  }
  
  // Propagate volume across muscle groups - if any part of a group is hit, all parts should light up
  // This ensures e.g. all 3 deltoid heads light up when any one is targeted
  const muscleGroups: Record<string, string[]> = {
    'Shoulders': ['anterior-deltoid', 'lateral-deltoid', 'posterior-deltoid'],
    'Traps': ['upper-trapezius', 'lower-trapezius', 'traps-middle'],
    'Biceps': ['long-head-bicep', 'short-head-bicep'],
    'Triceps': ['medial-head-triceps', 'long-head-triceps', 'lateral-head-triceps'],
    'Chest': ['mid-lower-pectoralis', 'upper-pectoralis'],
    'Quadriceps': ['outer-quadricep', 'rectus-femoris', 'inner-quadricep'],
    'Hamstrings': ['medial-hamstrings', 'lateral-hamstrings'],
    'Glutes': ['gluteus-maximus', 'gluteus-medius'],
    'Calves': ['gastrocnemius', 'soleus', 'tibialis'],
    'Abdominals': ['lower-abdominals', 'upper-abdominals'],
    'Forearms': ['wrist-extensors', 'wrist-flexors'],
  };
  
  for (const groupParts of Object.values(muscleGroups)) {
    // Find max volume in this group
    let maxGroupVolume = 0;
    for (const part of groupParts) {
      const vol = volumes.get(part) || 0;
      if (vol > maxGroupVolume) maxGroupVolume = vol;
    }
    // If any part has volume, propagate to all parts
    if (maxGroupVolume > 0) {
      for (const part of groupParts) {
        if (!volumes.has(part)) {
          volumes.set(part, maxGroupVolume);
        }
      }
    }
  }
  
  return { volumes, maxVolume: 1 };
};

