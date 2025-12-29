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
  parsedDate?: Date;
  isPr?: boolean;
}

export interface ExerciseHistoryEntry {
  date: Date;
  weight: number;
  reps: number;
  oneRepMax: number;
  volume: number;
  isPr: boolean;
}

export interface ExerciseStats {
  name: string;
  totalSets: number;
  totalVolume: number;
  maxWeight: number;
  prCount: number;
  history: ExerciseHistoryEntry[];
}

export interface DailySummary {
  date: string;
  timestamp: number;
  totalVolume: number;
  workoutTitle: string;
  sets: number;
  avgReps: number;
  durationMinutes: number;
  density: number;
}

export type WisdomType = 'efficiency' | 'hypertrophy' | 'crash' | 'promote' | 'demote' | 'neutral';

export interface SetWisdom {
  type: WisdomType;
  message: string;
  tooltip?: string;
}

export interface SessionAnalysis {
  goalLabel: string;
  avgReps: number;
  setCount: number;
  tooltip?: string;
  primaryGoal?: string;
  secondaryGoal?: string;
  repBands?: {
    strengthSets: number;
    hypertrophySets: number;
    enduranceSets: number;
    totalWorkingSets: number;
    strengthPct: number;
    hypertrophyPct: number;
    endurancePct: number;
  };
}

export type AnalysisStatus = 'success' | 'warning' | 'danger' | 'info';

export interface AnalysisMetrics {
  weight_change_pct: string;
  vol_drop_pct: string;
  actual_reps: number;
  expected_reps: string;
}

export interface TooltipLine {
  text: string;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
  bold?: boolean;
}

export interface StructuredTooltip {
  trend: { value: string; direction: 'up' | 'down' | 'same' };
  why: TooltipLine[];
  improve?: TooltipLine[];
}

export interface AnalysisResult {
  transition: string;
  status: AnalysisStatus;
  metrics: AnalysisMetrics;
  tooltip: string;
  shortMessage: string;
  structured?: StructuredTooltip;
}