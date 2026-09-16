import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { InsightsPanel, PlateauAlert, RecentPRsPanel } from '../../insights/InsightCards';
import { ActivityHeatmap } from './ActivityHeatmap';
import { LifetimeLedgerPanel } from '../receipt/LifetimeLedgerPanel';
import { TrainingManifestCard } from '../manifest/TrainingManifestCard';
import { TrainingTimelineCard } from '../trainingTimeline/TrainingTimelineCard';
import { DashboardSummaryCard } from './DashboardSummaryCard';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { DailySummary, WorkoutSet } from '../../../types';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import type { TimelineProgress } from '../../../utils/training/trainingTimeline';
import type { DashboardSummaryResult } from '../../../utils/analysis/dashboardSummary/dashboardSummary';
import type { WeeklySetsDashboardResult } from '../../../utils/muscle/analytics/dashboardWeeklySets';
import { stripExerciseSourceLabel } from '../../../utils/exercise/exerciseSourceLabel';

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

export const DashboardInsightsSection: React.FC<DashboardInsightsSectionProps> = ({
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

    {/* Manifest + lifetime ledger: stacked on mobile, equal-height 2/3 + 1/3 on desktop */}
    <div className="grid gap-2 lg:grid-cols-3 lg:items-stretch">
      <div className="min-w-0 h-full lg:col-span-2">
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
      </div>
      <div className="hidden min-w-0 h-full lg:block">
        <LifetimeLedgerPanel
          fullData={fullData}
          dailyData={dailyData}
          weightUnit={weightUnit}
          effectiveNow={effectiveNow}
          streakWeeks={dashboardInsights?.streakInfo?.currentStreak ?? 0}
          remark={dashboardSummary.sentences?.[0]?.slice(0, 140)}
          onExerciseClick={onExerciseClick}
        />
      </div>
    </div>
  </>
);
