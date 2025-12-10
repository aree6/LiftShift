export interface WorkoutSet {
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
  parsedDate?: Date; // Added after processing
  isPr?: boolean; // Added for PR tracking
}

export interface ExerciseStats {
  name: string;
  totalSets: number;
  totalVolume: number;
  maxWeight: number;
  prCount: number;
  history: {
    date: Date;
    weight: number;
    reps: number;
    oneRepMax: number;
    volume: number;
    isPr: boolean;
  }[];
}

export interface DailySummary {
  date: string; // ISO Date string for grouping
  timestamp: number;
  totalVolume: number;
  workoutTitle: string;
  sets: number;
  avgReps: number; // Added for Training Goal trends
  durationMinutes: number;
  density: number;
}

export interface SetWisdom {
  type: 'efficiency' | 'hypertrophy' | 'crash' | 'promote' | 'demote' | 'neutral';
  message: string;
  tooltip?: string;
}

export interface SessionAnalysis {
  goalLabel: string;
  avgReps: number;
  setCount: number;
  tooltip?: string;
}

export interface AnalysisResult {
  transition: string;     // e.g., "Set 1 -> Set 2"
  status: 'success' | 'warning' | 'danger' | 'info';
  metrics: {
    weight_change_pct: string;
    vol_drop_pct: string;
    actual_reps: number;
    expected_reps: string;
  };
  tooltip: string;        // The "Wisdom" text
  shortMessage: string;   // For the badge text
}