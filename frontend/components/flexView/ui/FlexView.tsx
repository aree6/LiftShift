import React, { useEffect, useMemo, useState } from 'react';

import type { DailySummary, ExerciseStats, WorkoutSet } from '../../../types';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import { getEffectiveNowFromWorkoutData } from '../../../utils/date/dateUtils';
import { useTheme } from '../../theme/ThemeProvider';
import type { CardTheme } from './FlexCard';
import { FlexCardRenderer } from '../parts/FlexCardRenderer';
import { FlexCarousel } from '../parts/FlexCarousel';
import { FlexFocusedCardModal } from '../parts/FlexFocusedCardModal';
import { FlexHeader } from '../parts/FlexHeader';
import { FLEX_CARDS } from '../utils/flexViewConstants';
import { useFlexAssets } from '../hooks/useFlexAssets';
import { useFlexFocus } from '../hooks/useFlexFocus';
import { useFlexMuscleHeatmap } from '../hooks/useFlexMuscleHeatmap';
import { useFlexInsights } from '../hooks/useFlexInsights';
import { useFlexStats } from '../hooks/useFlexStats';

interface FlexViewProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
  weightUnit?: WeightUnit;
  dailySummaries?: DailySummary[];
  exerciseStats?: ExerciseStats[];
  stickyHeader?: boolean;
  bodyMapGender?: BodyMapGender;
  /** Reference date for relative time calculations. Pass from App for centralized date mode control. */
  now?: Date;
  secondarySetMultiplier?: number;
}

export const FlexView: React.FC<FlexViewProps> = ({
  data,
  filtersSlot,
  weightUnit = 'kg' as WeightUnit,
  dailySummaries: dailySummariesProp,
  exerciseStats: exerciseStatsProp,
  stickyHeader = false,
  bodyMapGender = 'male',
  now,
  secondarySetMultiplier = 0.5,
}) => {
  const { mode } = useTheme();
  const cardTheme: CardTheme = mode === 'light' ? 'light' : 'dark';
  const [volumeCardTheme, setVolumeCardTheme] = useState<CardTheme>(cardTheme);

  const { assetLookup, exerciseMuscleData } = useFlexAssets();
  const effectiveNow = useMemo(() => now ?? getEffectiveNowFromWorkoutData(data), [now, data]);

  // Desktop users get the receipt pair (manifest + ledger) in the dashboard
  // itself, so the carousel skips the receipt slide there entirely (no hidden
  // slide, no snap stop, no modal entry). Matches Tailwind's lg breakpoint.
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? false
      : (window.matchMedia?.('(min-width: 1024px)')?.matches ?? false),
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const visibleCards = useMemo(
    () => (isDesktop ? FLEX_CARDS.filter((c) => c.id !== 'receipt') : FLEX_CARDS),
    [isDesktop],
  );

  const ytdMuscleHeatmap = useFlexMuscleHeatmap(data, effectiveNow, exerciseMuscleData, secondarySetMultiplier);
  const stats = useFlexStats({
    data,
    weightUnit,
    dailySummaries: dailySummariesProp,
    assetLookup,
    effectiveNow,
    secondarySetMultiplier,
  });

  const { streakInfo, prInsights, topPRExercises } = useFlexInsights({
    data,
    effectiveNow,
    weightUnit,
    assetLookup,
    exerciseStats: exerciseStatsProp,
  });

  const {
    focusedCardId,
    setFocusedCardId,
    showFocusedNav,
    setShowFocusedNav,
    toggleFocusedNavTouch,
    focusAdjacentCard,
    canHover,
    clearHideNavTimeout,
  } = useFlexFocus(visibleCards.map((card) => card.id));

  const renderCard = (id: (typeof FLEX_CARDS)[number]['id']) => (
    <FlexCardRenderer
      cardId={id}
      stats={stats}
      weightUnit={weightUnit}
      cardTheme={cardTheme}
      volumeCardTheme={volumeCardTheme}
      onToggleVolumeTheme={() => setVolumeCardTheme(volumeCardTheme === 'dark' ? 'light' : 'dark')}
      data={data}
      streakInfo={streakInfo}
      prInsights={prInsights}
      topPRExercises={topPRExercises}
      effectiveYear={effectiveNow.getFullYear()}
      muscleHeatmap={ytdMuscleHeatmap}
      bodyMapGender={bodyMapGender}
      effectiveNow={effectiveNow}
    />
  );

  return (
    <div className="flex flex-col gap-1 w-full text-slate-200 pb-6">
      <FlexHeader stats={stats} weightUnit={weightUnit} filtersSlot={filtersSlot} stickyHeader={stickyHeader} />

      <FlexCarousel cards={visibleCards} onSelectCard={setFocusedCardId} renderCard={renderCard} />

      <div className="hidden" />
      <div className="hidden" />

      {focusedCardId && visibleCards.some((c) => c.id === focusedCardId) ? (
        <FlexFocusedCardModal
          cardId={focusedCardId}
          renderCard={renderCard}
          onClose={() => setFocusedCardId(null)}
          onPrev={() => focusAdjacentCard(-1)}
          onNext={() => focusAdjacentCard(1)}
          showFocusedNav={showFocusedNav}
          setShowFocusedNav={setShowFocusedNav}
          toggleFocusedNavTouch={toggleFocusedNavTouch}
          clearHideNavTimeout={clearHideNavTimeout}
          canHover={canHover}
          cardTheme={cardTheme}
        />
      ) : null}
    </div>
  );
};

export default FlexView;
