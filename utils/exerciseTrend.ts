import { format, startOfDay } from 'date-fns';
import { ExerciseHistoryEntry, ExerciseStats } from '../types';

export type ExerciseTrendStatus = 'overload' | 'stagnant' | 'regression' | 'neutral' | 'new';

export interface ExerciseSessionEntry {
  date: Date;
  weight: number;
  reps: number;
  oneRepMax: number;
  volume: number;
  sets: number;
  totalReps: number;
  maxReps: number;
}

export interface ExerciseTrendCoreResult {
  status: ExerciseTrendStatus;
  isBodyweightLike: boolean;
  diffPct?: number;
  plateau?: {
    weight: number;
    minReps: number;
    maxReps: number;
  };
}

export const summarizeExerciseHistory = (history: ExerciseHistoryEntry[]): ExerciseSessionEntry[] => {
  const byDay = new Map<string, ExerciseSessionEntry>();

  for (const h of history) {
    const d = h.date;
    if (!d) continue;

    const day = startOfDay(d);
    const key = format(day, 'yyyy-MM-dd');

    let entry = byDay.get(key);
    if (!entry) {
      entry = {
        date: day,
        weight: 0,
        reps: 0,
        oneRepMax: 0,
        volume: 0,
        sets: 0,
        totalReps: 0,
        maxReps: 0,
      };
      byDay.set(key, entry);
    }

    entry.sets += 1;
    entry.volume += h.volume || 0;
    entry.totalReps += h.reps || 0;
    entry.maxReps = Math.max(entry.maxReps, h.reps || 0);

    if ((h.oneRepMax || 0) >= (entry.oneRepMax || 0)) {
      entry.oneRepMax = h.oneRepMax || 0;
      entry.weight = h.weight || 0;
      entry.reps = h.reps || 0;
    }
  }

  return Array.from(byDay.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const analyzeExerciseTrendCore = (stats: ExerciseStats): ExerciseTrendCoreResult => {
  const history = summarizeExerciseHistory(stats.history);

  if (history.length < 3) {
    return {
      status: 'new',
      isBodyweightLike: false,
    };
  }

  const recent = history.slice(0, 4);
  const weights = recent.map(h => h.weight);
  const maxWeightInRecent = Math.max(...weights);
  const isBodyweightLike = maxWeightInRecent <= 0.0001;
  const reps = isBodyweightLike
    ? recent.map(h => h.maxReps)
    : recent.map(h => h.reps || (h.weight > 0 ? h.volume / h.weight : 0));

  const maxReps = Math.max(...reps);
  const minReps = Math.min(...reps);
  const hasMeaningfulSignal = maxWeightInRecent > 0.0001 || maxReps >= 2;

  if (!hasMeaningfulSignal) {
    return {
      status: 'new',
      isBodyweightLike: true,
    };
  }

  const isWeightStatic = weights.every(w => Math.abs(w - weights[0]) < 1);
  const isRepStatic = (maxReps - minReps) <= 1;

  if (isWeightStatic && isRepStatic) {
    return {
      status: 'stagnant',
      isBodyweightLike,
      plateau: {
        weight: weights[0] ?? 0,
        minReps,
        maxReps,
      },
    };
  }

  const currentMetric = isBodyweightLike
    ? (reps[0] + (reps[1] ?? reps[0])) / 2
    : (recent[0].oneRepMax + recent[1].oneRepMax) / 2;
  const previousMetric = isBodyweightLike
    ? (reps[2] + (reps[3] ?? reps[2])) / 2
    : (recent[2].oneRepMax + (recent[3]?.oneRepMax || recent[2].oneRepMax)) / 2;

  if (currentMetric <= 0 && previousMetric <= 0) {
    return {
      status: 'new',
      isBodyweightLike,
    };
  }

  const diffPct = previousMetric > 0 ? ((currentMetric - previousMetric) / previousMetric) * 100 : 0;

  if (diffPct > 2.5) {
    return {
      status: 'overload',
      isBodyweightLike,
      diffPct,
    };
  }

  if (diffPct < -2.5) {
    return {
      status: 'regression',
      isBodyweightLike,
      diffPct,
    };
  }

  return {
    status: 'neutral',
    isBodyweightLike,
    diffPct,
  };
};
