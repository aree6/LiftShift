import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AreaChart as AreaChartIcon, BicepsFlexed, ChartColumnStacked, PersonStanding } from 'lucide-react';
import { LazyRender } from '../LazyRender';
import { ChartSkeleton } from '../ChartSkeleton';
import { normalizeMuscleGroup } from '../../utils/muscle/muscleNormalization';
import { MUSCLE_COLORS } from '../../utils/domain/categories';
import { formatSignedNumber } from '../../utils/format/formatters';
import {
  BadgeLabel,
  ChartDescription,
  getTrendBadgeTone,
  InsightLine,
  InsightText,
  ShiftedMeta,
  TrendBadge,
  TrendIcon,
} from './ChartBits';

type MuscleGrouping = 'groups' | 'muscles';
type MusclePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
type MuscleTrendView = 'area' | 'stackedBar';

type MuscleTrendInsight = {
  totalDelta: { direction: 'up' | 'down' | 'same'; deltaPercent: number };
  biggestMover?: { k: string; d: number };
} | null;

const formatSigned = (n: number) => formatSignedNumber(n, { maxDecimals: 2 });
const formatSignedPctWithNoun = (pct: number, noun: string) =>
  `${formatSignedNumber(pct, { maxDecimals: 0 })}% ${noun}`;

