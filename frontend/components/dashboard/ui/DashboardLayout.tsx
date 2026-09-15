import React from 'react';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import type { DailySummary, ExerciseStats, WorkoutSet } from '../../../types';
import type { WeightUnit, TimeFilterMode } from '../../../utils/storage/localStorage';
import type { TimelineProgress } from '../../../utils/training/trainingTimeline';
import type { DashboardSummaryResult } from '../../../utils/analysis/dashboardSummary/dashboardSummary';
import type { InjuryRiskResult } from '../../../utils/analysis/injury/injuryRisk';
import type { StrengthBalancePairResult } from '../../../utils/analysis/strengthBalance/strengthBalance';
import { DashboardHeaderBar } from './DashboardHeaderBar';
import { DashboardInsightsSection } from './DashboardInsightsSection';
import { DashboardPrimaryCharts } from './DashboardPrimaryCharts';
import { DashboardSecondaryCharts } from './DashboardSecondaryCharts';

interface DashboardLayoutProps {
  filtersSlot?: React.ReactNode;
  stickyHeader: boolean;
  totalWorkouts: number;
  totalSets: number;
  totalPrs: number;
  dashboardInsights: any;
  dashboardSummary: DashboardSummaryResult;
  onDayClick?: (date: Date) => void;
  onMuscleClick?: (muscleId: string, weeklySetsWindow: 'all' | '7d' | '30d' | '365d') => void;
  onExerciseClick?: (exerciseName: string) => void;
  activePlateauExercises: any[];
  assetsMap?: Map<string, any> | null;
  assetsLowerMap?: Map<string, any> | null;
  weightUnit: WeightUnit;
  dailyData: DailySummary[];
  effectiveNow: Date;
  trainingLevel: import('../../../utils/muscle/hypertrophy/muscleParams').TrainingLevel;
  timelineProgress: TimelineProgress;
  chartModes: { volumeVsDuration: TimeFilterMode; intensityEvo: TimeFilterMode; prTrend: TimeFilterMode };
  toggleChartMode: (key: string, mode: TimeFilterMode) => void;
  prTrendView: 'area' | 'bar';
  setPrTrendView: (v: 'area' | 'bar') => void;
  prsData: any[];
  prTrendDelta: any;
  prTrendDelta7d: any;
  weeklySetsView: 'heatmap' | 'radar';
  setWeeklySetsView: (v: 'heatmap' | 'radar') => void;
  compositionGrouping: 'muscles' | 'groups';
  muscleCompQuick: 'all' | '7d' | '30d' | '365d';
  setMuscleCompQuick: (v: 'all' | '7d' | '30d' | '365d') => void;
  weeklySetsDashboard: any;
  weeklySetsDashboard30d: any;
  bodyMapGender: BodyMapGender;
  intensityData: any[];
  intensityInsight: any;
  muscleGrouping: 'groups' | 'muscles';
  setMuscleGrouping: (v: 'groups' | 'muscles') => void;
  musclePeriod: TimeFilterMode | 'daily';
  setMusclePeriod: (v: any) => void;
  muscleTrendView: 'area' | 'stackedBar';
  setMuscleTrendView: (v: 'area' | 'stackedBar') => void;
  trendData: any[];
  trendKeys: string[];
  muscleTrendInsight: any;
  muscleVsLabel: string;
  weekShapeView: 'radar' | 'bar';
  setWeekShapeView: (v: 'radar' | 'bar') => void;
  weekShapeData: any[];
  weeklyRhythmInsight: any;
  volumeView: 'area' | 'bar';
  setVolumeView: (v: 'area' | 'bar') => void;
  volumeDurationData: any[];
  volumeDensityTrend: any;
  topExerciseMode: 'all' | 'weekly' | 'monthly' | 'yearly';
  setTopExerciseMode: (v: 'all' | 'weekly' | 'monthly' | 'yearly') => void;
  topExercisesView: 'barh' | 'area';
  setTopExercisesView: (v: 'barh' | 'area') => void;
  topExercisesBarData: any[];
  topExercisesOverTimeData: any[];
  topExerciseNames: string[];
  topExercisesInsight: any;
  pieColors: string[];
  tooltipStyle: any;
  fullData: WorkoutSet[];
  exerciseStats: ExerciseStats[];
  secondarySetMultiplier?: number;
  animationKeyframes: string;
  hypertrophyData: any[];
  hypertrophyData30d?: any[];
  hypertrophyPeriod: '7d' | '30d';
  setHypertrophyPeriod: (v: '7d' | '30d') => void;
  injuryRiskData: InjuryRiskResult[];
  strengthBalanceResults: StrengthBalancePairResult[];
  strengthBalanceTldr: string | null;
  sbCardRef: React.RefObject<HTMLDivElement | null>;
  onStrengthBalanceDetails?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = (props) => {
  const {
    filtersSlot,
    stickyHeader,
    totalWorkouts,
    totalSets,
    totalPrs,
    dashboardInsights,
    dashboardSummary,
    onDayClick,
    onMuscleClick,
    onExerciseClick,
    activePlateauExercises,
    assetsMap,
    assetsLowerMap,
    weightUnit,
    dailyData,
    effectiveNow,
    trainingLevel,
    timelineProgress,
    chartModes,
    toggleChartMode,
    prTrendView,
    setPrTrendView,
    prsData,
    prTrendDelta,
    prTrendDelta7d,
    weeklySetsView,
    setWeeklySetsView,
    compositionGrouping,
    muscleCompQuick,
    setMuscleCompQuick,
    weeklySetsDashboard,
    weeklySetsDashboard30d,
    bodyMapGender,
    intensityData,
    intensityInsight,
    muscleGrouping,
    setMuscleGrouping,
    musclePeriod,
    setMusclePeriod,
    muscleTrendView,
    setMuscleTrendView,
    trendData,
    trendKeys,
    muscleTrendInsight,
    muscleVsLabel,
    weekShapeView,
    setWeekShapeView,
    weekShapeData,
    weeklyRhythmInsight,
    volumeView,
    setVolumeView,
    volumeDurationData,
    volumeDensityTrend,
    topExerciseMode,
    setTopExerciseMode,
    topExercisesView,
    setTopExercisesView,
    topExercisesBarData,
    topExercisesOverTimeData,
    topExerciseNames,
    topExercisesInsight,
    pieColors,
    tooltipStyle,
    fullData,
    exerciseStats,
    secondarySetMultiplier = 0.5,
    animationKeyframes,
    hypertrophyData,
    hypertrophyData30d,
    hypertrophyPeriod,
    setHypertrophyPeriod,
    injuryRiskData,
    strengthBalanceResults,
    strengthBalanceTldr,
    sbCardRef,
    onStrengthBalanceDetails,
  } = props;

  return (
    <>
      <style>{animationKeyframes}</style>
      <div className="space-y-2 pb-2 animate-[fadeIn_0.2s_ease-out]">
        <DashboardHeaderBar
          totalWorkouts={totalWorkouts}
          filtersSlot={filtersSlot}
          stickyHeader={stickyHeader}
        />

        <DashboardInsightsSection
          dashboardInsights={dashboardInsights}
          totalWorkouts={totalWorkouts}
          totalSets={totalSets}
          totalPrs={totalPrs}
          weightUnit={weightUnit}
          dashboardSummary={dashboardSummary}
          effectiveNow={effectiveNow}
          onExerciseClick={onExerciseClick}
          onDayClick={onDayClick}
          activePlateauExercises={activePlateauExercises}
          assetsMap={assetsMap}
          assetsLowerMap={assetsLowerMap}
          dailyData={dailyData}
          fullData={fullData}
          bodyMapGender={bodyMapGender}
          secondarySetMultiplier={secondarySetMultiplier}
          timelineProgress={timelineProgress}
          weeklySetsDashboard={weeklySetsDashboard}
          weeklySetsDashboard30d={weeklySetsDashboard30d}
          onStrengthBalanceDetails={onStrengthBalanceDetails}
        />

        <DashboardPrimaryCharts
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
          onMuscleClick={onMuscleClick}
          bodyMapGender={bodyMapGender}
          effectiveNow={effectiveNow}
          trainingLevel={trainingLevel}
          intensityData={intensityData}
          intensityInsight={intensityInsight}
          muscleGrouping={muscleGrouping}
          setMuscleGrouping={setMuscleGrouping}
          musclePeriod={musclePeriod}
          setMusclePeriod={(v: any) => setMusclePeriod(v)}
          muscleTrendView={muscleTrendView}
          setMuscleTrendView={setMuscleTrendView}
          trendData={trendData}
          trendKeys={trendKeys}
          muscleTrendInsight={muscleTrendInsight}
          muscleVsLabel={muscleVsLabel}
          tooltipStyle={tooltipStyle}
          volumeView={volumeView}
          setVolumeView={setVolumeView}
          weightUnit={weightUnit}
          volumeDurationData={volumeDurationData}
          volumeDensityTrend={volumeDensityTrend}
          fullData={fullData}
          dailyData={dailyData}
          exerciseStats={exerciseStats}
          hypertrophyData={hypertrophyData}
          hypertrophyData30d={hypertrophyData30d}
          hypertrophyPeriod={hypertrophyPeriod}
          setHypertrophyPeriod={setHypertrophyPeriod}
          injuryRiskData={injuryRiskData}
          strengthBalanceResults={strengthBalanceResults}
          strengthBalanceTldr={strengthBalanceTldr}
          sbCardRef={sbCardRef}
          onExerciseClick={onExerciseClick}
        />
      </div>

      <div className="space-y-2">
        <DashboardSecondaryCharts
          topExerciseMode={topExerciseMode}
          setTopExerciseMode={setTopExerciseMode}
          topExercisesView={topExercisesView}
          setTopExercisesView={setTopExercisesView}
          topExercisesBarData={topExercisesBarData}
          topExercisesOverTimeData={topExercisesOverTimeData}
          topExerciseNames={topExerciseNames}
          topExercisesInsight={topExercisesInsight}
          pieColors={pieColors}
          tooltipStyle={tooltipStyle}
          onExerciseClick={onExerciseClick}
          assetsMap={assetsMap}
          assetsLowerMap={assetsLowerMap}
        />
      </div>
    </>
  );
};
