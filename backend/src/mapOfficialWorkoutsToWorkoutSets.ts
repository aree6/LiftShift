import { format } from 'date-fns';
import type { HevyApiWorkout, HevyApiExercise, HevyApiSet } from './hevyOfficialApi';
import type { WorkoutSetDTO } from './types';

const DATE_FORMAT_HEVY = 'd MMM yyyy, HH:mm';

const formatIsoString = (isoString: string | undefined): string => {
  if (!isoString) return '';
  try {
    return format(new Date(isoString), DATE_FORMAT_HEVY);
  } catch {
    return '';
  }
};

const toNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Maps official Hevy API workout format to the internal WorkoutSetDTO format
 */
export const mapOfficialWorkoutsToWorkoutSets = (workouts: HevyApiWorkout[]): WorkoutSetDTO[] => {
  const out: WorkoutSetDTO[] = [];

  for (const w of workouts) {
    const title = String(w.title ?? 'Workout');
    const start_time = formatIsoString(w.start_time);
    const end_time = formatIsoString(w.end_time);
    const description = String(w.description ?? '');

    for (const ex of w.exercises ?? []) {
      const exercise_title = String(ex.title ?? '').trim();
      const exercise_notes = String(ex.notes ?? '');
      const superset_id = ex.superset_id != null ? String(ex.superset_id) : '';

      for (const s of ex.sets ?? []) {
        const distanceMeters = s.distance_meters == null ? 0 : toNumber(s.distance_meters, 0);
        out.push({
          title,
          start_time,
          end_time,
          description,
          exercise_title,
          superset_id,
          exercise_notes,
          set_index: toNumber(s.index, 0),
          set_type: String(s.set_type ?? 'normal'),
          weight_kg: toNumber(s.weight_kg, 0),
          reps: toNumber(s.reps, 0),
          distance_km: distanceMeters > 0 ? distanceMeters / 1000 : 0,
          duration_seconds: toNumber(s.duration_seconds, 0),
          rpe: s.rpe == null ? null : toNumber(s.rpe, 0),
        });
      }
    }
  }

  return out;
};
