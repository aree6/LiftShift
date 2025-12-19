import React, { useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { DailySummary, ExerciseStats, WorkoutSet } from '../types';
import { 
  getIntensityEvolution, 
  getDayOfWeekShape, 
  getTopExercisesRadial,
  getPrsOverTime,
  getTopExercisesOverTime
} from '../utils/analysis/analytics';
import { getMuscleVolumeTimeSeries, getMuscleVolumeTimeSeriesDetailed } from '../utils/muscle/muscleAnalytics';
import type { BodyMapGender } from './BodyMap';
import { getSmartFilterMode, TimeFilterMode, WeightUnit } from '../utils/storage/localStorage';
import { getDisplayVolume } from '../utils/format/volumeDisplay';
import { CHART_TOOLTIP_STYLE, CHART_COLORS, ANIMATION_KEYFRAMES } from '../utils/ui/uiConstants';
import { computeWeeklySetsDashboardData } from '../utils/muscle/dashboardWeeklySets';
import { bucketRollingWeeklySeriesToWeeks } from '../utils/muscle/rollingSeriesBucketing';
import { getMuscleContributionsFromAsset } from '../utils/muscle/muscleContributions';
import { ActivityHeatmap } from './dashboard/ActivityHeatmap';
import { 
  Clock, Dumbbell
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { formatDayContraction, formatDayYearContraction, formatWeekContraction, formatMonthYearContraction, getEffectiveNowFromWorkoutData, getSessionKey } from '../utils/date/dateUtils';
import { getExerciseAssets, ExerciseAsset } from '../utils/data/exerciseAssets';
import { ViewHeader } from './ViewHeader';
import { calculateDashboardInsights, detectPlateaus, calculateDelta, DashboardInsights, PlateauAnalysis, SparklinePoint, StreakInfo } from '../utils/analysis/insights';
import { InsightsPanel, PlateauAlert, RecentPRsPanel } from './InsightCards';
import { computationCache } from '../utils/storage/computationCache';
import { MIN_SESSIONS_FOR_TREND, summarizeExerciseHistory } from '../utils/analysis/exerciseTrend';
import { isWarmupSet } from '../utils/analysis/setClassification';
import { ChartSkeleton } from './ChartSkeleton';
import { LazyRender } from './LazyRender';

const safePct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

interface DashboardProps {
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  fullData: WorkoutSet[]; // The raw set data
  onDayClick?: (date: Date) => void;
  onMuscleClick?: (muscleId: string, viewMode: 'muscle' | 'group') => void;
  onExerciseClick?: (exerciseName: string) => void;
  filtersSlot?: React.ReactNode;
  stickyHeader?: boolean;
  bodyMapGender?: BodyMapGender;
  weightUnit?: WeightUnit;
}

const WeeklySetsCard = React.lazy(() => import('./dashboard/WeeklySetsCard').then((m) => ({ default: m.WeeklySetsCard })));
const MuscleTrendCard = React.lazy(() => import('./dashboard/MuscleTrendCard').then((m) => ({ default: m.MuscleTrendCard })));
const PrTrendCard = React.lazy(() => import('./dashboard/PrTrendCard').then((m) => ({ default: m.PrTrendCard })));
const IntensityEvolutionCard = React.lazy(() => import('./dashboard/IntensityEvolutionCard').then((m) => ({ default: m.IntensityEvolutionCard })));
const WeeklyRhythmCard = React.lazy(() => import('./dashboard/WeeklyRhythmCard').then((m) => ({ default: m.WeeklyRhythmCard })));
const VolumeDensityCard = React.lazy(() => import('./dashboard/VolumeDensityCard').then((m) => ({ default: m.VolumeDensityCard })));
const TopExercisesCard = React.lazy(() => import('./dashboard/TopExercisesCard').then((m) => ({ default: m.TopExercisesCard })));

// --- MAIN DASHBOARD ---

export const Dashboard: React.FC<DashboardProps> = ({ dailyData, exerciseStats, fullData, onDayClick, onMuscleClick, onExerciseClick, filtersSlot, stickyHeader = false, bodyMapGender = 'male' as BodyMapGender, weightUnit = 'kg' as WeightUnit }) => {
  // State to control animation retriggering on mount
  const [isMounted, setIsMounted] = useState(false);

  const effectiveNow = useMemo(() => getEffectiveNowFromWorkoutData(fullData, new Date(0)), [fullData]);

  // Calculate date range span for smart filter
  const spanDays = useMemo(() => {
    if (!fullData.length) return 0;
    const dates = fullData.map(s => s.parsedDate?.getTime() || 0).filter(t => t > 0);
    if (dates.length === 0) return 0;
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
  }, [fullData]);

  // Smart filter mode based on date range span
  const smartMode = useMemo(() => getSmartFilterMode(spanDays), [spanDays]);

  // Count total workouts (for display purposes)
  const totalWorkouts = useMemo(() => {
    const sessions = new Set<string>();
    for (const s of fullData) {
      if (isWarmupSet(s)) continue;
      const key = getSessionKey(s);
      if (!key) continue;
      sessions.add(key);
    }
    return sessions.size;
  }, [fullData]);

  // Track user overrides only (null = use smart mode)
  const [chartOverrides, setChartOverrides] = useState<Record<string, TimeFilterMode | null>>({
    volumeVsDuration: null,
    intensityEvo: null,
    prTrend: null,
  });

  // Reset overrides when smart mode changes (new filter applied)
  useEffect(() => {
    setChartOverrides({
      volumeVsDuration: null,
      intensityEvo: null,
      prTrend: null,
    });
  }, [smartMode]);

  // Effective chart modes: use override if set, otherwise smart mode
  const chartModes = useMemo(() => ({
    volumeVsDuration: chartOverrides.volumeVsDuration ?? smartMode,
    intensityEvo: chartOverrides.intensityEvo ?? smartMode,
    prTrend: chartOverrides.prTrend ?? smartMode,
  }), [chartOverrides, smartMode]);

  // Simple effect to trigger animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Toggle chart mode (user override)
  const toggleChartMode = (chart: string, mode: TimeFilterMode) => {
    setChartOverrides(prev => ({ ...prev, [chart]: mode }));
  };

  const [topExerciseMode, setTopExerciseMode] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [topExercisesView, setTopExercisesView] = useState<'barh' | 'area'>('barh');
  
  // Chart view type states (defaults keep existing chart types)
  const [prTrendView, setPrTrendView] = useState<'area' | 'bar'>('area');
  const [volumeView, setVolumeView] = useState<'area' | 'bar'>('area');
  const [intensityView, setIntensityView] = useState<'area' | 'stackedBar'>('area');
  const [weekShapeView, setWeekShapeView] = useState<'radar' | 'bar'>('radar');
  
  const [muscleGrouping, setMuscleGrouping] = useState<'groups' | 'muscles'>('groups');
  const [musclePeriod, setMusclePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [muscleTrendView, setMuscleTrendView] = useState<'area' | 'stackedBar'>('stackedBar');
  const [muscleCompQuick, setMuscleCompQuick] = useState<'all'|'7d'|'30d'|'365d'>('all');
  const [compositionGrouping, setCompositionGrouping] = useState<'groups' | 'muscles'>('groups');
  const [weeklySetsView, setWeeklySetsView] = useState<'radar' | 'heatmap'>('heatmap');
  
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);

  const assetsLowerMap = useMemo(() => {
    if (!assetsMap) return null;
    const m = new Map<string, ExerciseAsset>();
    assetsMap.forEach((v, k) => m.set(k.toLowerCase(), v));
    return m;
  }, [assetsMap]);

  useEffect(() => {
    let mounted = true;
    getExerciseAssets().then(m => { if (mounted) setAssetsMap(m); }).catch(() => setAssetsMap(new Map()));
    return () => { mounted = false; };
  }, []);

  // --- MEMOIZED DATA LOGIC ---

  const totalPrs = useMemo(() => exerciseStats.reduce((acc, curr) => acc + curr.prCount, 0), [exerciseStats]);

  const totalSets = useMemo(() => {
    let count = 0;
    for (const s of fullData) {
      if (isWarmupSet(s)) continue;
      count += 1;
    }
    return count;
  }, [fullData]);

  // Dashboard Insights (deltas, streaks, PR info, sparklines) - cached across tab switches
  const dashboardInsights = useMemo(() => {
    return computationCache.getOrCompute(
      'dashboardInsights',
      fullData,
      () => calculateDashboardInsights(fullData, dailyData, effectiveNow),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, dailyData, effectiveNow]);

  // Plateau Detection - cached across tab switches
  const plateauAnalysis = useMemo(() => {
    return computationCache.getOrCompute(
      'plateauAnalysis',
      fullData,
      () => detectPlateaus(fullData, exerciseStats, effectiveNow, weightUnit),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, exerciseStats, effectiveNow, weightUnit]);

  const exerciseStatsMap = useMemo(() => {
    const m = new Map<string, ExerciseStats>();
    for (const s of exerciseStats) m.set(s.name, s);
    return m;
  }, [exerciseStats]);

  const activePlateauExercises = useMemo(() => {
    const activeSince = subDays(effectiveNow, 60);
    return plateauAnalysis.plateauedExercises.filter((p) => {
      const stat = exerciseStatsMap.get(p.exerciseName);
      if (!stat) return false;
      const sessions = summarizeExerciseHistory(stat.history);
      const lastDate = sessions[0]?.date ?? null;
      if (!lastDate) return false;
      if (sessions.length < MIN_SESSIONS_FOR_TREND) return false;
      return lastDate >= activeSince;
    });
  }, [plateauAnalysis.plateauedExercises, exerciseStatsMap, effectiveNow]);
  
  // 1. PRs Over Time Data
  type PrsOverTimePoint = {
    count: number;
    dateFormatted: string;
    tooltipLabel?: string;
    timestamp?: number;
  };

  const prsData = useMemo<PrsOverTimePoint[]>(() => {
    const mode = chartModes.prTrend === 'all' ? 'daily' : chartModes.prTrend;
    return computationCache.getOrCompute(
      `prsOverTime:${mode}:${effectiveNow.getTime()}`,
      fullData,
      () => {
        const data = getPrsOverTime(fullData, mode as any) as PrsOverTimePoint[];

        // Add tooltip labels and mark the current (in-progress) bucket as "to date".
        const now = effectiveNow;
        const currentStart =
          mode === 'weekly'
            ? startOfWeek(now, { weekStartsOn: 1 })
            : mode === 'monthly'
              ? startOfMonth(now)
              : startOfDay(now);

        return data.map((p) => {
          const ts = p.timestamp ?? 0;
          const isCurrent = ts > 0 && ts === currentStart.getTime();
          const baseLabel =
            mode === 'weekly'
              ? `wk of ${formatDayYearContraction(new Date(ts))}`
              : mode === 'monthly'
                ? format(new Date(ts), 'MMMM yyyy')
                : formatDayYearContraction(new Date(ts));

          return {
            ...p,
            tooltipLabel: `${baseLabel}${isCurrent ? ' (to date)' : ''}`,
          };
        });
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, chartModes.prTrend, effectiveNow]);

  const prTrendDelta = useMemo(() => {
    const d = dashboardInsights?.rolling28d;
    return d?.prs ? d.prs : null;
  }, [dashboardInsights]);

  const prTrendDelta7d = useMemo(() => {
    const d = dashboardInsights?.rolling7d;
    return d?.prs ? d.prs : null;
  }, [dashboardInsights]);

  // 2. Intensity Evolution Data
  const intensityData = useMemo(() => {
    const mode = chartModes.intensityEvo === 'all' ? 'daily' : chartModes.intensityEvo;
    return computationCache.getOrCompute(
      `intensityEvolution:${mode}`,
      fullData,
      () => getIntensityEvolution(fullData, mode as any),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, chartModes.intensityEvo]);

  const intensityInsight = useMemo(() => {
    return computationCache.getOrCompute(
      `intensityInsight:${effectiveNow.getTime()}`,
      fullData,
      () => {
        const now = effectiveNow;
        const currStart = startOfDay(subDays(now, 27));
        const prevStart = startOfDay(subDays(currStart, 28));
        const prevEnd = endOfDay(subDays(currStart, 1));

        const countStyles = (start: Date, end: Date) => {
          const counts = { Strength: 0, Hypertrophy: 0, Endurance: 0 };
          for (const s of fullData) {
            if (isWarmupSet(s)) continue;
            const d = s.parsedDate;
            if (!d) continue;
            if (d < start || d > end) continue;
            const reps = s.reps || 8;
            if (reps <= 5) counts.Strength += 1;
            else if (reps <= 12) counts.Hypertrophy += 1;
            else counts.Endurance += 1;
          }
          return counts;
        };

        const last = countStyles(currStart, now);
        const prev = countStyles(prevStart, prevEnd);
        const lastTotal = last.Strength + last.Hypertrophy + last.Endurance;
        const prevTotal = prev.Strength + prev.Hypertrophy + prev.Endurance;
        if (lastTotal <= 0 || prevTotal <= 0) return null;

        const shares = {
          Strength: safePct(last.Strength, lastTotal),
          Hypertrophy: safePct(last.Hypertrophy, lastTotal),
          Endurance: safePct(last.Endurance, lastTotal),
        } as const;
        const prevShares = {
          Strength: safePct(prev.Strength, prevTotal),
          Hypertrophy: safePct(prev.Hypertrophy, prevTotal),
          Endurance: safePct(prev.Endurance, prevTotal),
        } as const;

        const entries = (Object.entries(shares) as Array<[keyof typeof shares, number]>).sort((a, b) => b[1] - a[1]);
        const dominant = entries[0];
        const secondary = entries[1];

        const all = (['Hypertrophy', 'Strength', 'Endurance'] as const).map((k) => {
          const short = k === 'Hypertrophy' ? 'HYP' : k === 'Strength' ? 'STR' : 'END';
          const pct = shares[k];
          const prevPct = prevShares[k];
          const delta = calculateDelta(pct, prevPct);
          return { k, short, pct, prevPct, delta };
        });

        return {
          all,
          dominant: {
            k: dominant[0],
            pct: dominant[1],
            delta: calculateDelta(dominant[1], prevShares[dominant[0]]),
          },
          secondary: {
            k: secondary[0],
            pct: secondary[1],
          },
          period: 'Last 28d',
        };
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, effectiveNow]);

  // 3. Volume Density Data (volume done per set)
  const volumeDurationData = useMemo(() => {
    const mode = chartModes.volumeVsDuration;

    return computationCache.getOrCompute(
      `volumeDurationData:${mode}:${weightUnit}:${effectiveNow.getTime()}`,
      dailyData,
      () => {
        if (mode === 'all') {
          return dailyData.map(d => ({
            ...d,
            dateFormatted: formatDayContraction(new Date(d.timestamp)),
            tooltipLabel: formatDayYearContraction(new Date(d.timestamp)),
            volumePerSet: d.sets > 0 ? getDisplayVolume(d.totalVolume / d.sets, weightUnit, { round: 'int' }) : 0
          }));
        }

        if (mode === 'weekly') {
          const weeklyData: Record<string, { volSum: number, setSum: number, count: number, timestamp: number }> = {};
          dailyData.forEach(d => {
            const weekStart = startOfWeek(new Date(d.timestamp), { weekStartsOn: 1 });
            const weekKey = `wk-${format(weekStart, 'yyyy-MM-dd')}`;
            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = { volSum: 0, setSum: 0, count: 0, timestamp: weekStart.getTime() };
            }
            weeklyData[weekKey].volSum += d.totalVolume;
            weeklyData[weekKey].setSum += d.sets;
            weeklyData[weekKey].count += 1;
          });
          return Object.values(weeklyData).sort((a,b) => a.timestamp - b.timestamp).map(w => {
            const isCurrent = w.timestamp === startOfWeek(effectiveNow, { weekStartsOn: 1 }).getTime();
            const totalVol = w.volSum;
            const totalSets = w.setSum;
            const volumePerSetKg = totalSets > 0 ? totalVol / totalSets : 0;
            return {
              timestamp: w.timestamp,
              dateFormatted: formatWeekContraction(new Date(w.timestamp)),
              tooltipLabel: `wk of ${formatDayYearContraction(new Date(w.timestamp))}${isCurrent ? ' (to date)' : ''}`,
              totalVolume: getDisplayVolume(totalVol, weightUnit, { round: 'int' }),
              sets: totalSets,
              volumePerSet: getDisplayVolume(volumePerSetKg, weightUnit, { round: 'int' })
            };
          });
        }

        {
          // Manual aggregation for monthly view
          const monthlyData: Record<string, { volSum: number, setSum: number, count: number, timestamp: number }> = {};
          dailyData.forEach(d => {
            const monthKey = format(new Date(d.timestamp), 'yyyy-MM');
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { volSum: 0, setSum: 0, count: 0, timestamp: startOfMonth(new Date(d.timestamp)).getTime() };
            }
            monthlyData[monthKey].volSum += d.totalVolume;
            monthlyData[monthKey].setSum += d.sets;
            monthlyData[monthKey].count += 1;
          });
          return Object.values(monthlyData).sort((a,b) => a.timestamp - b.timestamp).map(m => {
            const isCurrent = m.timestamp === startOfMonth(effectiveNow).getTime();
            const totalVol = m.volSum;
            const totalSets = m.setSum;
            return {
              timestamp: m.timestamp,
              dateFormatted: formatMonthYearContraction(new Date(m.timestamp)),
              tooltipLabel: `${format(new Date(m.timestamp), 'MMMM yyyy')}${isCurrent ? ' (to date)' : ''}`,
              totalVolume: getDisplayVolume(totalVol, weightUnit, { round: 'int' }),
              sets: totalSets,
              volumePerSet: totalSets > 0 ? getDisplayVolume(totalVol / totalSets, weightUnit, { round: 'int' }) : 0
            };
          });
        }
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [dailyData, chartModes.volumeVsDuration, weightUnit, effectiveNow]);

  const volumeDensityTrend = useMemo(() => {
    const d = dashboardInsights?.rolling28d;
    if (!d) return null;
    if (!d.eligible || !d.volume || !d.sets) return null;
    const curr = d.current.totalSets > 0 ? (d.current.totalVolume / d.current.totalSets) : 0;
    const prev = d.previous.totalSets > 0 ? (d.previous.totalVolume / d.previous.totalSets) : 0;
    const delta = calculateDelta(curr, prev);
    return { label: 'Last 28d', delta, delta4: null };
  }, [dashboardInsights]);

  // Static Data
  const weekShapeData = useMemo(() => getDayOfWeekShape(dailyData), [dailyData]);
  const topExercisesData = useMemo(() => getTopExercisesRadial(exerciseStats).slice(0, 4), [exerciseStats]);

  const weeklyRhythmInsight = useMemo(() => {
    if (!weekShapeData || weekShapeData.length === 0) return null;
    const total = weekShapeData.reduce((acc, d) => acc + (d.A || 0), 0);
    if (total <= 0) return null;
    const sorted = [...weekShapeData].sort((a, b) => (b.A || 0) - (a.A || 0));
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const topShare = safePct(top.A || 0, total);
    const bottomShare = safePct(bottom.A || 0, total);
    const spread = topShare - bottomShare;
    const rhythmLabel = spread <= 12 ? "It's even" : spread <= 22 ? "It's somewhat spiky" : "It's spiky";
    const rhythmTone = spread <= 12 ? 'good' : spread <= 22 ? 'neutral' : 'bad';
    return {
      total,
      top: { subject: top.subject, share: topShare },
      bottom: { subject: bottom.subject, share: bottomShare },
      spread,
      rhythmLabel,
      rhythmTone,
    };
  }, [weekShapeData]);
  
  // Data for horizontal bars (simple) with time filters: All, Monthly (30d), Weekly (7d)
  const topExercisesBarData = useMemo(() => {
    return computationCache.getOrCompute(
      `topExercisesBarData:${topExerciseMode}:${effectiveNow.getTime()}`,
      fullData,
      () => {
        const now = effectiveNow;
        let start: Date | null = null;
        if (topExerciseMode === 'monthly') start = subDays(now, 30);
        else if (topExerciseMode === 'weekly') start = subDays(now, 7);
        // 'all' => start stays null (use all)
        const counts = new Map<string, number>();
        for (const s of fullData) {
          if (isWarmupSet(s)) continue;
          const d = s.parsedDate;
          if (!d) continue;
          if (start && d < start) continue;
          if (d > now) continue;
          const name = s.exercise_title || 'Unknown';
          counts.set(name, (counts.get(name) || 0) + 1);
        }
        const arr = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
        arr.sort((a,b) => b.count - a.count);
        return arr.slice(0, 4);
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, topExerciseMode, effectiveNow]);

  const topExercisesInsight = useMemo(() => {
    const barKey = topExercisesBarData.map((x) => `${x.name}:${x.count}`).join('|');
    return computationCache.getOrCompute(
      `topExercisesInsight:${topExerciseMode}:${effectiveNow.getTime()}:${barKey}`,
      fullData,
      () => {
        const now = effectiveNow;
        const getSetCountBetween = (start: Date | null, end: Date) => {
          let count = 0;
          for (const s of fullData) {
            if (isWarmupSet(s)) continue;
            const d = s.parsedDate;
            if (!d) continue;
            if (d > end) continue;
            if (start && d < start) continue;
            count += 1;
          }
          return count;
        };

        const getWorkoutCountBetween = (start: Date | null, end: Date) => {
          const sessions = new Set<string>();
          for (const s of fullData) {
            if (isWarmupSet(s)) continue;
            const d = s.parsedDate;
            if (!d) continue;
            if (d > end) continue;
            if (start && d < start) continue;
            const key = getSessionKey(s);
            if (!key) continue;
            sessions.add(key);
          }
          return sessions.size;
        };

        const sumShown = topExercisesBarData.reduce((acc, x) => acc + (x.count || 0), 0);
        const top = topExercisesBarData[0];
        const topShare = sumShown > 0 && top ? safePct(top.count || 0, sumShown) : 0;

        if (topExerciseMode === 'all') {
          if (!top) return { windowLabel: 'All time', delta: null as any, top, topShare };
          return { windowLabel: 'All time', delta: null as any, top, topShare };
        }

        const windowDays = topExerciseMode === 'weekly' ? 7 : 28;
        const start = subDays(now, windowDays);
        const prevStart = subDays(now, windowDays * 2);
        const prevEnd = subDays(now, windowDays);

        const currentSets = getSetCountBetween(start, now);
        const prevSets = getSetCountBetween(prevStart, prevEnd);
        const currentWorkouts = getWorkoutCountBetween(start, now);
        const prevWorkouts = getWorkoutCountBetween(prevStart, prevEnd);

        const windowLabel = topExerciseMode === 'weekly' ? '7d' : '28d';
        const eligible = currentWorkouts >= 2 && prevWorkouts >= 2;
        const delta = eligible ? calculateDelta(currentSets, prevSets) : null;
        return { windowLabel, delta, top, topShare, eligible };
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, topExerciseMode, topExercisesBarData, effectiveNow]);

  // Time series for area view of Top Exercises
  const topExercisesOverTimeData = useMemo(() => {
    const names = (topExercisesBarData.length > 0 ? topExercisesBarData : topExercisesData).map(e => e.name);
    const mode = topExerciseMode === 'weekly' ? 'weekly' : 'monthly';
    const namesKey = names.join('|');
    return computationCache.getOrCompute(
      `topExercisesOverTime:${mode}:${namesKey}`,
      fullData,
      () => getTopExercisesOverTime(fullData, names, mode as any),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, topExercisesBarData, topExercisesData, topExerciseMode]);

  // Keys for area stacking in Most Frequent Exercises
  const topExerciseNames = useMemo(() => (topExercisesBarData.length > 0 ? topExercisesBarData : topExercisesData).map(e => e.name), [topExercisesBarData, topExercisesData]);

  // 6. Muscle Volume (sets-based) unified data - cached for performance
  const muscleSeriesGroups = useMemo(() => {
    if (!assetsMap) return { data: [], keys: [] as string[] } as { data: any[]; keys: string[] };
    return computationCache.getOrCompute(
      `muscleSeriesGroups:${musclePeriod}`,
      fullData,
      () => {
        const series = getMuscleVolumeTimeSeries(fullData, assetsMap, musclePeriod);
        return musclePeriod === 'weekly' ? bucketRollingWeeklySeriesToWeeks(series) : series;
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, assetsMap, musclePeriod]);

  const muscleSeriesMuscles = useMemo(() => {
    if (!assetsMap) return { data: [], keys: [] as string[] } as { data: any[]; keys: string[] };
    return computationCache.getOrCompute(
      `muscleSeriesMuscles:${musclePeriod}`,
      fullData,
      () => {
        const series = getMuscleVolumeTimeSeriesDetailed(fullData, assetsMap, musclePeriod);
        return musclePeriod === 'weekly' ? bucketRollingWeeklySeriesToWeeks(series) : series;
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, assetsMap, musclePeriod]);

  const trendData = muscleGrouping === 'groups' ? muscleSeriesGroups.data : muscleSeriesMuscles.data;
  const trendKeys = useMemo(() => {
    const totals: Record<string, number> = {};
    const keys = muscleGrouping === 'groups' ? muscleSeriesGroups.keys : muscleSeriesMuscles.keys;
    trendData.forEach(row => {
      keys.forEach(k => { totals[k] = (totals[k] || 0) + (row[k] || 0); });
    });
    return [...keys].sort((a,b) => (totals[b]||0) - (totals[a]||0)).slice(0, 6);
  }, [trendData, muscleGrouping, muscleSeriesGroups.keys, muscleSeriesMuscles.keys]);

  const muscleTrendInsight = useMemo(() => {
    if (!assetsMap || !assetsLowerMap) return null;
    if (!trendKeys || trendKeys.length === 0) return null;

    const cacheKey = `muscleTrendInsight:${muscleGrouping}:${trendKeys.join('|')}:${effectiveNow.getTime()}:${assetsMap.size}`;
    return computationCache.getOrCompute(
      cacheKey,
      fullData,
      () => {
        const now = effectiveNow;
        const currStart = startOfDay(subDays(now, 27));
        const prevStart = startOfDay(subDays(currStart, 28));
        const prevEnd = endOfDay(subDays(currStart, 1));

        const getWorkoutCountBetween = (start: Date, end: Date) => {
          const sessions = new Set<string>();
          for (const s of fullData) {
            if (isWarmupSet(s)) continue;
            const d = s.parsedDate;
            if (!d) continue;
            if (d < start || d > end) continue;
            const key = getSessionKey(s);
            if (!key) continue;
            sessions.add(key);
          }
          return sessions.size;
        };

        const minWorkoutsRequired = 2;
        const currWorkouts = getWorkoutCountBetween(currStart, now);
        const prevWorkouts = getWorkoutCountBetween(prevStart, prevEnd);
        if (currWorkouts < minWorkoutsRequired || prevWorkouts < minWorkoutsRequired) return null;

        const useGroups = muscleGrouping === 'groups';

        const computeTotals = (start: Date, end: Date) => {
          const totals = new Map<string, number>();
          const add = (k: string, v: number) => totals.set(k, (totals.get(k) || 0) + v);

          for (const s of fullData) {
            if (isWarmupSet(s)) continue;
            const d = s.parsedDate;
            if (!d) continue;
            if (d < start || d > end) continue;
            const name = s.exercise_title || '';
            const asset = assetsMap.get(name) || assetsLowerMap.get(name.toLowerCase());
            if (!asset) continue;

            const contributions = getMuscleContributionsFromAsset(asset, useGroups);
            for (const c of contributions) {
              add(c.muscle, c.sets);
            }
          }

          return totals;
        };

        const currTotals = computeTotals(currStart, now);
        const prevTotals = computeTotals(prevStart, prevEnd);

        const totalLast = trendKeys.reduce((acc, k) => acc + (currTotals.get(k) || 0), 0);
        const totalPrev = trendKeys.reduce((acc, k) => acc + (prevTotals.get(k) || 0), 0);
        const totalDelta = calculateDelta(totalLast, totalPrev);
        const biggestMover = trendKeys
          .map((k) => ({ k, d: (currTotals.get(k) || 0) - (prevTotals.get(k) || 0) }))
          .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];

        return { label: 'Last 28d', totalDelta, biggestMover };
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [assetsMap, assetsLowerMap, fullData, effectiveNow, trendKeys, muscleGrouping]);

  const muscleVsLabel = 'vs prev mo';

  const weeklySetsDashboard = useMemo(() => {
    if (!assetsMap) {
      return {
        composition: [] as { subject: string; value: number }[],
        heatmap: { volumes: new Map<string, number>(), maxVolume: 1 },
      };
    }
    const cacheKey = `weeklySetsDashboard:${muscleCompQuick}:${compositionGrouping}`;
    return computationCache.getOrCompute(
      cacheKey,
      fullData,
      () => {
        const computed = computeWeeklySetsDashboardData(
          fullData,
          assetsMap,
          effectiveNow,
          muscleCompQuick,
          compositionGrouping
        );
        return { composition: computed.composition, heatmap: computed.heatmap };
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [assetsMap, fullData, effectiveNow, muscleCompQuick, compositionGrouping]);

  const compositionQuickData = weeklySetsDashboard.composition;


  // Use shared constants for Recharts styles
  const TooltipStyle = CHART_TOOLTIP_STYLE;
  const PIE_COLORS = useMemo(() => [...CHART_COLORS], []);

  return (
    <>
      <style>{ANIMATION_KEYFRAMES}</style>
      <div className={`space-y-2 pb-12 transition-opacity duration-700 ease-out ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      
        <div className="hidden sm:contents">
          <ViewHeader
            leftStats={[
              { icon: Clock, value: totalWorkouts, label: 'Workouts' },
            ]}
            rightStats={[
              { icon: Dumbbell, value: totalSets, label: 'Sets' },
            ]}
            filtersSlot={filtersSlot}
            sticky={stickyHeader}
          />
        </div>

      {/* INSIGHTS PANEL - KPIs with Deltas & Sparklines */}
      <InsightsPanel 
        insights={dashboardInsights}
        totalWorkouts={totalWorkouts}
        totalSets={totalSets}
        totalPRs={totalPrs}
      />

      {/* RECENT PRs TIMELINE */}
      <RecentPRsPanel prInsights={dashboardInsights.prInsights} weightUnit={weightUnit} now={effectiveNow} onExerciseClick={onExerciseClick} />

      {/* PLATEAU ALERTS */}
      {activePlateauExercises.length > 0 && (
        <div className="bg-black/70 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-amber-400">⚠️ Plateaus</span>
           
          </div>
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
              {activePlateauExercises.map((p) => (
                <div key={p.exerciseName} className="min-w-[280px] flex-shrink-0">
                  <PlateauAlert 
                    exerciseName={p.exerciseName}
                    suggestion={p.suggestion}
                    asset={assetsMap?.get(p.exerciseName) || assetsLowerMap?.get(p.exerciseName.toLowerCase())}
                    onClick={() => onExerciseClick?.(p.exerciseName)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. HEATMAP (Full Width) */}
      <ActivityHeatmap
        dailyData={dailyData}
        streakInfo={dashboardInsights.streakInfo}
        consistencySparkline={dashboardInsights.consistencySparkline}
        onDayClick={onDayClick}
        now={effectiveNow}
      />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2">
        
          {/* 2. PR TRENDS (Area/Bar) */}
          <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
            <PrTrendCard
              isMounted={isMounted}
              mode={chartModes.prTrend}
              onToggle={(m) => toggleChartMode('prTrend', m)}
              view={prTrendView}
              onViewToggle={setPrTrendView}
              prsData={prsData}
              tooltipStyle={TooltipStyle as any}
              prTrendDelta={prTrendDelta}
              prTrendDelta7d={prTrendDelta7d}
            />
          </Suspense>

        {/* 3. WEEKLY SETS (Radar/Heatmap) */}
        <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
          <WeeklySetsCard
            isMounted={isMounted}
            weeklySetsView={weeklySetsView}
            setWeeklySetsView={setWeeklySetsView}
            compositionGrouping={compositionGrouping}
            setCompositionGrouping={setCompositionGrouping}
            muscleCompQuick={muscleCompQuick}
            setMuscleCompQuick={setMuscleCompQuick}
            compositionQuickData={compositionQuickData}
            heatmap={weeklySetsDashboard.heatmap}
            tooltipStyle={TooltipStyle as any}
            onMuscleClick={onMuscleClick}
            bodyMapGender={bodyMapGender}
          />
        </Suspense>
      </div>

      {/* 4. INTENSITY EVOLUTION (Area/Stacked Bar) */}
      <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
        <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
          <IntensityEvolutionCard
            isMounted={isMounted}
            mode={chartModes.intensityEvo}
            onToggle={(m) => toggleChartMode('intensityEvo', m)}
            view={intensityView}
            onViewToggle={setIntensityView}
            intensityData={intensityData}
            intensityInsight={intensityInsight}
            tooltipStyle={TooltipStyle as any}
          />
        </Suspense>
      </LazyRender>

        {/* MUSCLE ANALYSIS (Unified) */}
        <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
          <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
            <MuscleTrendCard
              isMounted={isMounted}
              muscleGrouping={muscleGrouping}
              setMuscleGrouping={setMuscleGrouping}
              musclePeriod={musclePeriod}
              setMusclePeriod={setMusclePeriod}
              muscleTrendView={muscleTrendView}
              setMuscleTrendView={setMuscleTrendView}
              trendData={trendData}
              trendKeys={trendKeys}
              muscleTrendInsight={muscleTrendInsight as any}
              tooltipStyle={TooltipStyle as any}
              muscleVsLabel={muscleVsLabel}
            />
          </Suspense>
        </LazyRender>

      {/* 5. Weekly Rhythm + Muscle Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2">
        
        {/* Weekly Rhythm: Radar/Bar */}
        <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
          <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
            <WeeklyRhythmCard
              isMounted={isMounted}
              view={weekShapeView}
              onViewToggle={setWeekShapeView}
              weekShapeData={weekShapeData}
              weeklyRhythmInsight={weeklyRhythmInsight as any}
              tooltipStyle={TooltipStyle as any}
            />
          </Suspense>
        </LazyRender>

        {/* Volume Density (Area/Bar) */}
        <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
          <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
            <VolumeDensityCard
              isMounted={isMounted}
              mode={chartModes.volumeVsDuration}
              onToggle={(m) => toggleChartMode('volumeVsDuration', m)}
              view={volumeView}
              onViewToggle={setVolumeView}
              weightUnit={weightUnit}
              volumeDurationData={volumeDurationData}
              volumeDensityTrend={volumeDensityTrend as any}
              tooltipStyle={TooltipStyle as any}
            />
          </Suspense>
        </LazyRender>
      </div>

      {/* 6. Top Exercises (Full Width, Bars/Area Views) */}
      <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[360px]" />}>
        <Suspense fallback={<ChartSkeleton className="min-h-[360px]" />}>
          <TopExercisesCard
            isMounted={isMounted}
            topExerciseMode={topExerciseMode}
            setTopExerciseMode={setTopExerciseMode}
            topExercisesView={topExercisesView}
            setTopExercisesView={setTopExercisesView}
            topExercisesBarData={topExercisesBarData}
            topExercisesOverTimeData={topExercisesOverTimeData}
            topExerciseNames={topExerciseNames}
            topExercisesInsight={topExercisesInsight}
            pieColors={PIE_COLORS}
            tooltipStyle={TooltipStyle as any}
            onExerciseClick={onExerciseClick}
            assetsMap={assetsMap}
            assetsLowerMap={assetsLowerMap}
          />
        </Suspense>
      </LazyRender>

      </div>
    </>
  );
};