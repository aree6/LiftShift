export interface HevyLoginResponse {
  auth_token: string;
  user_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
}

export interface HevyAccountResponse {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  created_at?: string;
}

export interface HevyPagedWorkoutsResponse {
  workouts: HevyWorkout[];
}

export interface HevyWorkout {
  id: string;
  name?: string;
  description?: string;
  start_time?: number;
  end_time?: number;
  exercises?: HevyWorkoutExercise[];
}

export interface HevyWorkoutExercise {
  id: string;
  title?: string;
  notes?: string;
  superset_id?: string | null;
  sets?: HevyWorkoutSet[];
}

export interface HevyWorkoutSet {
  id?: number;
  index?: number;
  indicator?: string;
  weight_kg?: number;
  reps?: number;
  rpe?: number | null;
  distance_meters?: number | string | null;
  duration_seconds?: number | string | null;
}

export interface HevyProWorkoutSet {
  index?: number;
  type?: string;
  weight_kg?: number | null;
  reps?: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  rpe?: number | null;
  custom_metric?: number | null;
}

export interface HevyProWorkoutExercise {
  index?: number;
  title?: string;
  notes?: string;
  exercise_template_id?: string;
  supersets_id?: number | null;
  sets?: HevyProWorkoutSet[];
}

export interface HevyProWorkout {
  id: string;
  title?: string;
  routine_id?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  updated_at?: string;
  created_at?: string;
  exercises?: HevyProWorkoutExercise[];
}

export interface WorkoutSetDTO {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  exercise_title: string;
  superset_id: string;
  exercise_notes: string;
  set_index: number;
  set_type: string;
  weight_kg: number;
  reps: number;
  distance_km: number;
  duration_seconds: number;
  rpe: number | null;
}
