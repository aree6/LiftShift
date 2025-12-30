/**
 * Official Hevy API client
 * Uses the user's personal API key (from Hevy Pro subscription)
 * API docs: https://api.hevyapp.com/docs
 */

const HEVY_API_BASE = 'https://api.hevyapp.com/v1';

interface HevyApiWorkout {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  updated_at: string;
  created_at: string;
  exercises: HevyApiExercise[];
}

interface HevyApiExercise {
  index: number;
  title: string;
  notes: string;
  exercise_template_id: string;
  superset_id: number | null;
  sets: HevyApiSet[];
}

interface HevyApiSet {
  index: number;
  set_type: 'normal' | 'warmup' | 'dropset' | 'failure';
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
}

interface HevyApiPagedResponse<T> {
  page: number;
  page_count: number;
  [key: string]: T[] | number;
}

const parseErrorBody = async (res: Response): Promise<string> => {
  try {
    const data = await res.json();
    return data?.error || data?.message || `${res.status} ${res.statusText}`;
  } catch {
    try {
      const text = await res.text();
      return text || `${res.status} ${res.statusText}`;
    } catch {
      return `${res.status} ${res.statusText}`;
    }
  }
};

/**
 * Validate an API key by making a simple request
 */
export const hevyOfficialValidateApiKey = async (apiKey: string): Promise<boolean> => {
  const res = await fetch(`${HEVY_API_BASE}/workouts?page=1&pageSize=1`, {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
    },
  });

  return res.ok;
};

/**
 * Get workout count
 */
export const hevyOfficialGetWorkoutCount = async (apiKey: string): Promise<number> => {
  const res = await fetch(`${HEVY_API_BASE}/workouts/count`, {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
    },
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  const data = await res.json();
  return data.workout_count ?? 0;
};

/**
 * Get workouts (paginated)
 */
export const hevyOfficialGetWorkouts = async (
  apiKey: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ workouts: HevyApiWorkout[]; page: number; pageCount: number }> => {
  const res = await fetch(`${HEVY_API_BASE}/workouts?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
    },
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  const data = await res.json();
  return {
    workouts: data.workouts ?? [],
    page: data.page ?? 1,
    pageCount: data.page_count ?? 1,
  };
};

/**
 * Get all workouts (fetches all pages)
 */
export const hevyOfficialGetAllWorkouts = async (
  apiKey: string,
  maxPages?: number
): Promise<HevyApiWorkout[]> => {
  const allWorkouts: HevyApiWorkout[] = [];
  let page = 1;
  let pageCount = 1;
  let fetched = 0;

  while (page <= pageCount) {
    if (maxPages && fetched >= maxPages) break;

    const result = await hevyOfficialGetWorkouts(apiKey, page, 10);
    allWorkouts.push(...result.workouts);
    pageCount = result.pageCount;
    page++;
    fetched++;
  }

  return allWorkouts;
};

/**
 * Get exercise templates
 */
export const hevyOfficialGetExerciseTemplates = async (
  apiKey: string,
  page: number = 1,
  pageSize: number = 100
): Promise<any[]> => {
  const res = await fetch(`${HEVY_API_BASE}/exercise_templates?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
    },
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  const data = await res.json();
  return data.exercise_templates ?? [];
};

/**
 * Get routines
 */
export const hevyOfficialGetRoutines = async (
  apiKey: string,
  page: number = 1,
  pageSize: number = 10
): Promise<any[]> => {
  const res = await fetch(`${HEVY_API_BASE}/routines?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
    },
  });

  if (!res.ok) {
    const msg = await parseErrorBody(res);
    const err = new Error(msg);
    (err as any).statusCode = res.status;
    throw err;
  }

  const data = await res.json();
  return data.routines ?? [];
};

export type { HevyApiWorkout, HevyApiExercise, HevyApiSet };
