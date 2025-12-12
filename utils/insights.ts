import { WorkoutSet, ExerciseStats, DailySummary } from '../types';
import { format, differenceInDays, differenceInCalendarWeeks, startOfWeek, subDays, subWeeks, isWithinInterval, isSameDay } from 'date-fns';

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

  for (const set of filtered) {
    if (set.start_time) sessions.add(set.start_time);
    totalVolume += (set.weight_kg || 0) * (set.reps || 0);
    if (set.isPr) totalPRs++;
  }

  const totalWorkouts = sessions.size;
  const totalSets = filtered.length;

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
  
  return { 
    current: Number(current.toFixed(2)), 
    previous: Number(previous.toFixed(2)), 
    delta, 
    deltaPercent, 
    direction 
  };
};

export interface WeeklyComparison {
  volume: DeltaResult;
  sets: DeltaResult;
  workouts: DeltaResult;
  prs: DeltaResult;
}

export const getWeekOverWeekComparison = (data: WorkoutSet[]): WeeklyComparison => {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekEnd = subDays(thisWeekStart, 1);

  const thisWeek = calculatePeriodStats(data, thisWeekStart, now);
  const lastWeek = calculatePeriodStats(data, lastWeekStart, lastWeekEnd);

  return {
    volume: calculateDelta(thisWeek.totalVolume, lastWeek.totalVolume),
    sets: calculateDelta(thisWeek.totalSets, lastWeek.totalSets),
    workouts: calculateDelta(thisWeek.totalWorkouts, lastWeek.totalWorkouts),
    prs: calculateDelta(thisWeek.totalPRs, lastWeek.totalPRs),
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
  workoutsThisWeek: number;
  avgWorkoutsPerWeek: number;
  totalWeeksTracked: number;
  weeksWithWorkouts: number;
  consistencyScore: number;   // 0-100 score
}

export const calculateStreakInfo = (data: WorkoutSet[]): StreakInfo => {
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

  // Get all unique workout dates
  const workoutDates = new Set<string>();
  const workoutWeeks = new Set<string>();
  
  for (const set of data) {
    if (set.parsedDate) {
      workoutDates.add(format(set.parsedDate, 'yyyy-MM-dd'));
      workoutWeeks.add(format(startOfWeek(set.parsedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
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
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });

  // Count workouts this week
  let workoutsThisWeek = 0;
  for (const dateStr of sortedDates) {
    const d = new Date(dateStr);
    if (d >= thisWeekStart && d <= now) {
      workoutsThisWeek++;
    }
  }

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
    ? Math.round((workoutDates.size / totalWeeksTracked) * 10) / 10 
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

export const calculatePRInsights = (data: WorkoutSet[]): PRInsights => {
  const prs = data.filter(s => s.isPr && s.parsedDate).sort((a, b) => 
    (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0)
  );

  if (prs.length === 0) {
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

  const now = new Date();
  const lastPR = prs[0];
  const daysSinceLastPR = differenceInDays(now, lastPR.parsedDate!);
  
  // Build exercise history for finding previous bests
  const exerciseMaxWeights = new Map<string, { weight: number; date: Date }[]>();
  for (const set of data) {
    if (!set.parsedDate || !set.weight_kg) continue;
    const exercise = set.exercise_title;
    if (!exerciseMaxWeights.has(exercise)) {
      exerciseMaxWeights.set(exercise, []);
    }
    exerciseMaxWeights.get(exercise)!.push({ weight: set.weight_kg, date: set.parsedDate });
  }
  
  // Sort each exercise's history by date
  for (const [, history] of exerciseMaxWeights) {
    history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  // Get recent PRs (last 5) with previous best info
  const recentPRs: RecentPR[] = prs.slice(0, 5).map(pr => {
    const exerciseHistory = exerciseMaxWeights.get(pr.exercise_title) || [];
    // Find the max weight before this PR date
    const previousSets = exerciseHistory.filter(h => h.date < pr.parsedDate!);
    const previousBest = previousSets.length > 0 
      ? Math.max(...previousSets.map(h => h.weight))
      : 0;
    
    return {
      date: pr.parsedDate!,
      exercise: pr.exercise_title,
      weight: Number(pr.weight_kg.toFixed(2)),
      reps: pr.reps,
      previousBest: Number(previousBest.toFixed(2)),
      improvement: Number((pr.weight_kg - previousBest).toFixed(2)),
    };
  });

  // Calculate PR frequency (last 30 days)
  const thirtyDaysAgo = subDays(now, 30);
  const recentPRCount = prs.filter(pr => pr.parsedDate! >= thirtyDaysAgo).length;
  const prFrequency = Math.round((recentPRCount / 4) * 10) / 10; // Per week

  return {
    daysSinceLastPR,
    lastPRDate: lastPR.parsedDate!,
    lastPRExercise: lastPR.exercise_title,
    prDrought: daysSinceLastPR > 14,
    recentPRs,
    prFrequency,
    totalPRs: prs.length,
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

export const detectPlateaus = (data: WorkoutSet[], exerciseStats: ExerciseStats[]): PlateauAnalysis => {
  const now = new Date();
  const fourWeeksAgo = subWeeks(now, 4);
  const eightWeeksAgo = subWeeks(now, 8);

  const plateauedExercises: ExercisePlateauInfo[] = [];
  const improvingExercises: string[] = [];

  for (const stat of exerciseStats) {
    if (stat.totalSets < 8) continue; // Need enough data

    // Get sets for this exercise in last 8 weeks
    const recentSets = data.filter(s => 
      s.exercise_title === stat.name && 
      s.parsedDate && 
      s.parsedDate >= eightWeeksAgo
    );

    if (recentSets.length < 4) continue;

    // Find max weight in different periods
    const last4WeeksSets = recentSets.filter(s => s.parsedDate! >= fourWeeksAgo);
    const prev4WeeksSets = recentSets.filter(s => s.parsedDate! < fourWeeksAgo);

    const maxLast4 = Math.max(...last4WeeksSets.map(s => s.weight_kg || 0), 0);
    const maxPrev4 = Math.max(...prev4WeeksSets.map(s => s.weight_kg || 0), 0);

    if (maxPrev4 === 0) continue;

    const improvement = maxLast4 - maxPrev4;
    const improvementPct = (improvement / maxPrev4) * 100;

    if (improvementPct > 2) {
      improvingExercises.push(stat.name);
    } else if (improvementPct <= 0 && last4WeeksSets.length >= 4) {
      // No improvement in 4 weeks with sufficient data = plateau
      const lastProgressSet = recentSets
        .filter(s => s.weight_kg === maxLast4)
        .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0))[0];
      
      const weeksStuck = lastProgressSet?.parsedDate 
        ? differenceInCalendarWeeks(now, lastProgressSet.parsedDate, { weekStartsOn: 1 })
        : 4;

      plateauedExercises.push({
        exerciseName: stat.name,
        weeksAtSameWeight: weeksStuck,
        currentMaxWeight: maxLast4,
        lastProgressDate: lastProgressSet?.parsedDate || null,
        isPlateaued: true,
        suggestion: getSuggestion(stat.name, weeksStuck),
      });
    }
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

export const getWorkoutSparkline = (data: WorkoutSet[], weeks: number = 8): SparklinePoint[] => {
  const now = new Date();
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const sessions = new Set<string>();
    for (const set of data) {
      if (set.parsedDate && set.start_time && 
          isWithinInterval(set.parsedDate, { start: weekStart, end: weekEnd })) {
        sessions.add(set.start_time);
      }
    }
    
    result.push({
      value: sessions.size,
      label: format(weekStart, 'MMM d'),
    });
  }
  
  return result;
};

export const getPRSparkline = (data: WorkoutSet[], weeks: number = 8): SparklinePoint[] => {
  const now = new Date();
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const prCount = data.filter(s => 
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

export const getSetsSparkline = (data: WorkoutSet[], weeks: number = 8): SparklinePoint[] => {
  const now = new Date();
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const setsCount = data.filter(s => 
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

export const getConsistencySparkline = (data: WorkoutSet[], weeks: number = 8): SparklinePoint[] => {
  const now = new Date();
  const result: SparklinePoint[] = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), i);
    const weekEnd = subDays(subWeeks(weekStart, -1), 1);
    
    const sessions = new Set<string>();
    for (const set of data) {
      if (set.parsedDate && set.start_time && 
          isWithinInterval(set.parsedDate, { start: weekStart, end: weekEnd })) {
        sessions.add(set.start_time);
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
  weekComparison: WeeklyComparison;
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
  dailyData: DailySummary[]
): DashboardInsights => {
  return {
    weekComparison: getWeekOverWeekComparison(data),
    streakInfo: calculateStreakInfo(data),
    prInsights: calculatePRInsights(data),
    volumeSparkline: getVolumeSparkline(dailyData),
    workoutSparkline: getWorkoutSparkline(data),
    prSparkline: getPRSparkline(data),
    setsSparkline: getSetsSparkline(data),
    consistencySparkline: getConsistencySparkline(data),
  };
};
