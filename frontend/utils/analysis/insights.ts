import { WorkoutSet, ExerciseStats, DailySummary } from '../../types';
import { format, differenceInDays, differenceInCalendarWeeks, startOfDay, endOfDay, startOfWeek, subDays, subWeeks, isWithinInterval, isSameDay } from 'date-fns';
import { analyzeExerciseTrendCore, summarizeExerciseHistory, WEIGHT_STATIC_EPSILON_KG } from './exerciseTrend';
import { getSessionKey } from '../date/dateUtils';
import { isWarmupSet } from './setClassification';
import { WeightUnit } from '../storage/localStorage';
import { convertWeight, getStandardWeightIncrementKg } from '../format/units';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../format/deltaFormat';

// ============================================================================
// DELTA CALCULATIONS - Show movement vs previous periods
// ============================================================================

export interface PeriodStats {
  totalVolume: number;
  totalSets: number;
  totalWorkouts: number;
  totalPRs: number;
  avgSetsPerWorkout: number;
  avgVolumePerWorkout: number;
}

export interface DeltaResult {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
  formattedPercent: string;
  direction: 'up' | 'down' | 'same';
}

export const calculatePeriodStats = (data: WorkoutSet[], startDate: Date, endDate: Date): PeriodStats => {
  const filtered = data.filter(s => {
    if (!s.parsedDate) return false;
    return isWithinInterval(s.parsedDate, { start: startDate, end: endDate });
  });

  const sessions = new Set<string>();
  let totalVolume = 0;
  let totalPRs = 0;
  let totalSets = 0;

  for (const set of filtered) {
    if (isWarmupSet(set)) continue;

    const sessionKey = getSessionKey(set);
    if (sessionKey) sessions.add(sessionKey);
    totalSets += 1;
    totalVolume += (set.weight_kg || 0) * (set.reps || 0);
    if (set.isPr) totalPRs++;
  }

  const totalWorkouts = sessions.size;

  return {
    totalVolume,
    totalSets,
    totalWorkouts,
    totalPRs,
    avgSetsPerWorkout: totalWorkouts > 0 ? Math.round(totalSets / totalWorkouts) : 0,
    avgVolumePerWorkout: totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0,
  };
};

export const calculateDelta = (current: number, previous: number): DeltaResult => {
  const delta = Number((current - previous).toFixed(2));
  const deltaPercent = previous > 0 ? Math.round((delta / previous) * 100) : (current > 0 ? 100 : 0);
  const direction: 'up' | 'down' | 'same' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
  
  // Use centralized formatting for better UX with large percentages
  const formattedPercent = formatDeltaPercentage(deltaPercent, getDeltaFormatPreset('badge'));
  
  return { 
    current: Number(current.toFixed(2)), 
    previous: Number(previous.toFixed(2)), 
    delta, 
    deltaPercent, 
    formattedPercent,
    direction 
  };
};

export interface WeeklyComparison {
  volume: DeltaResult;
  sets: DeltaResult;
  workouts: DeltaResult;
  prs: DeltaResult;
}

export interface RollingWindowComparison {
  windowDays: 7 | 28;
  eligible: boolean;
  minWorkoutsRequired: number;
  current: PeriodStats;
  previous: PeriodStats;
  volume: DeltaResult | null;
  sets: DeltaResult | null;
  workouts: DeltaResult | null;
  prs: DeltaResult | null;
}

const getRollingWindowRange = (now: Date, windowDays: 7 | 28) => {
  const currentStart = startOfDay(subDays(now, windowDays - 1));
  const currentEnd = now;

  const previousStart = startOfDay(subDays(currentStart, windowDays));
  const previousEnd = endOfDay(subDays(currentStart, 1));

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
};

