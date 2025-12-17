import React from 'react';
import { AreaChart as AreaChartIcon, ChartColumnStacked, Infinity, Layers } from 'lucide-react';
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
import { LazyRender } from '../LazyRender';
import { ChartSkeleton } from '../ChartSkeleton';
import { formatSignedNumber } from '../../utils/format/formatters';

type IntensityView = 'area' | 'stackedBar';

export const IntensityEvolutionCard = ({
  isMounted,
  mode,
  onToggle,
  view,
  onViewToggle,
  intensityData,
  intensityInsight,
  tooltipStyle,
}: {
  isMounted: boolean;
  mode: TimeFilterMode;
  onToggle: (m: TimeFilterMode) => void;
  view: IntensityView;
  onViewToggle: (v: IntensityView) => void;
  intensityData: any[];
  intensityInsight: any | null;
  tooltipStyle: Record<string, unknown>;
}) => {
  const formatSigned = (n: number) => formatSignedNumber(n, { maxDecimals: 2 });

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl">
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Layers className="w-5 h-5 text-orange-500 transition-opacity duration-200 hover:opacity-80" />
          <span>Training Style Evolution</span>
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
              onClick={() => onViewToggle('stackedBar')}
              title="Stacked"
              aria-label="Stacked"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                view === 'stackedBar' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ChartColumnStacked className="w-3 h-3" />
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

      {intensityData && intensityData.length > 0 ? (
        <div
          className={`flex-1 w-full transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ minHeight: '250px', height: '100%' }}
        >
          <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 250 }} />}>
            <ResponsiveContainer width="100%" height={250}>
              {view === 'area' ? (
                <AreaChart key="area" data={intensityData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gStrength" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gHyper" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gEndure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle as any} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Strength" name="Strength (1-5)" stackId="1" stroke="#3b82f6" fill="url(#gStrength)" animationDuration={1500} />
                  <Area type="monotone" dataKey="Hypertrophy" name="Hypertrophy (6-12)" stackId="1" stroke="#10b981" fill="url(#gHyper)" animationDuration={1500} />
                  <Area type="monotone" dataKey="Endurance" name="Endurance (13+)" stackId="1" stroke="#a855f7" fill="url(#gEndure)" animationDuration={1500} />
                </AreaChart>
              ) : (
                <BarChart key="bar" data={intensityData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle as any} cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Strength" name="Strength (1-5)" stackId="1" fill="#3b82f6" radius={[0, 0, 0, 0]} animationDuration={1500} />
                  <Bar dataKey="Hypertrophy" name="Hypertrophy (6-12)" stackId="1" fill="#10b981" radius={[0, 0, 0, 0]} animationDuration={1500} />
                  <Bar dataKey="Endurance" name="Endurance (13+)" stackId="1" fill="#a855f7" radius={[8, 8, 0, 0]} animationDuration={1500} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </LazyRender>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[250px] sm:min-h-[300px] flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="text-center">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No data available for Training Style Evolution</p>
            <p className="text-xs text-slate-500 mt-1">Upload workout data or adjust your filters</p>
          </div>
        </div>
      )}

      <ChartDescription isMounted={isMounted}>
        <InsightLine>
          {intensityInsight ? (
            <>
              {intensityInsight.all
                .slice()
                .sort((a: any, b: any) => b.pct - a.pct)
                .map((s: any) => (
                  <TrendBadge
                    key={s.short}
                    label={
                      <BadgeLabel
                        main={`${s.short} ${s.pct.toFixed(0)}%`}
                        meta={
                          <ShiftedMeta>
                            <TrendIcon direction={s.delta.direction} />
                            <span>{`${formatSigned(s.delta.deltaPercent)}% vs prev mo`}</span>
                          </ShiftedMeta>
                        }
                      />
                    }
                    tone={getTrendBadgeTone(s.delta.deltaPercent, { goodWhen: 'either' })}
                  />
                ))}
            </>
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}
        </InsightLine>
        <InsightText text="Your rep ranges hint what you are training for: strength, size, endurance. Big percent shifts usually reflect a new block or focus." />
      </ChartDescription>
    </div>
  );
};
