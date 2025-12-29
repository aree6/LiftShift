import React from 'react';
import { AreaChart as AreaChartIcon, ChartBarStacked, Dumbbell, Infinity, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExerciseAsset } from '../../utils/data/exerciseAssets';
import { formatSignedNumber } from '../../utils/format/formatters';
import { LazyRender } from '../LazyRender';
import { ChartSkeleton } from '../ChartSkeleton';
import {
  BadgeLabel,
  ChartDescription,
  getTrendBadgeTone,
  InsightLine,
  InsightText,
  TrendBadge,
  TrendIcon,
} from './ChartBits';

export type TopExerciseMode = 'all' | 'weekly' | 'monthly';
export type TopExercisesView = 'barh' | 'area';

export type TopExerciseBarDatum = { name: string; count: number };

export type TopExercisesInsight = {
  windowLabel: string;
  delta: { direction: 'up' | 'down' | 'same'; deltaPercent: number } | null;
  top: TopExerciseBarDatum | undefined;
  topShare: number;
};

export const TopExercisesCard = ({
  isMounted,
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
  onExerciseClick,
  assetsMap,
  assetsLowerMap,
}: {
  isMounted: boolean;
  topExerciseMode: TopExerciseMode;
  setTopExerciseMode: (m: TopExerciseMode) => void;
  topExercisesView: TopExercisesView;
  setTopExercisesView: (v: TopExercisesView) => void;
  topExercisesBarData: TopExerciseBarDatum[];
  topExercisesOverTimeData: any[];
  topExerciseNames: string[];
  topExercisesInsight: TopExercisesInsight;
  pieColors: string[];
  tooltipStyle: Record<string, unknown>;
  onExerciseClick?: (exerciseName: string) => void;
  assetsMap: Map<string, ExerciseAsset> | null;
  assetsLowerMap: Map<string, ExerciseAsset> | null;
}) => {
  const formatSignedPctWithNoun = (pct: number, noun: string) =>
    `${formatSignedNumber(pct, { maxDecimals: 0 })}% ${noun}`;

  const pie = pieColors;

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[360px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Most Frequent Exercises
        </h3>
        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
          <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
            <button
              onClick={() => setTopExerciseMode('all')}
              title="All"
              aria-label="All"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                topExerciseMode === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Infinity className="w-3 h-3" />
              <span className="sr-only">All</span>
            </button>
            <button
              onClick={() => setTopExerciseMode('monthly')}
              title="Monthly"
              aria-label="Monthly"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
                topExerciseMode === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              mo
            </button>
            <button
              onClick={() => setTopExerciseMode('weekly')}
              title="Weekly"
              aria-label="Weekly"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
                topExerciseMode === 'weekly'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              wk
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
            <button
              onClick={() => setTopExercisesView('barh')}
              title="Bars"
              aria-label="Bars"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                topExercisesView === 'barh'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ChartBarStacked className="w-3 h-3" />
              <span className="sr-only">Bars</span>
            </button>
            <button
              onClick={() => setTopExercisesView('area')}
              title="Area"
              aria-label="Area"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                topExercisesView === 'area'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <AreaChartIcon className="w-3 h-3" />
              <span className="sr-only">Area</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
        {topExercisesView === 'barh' ? (
          topExercisesBarData.length === 0 ? (
            <div className="flex items-center justify-center h-[320px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              Not enough data to render Most Frequent Exercises.
            </div>
          ) : (
            <div className="w-full h-[320px] flex flex-col px-1 sm:px-2 overflow-x-hidden">
              {(() => {
                const max = Math.max(...topExercisesBarData.map((e) => e.count), 1);
                const tickValues = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

                return (
                  <>
                    <div className="flex items-center gap-3 px-1 mb-2">
                      <div className="flex-1 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Exercise</div>
                      <div className="min-w-[64px] text-right text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sets</div>
                    </div>

                    <div className="relative flex-1 overflow-hidden">
                      <div className="pointer-events-none absolute inset-0">
                        {[0, 25, 50, 75, 100].map((p) => (
                          <div
                            key={p}
                            className="absolute top-0 bottom-0 border-l border-slate-800/70"
                            style={{ left: `${p}%` }}
                          />
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
                              const color = pie[idx % pie.length];
                              const asset = assetsMap?.get(exercise.name) || assetsLowerMap?.get(exercise.name.toLowerCase());
                              const thumbnail = asset?.thumbnail;
                              const pct = Math.max(6, Math.round((exercise.count / max) * 100));

                              const medal = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null;
                              const medalEmoji = medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : medal === 'bronze' ? '🥉' : '';
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

                              const medalRing =
                                medal === 'gold'
                                  ? 'ring-2 ring-amber-300/70'
                                  : medal === 'silver'
                                    ? 'ring-2 ring-slate-100/80'
                                    : medal === 'bronze'
                                      ? 'ring-2 ring-orange-300/60'
                                      : '';

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
                                    animation: 'textShimmer 2.4s linear infinite',
                                  }
                                : undefined;

                              const barWidthPct = Math.max(8, pct);
                              const countReservePx = 88;

                              return (
                                <button
                                  key={exercise.name}
                                  type="button"
                                  onClick={() => onExerciseClick?.(exercise.name)}
                                  className="w-full min-w-0 text-left"
                                  title={`View ${exercise.name}`}
                                >
                                  <div className="hidden sm:flex items-center gap-2 min-w-0">
                                    <div
                                      className="relative rounded-full overflow-hidden min-w-0"
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

                                      <div
                                        className="relative z-10 h-full flex items-center pl-4"
                                        style={{ paddingRight: `${avatar + 14}px` }}
                                      >
                                        <div className="text-white font-semibold text-sm sm:text-base truncate">
                                          {medalEmoji ? `${medalEmoji} ${exercise.name}` : exercise.name}
                                        </div>
                                      </div>

                                      <div
                                        className={`absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white ${medalRing}`}
                                        style={{ width: `${avatar}px`, height: `${avatar}px` }}
                                      >
                                        {thumbnail ? (
                                          <img
                                            src={thumbnail}
                                            alt={exercise.name}
                                            className="w-full h-full object-cover object-center"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-white/95 flex items-center justify-center">
                                            <Dumbbell className="w-5 h-5 text-slate-500" />
                                          </div>
                                        )}
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
                                      className="relative rounded-full overflow-hidden min-w-0"
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

                                      <div
                                        className="relative z-10 h-full flex items-center pl-4"
                                        style={{ paddingRight: `${avatar + 14}px` }}
                                      >
                                        <div className="text-white font-semibold text-sm sm:text-base truncate">
                                          {medalEmoji ? `${medalEmoji} ${exercise.name}` : exercise.name}
                                        </div>
                                      </div>

                                      <div
                                        className={`absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white ${medalRing}`}
                                        style={{ width: `${avatar}px`, height: `${avatar}px` }}
                                      >
                                        {thumbnail ? (
                                          <img
                                            src={thumbnail}
                                            alt={exercise.name}
                                            className="w-full h-full object-cover object-center"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-white/95 flex items-center justify-center">
                                            <Dumbbell className="w-5 h-5 text-slate-500" />
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className={`self-end pr-1 font-extrabold text-xl tracking-tight ${countClass}`}>
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
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-2 flex items-center gap-3 px-1">
                      <div className="flex-1 flex justify-between text-[10px] text-slate-500 font-medium">
                        {tickValues.map((v, i) => (
                          <span key={`${v}-${i}`}>{v}</span>
                        ))}
                      </div>
                      <div className="min-w-[64px]" />
                    </div>
                  </>
                );
              })()}
            </div>
          )
        ) : (
          topExercisesOverTimeData.length === 0 || topExerciseNames.length === 0 ? (
            <div className="flex items-center justify-center h-[320px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              Not enough data to render Most Frequent Exercises area view.
            </div>
          ) : (
            <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 320 }} />}>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={topExercisesOverTimeData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle as any} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {topExerciseNames.map((exerciseName, idx) => (
                    <Area
                      key={exerciseName}
                      type="monotone"
                      dataKey={exerciseName}
                      name={exerciseName}
                      stackId="1"
                      stroke={pie[idx % pie.length]}
                      fill={pie[idx % pie.length]}
                      fillOpacity={0.25}
                      animationDuration={1200}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </LazyRender>
          )
        )}
      </div>

      <ChartDescription isMounted={isMounted}>
        <InsightLine>
          {topExercisesInsight.windowLabel === 'All time' ? (
            <>
              <TrendBadge label="All time" tone="info" />
              {topExercisesInsight.top && (
                <TrendBadge label={<BadgeLabel main={`Top: ${topExercisesInsight.top.name}`} />} tone="neutral" />
              )}
              {topExercisesInsight.top && (
                <TrendBadge
                  label={<BadgeLabel main={`${topExercisesInsight.topShare.toFixed(0)}%`} meta="of shown" />}
                  tone="neutral"
                />
              )}
            </>
          ) : (
            <>
              {topExercisesInsight.delta ? (
                <TrendBadge
                  label={
                    <BadgeLabel
                      main={
                        <span className="inline-flex items-center gap-1">
                          <TrendIcon direction={topExercisesInsight.delta.direction} />
                          <span>{formatSignedPctWithNoun(topExercisesInsight.delta.deltaPercent, 'sets')}</span>
                        </span>
                      }
                      meta={`vs prev ${topExercisesInsight.windowLabel}`}
                    />
                  }
                  tone={getTrendBadgeTone(topExercisesInsight.delta.deltaPercent, { goodWhen: 'up' })}
                />
              ) : (
                <TrendBadge label="Building baseline" tone="neutral" />
              )}
              {topExercisesInsight.top && (
                <TrendBadge label={<BadgeLabel main={`Top: ${topExercisesInsight.top.name}`} />} tone="neutral" />
              )}
              {topExercisesInsight.top && (
                <TrendBadge
                  label={<BadgeLabel main={`${topExercisesInsight.topShare.toFixed(0)}%`} meta="of shown" />}
                  tone={topExercisesInsight.topShare >= 45 ? 'bad' : topExercisesInsight.topShare >= 30 ? 'neutral' : 'good'}
                />
              )}
            </>
          )}

          {topExercisesInsight.top ? (
            <TrendBadge
              label={
                topExercisesInsight.topShare >= 45
                  ? 'Variety is low'
                  : topExercisesInsight.topShare >= 30
                    ? 'Variety is ok'
                    : 'Variety is high'
              }
              tone={topExercisesInsight.topShare >= 45 ? 'bad' : topExercisesInsight.topShare >= 30 ? 'neutral' : 'good'}
            />
          ) : null}
        </InsightLine>
        <InsightText text="This highlights your staples. If one movement takes a very large share, you may be rotating too little. More variation can help manage overuse." />
      </ChartDescription>
    </div>
  );
};
