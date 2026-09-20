import React, { Suspense } from 'react';
import type { DailySummary, ExerciseStats, WorkoutSet } from '../../types';
import type { BodyMapGender } from '../bodyMap/BodyMap';
import type { ExerciseTrendMode, WeightUnit } from '../../utils/storage/localStorage';
import { Tab } from '../../app/navigation';
import { SupportLinks } from '../layout/SupportLinks';
import { TabSkeleton } from '../ui/TabSkeleton';
import { DashboardSkeleton } from '../dashboard/ui/DashboardSkeleton';

const Dashboard = React.lazy(() => import('../dashboard/ui/Dashboard').then((m) => ({ default: m.Dashboard })));
const ExerciseView = React.lazy(() => import('../exerciseView/ui/ExerciseView').then((m) => ({ default: m.ExerciseView })));
const HistoryView = React.lazy(() => import('../historyView/ui/HistoryView').then((m) => ({ default: m.HistoryView })));
const MuscleAnalysis = React.lazy(() => import('../muscleAnalysis/ui/MuscleAnalysis').then((m) => ({ default: m.MuscleAnalysis })));
const FlexView = React.lazy(() => import('../flexView/ui/FlexView').then((m) => ({ default: m.FlexView })));

type InitialMuscleForAnalysis = { muscleId: string } | null;

type WeeklySetsWindow = 'all' | '7d' | '30d' | '365d';

type DateRange = { start: Date; end: Date };

interface AppTabContentProps {
  mainRef: React.RefObject<HTMLElement | null>;

  activeTab: Tab;
  isTabPending?: boolean;
  hasActiveCalendarFilter: boolean;

  dailySummaries: DailySummary[];
  exerciseStats: ExerciseStats[];
  parsedData: WorkoutSet[];
  filteredData: WorkoutSet[];
  filterCacheKey: string;

  filtersSlot: React.ReactNode;

  highlightedExercise: string | null;
  onHighlightApplied: () => void;

  onDayClick: (date: Date) => void;
  onMuscleClick?: (
    muscleId: string,
    weeklySetsWindow: WeeklySetsWindow
  ) => void;
  onExerciseClick?: (exerciseName: string) => void;

  onHistoryDayTitleClick?: (date: Date) => void;
  targetHistoryDate: Date | null;
  onTargetHistoryDateConsumed: () => void;

  initialMuscleForAnalysis: InitialMuscleForAnalysis;
  initialWeeklySetsWindow: WeeklySetsWindow | null;
  onInitialMuscleConsumed: () => void;

  bodyMapGender: BodyMapGender;
  weightUnit: WeightUnit;
  exerciseTrendMode: ExerciseTrendMode;
  secondarySetMultiplier: number;
  now: Date;
}

export const AppTabContent: React.FC<AppTabContentProps> = ({
  mainRef,
  activeTab,
  isTabPending = false,
  hasActiveCalendarFilter,
  dailySummaries,
  exerciseStats,
  parsedData,
  filteredData,
  filterCacheKey,
  filtersSlot,
  highlightedExercise,
  onHighlightApplied,
  onDayClick,
  onMuscleClick,
  onExerciseClick,
  onHistoryDayTitleClick,
  targetHistoryDate,
  onTargetHistoryDateConsumed,
  initialMuscleForAnalysis,
  initialWeeklySetsWindow,
  onInitialMuscleConsumed,
  bodyMapGender,
  weightUnit,
  exerciseTrendMode,
  secondarySetMultiplier,
  now,
}) => {
  return (
    <main
      ref={mainRef}
      aria-busy={isTabPending}
      className={`flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-black/20 px-2 py-0 sm:px-3 sm:py-0 md:px-1 md:py-0 lg:px-2 lg:py-0 transition-opacity duration-150 ${isTabPending ? 'opacity-70' : ''}`}
    >
      {activeTab === Tab.DASHBOARD && (
        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard
            dailyData={dailySummaries}
            exerciseStats={exerciseStats}
            parsedData={parsedData}
            filteredData={filteredData}
            filterCacheKey={filterCacheKey}
            filtersSlot={filtersSlot}
            stickyHeader={hasActiveCalendarFilter}
            onDayClick={onDayClick}
            onMuscleClick={onMuscleClick}
            onExerciseClick={onExerciseClick}
            bodyMapGender={bodyMapGender}
            weightUnit={weightUnit}
            secondarySetMultiplier={secondarySetMultiplier}
            now={now}
          />
        </Suspense>
      )}
      {activeTab === Tab.EXERCISES && (
        <Suspense fallback={<TabSkeleton rows={5} />}>
          <ExerciseView
            stats={exerciseStats}
            filteredData={filteredData}
            filterCacheKey={filterCacheKey}
            filtersSlot={filtersSlot}
            highlightedExercise={highlightedExercise}
            onHighlightApplied={onHighlightApplied}
            onExerciseClick={onExerciseClick}
            weightUnit={weightUnit}
            exerciseTrendMode={exerciseTrendMode}
            bodyMapGender={bodyMapGender}
            stickyHeader={hasActiveCalendarFilter}
            now={now}
            secondarySetMultiplier={secondarySetMultiplier}
          />
        </Suspense>
      )}
      {activeTab === Tab.HISTORY && (
        <Suspense fallback={<TabSkeleton rows={5} />}>
          <HistoryView
            data={filteredData}
            filterCacheKey={filterCacheKey}
            filtersSlot={filtersSlot}
            weightUnit={weightUnit}
            bodyMapGender={bodyMapGender}
            stickyHeader={hasActiveCalendarFilter}
            onExerciseClick={onExerciseClick}
            onDayTitleClick={onHistoryDayTitleClick}
            targetDate={targetHistoryDate}
            onTargetDateConsumed={onTargetHistoryDateConsumed}
            now={now}
            secondarySetMultiplier={secondarySetMultiplier}
          />
        </Suspense>
      )}
      {activeTab === Tab.MUSCLE_ANALYSIS && (
        <Suspense fallback={<TabSkeleton rows={6} />}>
          <MuscleAnalysis
            data={filteredData}
            lifetimeData={parsedData}
            filterCacheKey={filterCacheKey}
            filtersSlot={filtersSlot}
            onExerciseClick={onExerciseClick}
            initialMuscle={initialMuscleForAnalysis}
            initialWeeklySetsWindow={initialWeeklySetsWindow}
            onInitialMuscleConsumed={onInitialMuscleConsumed}
            bodyMapGender={bodyMapGender}
            stickyHeader={hasActiveCalendarFilter}
            now={now}
            secondarySetMultiplier={secondarySetMultiplier}
            exerciseStats={exerciseStats}
          />
        </Suspense>
      )}
      {activeTab === Tab.FLEX && (
        <Suspense fallback={<TabSkeleton rows={4} />}>
          <FlexView
            data={filteredData}
            filtersSlot={filtersSlot}
            weightUnit={weightUnit}
            dailySummaries={dailySummaries}
            exerciseStats={exerciseStats}
            stickyHeader={hasActiveCalendarFilter}
            bodyMapGender={bodyMapGender}
            now={now}
            secondarySetMultiplier={secondarySetMultiplier}
            filterCacheKey={filterCacheKey}
          />
        </Suspense>
      )}

      <div className="hidden sm:block mt-5">
        <SupportLinks variant="secondary" layout="footer" />
      </div>

      <div className="sm:hidden pb-[calc(env(safe-area-inset-bottom))] mt-5">
        <SupportLinks variant="all" layout="footer" />
      </div>
    </main>
  );
};