export const getRollingWindowComparison = (
  data: WorkoutSet[],
  windowDays: 7 | 28,
  now: Date = new Date(0),
  minWorkoutsRequired: number = 2
): RollingWindowComparison => {
  const range = getRollingWindowRange(now, windowDays);
  const current = calculatePeriodStats(data, range.current.start, range.current.end);
  const previous = calculatePeriodStats(data, range.previous.start, range.previous.end);

  const eligible = current.totalWorkouts >= minWorkoutsRequired && previous.totalWorkouts >= minWorkoutsRequired;

  return {
    windowDays,
    eligible,
    minWorkoutsRequired,
    current,
    previous,
    volume: eligible ? calculateDelta(current.totalVolume, previous.totalVolume) : null,
    sets: eligible ? calculateDelta(current.totalSets, previous.totalSets) : null,
    workouts: eligible ? calculateDelta(current.totalWorkouts, previous.totalWorkouts) : null,
    prs: eligible ? calculateDelta(current.totalPRs, previous.totalPRs) : null,
  };
};

// ============================================================================
// STREAK TRACKING - Consistency markers
// ============================================================================

export interface StreakInfo {
  currentStreak: number;      // Current consecutive weeks with workouts
  longestStreak: number;      // All-time longest streak
  isOnStreak: boolean;        // Did they work out this week?
  streakType: 'hot' | 'warm' | 'cold'; // Visual indicator
  workoutsThisWeek: number;   // Unique sessions this week
  avgWorkoutsPerWeek: number; // Avg unique sessions per week
  totalWeeksTracked: number;
  weeksWithWorkouts: number;
  consistencyScore: number;   // 0-100 score
}

