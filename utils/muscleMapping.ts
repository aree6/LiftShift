import { WorkoutSet } from '../types';
import { startOfWeek, endOfWeek, format, eachWeekOfInterval, subWeeks } from 'date-fns';

// Mapping from CSV muscle names to SVG muscle IDs
export const CSV_TO_SVG_MUSCLE_MAP: Record<string, string[]> = {
  'Abdominals': ['abdominals'],
  'Abductors': ['glutes'],
  'Adductors': ['quads'],
  'Biceps': ['biceps'],
  'Calves': ['calves'],
  'Chest': ['chest'],
  'Forearms': ['forearms'],
  'Glutes': ['glutes'],
  'Hamstrings': ['hamstrings'],
  'Lats': ['lats'],
  'Lower Back': ['lowerback'],
  'Neck': ['traps'],
  'Quadriceps': ['quads'],
  'Shoulders': ['front-shoulders', 'rear-shoulders'],
  'Traps': ['traps', 'traps-middle'],
  'Triceps': ['triceps'],
  'Upper Back': ['lats', 'traps-middle', 'rear-shoulders'],
  'Obliques': ['obliques'],
};

// Reverse mapping: SVG ID to display name
export const SVG_MUSCLE_NAMES: Record<string, string> = {
  calves: 'Calves',
  quads: 'Quadriceps',
  abdominals: 'Abdominals',
  obliques: 'Obliques',
  chest: 'Chest',
  biceps: 'Biceps',
  forearms: 'Forearms',
  'front-shoulders': 'Front Delts',
  'rear-shoulders': 'Rear Delts',
  traps: 'Upper Traps',
  'traps-middle': 'Mid/Lower Traps',
  lats: 'Lats',
  lowerback: 'Lower Back',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  triceps: 'Triceps',
};

// All muscle groups that can be displayed on SVG
export const ALL_SVG_MUSCLES = Object.keys(SVG_MUSCLE_NAMES);

// Map SVG muscle ID back to CSV muscle names
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

// Full Body muscles - when an exercise targets "Full Body", add to all these
export const FULL_BODY_MUSCLES = [
  'Chest', 'Shoulders', 'Triceps', 'Biceps', 'Forearms',
  'Lats', 'Upper Back', 'Lower Back', 'Traps',
  'Abdominals', 'Obliques',
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves'
];

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
    const response = await fetch('/exercises_muscles_and_thumbnail_data.csv');
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
  weeksBack: number = 12
): Promise<WeeklyMuscleVolume[]> => {
  const now = new Date();
  const startDate = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), weeksBack - 1);
  const endDate = endOfWeek(now, { weekStartsOn: 1 });
  
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
  if (sets === 0) return 'hsla(0, 0%, 100%, 0.1)';

  const ratio = sets / Math.max(maxSets, 1);
  const lightness = 84 - ratio * 64; // 84% → 20%

  return `hsl(5, 75%, ${lightness}%)`;
};