export const MuscleTrendCard = ({
  isMounted,
  muscleGrouping,
  setMuscleGrouping,
  musclePeriod,
  setMusclePeriod,
  muscleTrendView,
  setMuscleTrendView,
  trendData,
  trendKeys,
  muscleTrendInsight,
  tooltipStyle,
  muscleVsLabel,
}: {
  isMounted: boolean;
  muscleGrouping: MuscleGrouping;
  setMuscleGrouping: (v: MuscleGrouping) => void;
  musclePeriod: MusclePeriod;
  setMusclePeriod: (v: MusclePeriod) => void;
  muscleTrendView: MuscleTrendView;
  setMuscleTrendView: (v: MuscleTrendView) => void;
  trendData: any[];
  trendKeys: string[];
  muscleTrendInsight: MuscleTrendInsight;
  tooltipStyle: Record<string, unknown>;
  muscleVsLabel: string;
}) => {
  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BicepsFlexed className="w-5 h-5 text-emerald-500" />
          <span>Muscle Analysis</span>
        </h3>

        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto w-full sm:w-auto sm:overflow-visible">
          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setMuscleGrouping('groups')}
              title="Groups"
              aria-label="Groups"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleGrouping==='groups'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <PersonStanding className="w-3.5 h-3.5 scale-[1.3]" />
              <span className="sr-only">Groups</span>
            </button>
            <button
              onClick={() => setMuscleGrouping('muscles')}
              title="Muscles"
              aria-label="Muscles"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleGrouping==='muscles'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <BicepsFlexed className="w-3.5 h-3.5" />
              <span className="sr-only">Muscles</span>
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setMusclePeriod('weekly')}
              title="Weekly"
              aria-label="Weekly"
              className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='weekly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              wk
            </button>
            <button
              onClick={() => setMusclePeriod('monthly')}
              title="Monthly"
              aria-label="Monthly"
              className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='monthly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              mo
            </button>
            <button
              onClick={() => setMusclePeriod('yearly')}
              title="Yearly"
              aria-label="Yearly"
              className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='yearly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              yr
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setMuscleTrendView('stackedBar')}
              title="Stacked"
              aria-label="Stacked"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleTrendView==='stackedBar'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <ChartColumnStacked className="w-3.5 h-3.5" />
              <span className="sr-only">Stacked</span>
            </button>
            <button
              onClick={() => setMuscleTrendView('area')}
              title="Area"
              aria-label="Area"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleTrendView==='area'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <AreaChartIcon className="w-3.5 h-3.5" />
              <span className="sr-only">Area</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full min-h-[250px] sm:min-h-[320px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
        {trendData.length === 0 || trendKeys.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
            Not enough data to render Muscle Analysis trend.
          </div>
        ) : (
          <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 280 }} />}>
            <ResponsiveContainer width="100%" height={280}>
              {muscleTrendView === 'area' ? (
                <AreaChart
                  key={`area-${musclePeriod}-${muscleGrouping}`}
                  data={trendData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle as any} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {trendKeys.map((k) => {
                    const colorKey = muscleGrouping === 'groups' ? k : normalizeMuscleGroup(k);
                    const color = (MUSCLE_COLORS as any)[colorKey] || '#94a3b8';
                    return (
                      <Area
                        key={k}
                        type="monotone"
                        dataKey={k}
                        name={k}
                        stackId="1"
                        stroke={color}
                        fill={color}
                        fillOpacity={0.25}
                        animationDuration={1200}
                      />
                    );
                  })}
                </AreaChart>
              ) : (
                <BarChart
                  key={`bar-${musclePeriod}-${muscleGrouping}`}
                  data={trendData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle as any} cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {trendKeys.map((k, idx) => {
                    const colorKey = muscleGrouping === 'groups' ? k : normalizeMuscleGroup(k);
                    const color = (MUSCLE_COLORS as any)[colorKey] || '#94a3b8';
                    return (
                      <Bar
                        key={k}
                        dataKey={k}
                        name={k}
                        stackId="1"
                        fill={color}
                        radius={idx === trendKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        animationDuration={1200}
                      />
                    );
                  })}
                </BarChart>
              )}
            </ResponsiveContainer>
          </LazyRender>
        )}
      </div>

      <ChartDescription isMounted={isMounted}>
        <InsightLine>
          {muscleTrendInsight ? (
            <>
              <TrendBadge
                label={
                  <BadgeLabel
                    main={
                      <span className="inline-flex items-center gap-1">
                        <TrendIcon direction={muscleTrendInsight.totalDelta.direction} />
                        <span>{formatSignedPctWithNoun(muscleTrendInsight.totalDelta.deltaPercent, 'sets')}</span>
                      </span>
                    }
                    meta={muscleVsLabel}
                  />
                }
                tone={getTrendBadgeTone(muscleTrendInsight.totalDelta.deltaPercent, { goodWhen: 'up' })}
              />
              {muscleTrendInsight.biggestMover && (
                <TrendBadge
                  label={
                    <BadgeLabel
                      main={
                        <span className="inline-flex items-center gap-1">
                          <TrendIcon
                            direction={
                              muscleTrendInsight.biggestMover.d > 0
                                ? 'up'
                                : muscleTrendInsight.biggestMover.d < 0
                                  ? 'down'
                                  : 'same'
                            }
                          />
                          <span>{muscleTrendInsight.biggestMover.k}</span>
                        </span>
                      }
                      meta={
                        <ShiftedMeta>
                          <span>{`biggest mover: ${formatSigned(muscleTrendInsight.biggestMover.d)} sets`}</span>
                        </ShiftedMeta>
                      }
                    />
                  }
                  tone={
                    muscleTrendInsight.biggestMover.d === 0
                      ? 'neutral'
                      : muscleTrendInsight.biggestMover.d > 0
                        ? 'good'
                        : 'bad'
                  }
                />
              )}
            </>
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}
        </InsightLine>
        <p>
          <span className="font-semibold text-slate-300">Weighting:</span>{' '}
          <span className="text-emerald-400 font-semibold">Primary</span>: 1 set,{' '}
          <span className="text-cyan-400 font-semibold">Secondary</span>: 0.5 set. Cardio is ignored. Full Body adds 1 set to every group.
        </p>
        <InsightText text="Use this to spot volume drift. If one area rises while others fade, you are gradually specializing. This can be intentional, or accidental." />
      </ChartDescription>
    </div>
  );
};
