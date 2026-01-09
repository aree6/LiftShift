import React, { useMemo } from 'react';
import { AreaChart as AreaChartIcon, BarChart3, Infinity, Trophy } from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeFilterMode } from '../../utils/storage/localStorage';
import { formatSignedNumber } from '../../utils/format/formatters';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../../utils/format/deltaFormat';
import { addEmaSeries, DEFAULT_EMA_HALF_LIFE_DAYS } from '../../utils/analysis/ema';
import {
  BadgeLabel,
  ChartDescription,
  getTrendBadgeTone,
  InsightLine,
  InsightText,
  TrendBadge,
  TrendIcon,
} from './ChartBits';
import { LazyRender } from '../LazyRender';
import { ChartSkeleton } from '../ChartSkeleton';
import { getRechartsXAxisInterval, RECHARTS_XAXIS_PADDING, ValueDot } from '../../utils/chart/chartEnhancements';

type PrTrendView = 'area' | 'bar';

export const PrTrendCard = ({
  isMounted,
  mode,
  onToggle,
  view,
  onViewToggle,
  prsData,
  tooltipStyle,
  prTrendDelta,
  prTrendDelta7d,
}: {
  isMounted: boolean;
  mode: TimeFilterMode;
  onToggle: (m: TimeFilterMode) => void;
  view: PrTrendView;
  onViewToggle: (v: PrTrendView) => void;
  prsData: any[];
  tooltipStyle: Record<string, unknown>;
  prTrendDelta: any | null;
  prTrendDelta7d: any | null;
}) => {
  const formatSigned = (n: number) => formatSignedNumber(n, { maxDecimals: 2 });

  const chartData = useMemo(() => {
    return addEmaSeries(prsData, 'count', 'emaCount', {
      halfLifeDays: DEFAULT_EMA_HALF_LIFE_DAYS,
      timestampKey: 'timestamp',
    });
  }, [prsData]);

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl">
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Trophy className="w-5 h-5 text-yellow-500 transition-opacity duration-200 hover:opacity-80" />
          <span>PRs Over Time</span>
        </h3>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible max-w-full">
          <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
            <button
              onClick={() => onViewToggle('area')}
              title="Area"
              aria-label="Area"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                view === 'area' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <AreaChartIcon className="w-3 h-3" />
            </button>
            <button
              onClick={() => onViewToggle('bar')}
              title="Bar"
              aria-label="Bar"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                view === 'bar' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
            <button
              onClick={() => onToggle('all')}
              title="All"
              aria-label="All"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                mode === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Infinity className="w-3 h-3" />
            </button>
            <button
              onClick={() => onToggle('weekly')}
              title="Weekly"
              aria-label="Weekly"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
                mode === 'weekly' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              wk
            </button>
            <button
              onClick={() => onToggle('monthly')}
              title="Monthly"
              aria-label="Monthly"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
                mode === 'monthly' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              mo
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <LazyRender className="h-full w-full" placeholder={<ChartSkeleton className="h-full min-h-[250px] sm:min-h-[300px]" />}>
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <ComposedChart key={view} data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gPRs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="dateFormatted"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                padding={RECHARTS_XAXIS_PADDING as any}
                interval={getRechartsXAxisInterval(chartData.length, 8)}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle as any}
                cursor={view === 'bar' ? ({ fill: 'rgb(var(--overlay-rgb) / 0.12)' } as any) : ({ stroke: 'rgb(var(--border-rgb) / 0.35)' } as any)}
                labelFormatter={(l, p) => (p as any)?.[0]?.payload?.tooltipLabel || l}
                formatter={(val: number, name) => {
                  if (name === 'EMA') return [Math.round(val), 'EMA'];
                  if (name === 'PRs') return [Math.round(val), 'PRs'];
                  return [Math.round(val), name];
                }}
              />
              {view === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="count"
                  name="PRs"
                  stroke="#eab308"
                  strokeWidth={3}
                  fill="url(#gPRs)"
                  dot={<ValueDot valueKey="count" unit="" data={chartData} color="#eab308" />}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              ) : (
                <Bar dataKey="count" name="PRs" fill="#eab308" radius={[8, 8, 0, 0]} animationDuration={1500} />
              )}
              <Line
                type="monotone"
                dataKey="emaCount"
                name="EMA"
                stroke="#eab308"
                strokeOpacity={0.95}
                strokeWidth={2.25}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                animationDuration={1500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </LazyRender>
      </div>

      <ChartDescription isMounted={isMounted}>
        <InsightLine>
          {prTrendDelta ? (
            <TrendBadge
              label={
                <BadgeLabel
                  main={
                    <span className="inline-flex items-center gap-1">
                      <TrendIcon direction={prTrendDelta.direction} />
                      <span>{formatDeltaPercentage(prTrendDelta.deltaPercent, getDeltaFormatPreset('badge'))}</span>
                    </span>
                  }
                  meta="vs prev mo"
                />
              }
              tone={getTrendBadgeTone(prTrendDelta.deltaPercent, { goodWhen: 'up' })}
            />
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}

          {prTrendDelta7d ? (
            <TrendBadge
              label={
                <BadgeLabel
                  main={
                    <span className="inline-flex items-center gap-1">
                      <TrendIcon direction={prTrendDelta7d.direction} />
                      <span>{formatDeltaPercentage(prTrendDelta7d.deltaPercent, getDeltaFormatPreset('badge'))}</span>
                    </span>
                  }
                  meta="vs prev 7d"
                />
              }
              tone={getTrendBadgeTone(prTrendDelta7d.deltaPercent, { goodWhen: 'up' })}
            />
          ) : null}
        </InsightLine>
        <InsightText text="PRs are new all-time max weights per exercise. Use this to see whether your progress is clustering in bursts or staying steady." />
      </ChartDescription>
    </div>
  );
};
