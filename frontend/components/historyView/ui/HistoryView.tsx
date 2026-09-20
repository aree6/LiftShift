import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { WorkoutSet } from '../../../types';
import { Calendar, Dumbbell } from 'lucide-react';
import { getExerciseAssets, ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { loadExerciseMuscleData, ExerciseMuscleData } from '../../../utils/muscle/mapping';
import { isWarmupSet } from '../../../utils/analysis/masterAlgorithm';
import { ViewHeader } from '../../layout/ViewHeader';
import { WeightUnit } from '../../../utils/storage/localStorage';
import { getEffectiveNowFromWorkoutData } from '../../../utils/date/dateUtils';
import { BodyMapGender } from '../../bodyMap/BodyMap';
import { useTheme } from '../../theme/ThemeProvider';
import { TooltipPortal } from './HistoryTooltipPortal';
import { buildHistorySessions, type Session } from '../utils/historySessions';
import { useExerciseBestHistory, useExerciseVolumeHistory, useExerciseVolumePrHistory, useExerciseHistoricalSets } from '../utils/exerciseHistoryHooks';
import { useHistoryTooltip } from '../hooks/useHistoryTooltip';
import { HistoryPaginationControls } from './HistoryPaginationControls';
import { HistorySessionBlock } from './HistorySessionBlock';
import { ITEMS_PER_PAGE, isSameCalendarDay } from '../utils/historyViewConstants';
import { prefetchFlexData, schedulePrefetch } from '../../../utils/prefetch/prefetchStrategies';
import { useTrainingLevel } from '../../../hooks/app/useTrainingLevel';

interface HistoryViewProps {
  data: WorkoutSet[];
  filterCacheKey: string;
  filtersSlot?: React.ReactNode;
  weightUnit?: WeightUnit;
  bodyMapGender?: BodyMapGender;
  stickyHeader?: boolean;
  onExerciseClick?: (exerciseName: string) => void;
  onDayTitleClick?: (date: Date) => void;
  targetDate?: Date | null;
  onTargetDateConsumed?: () => void;
  now?: Date;
  secondarySetMultiplier?: number;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  data,
  filterCacheKey,
  filtersSlot,
  weightUnit = 'kg',
  bodyMapGender = 'male',
  stickyHeader = false,
  onExerciseClick,
  targetDate,
  onTargetDateConsumed,
  now,
  secondarySetMultiplier = 0.5,
}) => {
  const { mode } = useTheme();
  const isLightMode = mode === 'light';
  const [currentPage, setCurrentPage] = useState(1);
  const { tooltip, setTooltip, handleMouseEnter, handleTooltipToggle } = useHistoryTooltip();
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(() => new Set());

  const effectiveNow = useMemo(() => now ?? getEffectiveNowFromWorkoutData(data, new Date(0)), [now, data]);

  const exerciseVolumeHistory = useExerciseVolumeHistory(data);
  const { exerciseBests, currentBests } = useExerciseBestHistory(data);
  const { exerciseVolumePrBests } = useExerciseVolumePrHistory(data);
  const exerciseHistoricalSets = useExerciseHistoricalSets(data);
  const { trainingLevel } = useTrainingLevel(data, effectiveNow);

  useEffect(() => setCurrentPage(1), [data]);

  useEffect(() => {
    setCollapsedSessions(new Set());
  }, [data]);

  useEffect(() => {
    let mounted = true;
    getExerciseAssets()
      .then((m) => { if (mounted) setAssetsMap(m); })
      .catch(() => setAssetsMap(new Map()));
    loadExerciseMuscleData()
      .then((m) => { if (mounted) setExerciseMuscleData(m); });
    return () => { mounted = false; };
  }, []);

  // Prefetch Flex view data when idle on History view
  useEffect(() => {
    if (data.length === 0) return;

    const cancel = schedulePrefetch(() => {
      prefetchFlexData(filterCacheKey, data, effectiveNow);
    });

    return cancel;
  }, [filterCacheKey, data, effectiveNow]);

  const sessions: Session[] = useMemo(() => buildHistorySessions(data), [data]);
  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const currentSessions = sessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const navigateToSession = useCallback((key: string) => {
    const idx = sessions.findIndex((s) => s.key === key);
    if (idx === -1) return;

    const page = Math.floor(idx / ITEMS_PER_PAGE) + 1;

    if (page !== currentPage) {
      setCurrentPage(page);
    }

    setTimeout(() => {
      document.getElementById(`session-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, page !== currentPage ? 100 : 0);
  }, [sessions, currentPage]);

  useEffect(() => {
    if (!targetDate || sessions.length === 0) return;

    const targetSessionIndex = sessions.findIndex((session) =>
      session.date && isSameCalendarDay(session.date, targetDate)
    );

    if (targetSessionIndex !== -1) {
      const targetPage = Math.floor(targetSessionIndex / ITEMS_PER_PAGE) + 1;

      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }

      setTimeout(() => {
        const sessionElement = document.getElementById(`session-${sessions[targetSessionIndex].key}`);
        if (sessionElement) {
          sessionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          sessionElement.classList.add('bg-emerald-400/10');
          setTimeout(() => {
            sessionElement.classList.remove('bg-emerald-400/10');
          }, 2000);
        }
        onTargetDateConsumed?.();
      }, 100);
    } else {
      onTargetDateConsumed?.();
    }
  }, [targetDate, sessions, currentPage, onTargetDateConsumed]);

  const totalSessions = sessions.length;
  const totalSets = useMemo(() => {
    return data.reduce((acc, s) => (isWarmupSet(s) ? acc : acc + 1), 0);
  }, [data]);

  const pageChangeScrollRef = useRef(false);

  const scrollHistoryToTop = useCallback(() => {
    const historyElement = document.querySelector('[data-history-view]') as HTMLElement;
    if (historyElement) {
      historyElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) {
      scrollHistoryToTop();
      return;
    }
    // Page turns rebuild session blocks: keep the click responsive and let
    // React render the next page at lower priority. The scroll runs in the
    // effect below so it can't fire before the new blocks commit.
    pageChangeScrollRef.current = true;
    React.startTransition(() => {
      setCurrentPage(newPage);
    });
  };

  useEffect(() => {
    if (!pageChangeScrollRef.current) return;
    pageChangeScrollRef.current = false;
    const t = setTimeout(() => {
      scrollHistoryToTop();
    }, 150);
    return () => clearTimeout(t);
  }, [currentPage]);

  const paginationControls = (
    <HistoryPaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
  );

  return (
    <div
      data-history-view
      className="flex flex-col gap-1 w-full text-slate-200 pb-10"
      onClick={(e) => {
        if (tooltip && e.target === e.currentTarget) {
          setTooltip(null);
        }
      }}
    >
      <div className="hidden sm:contents">
        <ViewHeader
          leftStats={[{ icon: Calendar, value: totalSessions, label: 'Sessions' }]}
          rightStats={[{ icon: Dumbbell, value: totalSets, label: 'Sets' }]}
          filtersSlot={filtersSlot}
          sticky={stickyHeader}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-2 pb-4 sm:pt-0">
          {paginationControls}
        </div>
      )}

      {/* Stable key: remounting the whole page container on every page turn
      re-ran all block effects/animations and lost collapsed/tooltip state.
      Blocks reconcile by session.key instead. */}
      <div className="space-y-2 sm:space-y-3">
        {currentSessions.map((session, index) => (
          <HistorySessionBlock
            key={session.key}
            session={session}
            index={index}
            currentSessions={currentSessions}
            sessions={sessions}
            collapsedSessions={collapsedSessions}
            setCollapsedSessions={setCollapsedSessions}
            weightUnit={weightUnit}
            bodyMapGender={bodyMapGender}
            exerciseMuscleData={exerciseMuscleData}
            assetsMap={assetsMap}
            effectiveNow={effectiveNow}
            isLightMode={isLightMode}
            exerciseVolumeHistory={exerciseVolumeHistory}
            exerciseBests={exerciseBests}
            currentBests={currentBests}
            exerciseVolumePrBests={exerciseVolumePrBests}
            exerciseHistoricalSets={exerciseHistoricalSets}
            trainingLevel={trainingLevel}
            secondarySetMultiplier={secondarySetMultiplier}
            onExerciseClick={onExerciseClick}
            onTooltipToggle={handleTooltipToggle}
            onMouseEnter={handleMouseEnter}
            onClearTooltip={() => setTooltip(null)}
            setTooltip={setTooltip}
            onNavigateToSession={navigateToSession}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center pt-4 pb-6">
          {paginationControls}
        </div>
      )}

      {tooltip && <TooltipPortal data={tooltip} />}
    </div>
  );
};
