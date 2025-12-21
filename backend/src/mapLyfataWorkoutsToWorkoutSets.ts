import { format } from 'date-fns';
import type { WorkoutSetDTO } from './types';
import type { LyfatGetWorkoutsResponse } from './lyfta';

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

const toNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const mapLyfataWorkoutsToWorkoutSets = (workouts: LyfatGetWorkoutsResponse['workouts']): WorkoutSetDTO[] => {
  const out: WorkoutSetDTO[] = [];

  for (const w of workouts) {
    const title = String(w.title ?? 'Workout');
    const start_time = parseDate(w.workout_perform_date);
    const end_time = start_time; // Lyfta doesn't provide end time
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
