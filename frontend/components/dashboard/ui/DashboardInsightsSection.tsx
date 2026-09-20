import React, { Suspense, lazy, memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { InsightsPanel, PlateauAlert, RecentPRsPanel } from '../../insights/InsightCards';
import { ActivityHeatmap } from './ActivityHeatmap';
import { TrainingTimelineCard } from '../trainingTimeline/TrainingTimelineCard';
import { DashboardSummaryCard } from './DashboardSummaryCard';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { DailySummary, WorkoutSet } from '../../../types';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import type { TimelineProgress } from '../../../utils/training/trainingTimeline';
import type { DashboardSummaryResult } from '../../../utils/analysis/dashboardSummary/dashboardSummary';
import type { WeeklySetsDashboardResult } from '../../../utils/muscle/analytics/dashboardWeeklySets';
import { stripExerciseSourceLabel } from '../../../utils/exercise/exerciseSourceLabel';

// Below-the-fold paper pair (heavy SVG filters + muscle pipeline): split into
// their own chunks so they never block the initial dashboard paint.
const TrainingManifestCard = lazy(() => import('../manifest/TrainingManifestCard'));
const LifetimeLedgerPanel = lazy(() => import('../receipt/LifetimeLedgerPanel'));

const PaperShell: React.FC<{ className?: string; height: number }> = ({ className, height }) => (
  <div
    className={`min-w-0 overflow-hidden rounded-xl border p-1.5 sm:p-2 ${className ?? ''}`}
    style={{ backgroundColor: '#8a7f57', borderColor: '#8a7f57' }}
  >
    <div className="animate-pulse rounded-[14px]" style={{ backgroundColor: '#F0E5C5', opacity: 0.6, height }} />
  </div>
);

interface DashboardInsightsSectionProps {
  dashboardInsights: any;
  totalWorkouts: number;
  totalSets: number;
  totalPrs: number;
  dashboardSummary: DashboardSummaryResult;
  weightUnit: WeightUnit;
  effectiveNow: Date;
  onExerciseClick?: (exerciseName: string) => void;
  onDayClick?: (date: Date) => void;
  activePlateauExercises: any[];
  assetsMap?: Map<string, any> | null;
  assetsLowerMap?: Map<string, any> | null;
  dailyData: DailySummary[];
  fullData: WorkoutSet[];
  bodyMapGender?: BodyMapGender;
  secondarySetMultiplier?: number;
  timelineProgress: TimelineProgress;
  weeklySetsDashboard: WeeklySetsDashboardResult | null;
  weeklySetsDashboard30d: WeeklySetsDashboardResult | null;
  onStrengthBalanceDetails?: () => void;
}

export const DashboardInsightsSection: React.FC<DashboardInsightsSectionProps> = memo(({
  dashboardInsights,
  totalWorkouts,
  totalSets,
  totalPrs,
  dashboardSummary,
  weightUnit,
  effectiveNow,
  onExerciseClick,
  onDayClick,
  activePlateauExercises,
  assetsMap,
  assetsLowerMap,
  dailyData,
  fullData,
  bodyMapGender = 'male',
  secondarySetMultiplier = 0.5,
  timelineProgress,
  weeklySetsDashboard,
  weeklySetsDashboard30d,
  onStrengthBalanceDetails,
}) => (
  <>
    <DashboardSummaryCard
      summary={dashboardSummary}
      onExerciseClick={onExerciseClick}
      onDayClick={onDayClick}
      onStrengthBalanceDetails={onStrengthBalanceDetails}
    />

    <InsightsPanel
      insights={dashboardInsights}
      totalPRs={totalPrs}
      weightUnit={weightUnit}
      weeklySetsDashboard={weeklySetsDashboard30d}
    />

    <RecentPRsPanel prInsights={dashboardInsights.prInsights} weightUnit={weightUnit} now={effectiveNow} onExerciseClick={onExerciseClick} />

    {activePlateauExercises.length > 0 && (
      <div className="bg-black/20 border border-amber-500/10 rounded-xl p-4" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-white">Plateaus</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold">
              {activePlateauExercises.length} {activePlateauExercises.length === 1 ? 'exercise' : 'exercises'}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto -mx-2 px-2 pb-2">
          <div className="flex gap-2">
            {activePlateauExercises.map((p) => {
              const baseName = stripExerciseSourceLabel(p.exerciseName);
              return (
                <div key={p.exerciseName} className="min-w-[280px] flex-shrink-0">
                  <PlateauAlert
                    exerciseName={p.exerciseName}
                    suggestion={p.suggestion}
                    lastWeight={p.lastWeight}
                    lastReps={p.lastReps}
                    isBodyweightLike={p.isBodyweightLike}
                    loadProgressionDirection={p.loadProgressionDirection}
                    asset={assetsMap?.get(baseName) || assetsLowerMap?.get(baseName.toLowerCase())}
                    weightUnit={weightUnit}
                    onClick={() => onExerciseClick?.(p.exerciseName)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

    <TrainingTimelineCard progress={timelineProgress} />

    <ActivityHeatmap
      dailyData={dailyData}
      streakInfo={dashboardInsights.streakInfo}
      consistencySparkline={dashboardInsights.consistencySparkline}
      onDayClick={onDayClick}
      now={effectiveNow}
    />

    {/* Manifest + lifetime ledger: stacked on mobile, equal-height 2/3 + 1/3 on desktop.
        Offscreen rendering is skipped via content-visibility so the paper
        filters never cost anything until scrolled to. */}
    <div
      className="grid gap-2 lg:grid-cols-3 lg:items-stretch"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 560px' }}
    >
      <div className="min-w-0 h-full lg:col-span-2">
        <Suspense fallback={<PaperShell height={480} />}>
          <TrainingManifestCard
            fullData={fullData}
            dailyData={dailyData}
            weightUnit={weightUnit}
            effectiveNow={effectiveNow}
            assetsMap={assetsMap}
            bodyMapGender={bodyMapGender}
            secondarySetMultiplier={secondarySetMultiplier}
            onExerciseClick={onExerciseClick}
          />
        </Suspense>
      </div>
      <div className="hidden min-w-0 h-full lg:block">
        <Suspense fallback={<PaperShell height={480} />}>
          <LifetimeLedgerPanel
            fullData={fullData}
            dailyData={dailyData}
            weightUnit={weightUnit}
            effectiveNow={effectiveNow}
            streakWeeks={dashboardInsights?.streakInfo?.currentStreak ?? 0}
            onExerciseClick={onExerciseClick}
          />
        </Suspense>
      </div>
    </div>
  </>
));

DashboardInsightsSection.displayName = 'DashboardInsightsSection';