export const calculateStreakInfo = (data: WorkoutSet[], now: Date = new Date(0)): StreakInfo => {
  if (data.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isOnStreak: false,
      streakType: 'cold',
      workoutsThisWeek: 0,
      avgWorkoutsPerWeek: 0,
      totalWeeksTracked: 0,
      weeksWithWorkouts: 0,
      consistencyScore: 0,
    };
  }

  // Get unique session and date markers (session = unique workout instance)
  const workoutDates = new Set<string>();
  const workoutWeeks = new Set<string>();
  const workoutSessions = new Set<string>();
  const sessionsThisWeek = new Set<string>();
  
  for (const set of data) {
    if (set.parsedDate && !isWarmupSet(set)) {
      workoutDates.add(format(set.parsedDate, 'yyyy-MM-dd'));
      workoutWeeks.add(format(startOfWeek(set.parsedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'));

      const sessionKey = getSessionKey(set);
      if (sessionKey) {
        workoutSessions.add(sessionKey);
      }
    }
  }

  // Sort dates to find streaks
  const sortedDates = Array.from(workoutDates).sort();
  if (sortedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isOnStreak: false,
      streakType: 'cold',
      workoutsThisWeek: 0,
      avgWorkoutsPerWeek: 0,
      totalWeeksTracked: 0,
      weeksWithWorkouts: 0,
      consistencyScore: 0,
    };
  }

  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  for (const set of data) {
    if (!set.parsedDate) continue;
    if (isWarmupSet(set)) continue;
    if (set.parsedDate < thisWeekStart || set.parsedDate > now) continue;
    const sessionKey = getSessionKey(set);
    if (sessionKey) sessionsThisWeek.add(sessionKey);
  }

  // Count workouts this week
  const workoutsThisWeek = sessionsThisWeek.size;

  // Calculate week-based streaks
  const sortedWeeks = Array.from(workoutWeeks).sort();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Check consecutive weeks from most recent
  const thisWeekKey = format(thisWeekStart, 'yyyy-MM-dd');
  const lastWeekKey = format(subWeeks(thisWeekStart, 1), 'yyyy-MM-dd');
  
  // Determine if current/last week has workouts
  const hasThisWeek = workoutWeeks.has(thisWeekKey);
  const hasLastWeek = workoutWeeks.has(lastWeekKey);
  
  // Calculate streaks by iterating through weeks
  for (let i = sortedWeeks.length - 1; i >= 0; i--) {
    const weekDate = new Date(sortedWeeks[i]);
    const expectedPrevWeek = i > 0 ? new Date(sortedWeeks[i - 1]) : null;
    
    tempStreak++;
    
    if (expectedPrevWeek) {
      const weekDiff = differenceInCalendarWeeks(weekDate, expectedPrevWeek, { weekStartsOn: 1 });
      if (weekDiff > 1) {
        // Gap in weeks, streak broken
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 0;
      }
    }
  }
  if (tempStreak > longestStreak) longestStreak = tempStreak;

  // Current streak: count back from this/last week
  if (hasThisWeek || hasLastWeek) {
    let checkWeek = hasThisWeek ? thisWeekStart : subWeeks(thisWeekStart, 1);
    currentStreak = 0;
    while (workoutWeeks.has(format(checkWeek, 'yyyy-MM-dd'))) {
      currentStreak++;
      checkWeek = subWeeks(checkWeek, 1);
    }
  }

  // Calculate total weeks tracked and consistency
  const totalWeeksTracked = Math.max(1, differenceInCalendarWeeks(now, firstDate, { weekStartsOn: 1 }) + 1);
  const weeksWithWorkouts = workoutWeeks.size;
  const consistencyScore = Math.round((weeksWithWorkouts / totalWeeksTracked) * 100);

  // Average workouts per week
  const avgWorkoutsPerWeek = totalWeeksTracked > 0 
    ? Math.round((workoutSessions.size / totalWeeksTracked) * 10) / 10 
    : 0;

  // Determine streak type
  let streakType: 'hot' | 'warm' | 'cold' = 'cold';
  if (currentStreak >= 4) streakType = 'hot';
  else if (currentStreak >= 2) streakType = 'warm';

  return {
    currentStreak,
    longestStreak,
    isOnStreak: hasThisWeek || hasLastWeek,
    streakType,
    workoutsThisWeek,
    avgWorkoutsPerWeek,
    totalWeeksTracked,
    weeksWithWorkouts,
    consistencyScore,
  };
};

// ============================================================================
// PR INSIGHTS - Timeline and drought detection
// ============================================================================

export interface RecentPR {
  date: Date;
  exercise: string;
  weight: number;
  reps: number;
  previousBest: number;      // Previous best weight for this exercise
  improvement: number;       // Weight improvement (current - previous)
}

export interface PRInsights {
  daysSinceLastPR: number;
  lastPRDate: Date | null;
  lastPRExercise: string | null;
  prDrought: boolean;        // More than 14 days without PR
  recentPRs: RecentPR[];
  prFrequency: number;       // PRs per week average
  totalPRs: number;
}

export const calculatePRInsights = (data: WorkoutSet[], now: Date = new Date(0)): PRInsights => {
  const sorted = [...data]
    .filter((s) => s.parsedDate && !isWarmupSet(s) && (s.weight_kg || 0) > 0)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const dt = (a.s.parsedDate!.getTime() || 0) - (b.s.parsedDate!.getTime() || 0);
      if (dt !== 0) return dt;
      const dsi = (a.s.set_index || 0) - (b.s.set_index || 0);
      if (dsi !== 0) return dsi;
      return a.i - b.i;
    })
    .map((x) => x.s);

  // Scan in chronological order and record PR events with their true previous best.
  const runningBest = new Map<string, number>();
  const prEvents: RecentPR[] = [];

  for (const set of sorted) {
    const exercise = set.exercise_title;
    const currentWeight = set.weight_kg || 0;
    const previousBest = runningBest.get(exercise) ?? 0;
    if (currentWeight <= previousBest) continue;

    prEvents.push({
      date: set.parsedDate!,
      exercise,
      weight: Number(currentWeight.toFixed(2)),
      reps: set.reps,
      previousBest: Number(previousBest.toFixed(2)),
      improvement: Number((currentWeight - previousBest).toFixed(2)),
    });

    runningBest.set(exercise, currentWeight);
  }

  if (prEvents.length === 0) {
    return {
      daysSinceLastPR: -1,
      lastPRDate: null,
      lastPRExercise: null,
      prDrought: true,
      recentPRs: [],
      prFrequency: 0,
      totalPRs: 0,
    };
  }

  const lastPR = prEvents[prEvents.length - 1];
  const daysSinceLastPR = differenceInDays(now, lastPR.date);

  // Most recent first.
  const recentPRs: RecentPR[] = prEvents.slice(-5).reverse();

  // Calculate PR frequency (last 30 days)
  const thirtyDaysAgo = subDays(now, 30);
  const recentPRCount = prEvents.filter((pr) => pr.date >= thirtyDaysAgo).length;
  const prFrequency = Math.round((recentPRCount / 4) * 10) / 10; // Per week

  return {
    daysSinceLastPR,
    lastPRDate: lastPR.date,
    lastPRExercise: lastPR.exercise,
    prDrought: daysSinceLastPR > 14,
    recentPRs,
    prFrequency,
    totalPRs: prEvents.length,
  };
};

