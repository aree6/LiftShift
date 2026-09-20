import React, { Suspense, useMemo } from 'react';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import { LazyRender } from '../../ui/LazyRender';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import type { DailySummary, ExerciseStats, WorkoutSet } from '../../../types';
import type { WeightUnit, TimeFilterMode } from '../../../utils/storage/localStorage';
import type { TrainingLevel } from '../../../utils/muscle/hypertrophy/muscleParams';
import { DashboardAIAnalysisCard } from './DashboardAIAnalysisCard';
import type { InjuryRiskResult } from '../../../utils/analysis/injury/injuryRisk';
import type { StrengthBalancePairResult } from '../../../utils/analysis/strengthBalance/strengthBalance';

const WeeklySetsCard = React.lazy(() => import('../weeklySets/WeeklySetsCard').then((m) => ({ default: m.WeeklySetsCard })));
const MuscleTrendCard = React.lazy(() => import('../muscleTrend/MuscleTrendCard').then((m) => ({ default: m.MuscleTrendCard })));
const PrTrendCard = React.lazy(() => import('../prTrend/PrTrendCard').then((m) => ({ default: m.PrTrendCard })));
const IntensityEvolutionCard = React.lazy(() => import('../intensityEvolution/IntensityEvolutionCard').then((m) => ({ default: m.IntensityEvolutionCard })));
const HypertrophyScatterCard = React.lazy(() => import('../hypertrophy/HypertrophyScatterCard').then((m) => ({ default: m.HypertrophyScatterCard })));
const HypertrophyBarCard = React.lazy(() => import('../hypertrophy/HypertrophyBarCard').then((m) => ({ default: m.HypertrophyBarCard })));
const VolumeDensityCard = React.lazy(() => import('../volumeDensity/VolumeDensityCard').then((m) => ({ default: m.VolumeDensityCard })));
const InjuryRiskCard = React.lazy(() => import('../injuryRisk/InjuryRiskCard').then((m) => ({ default: m.InjuryRiskCard })));
const StrengthBalanceCard = React.lazy(() => import('../strengthBalance/StrengthBalanceCard').then((m) => ({ default: m.StrengthBalanceCard })));

interface DashboardPrimaryChartsProps {
  fullData: WorkoutSet[];
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  effectiveNow: Date;
  hypertrophyData: any[];
  hypertrophyData30d?: any[];
  hypertrophyPeriod: '7d' | '30d';
  setHypertrophyPeriod: (v: '7d' | '30d') => void;
  chartModes: { volumeVsDuration: TimeFilterMode; intensityEvo: TimeFilterMode; prTrend: TimeFilterMode };
  toggleChartMode: (key: string, mode: TimeFilterMode) => void;
  prTrendView: 'area' | 'bar';
  setPrTrendView: (v: 'area' | 'bar') => void;
  prsData: any[];
  prTrendDelta: number;
  prTrendDelta7d: number;
  weeklySetsView: 'heatmap' | 'radar';
  setWeeklySetsView: (v: 'heatmap' | 'radar') => void;
  compositionGrouping: 'muscles' | 'groups';
  muscleCompQuick: 'all' | '7d' | '30d' | '365d';
  setMuscleCompQuick: (v: 'all' | '7d' | '30d' | '365d') => void;
  weeklySetsDashboard: any;
  onMuscleClick?: (muscleId: string, weeklySetsWindow: 'all' | '7d' | '30d' | '365d') => void;
  bodyMapGender: BodyMapGender;
  tooltipStyle: any;
  trainingLevel: TrainingLevel;
  volumeView: 'area' | 'bar';
  setVolumeView: (v: 'area' | 'bar') => void;
  weightUnit: WeightUnit;
  volumeDurationData: any[];
  volumeDensityTrend: any;
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
  injuryRiskData: InjuryRiskResult[];
  strengthBalanceResults: StrengthBalancePairResult[];
  strengthBalanceTldr: string | null;
  sbCardRef: React.RefObject<HTMLDivElement | null>;
  onExerciseClick?: (exerciseName: string) => void;
}

