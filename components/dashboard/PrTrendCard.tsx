import React from 'react';
import { AreaChart as AreaChartIcon, BarChart3, Infinity, Trophy } from 'lucide-react';
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
import type { TimeFilterMode } from '../../utils/storage/localStorage';
import { formatSignedNumber } from '../../utils/format/formatters';
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
            {view === 'area' ? (
              <AreaChart key="area" data={prsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPRs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle as any}
                  cursor={{ stroke: 'rgb(var(--border-rgb) / 0.35)' }}
                  labelFormatter={(l, p) => (p as any)?.[0]?.payload?.tooltipLabel || l}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="PRs Set"
                  stroke="#eab308"
                  strokeWidth={3}
                  fill="url(#gPRs)"
                  dot={{ r: 3, fill: '#eab308' }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </AreaChart>
            ) : (
              <BarChart key="bar" data={prsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle as any}
                  cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }}
                  labelFormatter={(l, p) => (p as any)?.[0]?.payload?.tooltipLabel || l}
                />
                <Bar dataKey="count" name="PRs Set" fill="#eab308" radius={[8, 8, 0, 0]} animationDuration={1500} />
              </BarChart>
            )}
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
                      <span>{`${formatSigned(prTrendDelta.deltaPercent)}%`}</span>
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
                      <span>{`${formatSigned(prTrendDelta7d.deltaPercent)}%`}</span>
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
