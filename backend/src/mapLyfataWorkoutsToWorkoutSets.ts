import { format } from 'date-fns';
import type { WorkoutSetDTO } from './types';
import type { LyfatGetWorkoutsResponse, LyfatGetWorkoutSummaryResponse } from './lyfta';

const DATE_FORMAT_LYFTA = 'd MMM yyyy, HH:mm';

const parseDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return format(date, DATE_FORMAT_LYFTA);
  } catch {
    return '';
  }
};

const parseDurationToMinutes = (durationStr: string | undefined): number => {
  if (!durationStr) return 0;
  try {
    const parts = durationStr.split(':');
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
    
    return hours * 60 + minutes + Math.round(seconds / 60);
  } catch {
    return 0;
  }
};

const toNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const mapLyfataWorkoutsToWorkoutSets = (
  workouts: LyfatGetWorkoutsResponse['workouts'],
  summaries: LyfatGetWorkoutSummaryResponse['workouts'] = []
): WorkoutSetDTO[] => {
  const out: WorkoutSetDTO[] = [];
  
  // Create a map of workout ID to duration for quick lookup
  const durationMap = new Map<number, number>();
  for (const summary of summaries) {
    const workoutId = parseInt(summary.id, 10);
    const duration = parseDurationToMinutes(summary.workout_duration);
    durationMap.set(workoutId, duration);
  }

  for (const w of workouts) {
    const title = String(w.title ?? 'Workout');
    const start_time = parseDate(w.workout_perform_date);
    
    // Calculate end_time based on duration from summary data
    const durationMinutes = durationMap.get(w.id) ?? 0;
    const end_time = durationMinutes > 0 
      ? format(new Date(new Date(w.workout_perform_date).getTime() + durationMinutes * 60 * 1000), DATE_FORMAT_LYFTA)
      : start_time; // Fallback to start_time if no duration available
    
    const description = '';

    for (const ex of w.exercises ?? []) {
      const exercise_title = String(ex.excercise_name ?? '').trim();
      const exercise_notes = '';
      const superset_id = '';

      for (const s of ex.sets ?? []) {
        out.push({
          title,
          start_time,
          end_time,
          description,
          exercise_title,
          superset_id,
          exercise_notes,
          set_index: 0, // Lyfta doesn't provide index
          set_type: 'normal',
          weight_kg: toNumber(s.weight, 0),
          reps: toNumber(s.reps, 0),
          distance_km: 0,
          duration_seconds: ex.exercise_rest_time ?? 0,
          rpe: null,
        });
      }
    }
  }

  return out;
};
