import { format, isValid, parseISO } from 'date-fns';
import type { HevyProWorkout, WorkoutSetDTO } from './types';

const DATE_FORMAT_HEVY = 'd MMM yyyy, HH:mm';

const formatIsoDate = (iso: string | undefined): string => {
  if (!iso) return '';
  try {
    const d = parseISO(iso);
    return isValid(d) ? format(d, DATE_FORMAT_HEVY) : '';
  } catch {
    return '';
  }
};

const toNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const mapHevyProWorkoutsToWorkoutSets = (workouts: HevyProWorkout[]): WorkoutSetDTO[] => {
  const out: WorkoutSetDTO[] = [];

  for (const w of workouts) {
    const title = String(w.title ?? 'Workout');
    const start_time = formatIsoDate(w.start_time);
    const end_time = formatIsoDate(w.end_time);
    const description = String(w.description ?? '');

    for (const ex of w.exercises ?? []) {
      const exercise_title = String(ex.title ?? '').trim();
      const exercise_notes = String(ex.notes ?? '');
      const superset_id = String(ex.supersets_id ?? '');

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
          set_type: String(s.type ?? 'normal'),
          weight_kg: s.weight_kg == null ? 0 : toNumber(s.weight_kg, 0),
          reps: s.reps == null ? 0 : toNumber(s.reps, 0),
          distance_km: distanceMeters > 0 ? distanceMeters / 1000 : 0,
          duration_seconds: s.duration_seconds == null ? 0 : toNumber(s.duration_seconds, 0),
          rpe: s.rpe == null ? null : toNumber(s.rpe, 0),
        });
      }
    }
  }

  return out;
};
