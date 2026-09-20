import React, { useState, useMemo, useEffect } from 'react';
import { ExerciseStats, WorkoutSet } from '../../../types';
import { getExerciseAssets, ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { createExerciseAssetLookup, ExerciseAssetLookup } from '../../../utils/exercise/exerciseAssetLookup';
import { loadExerciseMuscleData, ExerciseMuscleData, toMuscleVolumeMap } from '../../../utils/muscle/mapping';
import { ExerciseTrendMode, WeightUnit, getSmartFilterMode } from '../../../utils/storage/localStorage';
import { summarizeExerciseHistory, analyzeExerciseTrendCore, type ExerciseSessionEntry } from '../../../utils/analysis/exerciseTrend';
import { getRechartsCategoricalTicks, getRechartsTickIndexMap } from '../../../utils/chart/chartEnhancements';
import { prefetchMuscleData, schedulePrefetch } from '../../../utils/prefetch/prefetchStrategies';
import { getVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';
import { useTrainingLevel } from '../../../hooks/app/useTrainingLevel';

import { buildExerciseChartData } from '../utils/exerciseChartData';
import { computeEffectiveNowFromStats, resolveEffectiveNow } from '../utils/effectiveNow';
import { useExerciseSelection } from '../hooks/useExerciseSelection';
import { useExerciseFilters } from '../hooks/useExerciseFilters';
import { ExerciseViewHeader } from './ExerciseViewHeader';
import { ExerciseListPanel } from './ExerciseListPanel';
import { ExerciseSummaryPanel } from './ExerciseSummaryPanel';
import { ExerciseProgressChart } from './ExerciseProgressChart';
import { ExerciseOverviewCard } from './ExerciseOverviewCard';
import type { ExerciseMuscleTargets, InactiveReason } from '../utils/exerciseViewTypes';
import { buildExerciseMuscleTargets, getExerciseSpanDays, getInactiveReason } from '../utils/exerciseViewDerived';

interface ExerciseViewProps {
  stats: ExerciseStats[];
  filteredData: WorkoutSet[];
  filterCacheKey: string;
  filtersSlot?: React.ReactNode;
  highlightedExercise?: string | null;
  onHighlightApplied?: () => void;
  onExerciseClick?: (exerciseName: string) => void;
  weightUnit?: WeightUnit;
  exerciseTrendMode: ExerciseTrendMode;
  bodyMapGender?: 'male' | 'female';
  stickyHeader?: boolean;
  now?: Date;
  secondarySetMultiplier?: number;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  stats,
  filteredData,
  filterCacheKey,
  filtersSlot,
  highlightedExercise,
  onHighlightApplied,
  onExerciseClick,
  weightUnit = 'kg' as WeightUnit,
  exerciseTrendMode,
  bodyMapGender = 'male',
  stickyHeader = false,
  now,
  secondarySetMultiplier = 0.5,
}) => {
  const computedEffectiveNow = useMemo(() => computeEffectiveNowFromStats(stats), [stats]);
  const effectiveNow = useMemo(() => resolveEffectiveNow(computedEffectiveNow, now), [computedEffectiveNow, now]);

  // Calculate user's training level for personalized volume thresholds
  const { trainingLevel } = useTrainingLevel(filteredData, effectiveNow);

  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());

  const {
    searchTerm,
    setSearchTerm,
    trendFilter,
    setTrendFilter,
    exerciseListSortMode,
    setExerciseListSortMode,
    exerciseListSortDir,
    setExerciseListSortDir,
    showUnilateral,
    setShowUnilateral,
    viewModeOverride,
    setViewModeOverride,
    filteredExercises,
    statusMap,
    trainingStructure,
    lastSessionByName,
    summarizedHistoryByName,
  } = useExerciseFilters({
    stats,
    weightUnit: weightUnit ?? 'kg',
    exerciseTrendMode,
    effectiveNow,
    muscleDataMap: exerciseMuscleData,
  });

  const {
    selectedExerciseName,
    setSelectedExerciseName,
    exerciseButtonRefs,
  } = useExerciseSelection({
    stats,
    highlightedExercise,
    onHighlightApplied,
    defaultExerciseName: filteredExercises[0]?.name ?? '',
  });

  const assetLookup = useMemo<ExerciseAssetLookup | null>(() => {
    if (!assetsMap) return null;
    return createExerciseAssetLookup(assetsMap);
  }, [assetsMap]);

  const selectedStats = useMemo(() =>
    stats.find((s) => s.name === selectedExerciseName),
    [stats, selectedExerciseName]
  );

  const inactiveReason = useMemo<InactiveReason | null>(() => {
    return getInactiveReason(selectedStats, effectiveNow, summarizedHistoryByName);
  }, [effectiveNow, selectedStats, summarizedHistoryByName]);

  const exerciseSpanDays = useMemo(() => {
    return getExerciseSpanDays(selectedStats, summarizedHistoryByName);
  }, [selectedStats, summarizedHistoryByName]);

  const smartMode = useMemo(() => getSmartFilterMode(exerciseSpanDays), [exerciseSpanDays]);
  const allAggregationMode = useMemo<'daily' | 'weekly' | 'monthly'>(() => {
    if (smartMode === 'all') return 'daily';
    if (smartMode === 'yearly') return 'monthly';
    return smartMode;
  }, [smartMode]);

  const viewMode = viewModeOverride ?? 'monthly';
  const setViewMode = setViewModeOverride;

  useEffect(() => {
    let mounted = true;
    getExerciseAssets()
      .then((m) => { if (mounted) setAssetsMap(m); })
      .catch(() => setAssetsMap(new Map()));
    loadExerciseMuscleData()
      .then((m) => { if (mounted) setExerciseMuscleData(m); });
    return () => { mounted = false; };
  }, []);

  // Prefetch Muscle Analysis data when idle on Exercise view
  useEffect(() => {
    if (!assetsMap || filteredData.length === 0) return;

    const cancel = schedulePrefetch(() => {
      prefetchMuscleData(filterCacheKey, filteredData, assetsMap, effectiveNow, secondarySetMultiplier);
    });

    return cancel;
  }, [filterCacheKey, filteredData, assetsMap, effectiveNow, secondarySetMultiplier]);

  const selectedSessions = useMemo(() => {
    if (!selectedStats) return [] as ExerciseSessionEntry[];
    const base = summarizedHistoryByName.get(selectedStats.name) ?? summarizeExerciseHistory(selectedStats.history, { exerciseName: selectedStats.name });
    const separateSides = selectedStats.hasUnilateralData ?? false;
    if (!separateSides) return base;
    return summarizeExerciseHistory(selectedStats.history, { separateSides, exerciseName: selectedStats.name });
  }, [selectedStats, summarizedHistoryByName]);

  const selectedExerciseMuscleInfo = useMemo<ExerciseMuscleTargets>(() => {
    return buildExerciseMuscleTargets(selectedStats, exerciseMuscleData, secondarySetMultiplier);
  }, [selectedStats, exerciseMuscleData, secondarySetMultiplier]);

  const selectedExerciseMuscleVolumes = useMemo(() => {
    return toMuscleVolumeMap(selectedExerciseMuscleInfo.volumes);
  }, [selectedExerciseMuscleInfo.volumes]);

  const selectedExerciseMuscleMaxVolume = useMemo(() => {
    return Math.max(1, ...(Array.from(selectedExerciseMuscleVolumes.values()) as number[]));
  }, [selectedExerciseMuscleVolumes]);

  const volumeThresholds = useMemo(() => getVolumeThresholds(trainingLevel), [trainingLevel]);

  const isSelectedEligible = useMemo(() => {
    if (!selectedStats) return true;
    return trainingStructure.eligibilityByName.get(selectedStats.name)?.isEligible ?? false;
  }, [selectedStats, trainingStructure.eligibilityByName]);

  const sessionsCount = selectedStats ? selectedSessions.length : 0;

  const currentStatus = selectedStats ? statusMap[selectedStats.name] : null;
  const isBodyweightLike = currentStatus?.isBodyweightLike ?? false;

  const currentCore = useMemo(() => {
    if (!selectedStats) return null;
    const summarized = summarizedHistoryByName.get(selectedStats.name);
    return analyzeExerciseTrendCore(selectedStats, { trendMode: exerciseTrendMode, summarizedHistory: summarized });
  }, [exerciseTrendMode, selectedStats, summarizedHistoryByName]);

  const selectedPrematurePrTooltip = useMemo(() => {
    if (!currentCore?.prematurePr) return null;
    const spike = currentCore.prSpikePct;
    const drop = currentCore.prDropPct;
    if (!Number.isFinite(spike) && !Number.isFinite(drop)) {
      return 'This looks like a PR spike that may not be sustainable yet. Keep building consistency at this level.';
    }
    const parts: string[] = ['This looks like a PR spike that may not be sustainable yet.'];
    if (Number.isFinite(spike)) parts.push(`PR spike: +${(spike as number).toFixed(1)}%`);
    if (Number.isFinite(drop)) parts.push(`After PR: ${(drop as number).toFixed(1)}%`);
    return parts.join(' ');
  }, [currentCore?.prematurePr, currentCore?.prDropPct, currentCore?.prSpikePct]);

  const chartData = useMemo(() => {
    return buildExerciseChartData({
      selectedStats,
      selectedSessions,
      viewMode,
      allAggregationMode,
      weightUnit,
      effectiveNow,
      isBodyweightLike,
    });
  }, [selectedStats, selectedSessions, viewMode, allAggregationMode, weightUnit, effectiveNow, isBodyweightLike]);

  const hasUnilateralChartData = useMemo(() => {
    if (!selectedStats?.hasUnilateralData) return false;
    return chartData.some((d: any) => d.leftOneRepMax !== undefined || d.rightOneRepMax !== undefined);
  }, [chartData, selectedStats?.hasUnilateralData]);

  const xTicks = useMemo(() => {
    return getRechartsCategoricalTicks(chartData, (row: any) => row?.date);
  }, [chartData]);

  const tickIndexMap = useMemo(() => {
    return getRechartsTickIndexMap(chartData.length) as Record<number, boolean>;
  }, [chartData.length]);

  return (
    <div className="flex flex-col gap-1 w-full text-slate-200">
      <ExerciseViewHeader
        filtersSlot={filtersSlot}
        stickyHeader={stickyHeader}
        loadDirectionMode={currentStatus?.loadProgressionDirection ?? 'higher'}
        trainingStructure={trainingStructure}
        trendFilter={trendFilter}
        setTrendFilter={setTrendFilter}
      />

      <div className="grid grid-cols-1 lg:[grid-template-columns:40%_60%] gap-2 items-stretch">
        <ExerciseListPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          exerciseListSortMode={exerciseListSortMode}
          setExerciseListSortMode={setExerciseListSortMode}
          exerciseListSortDir={exerciseListSortDir}
          setExerciseListSortDir={setExerciseListSortDir}
          filteredExercises={filteredExercises}
          selectedExerciseName={selectedExerciseName}
          statusMap={statusMap}
          assetLookup={assetLookup}
          trainingStructure={trainingStructure}
          lastSessionByName={lastSessionByName}
          effectiveNow={effectiveNow}
          exerciseButtonRefs={exerciseButtonRefs}
          onExerciseClick={onExerciseClick}
          setSelectedExerciseName={setSelectedExerciseName}
        />

        <div data-exercise-summary-panel className="lg:col-span-1 flex flex-col gap-2 h-full min-h-0">
          {selectedStats && (
            <div className="hidden lg:block">
              <ExerciseOverviewCard
                selectedStats={selectedStats}
                assetLookup={assetLookup}
                bodyMapGender={bodyMapGender}
                selectedExerciseMuscleInfo={selectedExerciseMuscleInfo}
                selectedExerciseMuscleVolumes={selectedExerciseMuscleVolumes}
                selectedExerciseMuscleMaxVolume={selectedExerciseMuscleMaxVolume}
                volumeThresholds={volumeThresholds}
              />
            </div>
          )}

          <ExerciseSummaryPanel
            selectedStats={selectedStats}
            currentStatus={currentStatus}
            isSelectedEligible={isSelectedEligible}
            inactiveReason={inactiveReason}
            currentCore={currentCore}
            selectedPrematurePrTooltip={selectedPrematurePrTooltip}
          />
        </div>
      </div>

      {selectedStats && (
        <>
          <ExerciseProgressChart
            selectedStats={selectedStats}
            selectedSessions={selectedSessions}
            chartData={chartData}
            viewMode={viewMode}
            setViewMode={setViewMode}
            allAggregationMode={allAggregationMode}
            weightUnit={weightUnit}
            isBodyweightLike={isBodyweightLike}
            showUnilateral={showUnilateral}
            setShowUnilateral={setShowUnilateral}
            hasUnilateralChartData={hasUnilateralChartData}
            sessionsCount={sessionsCount}
            xTicks={xTicks}
            tickIndexMap={tickIndexMap}
          />
          <div className="lg:hidden">
            <ExerciseOverviewCard
              selectedStats={selectedStats}
              assetLookup={assetLookup}
              bodyMapGender={bodyMapGender}
              selectedExerciseMuscleInfo={selectedExerciseMuscleInfo}
              selectedExerciseMuscleVolumes={selectedExerciseMuscleVolumes}
              selectedExerciseMuscleMaxVolume={selectedExerciseMuscleMaxVolume}
              volumeThresholds={volumeThresholds}
            />
          </div>
        </>
      )}
    </div>
  );
};
