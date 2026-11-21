import React, { Suspense, lazy, memo } from 'react';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import type { DailySummary, WorkoutSet } from '../../../types';
import type { BodyMapGender } from '../../bodyMap/BodyMap';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';

// Bottom-of-page paper pair (heavy SVG filters + muscle pipeline): split into
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

interface DashboardPaperSectionProps {
  fullData: WorkoutSet[];
  dailyData: DailySummary[];
  weightUnit: WeightUnit;
  effectiveNow: Date;
  onExerciseClick?: (exerciseName: string) => void;
  assetsMap?: Map<string, ExerciseAsset> | null;
  bodyMapGender?: BodyMapGender;
  secondarySetMultiplier?: number;
  streakWeeks: number;
}

export const DashboardPaperSection: React.FC<DashboardPaperSectionProps> = memo(({
  fullData,
  dailyData,
  weightUnit,
  effectiveNow,
  onExerciseClick,
  assetsMap,
  bodyMapGender = 'male',
  secondarySetMultiplier = 0.5,
  streakWeeks,
}) => (
  /* Manifest + lifetime ledger: stacked on mobile, equal-height 2/3 + 1/3 on
     desktop. Offscreen rendering is skipped via content-visibility so the
     paper filters never cost anything until scrolled to. */
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
          streakWeeks={streakWeeks}
          onExerciseClick={onExerciseClick}
        />
      </Suspense>
    </div>
  </div>
));

DashboardPaperSection.displayName = 'DashboardPaperSection';
