import React from 'react';

import type { WorkoutSet } from '../../../types';
import type { PRInsights, StreakInfo } from '../../../utils/analysis/insights';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import { BestMonthCard } from '../ui/BestMonthCard';
import { MuscleFocusCard } from '../ui/MuscleFocusCard';
import { PersonalRecordsCard } from '../ui/PersonalRecordsCard';
import { ReceiptCard } from '../ui/ReceiptCard';
import { StreakCard } from '../ui/StreakCard';
import { SummaryCard } from '../ui/SummaryCard';
import { TopExercisesCard } from '../ui/TopExercisesCard';
import { VolumeComparisonCard } from '../ui/VolumeComparisonCard';
import { YearlyHeatmapCard } from '../ui/YearlyHeatmapCard';
import type { CardTheme } from '../ui/FlexCard';
import type { FlexCardId } from '../utils/flexViewConstants';
import type { FlexMuscleHeatmap, FlexStats, FlexTopPRExercise } from '../utils/flexViewTypes';

interface FlexCardRendererProps {
  cardId: FlexCardId;
  stats: FlexStats;
  weightUnit: WeightUnit;
  cardTheme: CardTheme;
  volumeCardTheme: CardTheme;
  onToggleVolumeTheme: () => void;
  data: WorkoutSet[];
  streakInfo: StreakInfo;
  prInsights: PRInsights;
  topPRExercises: FlexTopPRExercise[];
  effectiveYear: number;
  muscleHeatmap: FlexMuscleHeatmap;
  bodyMapGender: BodyMapGender;
  effectiveNow: Date;
}

export const FlexCardRenderer: React.FC<FlexCardRendererProps> = ({
  cardId,
  stats,
  weightUnit,
  cardTheme,
  volumeCardTheme,
  onToggleVolumeTheme,
  data,
  streakInfo,
  prInsights,
  topPRExercises,
  effectiveYear,
  muscleHeatmap,
  bodyMapGender,
  effectiveNow,
}) => {
  switch (cardId) {
    case 'receipt':
      return (
        <ReceiptCard
          data={data}
          weightUnit={weightUnit}
          effectiveNow={effectiveNow}
          streakWeeks={streakInfo?.currentStreak ?? 0}
        />
      );
    case 'summary':
      return (
        <SummaryCard
          totalWorkouts={stats.totalWorkouts}
          totalDuration={stats.totalDuration}
          totalVolume={stats.totalVolume}
          totalSets={stats.totalSets}
          totalReps={stats.totalReps}
          weightUnit={weightUnit}
          theme={cardTheme}
        />
      );
    case 'volume':
      return (
        <VolumeComparisonCard
          totalVolume={stats.totalVolume}
          totalVolumeKg={stats.totalVolumeKg}
          weightUnit={weightUnit}
          theme={volumeCardTheme}
          showThemeToggle={true}
          onThemeToggle={onToggleVolumeTheme}
        />
      );
    case 'year-heatmap':
      return <YearlyHeatmapCard data={data} theme={cardTheme} />;
    case 'streak':
      return <StreakCard streakInfo={streakInfo} theme={cardTheme} />;
    case 'prs':
      return (
        <PersonalRecordsCard
          prInsights={prInsights}
          topPRExercises={topPRExercises}
          weightUnit={weightUnit}
          theme={cardTheme}
        />
      );
    case 'best-month':
      return <BestMonthCard monthlyData={stats.monthlyData} theme={cardTheme} selectedYear={effectiveYear} />;
    case 'top-exercises':
      return <TopExercisesCard exercises={stats.topExercises} theme={cardTheme} />;
    case 'muscle-focus':
      return (
        <MuscleFocusCard
          muscleData={stats.muscleData}
          muscleHeatmap={muscleHeatmap}
          theme={cardTheme}
          gender={bodyMapGender}
          effectiveNow={effectiveNow}
        />
      );
    default:
      return null;
  }
};