export const DashboardPrimaryCharts: React.FC<DashboardPrimaryChartsProps> = ({
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
  onMuscleClick,
  bodyMapGender,
  effectiveNow,
  hypertrophyData,
  hypertrophyData30d,
  hypertrophyPeriod,
  setHypertrophyPeriod,
  tooltipStyle,
  trainingLevel,
  fullData,
  dailyData,
  exerciseStats,
  volumeView,
  setVolumeView,
  weightUnit,
  volumeDurationData,
  volumeDensityTrend,
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
  injuryRiskData,
  strengthBalanceResults,
  strengthBalanceTldr,
  sbCardRef,
  onExerciseClick,
}) => {
  const scatterHypertrophyData = useMemo(() =>
    hypertrophyData.filter(m => m.score.raw.weeklySets >= 1.0 && m.score.raw.daysPerWeek >= 1.0),
    [hypertrophyData]
  );

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2">
      <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
        <PrTrendCard
          mode={chartModes.prTrend}
          onToggle={(m) => toggleChartMode('prTrend', m)}
          view={prTrendView}
          onViewToggle={setPrTrendView}
          prsData={prsData}
          tooltipStyle={tooltipStyle as any}
          prTrendDelta={prTrendDelta}
          prTrendDelta7d={prTrendDelta7d}
        />
      </Suspense>

      <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
        <WeeklySetsCard
          weeklySetsView={weeklySetsView}
          setWeeklySetsView={setWeeklySetsView}
          muscleCompQuick={muscleCompQuick}
          setMuscleCompQuick={setMuscleCompQuick}
          heatmap={weeklySetsDashboard.heatmap}
          tooltipStyle={tooltipStyle as any}
          onMuscleClick={(muscleId: string, weeklySetsWindow: 'all' | '7d' | '30d' | '365d') => onMuscleClick?.(muscleId, weeklySetsWindow)}
          bodyMapGender={bodyMapGender}
          windowStart={weeklySetsDashboard.windowStart}
          now={effectiveNow}
          trainingLevel={trainingLevel}
        />
      </Suspense>
</div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2">
      <LazyRender className="lg:h-auto" placeholder={<ChartSkeleton className="min-h-[450px] sm:min-h-[650px]" />}>
        <Suspense fallback={<ChartSkeleton className="min-h-[450px] sm:min-h-[650px]" />}>
          <HypertrophyScatterCard
            hypertrophyData={scatterHypertrophyData}
            hypertrophyPeriod={hypertrophyPeriod}
            setHypertrophyPeriod={setHypertrophyPeriod}
          />
        </Suspense>
      </LazyRender>

      <LazyRender className=" lg:h-auto" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
        <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
          <HypertrophyBarCard
            hypertrophyData={hypertrophyData}
            hypertrophyData30d={hypertrophyData30d}
            selectedMuscleId={null}
            onMuscleClick={(muscleId) => onMuscleClick?.(muscleId, muscleCompQuick)}
            hypertrophyPeriod={hypertrophyPeriod}
            setHypertrophyPeriod={setHypertrophyPeriod}
          />
        </Suspense>
      </LazyRender>
    </div>

    {(injuryRiskData.length > 0 || strengthBalanceResults.length > 0) && (
      <div className={injuryRiskData.length > 0 && strengthBalanceResults.length > 0 ? 'grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2' : ''}>
        {injuryRiskData.length > 0 && (
          <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
            <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
              <InjuryRiskCard injuryRiskData={injuryRiskData} />
            </Suspense>
          </LazyRender>
        )}

        {strengthBalanceResults.length > 0 && (
          <div ref={sbCardRef} className="min-w-0 scroll-mt-16 sm:scroll-mt-20">
            <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
              <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
                <StrengthBalanceCard
                  results={strengthBalanceResults}
                  tldr={strengthBalanceTldr}
                  onExerciseClick={onExerciseClick}
                />
              </Suspense>
            </LazyRender>
          </div>
        )}
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2">
      <DashboardAIAnalysisCard
        fullData={fullData}
        dailyData={dailyData}
        exerciseStats={exerciseStats}
        effectiveNow={effectiveNow}
      />

      <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
        <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
          <VolumeDensityCard
            mode={chartModes.volumeVsDuration}
            onToggle={(m) => toggleChartMode('volumeVsDuration', m)}
            view={volumeView}
            onViewToggle={setVolumeView}
            weightUnit={weightUnit}
            volumeDurationData={volumeDurationData}
            volumeDensityTrend={volumeDensityTrend as any}
            tooltipStyle={tooltipStyle as any}
          />
        </Suspense>
      </LazyRender>
    </div>

    <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
      <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[480px]" />}>
        <IntensityEvolutionCard
          mode={chartModes.intensityEvo}
          onToggle={(m) => toggleChartMode('intensityEvo', m)}
          intensityData={intensityData}
          intensityInsight={intensityInsight}
          tooltipStyle={tooltipStyle as any}
        />
      </Suspense>
    </LazyRender>

    <LazyRender className="min-w-0" placeholder={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
      <Suspense fallback={<ChartSkeleton className="min-h-[400px] sm:min-h-[520px]" />}>
        <MuscleTrendCard
          muscleGrouping={muscleGrouping}
          setMuscleGrouping={setMuscleGrouping}
          musclePeriod={musclePeriod}
          setMusclePeriod={(v: any) => setMusclePeriod(v)}
          muscleTrendView={muscleTrendView}
          setMuscleTrendView={setMuscleTrendView}
          trendData={trendData}
          trendKeys={trendKeys}
          muscleTrendInsight={muscleTrendInsight as any}
          tooltipStyle={tooltipStyle as any}
          muscleVsLabel={muscleVsLabel}
        />
      </Suspense>
    </LazyRender>
  </>
  );
};
