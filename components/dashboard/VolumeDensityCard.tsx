import React from 'react';
import { AreaChart as AreaChartIcon, BarChart3, Infinity, Timer } from 'lucide-react';
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
import type { TimeFilterMode, WeightUnit } from '../../utils/storage/localStorage';
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

type VolumeView = 'area' | 'bar';

type VolumeDensityTrend = {
  delta: { direction: 'up' | 'down' | 'same'; deltaPercent: number };
} | null;

export const VolumeDensityCard = ({
  isMounted,
  mode,
  onToggle,
  view,
  onViewToggle,
  weightUnit,
  volumeDurationData,
  volumeDensityTrend,
  tooltipStyle,
}: {
  isMounted: boolean;
  mode: TimeFilterMode;
  onToggle: (m: TimeFilterMode) => void;
  view: VolumeView;
  onViewToggle: (v: VolumeView) => void;
  weightUnit: WeightUnit;
  volumeDurationData: any[];
  volumeDensityTrend: VolumeDensityTrend;
  tooltipStyle: Record<string, unknown>;
}) => {
  const formatSigned = (n: number) => formatSignedNumber(n, { maxDecimals: 2 });

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl">
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Timer className="w-5 h-5 text-purple-500 transition-opacity duration-200 hover:opacity-80" />
          <span>Volume Density</span>
        </h3>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible max-w-full">
          <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
            <button
              onClick={() => onViewToggle('area')}
              title="Area"
              aria-label="Area"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                view === 'area'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <AreaChartIcon className="w-3 h-3" />
            </button>
            <button
              onClick={() => onViewToggle('bar')}
              title="Bar"
              aria-label="Bar"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                view === 'bar'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
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
              <Infinity className="w-4 h-4" />
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
        <ResponsiveContainer width="100%" height={300} minWidth={0}>
          {view === 'area' ? (
            <AreaChart key="area" data={volumeDurationData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDensityArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}${weightUnit}`} />
                <Tooltip
                  contentStyle={tooltipStyle as any}
                  labelFormatter={(l, p) => (p as any)?.[0]?.payload?.tooltipLabel || l}
                  formatter={(val: number, name) => {
                    if (name === `Volume per Set (${weightUnit})`) return [`${val} ${weightUnit}`, name];
                    return [val, name];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="volumePerSet"
                  name={`Volume per Set (${weightUnit})`}
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#gDensityArea)"
                  dot={{ r: 3, fill: '#8b5cf6' }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={1500}
                />
            </AreaChart>
          ) : (
            <BarChart key="bar" data={volumeDurationData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}${weightUnit}`} />
                <Tooltip
                  contentStyle={tooltipStyle as any}
                  cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }}
                  labelFormatter={(l, p) => (p as any)?.[0]?.payload?.tooltipLabel || l}
                  formatter={(val: number, name) => {
                    if (name === `Volume per Set (${weightUnit})`) return [`${val} ${weightUnit}`, name];
                    if (name === 'Set Count') return [`${val} sets`, name];
                    return [val, name];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="volumePerSet"
                  name={`Volume per Set (${weightUnit})`}
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1500}
                />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <ChartDescription isMounted={isMounted}>
        <InsightLine>
          {volumeDensityTrend ? (
            <>
              <TrendBadge
                label={
                  <BadgeLabel
                    main={
                      <span className="inline-flex items-center gap-1">
                        <TrendIcon direction={volumeDensityTrend.delta.direction} />
                        <span>{`${formatSigned(volumeDensityTrend.delta.deltaPercent)}%`}</span>
                      </span>
                    }
                    meta="vs prev mo"
                  />
                }
                tone={getTrendBadgeTone(volumeDensityTrend.delta.deltaPercent, { goodWhen: 'up' })}
              />
              <TrendBadge
                label={
                  volumeDensityTrend.delta.direction === 'up'
                    ? 'Work capacity is improving'
                    : volumeDensityTrend.delta.direction === 'down'
                      ? 'Work capacity is down'
                      : 'Work capacity is steady'
                }
                tone={
                  volumeDensityTrend.delta.direction === 'up'
                    ? 'good'
                    : volumeDensityTrend.delta.direction === 'down'
                      ? 'bad'
                      : 'neutral'
                }
              />
            </>
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}
        </InsightLine>
        <InsightText text="Read this chart by the curve and the percent change. Rising density usually means you are doing more work per set. This often reflects an intensity and work capacity trend." />
      </ChartDescription>
    </div>
  );
};
