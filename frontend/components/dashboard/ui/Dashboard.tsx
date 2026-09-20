import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { DailySummary, ExerciseStats, WorkoutSet } from '../../../types';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import { getSmartFilterMode, TimeFilterMode, WeightUnit } from '../../../utils/storage/localStorage';
import { CHART_TOOLTIP_STYLE, CHART_COLORS, ANIMATION_KEYFRAMES } from '../../../utils/ui/uiConstants';
import { getEffectiveNowFromWorkoutData, getSessionKey } from '../../../utils/date/dateUtils';
import { getExerciseAssets, ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { calculateDashboardInsights } from '../../../utils/analysis/insights';
import { buildDashboardSummary } from '../../../utils/analysis/dashboardSummary/dashboardSummary';
import { computationCache } from '../../../utils/storage/computationCache';
import { dashboardCacheKeys } from '../../../utils/storage/cacheKeys';
import { prefetchExerciseData, schedulePrefetch } from '../../../utils/prefetch/prefetchStrategies';
import { isWarmupSet, getWeeklyVolumeSetWeight } from '../../../utils/analysis/classification';
import { useDashboardIntensityEvolution } from '../hooks/useDashboardIntensityEvolution';
import { useDashboardMuscleTrend } from '../hooks/useDashboardMuscleTrend';
import { useDashboardPrTrend } from '../hooks/useDashboardPrTrend';
import { useDashboardTopExercises } from '../hooks/useDashboardTopExercises';
import { useDashboardVolumeDensity } from '../hooks/useDashboardVolumeDensity';
import { useDashboardWeeklySetsDashboard } from '../hooks/useDashboardWeeklySetsDashboard';
import { DashboardLayout } from './DashboardLayout';
import { useDashboardPlateaus } from '../hooks/useDashboardPlateaus';
import { useDashboardInjuryRisk } from '../hooks/useDashboardInjuryRisk';
import { useDashboardStrengthBalance } from '../hooks/useDashboardStrengthBalance';
import { useWeeklyRhythm } from '../hooks/useWeeklyRhythm';
import { useTrainingLevel } from '../../../hooks/app/useTrainingLevel';
import { useTrainingTimeline } from '../../../hooks/app/useTrainingTimeline';
import { calculateHypertrophyScoresWithExerciseTrends } from '../../../utils/muscle/hypertrophy/hypertrophyScore';
import { analyzeExerciseTrendCore } from '../../../utils/analysis/exerciseTrend';
import type { ExerciseTrendCoreResult } from '../../../utils/analysis/exerciseTrend/exerciseTrendCore';
import { toMuscleVolumeMap } from '../../../utils/muscle/volume/muscleVolumeUtils';
import { computeWeeklySetsDashboardData } from '../../../utils/muscle/analytics/dashboardWeeklySets';

interface DashboardProps {
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  parsedData: WorkoutSet[];
  filteredData: WorkoutSet[];
  filterCacheKey: string;
  onDayClick?: (date: Date) => void;
  onMuscleClick?: (
    muscleId: string,
    weeklySetsWindow: 'all' | '7d' | '30d' | '365d'
  ) => void;
  onExerciseClick?: (exerciseName: string) => void;
  filtersSlot?: React.ReactNode;
  stickyHeader?: boolean;
  bodyMapGender?: BodyMapGender;
  weightUnit?: WeightUnit;
  now?: Date;
  secondarySetMultiplier?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dailyData,
  exerciseStats,
  parsedData,
  filteredData,
  filterCacheKey,
  onDayClick,
  onMuscleClick,
  onExerciseClick,
  filtersSlot,
  stickyHeader = false,
  bodyMapGender = 'male' as BodyMapGender,
  weightUnit = 'kg' as WeightUnit,
  now,
  secondarySetMultiplier = 0.5,
}) => {
  const effectiveNow = useMemo(() => now ?? getEffectiveNowFromWorkoutData(parsedData), [now, parsedData]);

  // For hypertrophy: use filteredData's max date so calendar filter is respected
  const hypertrophyEffectiveNow = useMemo(() => {
    if (now) return now;
    if (!filteredData.length) return effectiveNow;
    let max = new Date(0);
    for (const s of filteredData) {
      if (s.parsedDate && s.parsedDate > max) max = s.parsedDate;
    }
    return max.getTime() > 0 ? max : effectiveNow;
  }, [filteredData, effectiveNow, now]);

  const { trainingLevel } = useTrainingLevel(parsedData, effectiveNow);

  const timelineProgress = useTrainingTimeline(parsedData, effectiveNow);

  const spanDays = useMemo(() => {
    if (!filteredData.length) return 0;
    // Loop min/max: spread over a large dates array risks arg-limit RangeError
    // and forces a full argument-array alloc on every filter change.
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const s of filteredData) {
      const t = s.parsedDate?.getTime() || 0;
      if (t <= 0) continue;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    if (max === 0) return 0;
    return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
  }, [filteredData]);

  const smartMode = useMemo(() => getSmartFilterMode(spanDays), [spanDays]);

  const allAggregationMode = useMemo(() => {
    return smartMode === 'all' ? 'daily' : smartMode;
  }, [smartMode]);

  const totalWorkouts = useMemo(() => {
    const sessions = new Set<string>();
    for (const s of filteredData) {
      if (isWarmupSet(s)) continue;
      const key = getSessionKey(s);
      if (!key) continue;
      sessions.add(key);
    }
    return sessions.size;
  }, [filteredData]);

  const [chartOverrides, setChartOverrides] = useState<Record<string, TimeFilterMode | null>>({
    volumeVsDuration: null,
    intensityEvo: null,
    prTrend: null,
  });

  const chartModes = useMemo(() => ({
    volumeVsDuration: chartOverrides.volumeVsDuration ?? 'monthly',
    intensityEvo: chartOverrides.intensityEvo ?? 'monthly',
    prTrend: chartOverrides.prTrend ?? 'monthly',
  }), [chartOverrides]);


  const toggleChartMode = (chart: string, mode: TimeFilterMode) => {
    setChartOverrides((prev) => ({ ...prev, [chart]: mode }));
  };

  const [topExerciseMode, setTopExerciseMode] = useState<'all' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [topExercisesView, setTopExercisesView] = useState<'barh' | 'area'>('barh');

  const [prTrendView, setPrTrendView] = useState<'area' | 'bar'>('area');
  const [volumeView, setVolumeView] = useState<'area' | 'bar'>('area');
  const [weekShapeView, setWeekShapeView] = useState<'radar' | 'bar'>('radar');

  const [muscleGrouping, setMuscleGrouping] = useState<'groups' | 'muscles'>('groups');
  const [musclePeriod, setMusclePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('monthly');
  const [muscleTrendView, setMuscleTrendView] = useState<'area' | 'stackedBar'>('stackedBar');
  const [muscleCompQuick, setMuscleCompQuick] = useState<'all' | '7d' | '30d' | '365d'>('30d');
  const [weeklySetsView, setWeeklySetsView] = useState<'radar' | 'heatmap'>('heatmap');
  const [hypertrophyPeriod, setHypertrophyPeriod] = useState<'7d' | '30d'>('7d');
  // Always use 'muscles' grouping for weekly sets (group view toggle removed from UI)
  const compositionGrouping = 'muscles' as const;

  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);

  const assetsLowerMap = useMemo(() => {
    if (!assetsMap) return null;
    const m = new Map<string, ExerciseAsset>();
    assetsMap.forEach((v, k) => m.set(k.toLowerCase(), v));
    return m;
  }, [assetsMap]);

  useEffect(() => {
    let mounted = true;
    getExerciseAssets().then((m) => { if (mounted) setAssetsMap(m); }).catch(() => setAssetsMap(new Map()));
    return () => { mounted = false; };
  }, []);

  const totalPrs = useMemo(() => exerciseStats.reduce((acc, curr) => acc + curr.prCount, 0), [exerciseStats]);

  const exerciseTrendResults = useMemo(() => {
    const map = new Map<string, ExerciseTrendCoreResult>();
    for (const stat of exerciseStats) {
      map.set(stat.name, analyzeExerciseTrendCore(stat, { trendMode: 'reactive' }));
    }
    return map;
  }, [exerciseStats]);

  const totalSets = useMemo(() => {
    let count = 0;
    for (const s of filteredData) {
      count += getWeeklyVolumeSetWeight(s);
    }
    return count;
  }, [filteredData]);

  const dashboardInsights = useMemo(() => {
    const cacheKey = dashboardCacheKeys.dashboardInsights(filterCacheKey);
    return computationCache.getOrCompute(
      cacheKey,
      filteredData,
      () => calculateDashboardInsights(filteredData, dailyData, effectiveNow),
      { ttl: 10 * 60 * 1000 }
    );
  }, [filteredData, dailyData, effectiveNow, filterCacheKey]);

  useEffect(() => {
    if (filteredData.length === 0) return;

    // Idle-gated so chunk fetch + cache warming never contends with
    // active scrolling/filtering (was a fixed 3s timer on main thread).
    const cancel = schedulePrefetch(() => {
      prefetchExerciseData(filterCacheKey, filteredData);
    });

    return cancel;
  }, [filterCacheKey, filteredData]);

  const { activePlateauExercises } = useDashboardPlateaus({
    fullData: filteredData,
    exerciseStats,
    weightUnit,
    effectiveNow,
    filterCacheKey,
  });

  const { injuryRiskData } = useDashboardInjuryRisk({
    fullData: filteredData,
    assetsMap,
    assetsLowerMap,
    effectiveNow,
    filterCacheKey,
  });

  const { strengthBalanceItems, strengthBalanceTldr, strengthBalanceResults } = useDashboardStrengthBalance({
    filteredData,
    assetsMap,
    effectiveNow,
    filterCacheKey,
  });

  const sbCardRef = useRef<HTMLDivElement | null>(null);
  const sbScrollTimers = useRef<number[]>([]);

  const handleStrengthBalanceDetails = useCallback(() => {
    // The card mounts lazily (skeleton first), so its height shifts after
    // the first scroll. Retry a few times so the card header lands at the
    // top of the viewport once the real content has rendered.
    const scroll = () => sbCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    for (const delay of [50, 300, 700]) {
      sbScrollTimers.current.push(window.setTimeout(scroll, delay));
    }
  }, []);

  useEffect(() => {
    const timers = sbScrollTimers.current;
    return () => {
      for (const t of timers) window.clearTimeout(t);
      sbScrollTimers.current = [];
    };
  }, []);

  const { prsData, prTrendDelta, prTrendDelta7d } = useDashboardPrTrend({
    fullData: filteredData,
    rangeMode: chartModes.prTrend as any,
    allAggregationMode: allAggregationMode as any,
    effectiveNow,
    dashboardInsights,
    filterCacheKey,
  });

  const { intensityData, intensityInsight } = useDashboardIntensityEvolution({
    fullData: filteredData,
    rangeMode: chartModes.intensityEvo as any,
    allAggregationMode: allAggregationMode as any,
    effectiveNow,
    filterCacheKey,
  });

  const { volumeDurationData, volumeDensityTrend } = useDashboardVolumeDensity({
    dailyData,
    rangeMode: chartModes.volumeVsDuration as any,
    smartMode: smartMode as any,
    weightUnit,
    effectiveNow,
    dashboardInsights,
    filterCacheKey,
  });

  const { weekShapeData, weeklyRhythmInsight } = useWeeklyRhythm(dailyData);

  const { topExercisesBarData, topExercisesOverTimeData, topExerciseNames, topExercisesInsight } = useDashboardTopExercises({
    fullData: filteredData,
    exerciseStats,
    topExerciseMode: topExerciseMode as any,
    allAggregationMode: allAggregationMode as any,
    effectiveNow,
    filterCacheKey,
  });

  const { trendData, trendKeys, muscleTrendInsight, muscleVsLabel } = useDashboardMuscleTrend({
    fullData: filteredData,
    assetsMap,
    assetsLowerMap,
    muscleGrouping,
    musclePeriod,
    effectiveNow,
    filterCacheKey,
    secondarySetMultiplier,
  });

  const { weeklySetsDashboard } = useDashboardWeeklySetsDashboard({
    assetsMap,
    fullData: filteredData,
    effectiveNow,
    muscleCompQuick,
    compositionGrouping,
    filterCacheKey,
    secondarySetMultiplier,
  });

  // Fixed 30d window for the KPI row so Volume and Weekly Sets always share one period
  const { weeklySetsDashboard: weeklySetsDashboard30d } = useDashboardWeeklySetsDashboard({
    assetsMap,
    fullData: filteredData,
    effectiveNow,
    muscleCompQuick: '30d',
    compositionGrouping,
    filterCacheKey,
    secondarySetMultiplier,
  });

  const hypertrophyWindowStart = useMemo(() => {
    const days = hypertrophyPeriod === '7d' ? 7 : 30;
    return new Date(hypertrophyEffectiveNow.getTime() - days * 24 * 60 * 60 * 1000);
  }, [hypertrophyPeriod, hypertrophyEffectiveNow]);

  const hypertrophyWindowStart30d = useMemo(() =>
    new Date(hypertrophyEffectiveNow.getTime() - 30 * 24 * 60 * 60 * 1000),
    [hypertrophyEffectiveNow]
  );

  // 30d base is computed once through cache; the period-specific map reuses
  // it when windows coincide instead of running a second full scan.
  // INVARIANT: this key space holds RAW WeeklySetsDashboardResult entries
  // (shared with the weekly-sets hook + warmup). The Map conversion happens
  // AFTER the lookup, every time — never store the mapped value here, or
  // readers expecting the raw shape crash (and vice versa). parsedData as
  // the data arg keeps same-length content edits invalidating correctly.
  const hypertrophyMuscleRatesMap30d = useMemo(() => {
    if (!assetsMap) return null;
    const result = computationCache.getOrCompute(
      dashboardCacheKeys.weeklySets(filterCacheKey, '30d', 'muscles', secondarySetMultiplier),
      parsedData,
      () => computeWeeklySetsDashboardData(
        parsedData,
        assetsMap,
        hypertrophyEffectiveNow,
        '30d',
        'muscles',
        secondarySetMultiplier
      ),
      { ttl: 10 * 60 * 1000 }
    );
    return toMuscleVolumeMap(result.heatmap.volumes);
  }, [assetsMap, parsedData, hypertrophyEffectiveNow, secondarySetMultiplier, filterCacheKey]);

  const hypertrophyMuscleRatesMap = useMemo(() => {
    if (!assetsMap) return null;
    if (hypertrophyPeriod === '30d') return hypertrophyMuscleRatesMap30d;
    const result = computationCache.getOrCompute(
      dashboardCacheKeys.weeklySets(filterCacheKey, hypertrophyPeriod, 'muscles', secondarySetMultiplier),
      parsedData,
      () => computeWeeklySetsDashboardData(
        parsedData,
        assetsMap,
        hypertrophyEffectiveNow,
        hypertrophyPeriod,
        'muscles',
        secondarySetMultiplier
      ),
      { ttl: 10 * 60 * 1000 }
    );
    return toMuscleVolumeMap(result.heatmap.volumes);
  }, [assetsMap, parsedData, hypertrophyEffectiveNow, hypertrophyPeriod, secondarySetMultiplier, filterCacheKey, hypertrophyMuscleRatesMap30d]);

  const hypertrophyData = useMemo(() => {
    if (!parsedData.length || !assetsMap) return [];
    return calculateHypertrophyScoresWithExerciseTrends(
      exerciseStats,
      hypertrophyMuscleRatesMap,
      assetsMap,
      trainingLevel,
      hypertrophyPeriod,
      hypertrophyEffectiveNow,
      parsedData,
      hypertrophyWindowStart,
      exerciseTrendResults
    );
  }, [parsedData, assetsMap, exerciseStats, hypertrophyEffectiveNow, trainingLevel, hypertrophyPeriod, hypertrophyMuscleRatesMap, hypertrophyWindowStart, exerciseTrendResults]);

  const hypertrophyData30d = useMemo(() => {
    if (!parsedData.length || !assetsMap || !hypertrophyMuscleRatesMap30d) return [];
    return calculateHypertrophyScoresWithExerciseTrends(
      exerciseStats,
      hypertrophyMuscleRatesMap30d,
      assetsMap,
      trainingLevel,
      '30d',
      hypertrophyEffectiveNow,
      parsedData,
      hypertrophyWindowStart30d,
      exerciseTrendResults
    );
  }, [parsedData, assetsMap, exerciseStats, hypertrophyEffectiveNow, trainingLevel, hypertrophyMuscleRatesMap30d, hypertrophyWindowStart30d, exerciseTrendResults]);

  const dashboardSummary = useMemo(() => buildDashboardSummary({
    dashboardInsights,
    filteredData,
    dailyData,
    exerciseStats,
    activePlateauExercises,
    totalWorkouts,
    totalSets,
    totalPRs: totalPrs,
    effectiveNow,
    weightUnit,
    filterCacheKey,
    exerciseTrendResults,
    strengthBalanceItems,
    strengthBalanceTldr,
  }), [
    dashboardInsights,
    filteredData,
    dailyData,
    exerciseStats,
    activePlateauExercises,
    totalWorkouts,
    totalSets,
    totalPrs,
    effectiveNow,
    weightUnit,
    filterCacheKey,
    exerciseTrendResults,
    strengthBalanceItems,
    strengthBalanceTldr,
  ]);

  const TooltipStyle = CHART_TOOLTIP_STYLE;
  const PIE_COLORS = useMemo(() => [...CHART_COLORS], []);

  return (
    <DashboardLayout
      filtersSlot={filtersSlot}
      stickyHeader={stickyHeader}
      totalWorkouts={totalWorkouts}
      totalSets={totalSets}
      totalPrs={totalPrs}
      dashboardInsights={dashboardInsights}
      dashboardSummary={dashboardSummary}
      onDayClick={onDayClick}
      onMuscleClick={onMuscleClick}
      onExerciseClick={onExerciseClick}
      activePlateauExercises={activePlateauExercises}
      assetsMap={assetsMap}
      assetsLowerMap={assetsLowerMap}
      weightUnit={weightUnit}
      dailyData={dailyData}
      effectiveNow={effectiveNow}
      trainingLevel={trainingLevel}
      timelineProgress={timelineProgress}
      chartModes={chartModes}
      toggleChartMode={toggleChartMode}
      prTrendView={prTrendView}
      setPrTrendView={setPrTrendView}
      prsData={prsData}
      prTrendDelta={prTrendDelta}
      prTrendDelta7d={prTrendDelta7d}
      weeklySetsView={weeklySetsView}
      setWeeklySetsView={setWeeklySetsView}
      compositionGrouping={compositionGrouping}
      muscleCompQuick={muscleCompQuick}
      setMuscleCompQuick={setMuscleCompQuick}
      weeklySetsDashboard={weeklySetsDashboard}
      weeklySetsDashboard30d={weeklySetsDashboard30d}
      bodyMapGender={bodyMapGender}
      intensityData={intensityData}
      intensityInsight={intensityInsight}
      muscleGrouping={muscleGrouping}
      setMuscleGrouping={setMuscleGrouping}
      musclePeriod={musclePeriod}
      setMusclePeriod={setMusclePeriod}
      muscleTrendView={muscleTrendView}
      setMuscleTrendView={setMuscleTrendView}
      trendData={trendData}
      trendKeys={trendKeys}
      muscleTrendInsight={muscleTrendInsight}
      muscleVsLabel={muscleVsLabel}
      weekShapeView={weekShapeView}
      setWeekShapeView={setWeekShapeView}
      weekShapeData={weekShapeData}
      weeklyRhythmInsight={weeklyRhythmInsight}
      volumeView={volumeView}
      setVolumeView={setVolumeView}
      volumeDurationData={volumeDurationData}
      volumeDensityTrend={volumeDensityTrend}
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
      fullData={filteredData}
      exerciseStats={exerciseStats}
      secondarySetMultiplier={secondarySetMultiplier}
      animationKeyframes={ANIMATION_KEYFRAMES}
      hypertrophyData={hypertrophyData}
      hypertrophyData30d={hypertrophyData30d}
      hypertrophyPeriod={hypertrophyPeriod}
      setHypertrophyPeriod={setHypertrophyPeriod}
      injuryRiskData={injuryRiskData}
      strengthBalanceResults={strengthBalanceResults}
      strengthBalanceTldr={strengthBalanceTldr}
      sbCardRef={sbCardRef}
      onStrengthBalanceDetails={handleStrengthBalanceDetails}
    />
  );
};
