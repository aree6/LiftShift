import React from 'react';
import { Award, Trophy } from 'lucide-react';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { ExerciseThumbnail } from '../../common/ExerciseThumbnail';
import type { TopExerciseBarDatum } from './TopExercisesCard';
import { stripExerciseSourceLabel } from '../../../utils/exercise/exerciseSourceLabel';
import { SEMI_FANCY_FONT } from '../../../utils/ui/uiConstants';

interface TopExercisesBarViewProps {
  topExercisesBarData: TopExerciseBarDatum[];
  pieColors: string[];
  onExerciseClick?: (exerciseName: string) => void;
  assetsMap: Map<string, ExerciseAsset> | null;
  assetsLowerMap: Map<string, ExerciseAsset> | null;
}

export const TopExercisesBarView: React.FC<TopExercisesBarViewProps> = ({
  topExercisesBarData,
  pieColors,
  onExerciseClick,
  assetsMap,
  assetsLowerMap,
}) => {
  if (topExercisesBarData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[320px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
        Not enough data to render Most Frequent Exercises.
      </div>
    );
  }

  const max = Math.max(...topExercisesBarData.map((e) => e.count), 1);
  const tickValues = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

  return (
    <div className="w-full h-[320px] flex flex-col px-1 sm:px-2 overflow-x-hidden">
      <div className="flex items-center gap-3 px-1 mb-2">
        <div className="flex-1 text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold">Exercise</div>
        <div className="min-w-[64px] text-right text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold">Sets</div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          {[0, 25, 50, 75, 100].map((p) => (
            <div key={p} className="absolute top-0 bottom-0 border-l border-slate-800/70" style={{ left: `${p}%` }} />
          ))}
        </div>

        {(() => {
          const n = Math.max(topExercisesBarData.length, 1);
          const headerH = 22;
          const axisH = 18;
          const padding = 8;
          const available = 320 - headerH - axisH - padding;
          const gap = 12;
          const rowH = 48;
          const avatar = 40;
          const contentH = n * rowH + (n - 1) * gap;
          const verticalPad = Math.max(0, available - contentH);

          return (
            <div
              className="relative"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: `${gap}px`,
                height: `${available}px`,
                paddingTop: `${Math.floor(verticalPad / 2)}px`,
                paddingBottom: `${Math.ceil(verticalPad / 2)}px`,
                overflow: 'hidden',
              }}
            >
              {topExercisesBarData.map((exercise, idx) => {
                const color = pieColors[idx % pieColors.length];
                const baseName = stripExerciseSourceLabel(exercise.name);
                const asset = assetsMap?.get(baseName) || assetsLowerMap?.get(baseName.toLowerCase());
                const pct = Math.max(6, Math.round((exercise.count / max) * 100));

                const medal = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null;
                const medalIcon = medal === 'gold' ? <Trophy className="inline w-4 h-4 -mt-0.5" /> : medal === 'silver' ? <Award className="inline w-4 h-4 -mt-0.5" /> : medal === 'bronze' ? <Award className="inline w-4 h-4 -mt-0.5" /> : null;
                const countClass =
                  medal === 'gold'
                    ? 'text-amber-300'
                    : medal === 'silver'
                      ? 'text-slate-200'
                      : medal === 'bronze'
                        ? 'text-orange-300'
                        : 'text-white';

                const fillBackground =
                  medal === 'gold'
                    ? 'linear-gradient(90deg, rgba(245,158,11,0.95) 0%, rgba(59,130,246,0.9) 100%)'
                    : medal === 'silver'
                      ? 'linear-gradient(90deg, rgba(226,232,240,0.96) 0%, rgba(148,163,184,0.92) 40%, rgba(59,130,246,0.85) 100%)'
                      : medal === 'bronze'
                        ? 'linear-gradient(90deg, rgba(251,146,60,0.9) 0%, rgba(59,130,246,0.85) 100%)'
                        : undefined;

                const countShimmerStyle: React.CSSProperties | undefined = medal
                  ? {
                      backgroundImage:
                        medal === 'gold'
                          ? 'linear-gradient(90deg, rgba(245,158,11,1) 0%, rgba(255,255,255,0.95) 18%, rgba(245,158,11,1) 36%, rgba(251,191,36,1) 100%)'
                          : medal === 'silver'
                            ? 'linear-gradient(90deg, rgba(148,163,184,1) 0%, rgba(255,255,255,0.98) 18%, rgba(148,163,184,1) 36%, rgba(226,232,240,1) 100%)'
                            : 'linear-gradient(90deg, rgba(251,146,60,1) 0%, rgba(255,255,255,0.92) 18%, rgba(251,146,60,1) 36%, rgba(253,186,116,1) 100%)',
                      backgroundSize: '220% 100%',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.08))',
                      animation: 'textShimmer 2.4s linear 1',
                    }
                  : undefined;

                const barWidthPct = Math.max(8, pct);
                const countReservePx = 88;

                return (
                  <button
                    key={exercise.name}
                    type="button"
                    onClick={() => onExerciseClick?.(exercise.name)}
                    className="w-full min-w-0 text-left cursor-pointer"
                    title={`View ${exercise.name}`}
                  >
                    <div className="hidden sm:flex items-center gap-2 min-w-0">
                      <div
                        className="relative rounded-full overflow-hidden min-w-0 border border-transparent hover:border-slate-600/40 transition-colors"
                        style={{
                          height: `${rowH}px`,
                          width: `${barWidthPct}%`,
                          minWidth: `${avatar + 72}px`,
                          maxWidth: `calc(100% - ${countReservePx}px)`,
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            backgroundColor: fillBackground ? undefined : color,
                            backgroundImage: fillBackground,
                            opacity: 0.95,
                          }}
                        />

                        <div className="relative z-10 h-full flex items-center pl-4" style={{ paddingRight: `${avatar + 14}px` }}>
                          <div className="text-white font-semibold text-sm sm:text-base truncate" style={SEMI_FANCY_FONT}>
                            {medalIcon ? <>{medalIcon} {exercise.name}</> : exercise.name}
                          </div>
                        </div>

                        <div
                          className="absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white"
                          style={{ width: `${avatar}px`, height: `${avatar}px` }}
                        >
                          <ExerciseThumbnail
                            asset={asset}
                            className="w-full h-full"
                            imageClassName="w-full h-full object-cover object-center"
                          />
                        </div>
                      </div>

                      <div className={`shrink-0 font-extrabold text-xl tracking-tight ${countClass}`}>
                        {medal ? (
                          <span style={countShimmerStyle}>{exercise.count}x</span>
                        ) : (
                          <>
                            {exercise.count}
                            <span className="text-white/90 font-bold ml-1">x</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:hidden min-w-0">
                      <div
                        className="relative rounded-full overflow-hidden min-w-0 border border-transparent hover:border-slate-600/40 transition-colors"
                        style={{
                          height: `${rowH}px`,
                          width: `${barWidthPct}%`,
                          minWidth: `${avatar + 72}px`,
                          maxWidth: '100%',
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            backgroundColor: fillBackground ? undefined : color,
                            backgroundImage: fillBackground,
                            opacity: 0.95,
                          }}
                        />

                        <div className="relative z-10 h-full flex items-center pl-4" style={{ paddingRight: `${avatar + 14}px` }}>
                          <div className="text-white font-semibold text-sm sm:text-base truncate" style={SEMI_FANCY_FONT}>
                            {medalIcon ? <>{medalIcon} {exercise.name}</> : exercise.name}
                          </div>
                        </div>

                        <div
                          className="absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white"
                          style={{ width: `${avatar}px`, height: `${avatar}px` }}
                        >
                          <ExerciseThumbnail
                            asset={asset}
                            className="w-full h-full"
                            imageClassName="w-full h-full object-cover object-center"
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="mt-2 flex items-center gap-3 px-1">
        <div className="flex-1 flex justify-between text-[10px] sm:text-xs text-slate-500 font-medium">
          {tickValues.map((v, i) => (
            <span key={`${v}-${i}`}>{v}</span>
          ))}
        </div>
        <div className="min-w-[64px]" />
      </div>
    </div>
  );
};