// ============================================================================
// PLATEAU DETECTION - Identify stagnation
// ============================================================================

export interface ExercisePlateauInfo {
  exerciseName: string;
  weeksAtSameWeight: number;
  currentMaxWeight: number;
  lastProgressDate: Date | null;
  isPlateaued: boolean;
  suggestion: string;
}

export interface PlateauAnalysis {
  plateauedExercises: ExercisePlateauInfo[];
  improvingExercises: string[];
  overallTrend: 'improving' | 'maintaining' | 'declining';
}

export const detectPlateaus = (
  data: WorkoutSet[],
  exerciseStats: ExerciseStats[],
  now: Date = new Date(0),
  weightUnit: WeightUnit = 'kg'
): PlateauAnalysis => {
  const plateauedExercises: ExercisePlateauInfo[] = [];
  const improvingExercises: string[] = [];

  for (const stat of exerciseStats) {
    const core = analyzeExerciseTrendCore(stat);

    if (core.status === 'overload') {
      improvingExercises.push(stat.name);
      continue;
    }

    if (core.status !== 'stagnant') continue;

    const sessions = summarizeExerciseHistory(stat.history);
    const plateauWeight = core.plateau?.weight ?? 0;
    const plateauMinReps = core.plateau?.minReps ?? 0;
    const plateauMaxReps = core.plateau?.maxReps ?? 0;

    let earliestPlateauDate: Date | null = sessions[0]?.date ?? null;

    for (const s of sessions) {
      const repsMetric = core.isBodyweightLike ? s.maxReps : (s.reps || (s.weight > 0 ? s.volume / s.weight : 0));
      const isWeightMatch = Math.abs((s.weight ?? 0) - plateauWeight) < WEIGHT_STATIC_EPSILON_KG;
      const isRepsMatch = repsMetric >= (plateauMinReps - 1) && repsMetric <= (plateauMaxReps + 1);
      if (!isWeightMatch || !isRepsMatch) break;
      earliestPlateauDate = s.date;
    }

    const weeksStuckRaw = earliestPlateauDate
      ? differenceInCalendarWeeks(now, earliestPlateauDate, { weekStartsOn: 1 })
      : 1;
    const weeksStuck = Math.max(1, weeksStuckRaw);

    plateauedExercises.push({
      exerciseName: stat.name,
      weeksAtSameWeight: weeksStuck,
      currentMaxWeight: plateauWeight,
      lastProgressDate: earliestPlateauDate,
      isPlateaued: true,
      suggestion: core.isBodyweightLike
        ? 'Try adding 1-2 reps or an extra set next session.'
        : `Try increasing weight to ${convertWeight(plateauWeight + getStandardWeightIncrementKg(weightUnit), weightUnit)}${weightUnit} next session.`,
    });
  }

  // Determine overall trend
  let overallTrend: 'improving' | 'maintaining' | 'declining' = 'maintaining';
  if (improvingExercises.length > plateauedExercises.length) {
    overallTrend = 'improving';
  } else if (plateauedExercises.length > improvingExercises.length + 2) {
    overallTrend = 'declining';
  }

  return {
    plateauedExercises: plateauedExercises.sort((a, b) => b.weeksAtSameWeight - a.weeksAtSameWeight),
    improvingExercises,
    overallTrend,
  };
};

const getSuggestion = (exercise: string, weeks: number): string => {
  const suggestions = [
    'Try adding more volume (extra sets)',
    'Consider a deload week',
    'Try a different rep range',
    'Add pause reps or tempo work',
    'Check sleep and nutrition',
  ];
  return suggestions[weeks % suggestions.length];
};

