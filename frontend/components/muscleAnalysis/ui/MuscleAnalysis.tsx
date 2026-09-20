import React, { useState, useEffect, useMemo } from 'react';
import { ExerciseStats, WorkoutSet } from '../../../types';
import { ViewHeader } from '../../layout/ViewHeader';
import { Activity, Dumbbell } from 'lucide-react';
import { BodyMapGender } from '../../bodyMap/BodyMap';
import { useMuscleSelection } from '../hooks/useMuscleSelection';
import { useMuscleVolumeData } from '../hooks/useMuscleVolumeData';
import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import { useMuscleHeatmapData } from '../hooks/useMuscleHeatmapData';
import { useMuscleTrendData } from '../hooks/useMuscleTrendData';
import { useMuscleAnalysisHandlers } from '../hooks/useMuscleAnalysisHandlers';
import { useLifetimeAchievement } from '../hooks/useLifetimeAchievement';
import { MuscleAnalysisBodyMapPanel } from './MuscleAnalysisBodyMapPanel';
import { MuscleAnalysisGraphPanel } from './MuscleAnalysisGraphPanel';
import { MuscleAnalysisExerciseListPanel } from './MuscleAnalysisExerciseListPanel';
import { LifetimeAchievementCard } from './LifetimeAchievementCard';
import { TooltipData } from '../../ui/Tooltip';
import { TabSkeleton } from '../../ui/TabSkeleton';
import { prefetchHistoryData, schedulePrefetch } from '../../../utils/prefetch/prefetchStrategies';
import { calculateHypertrophyScoresWithExerciseTrends, HypertrophyScoreResult } from '../../../utils/muscle/hypertrophy/hypertrophyScore';
import type { MuscleVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';

interface MuscleAnalysisProps {
  data: WorkoutSet[];
  lifetimeData: WorkoutSet[];
  filterCacheKey: string;
  filtersSlot?: React.ReactNode;
  onExerciseClick?: (exerciseName: string) => void;
  initialMuscle?: { muscleId: string } | null;
  initialWeeklySetsWindow?: WeeklySetsWindow | null;
  onInitialMuscleConsumed?: () => void;
  stickyHeader?: boolean;
  bodyMapGender?: BodyMapGender;
  now?: Date;
  secondarySetMultiplier?: number;
  exerciseStats?: ExerciseStats[];
}

export const MuscleAnalysis: React.FC<MuscleAnalysisProps> = ({
  data,
  lifetimeData,
  filterCacheKey,
  filtersSlot,
  onExerciseClick,
  initialMuscle,
  initialWeeklySetsWindow,
  onInitialMuscleConsumed,
  stickyHeader = false,
  bodyMapGender = 'male',
  now,
  secondarySetMultiplier = 0.5,
  exerciseStats,
}) => {
  const [weeklySetsChartView, setWeeklySetsChartView] = useState<'heatmap' | 'radar'>('heatmap');
  const [hoverTooltip, setHoverTooltip] = useState<TooltipData | null>(null);

  const {
    selectedMuscle,
    setSelectedMuscle,
    weeklySetsWindow,
    setWeeklySetsWindow,
    selectedSvgIdForUrlRef,
    clearSelectionUrl,
    updateSelectionUrl,
    clearSelection,
  } = useMuscleSelection({
    initialMuscle,
    initialWeeklySetsWindow,
    onInitialMuscleConsumed,
    isLoading: false,
  });

  const {
    exerciseMuscleData,
    muscleVolume,
    isLoading,
    assetsMap,
    windowStart,
    breakdownStart,
    effectiveNow,
    allTimeWindowStart,
    lifetimeMuscleVolumes,
  } = useMuscleVolumeData({
    data,
    lifetimeData,
    weeklySetsWindow,
    now,
    secondarySetMultiplier,
  });

  // Prefetch History view data when idle on Muscle Analysis
  useEffect(() => {
    if (data.length === 0 || !effectiveNow) return;

    const cancel = schedulePrefetch(() => {
      prefetchHistoryData(filterCacheKey, data, effectiveNow);
    });

    return cancel;
  }, [filterCacheKey, data, effectiveNow]);

  const {
    muscleVolumes,
    maxVolume,
    windowedGroupVolumes,
    groupedBodyMapVolumes,
    maxGroupVolume,
    selectedSubjectKeys,
    groupWeeklyRatesBySubject,
    muscleRatesMap,
    radarData,
  } = useMuscleHeatmapData({
    data,
    assetsMap,
    windowStart,
    effectiveNow,
    weeklySetsWindow,
    selectedMuscle,
    filterCacheKey,
    secondarySetMultiplier,
  });

  const {
    weeklySetsSummary,
    legendMaxSets,
    trainingLevel,
    volumeThresholds,
    weeklySetsDelta,
    trendData,
    legendTrendData,
    windowedSelectionBreakdown,
    contributingExercises,
    totalSets,
    musclesWorked,
  } = useMuscleTrendData({
    data,
    assetsMap,
    windowStart,
    breakdownStart,
    effectiveNow,
    allTimeWindowStart,
    weeklySetsWindow,
    selectedSubjectKeys,
    groupWeeklyRatesBySubject,
    muscleRatesMap,
    muscleVolume,
    windowedGroupVolumes,
    muscleVolumes,
    filterCacheKey,
    secondarySetMultiplier,
    exerciseStats,
  });

  // Compute hypertrophy scores (same function as dashboard, computed once and reused)
  const hypertrophyScores = useMemo(() => {
    if (!assetsMap || !muscleRatesMap || muscleRatesMap.size === 0) return [];
    if (!data || data.length === 0 || !effectiveNow) return [];

    const period: '7d' | '30d' = weeklySetsWindow === '7d' ? '7d' : '30d';
    const windowDays = period === '7d' ? 7 : 30;
    const scoreWindowStart = new Date(effectiveNow.getTime() - windowDays * 86400000);

    return calculateHypertrophyScoresWithExerciseTrends(
      exerciseStats ?? [],
      muscleRatesMap,
      assetsMap,
      trainingLevel,
      period,
      effectiveNow,
      data,
      scoreWindowStart,
    );
  }, [data, assetsMap, muscleRatesMap, trainingLevel, effectiveNow, weeklySetsWindow, exerciseStats]);

  // Fast lookup map: muscleId → full hypertrophy score result
  const hypertrophyScoreMap = useMemo(() => {
    const m = new Map<string, HypertrophyScoreResult>();
    for (const s of hypertrophyScores) m.set(s.muscleId, s.score);
    return m;
  }, [hypertrophyScores]);

  // Body map volumes driven by hypertrophy score (0-100) instead of raw weekly sets
  const bodyMapVolumeMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const [muscleId, result] of hypertrophyScoreMap) {
      m.set(muscleId, result.totalScore);
    }
    return m;
  }, [hypertrophyScoreMap]);

  const {
    handleMuscleClick,
    handleMuscleHover,
    selectedBodyMapIds,
    hoveredBodyMapIds,
  } = useMuscleAnalysisHandlers({
    selectedMuscle,
    setSelectedMuscle,
    selectedSvgIdForUrlRef,
    clearSelectionUrl,
    updateSelectionUrl: (payload: { svgId: string; window: WeeklySetsWindow }) => updateSelectionUrl({ svgId: payload.svgId, window: payload.window }),
    weeklySetsWindow,
    muscleRatesMap,
    setHoverTooltip,
    trainingLevel,
    hypertrophyScoreMap,
  });

  const lifetimeAchievementData = useLifetimeAchievement({
    lifetimeMuscleVolumes,
    weeklyMuscleVolumes: muscleRatesMap,
    selectedMuscle,
  });

  if (isLoading) {
    return <TabSkeleton rows={6} className="py-2" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-slate-400 mb-2">No workout data for current filter</div>
        <div className="text-slate-500 text-sm">Try adjusting your date filter to see muscle analysis</div>
      </div>
    );
  }

  return (
    <div className="space-y-1 flex flex-col">
      <div className="hidden sm:contents">
        <ViewHeader
          leftStats={[{ icon: Activity, value: totalSets, label: 'Total Sets' }]}
          rightStats={[{ icon: Dumbbell, value: musclesWorked, label: 'Muscles' }]}
          filtersSlot={filtersSlot}
          sticky={stickyHeader}
        />
      </div>

      {/* Main layout: 3 columns on desktop, stacked on mobile */}
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:grid-rows-[1fr_1fr] lg:gap-2 lg:h-[80vh] overflow-hidden">
        {/* Column 1: Body Map (1/3 width, full height) */}
        <div className="h-[400px] sm:h-full lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:h-full min-h-0">
          <MuscleAnalysisBodyMapPanel
            bodyMapGender={bodyMapGender}
            weeklySetsChartView={weeklySetsChartView}
            setWeeklySetsChartView={setWeeklySetsChartView}
            weeklySetsWindow={weeklySetsWindow}
            setWeeklySetsWindow={setWeeklySetsWindow}
            selectedSvgIdForUrlRef={selectedSvgIdForUrlRef}
            updateSelectionUrl={updateSelectionUrl}
            muscleVolumes={bodyMapVolumeMap}
            maxVolume={100}
            volumeThresholds={{ mv: 20, mev: 40, mrv: 60, maxv: 100 } as MuscleVolumeThresholds}
            selectedMuscle={selectedMuscle}
            selectedBodyMapIds={selectedBodyMapIds}
            hoveredBodyMapIds={hoveredBodyMapIds}
            handleMuscleClick={handleMuscleClick}
            handleMuscleHover={handleMuscleHover}
            radarData={radarData}
            hoverTooltip={hoverTooltip}
          />
        </div>

        {/* Column 2: Weekly Sets Graph */}
        <div className="h-full sm:h-full lg:col-start-2 lg:row-start-1 lg:h-full min-h-0 overflow-hidden">
          <MuscleAnalysisGraphPanel
            selectedMuscle={selectedMuscle}
            weeklySetsWindow={weeklySetsWindow}
            weeklySetsSummary={weeklySetsSummary}
            legendMaxSets={legendMaxSets}
            volumeThresholds={volumeThresholds}
            volumeDelta={weeklySetsDelta}
            trendData={trendData}
            legendTrendData={legendTrendData}
            windowedSelectionBreakdown={windowedSelectionBreakdown}
            clearSelection={clearSelection}
            hypertrophyScore={selectedMuscle ? hypertrophyScoreMap.get(selectedMuscle)?.totalScore : undefined}
          />
        </div>

        {/* Column 3: Exercise List */}
        <div className=" sm:h-full h-[300px] lg:h-full lg:col-start-3 lg:row-start-1 min-h-0 overflow-hidden">
          <MuscleAnalysisExerciseListPanel
            contributingExercises={contributingExercises}
            assetsMap={assetsMap}
            exerciseMuscleData={exerciseMuscleData}
            totalSetsInWindow={windowedSelectionBreakdown?.totalSetsInWindow ?? 0}
            volumeThresholds={volumeThresholds}
            onExerciseClick={onExerciseClick}
            bodyMapGender={bodyMapGender}
            secondarySetMultiplier={secondarySetMultiplier}
            selectedMuscle={selectedMuscle}
          />
        </div>

        {/* Bottom row: Lifetime Growth Unlocked (columns 2-3) */}
        {lifetimeAchievementData && (
          <div className="h-[300px] lg:h-full lg:col-start-2 lg:col-span-2 lg:row-start-2 min-h-0 overflow-hidden">
            <LifetimeAchievementCard
              data={lifetimeAchievementData}
              selectedMuscleId={selectedMuscle}
              onMuscleClick={handleMuscleClick}
              workoutData={data}
              assetsMap={assetsMap ?? undefined}
              effectiveNow={effectiveNow}
              windowStart={windowStart}
              muscleRatesMap={muscleRatesMap}
              trainingLevel={trainingLevel}
              hypertrophyScores={hypertrophyScores}
            />
          </div>
        )}
      </div>
    </div>
  );
};
