import React, { useMemo } from 'react';
import { Infinity, Layers } from 'lucide-react';
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
import type { TimeFilterMode } from '../../../utils/storage/localStorage';
import {
  BadgeLabel,
  ChartDescription,
  getTrendBadgeTone,
  InsightLine,
  InsightText,
  ShiftedMeta,
  TrendBadge,
  TrendIcon,
} from '../insights/ChartBits';
import { Reveal } from '../../ui/Reveal';
import { LazyRender } from '../../ui/LazyRender';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import { SegmentControl } from '../../ui/SegmentControl';
import { formatNumber } from '../../../utils/format/formatters';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../../../utils/format/deltaFormat';
import { getRechartsXAxisInterval, RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, formatAxisNumber } from '../../../utils/chart/chartEnhancements';
import { formatVsPrevRollingWindow, getRollingWindowDaysForMode } from '../../../utils/date/dateUtils';

export const IntensityEvolutionCard = ({
  mode,
  onToggle,
  intensityData,
  intensityInsight,
  tooltipStyle,
}: {
  mode: TimeFilterMode;
  onToggle: (m: TimeFilterMode) => void;
  intensityData: any[];
  intensityInsight: any | null;
  tooltipStyle: Record<string, unknown>;
}) => {

  const primaryWindowDays = getRollingWindowDaysForMode(mode) ?? 30;
  const primaryMeta = formatVsPrevRollingWindow(primaryWindowDays);

  const baseData = useMemo(() => {
    if (!Array.isArray(intensityData)) return [];
    return intensityData.map((d: any) => {
      const s = Number(d?.Strength ?? 0);
      const h = Number(d?.Hypertrophy ?? 0);
      const e = Number(d?.Endurance ?? 0);
      return { ...d, Strength: s, Hypertrophy: h, Endurance: e, total: s + h + e };
    });
  }, [intensityData]);

  const percentData = useMemo(() => {
    if (!Array.isArray(baseData)) return [];
    return baseData.map((d: any) => {
      const t = d.Strength + d.Hypertrophy + d.Endurance;
      if (t === 0) return { ...d, Strength: 0, Hypertrophy: 0, Endurance: 0, total: 0 };
      return {
        ...d,
        Strength: (d.Strength / t) * 100,
        Hypertrophy: (d.Hypertrophy / t) * 100,
        Endurance: (d.Endurance / t) * 100,
        total: 100,
      };
    });
  }, [baseData]);

  const legendPayload = useMemo(() => {
    return [
      { value: 'Strength (1-5)', type: 'line', color: '#3b82f6', id: 'Strength' },
      { value: 'Hypertrophy (6-12)', type: 'line', color: '#10b981', id: 'Hypertrophy' },
      { value: 'Endurance (13+)', type: 'line', color: '#a855f7', id: 'Endurance' },
    ] as any[];
  }, []);

  return (
    <Reveal className="bg-black/20 border border-slate-700/50 px-2 sm:px-3 py-4 sm:py-6 rounded-xl min-h-[400px] sm:min-h-[480px] flex flex-col transition-colors duration-300" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      <div className="flex flex-row justify-between items-center mb-3 gap-3">
        <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Layers className="w-5 h-5 text-orange-500 transition-opacity duration-200 hover:opacity-80" />
          <span>Training Style Evolution</span>
        </h3>

        <div className="flex items-center justify-end gap-0.5 sm:gap-1 flex-wrap sm:flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
          <SegmentControl
            dataTrack="timerange-intensity"
            options={[
              { value: 'all', icon: <Infinity className="w-3 h-3" />, title: 'All' },
              { value: 'weekly', label: 'lst wk', title: 'Last Week' },
              { value: 'monthly', label: 'lst mo', title: 'Last Month' },
              { value: 'yearly', label: 'lst yr', title: 'Last Year' },
            ]}
            value={mode}
            onChange={onToggle}
          />
        </div>
      </div>

      {intensityData && intensityData.length > 0 ? (
        <div
          className="flex-1 w-full"
          style={{ minHeight: '250px', height: '100%' }}
        >
          <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 250 }} />}>
            <ResponsiveContainer width="100%" height={250}>
                  <AreaChart key={mode} data={percentData} margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
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
                    <linearGradient id="efGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                      <stop offset="6%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="94%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <mask id="efMask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                      <rect x="0" y="0" width="1" height="1" fill="url(#efGrad)" />
                    </mask>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.35} vertical={false} />
                  <XAxis
                    dataKey="dateFormatted"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    padding={RECHARTS_XAXIS_PADDING as any}
                    interval={getRechartsXAxisInterval(percentData.length)}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => formatAxisNumber(Number(val), '%')} />
                  <Tooltip
                    contentStyle={tooltipStyle as any}
                    formatter={(val: any, name: any) => {
                      const fmt = (n: number) => `${formatNumber(n, { maxDecimals: 1 })}%`;
                      if (name === 'Strength (1-5)') return [fmt(Number(val)), 'Strength'];
                      if (name === 'Hypertrophy (6-12)') return [fmt(Number(val)), 'Hypertrophy'];
                      if (name === 'Endurance (13+)') return [fmt(Number(val)), 'Endurance'];
                      return [fmt(Number(val)), name];
                    }}
                  />
                  <Legend {...({ wrapperStyle: { fontSize: '11px', left: '52%', transform: 'translateX(-50%)', position: 'absolute' }, payload: legendPayload } as any)} />

                  <Area type="monotone" dataKey="Strength" name="Strength (1-5)" stackId="1" stroke="#3b82f6" fill="url(#gStrength)" mask="url(#efMask)" animationDuration={250} />
                  <Area type="monotone" dataKey="Hypertrophy" name="Hypertrophy (6-12)" stackId="1" stroke="#10b981" fill="url(#gHyper)" mask="url(#efMask)" animationDuration={250} />
                  <Area type="monotone" dataKey="Endurance" name="Endurance (13+)" stackId="1" stroke="#a855f7" fill="url(#gEndure)" mask="url(#efMask)" animationDuration={250} />

                </AreaChart>
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

      <ChartDescription>
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
                        main={`${s.short} ${formatDeltaPercentage(s.pct, getDeltaFormatPreset('badge'))}`}
                        meta={
                          <ShiftedMeta>
                            <TrendIcon direction={s.delta.direction} />
                            <span>{formatDeltaPercentage(s.delta.deltaPercent, getDeltaFormatPreset('badge'))} {primaryMeta}</span>
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
    </Reveal>
  );
};