// ============================================================================
// SPARKLINE DATA - Mini trends for KPIs
// ============================================================================

export interface SparklinePoint {
  value: number;
  label: string;
}

export const getVolumeSparkline = (dailyData: DailySummary[], points: number = 7): SparklinePoint[] => {
  const sorted = [...dailyData].sort((a, b) => b.timestamp - a.timestamp);
  const recent = sorted.slice(0, points).reverse();
  
  return recent.map(d => ({
    value: d.totalVolume,
    label: format(new Date(d.timestamp), 'MMM d'),
  }));
};

export const getWorkoutSparkline = (data: WorkoutSet[], weeks: number = 8, now: Date = new Date(0)): SparklinePoint[] => {
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const sessions = new Set<string>();
    for (const set of data) {
      if (isWarmupSet(set)) continue;
      if (set.parsedDate && isWithinInterval(set.parsedDate, { start: weekStart, end: weekEnd })) {
        const sessionKey = getSessionKey(set);
        if (sessionKey) sessions.add(sessionKey);
      }
    }
    
    result.push({
      value: sessions.size,
      label: format(weekStart, 'MMM d'),
    });
  }
  
  return result;
};

export const getPRSparkline = (data: WorkoutSet[], weeks: number = 8, now: Date = new Date(0)): SparklinePoint[] => {
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const prCount = data.filter(s => 
      !isWarmupSet(s) &&
      s.isPr && 
      s.parsedDate && 
      isWithinInterval(s.parsedDate, { start: weekStart, end: weekEnd })
    ).length;
    
    result.push({
      value: prCount,
      label: format(weekStart, 'MMM d'),
    });
  }
  
  return result;
};

export const getSetsSparkline = (data: WorkoutSet[], weeks: number = 8, now: Date = new Date(0)): SparklinePoint[] => {
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const setsCount = data.filter(s => 
      !isWarmupSet(s) &&
      s.parsedDate && 
      isWithinInterval(s.parsedDate, { start: weekStart, end: weekEnd })
    ).length;
    
    result.push({
      value: setsCount,
      label: format(weekStart, 'MMM d'),
    });
  }
  
  return result;
};

export const getConsistencySparkline = (data: WorkoutSet[], weeks: number = 8, now: Date = new Date(0)): SparklinePoint[] => {
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const sessions = new Set<string>();
    for (const set of data) {
      if (isWarmupSet(set)) continue;
      if (set.parsedDate && isWithinInterval(set.parsedDate, { start: weekStart, end: weekEnd })) {
        const sessionKey = getSessionKey(set);
        if (sessionKey) sessions.add(sessionKey);
      }
    }
    
    result.push({
      value: sessions.size,
      label: format(weekStart, 'MMM d'),
    });
  }
  
  return result;
};

// ============================================================================
// SUMMARY INSIGHTS - High-level actionable info
// ============================================================================

export interface DashboardInsights {
  rolling7d: RollingWindowComparison;
  rolling28d: RollingWindowComparison;
  streakInfo: StreakInfo;
  prInsights: PRInsights;
  volumeSparkline: SparklinePoint[];
  workoutSparkline: SparklinePoint[];
  prSparkline: SparklinePoint[];
  setsSparkline: SparklinePoint[];
  consistencySparkline: SparklinePoint[];
}

export const calculateDashboardInsights = (
  data: WorkoutSet[], 
  dailyData: DailySummary[],
  now: Date = new Date(0)
): DashboardInsights => {
  return {
    rolling7d: getRollingWindowComparison(data, 7, now, 2),
    rolling28d: getRollingWindowComparison(data, 28, now, 2),
    streakInfo: calculateStreakInfo(data, now),
    prInsights: calculatePRInsights(data, now),
    volumeSparkline: getVolumeSparkline(dailyData),
    workoutSparkline: getWorkoutSparkline(data, 8, now),
    prSparkline: getPRSparkline(data, 8, now),
    setsSparkline: getSetsSparkline(data, 8, now),
    consistencySparkline: getConsistencySparkline(data, 8, now),
  };
};
