import React, { useMemo } from 'react';
import { AreaChart as AreaChartIcon, BarChart3, Infinity, Timer } from 'lucide-react';
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
import type { TimeFilterMode, WeightUnit } from '../../../utils/storage/localStorage';
import { formatNumber, formatSignedNumber } from '../../../utils/format/formatters';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../../../utils/format/deltaFormat';
import { getRechartsTickIndexMap, getRechartsXAxisInterval, IndexFilteredDot, RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, calculateYAxisDomain, formatAxisNumber } from '../../../utils/chart/chartEnhancements';
import {
  BadgeLabel,
  ChartDescription,
  getTrendBadgeTone,
  InsightLine,
  InsightText,
  TrendBadge,
  TrendIcon,
} from '../insights/ChartBits';
import { formatVsPrevRollingWindow, getRollingWindowDaysForMode } from '../../../utils/date/dateUtils';
import { Reveal } from '../../ui/Reveal';
import { SegmentControl } from '../../ui/SegmentControl';

type VolumeView = 'area' | 'bar';

type VolumeDensityTrend = {
  delta: { direction: 'up' | 'down' | 'same'; deltaPercent: number };
  meta?: string;
} | null;

export const VolumeDensityCard = ({
  mode,
  onToggle,
  view,
  onViewToggle,
  weightUnit,
  volumeDurationData,
  volumeDensityTrend,
  tooltipStyle,
}: {
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

  const primaryWindowDays = getRollingWindowDaysForMode(mode) ?? 30;
  const fallbackMeta = formatVsPrevRollingWindow(primaryWindowDays);
  const metaLabel = volumeDensityTrend?.meta ?? fallbackMeta;

  const chartData = useMemo(() => {
    return volumeDurationData;
  }, [volumeDurationData]);

  const yAxisDomain = useMemo(() => {
    return calculateYAxisDomain(chartData, ['volumePerSet', 'setCount']);
  }, [chartData]);

  const tickIndexMap = useMemo(() => {
    return getRechartsTickIndexMap(chartData.length);
  }, [chartData.length]);

  return (
    <Reveal className="bg-black/20 border border-slate-700/50 px-2 sm:px-3 py-4 sm:py-6 rounded-xl min-h-[400px] sm:min-h-[520px] flex flex-col transition-colors duration-300" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      <div className="flex flex-row justify-between items-center mb-3 gap-3">
        <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Timer className="w-5 h-5 text-purple-500 transition-opacity duration-200 hover:opacity-80" />
          <span>Volume Density</span>
        </h3>

        <div className="flex items-center justify-end gap-0.5 sm:gap-1 flex-wrap sm:flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
          <SegmentControl
            dataTrack="charttype-volumedensity"
            options={[
              { value: 'area', icon: <AreaChartIcon className="w-3 h-3" />, title: 'Area' },
              { value: 'bar', icon: <BarChart3 className="w-3 h-3" />, title: 'Bar' },
            ]}
            value={view}
            onChange={onViewToggle}
          />

          <SegmentControl
            dataTrack="timerange-volumedensity"
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

      <div className="flex-1 w-full min-h-[250px] sm:min-h-[300px]">
        <ResponsiveContainer width="100%" height={300} minWidth={0}>
          <ComposedChart key={view} data={chartData} margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
            <defs>
              <linearGradient id="gDensityArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
              <marker id="densityArrow" viewBox="0 0 6 10" refX="4.8" refY="5" markerWidth="5" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 0 0 L 6 5 L 0 10 z" fill="#8b5cf6" />
              </marker>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.35} vertical={false} />
            <XAxis
              dataKey="dateFormatted"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              padding={RECHARTS_XAXIS_PADDING as any}
              interval={getRechartsXAxisInterval(chartData.length)}
            />
            <YAxis
              stroke="#8b5cf6"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={yAxisDomain}
              tickFormatter={(val) => formatAxisNumber(Number(val), weightUnit)}
            />
            <Tooltip
              contentStyle={tooltipStyle as any}
              cursor={view === 'bar' ? ({ fill: 'rgb(var(--overlay-rgb) / 0.12)' } as any) : ({ stroke: 'rgb(var(--border-rgb) / 0.35)' } as any)}
              labelFormatter={(l, p) => (p as any)?.[0]?.payload?.tooltipLabel || l}
              formatter={(val: any, name: any) => {
                const v = formatNumber(Number(val), { maxDecimals: 1 });
                if (name === `Volume per Set (${weightUnit})`) return [`${v} ${weightUnit}`, name];
                if (name === 'Set Count') return [`${val} sets`, name];
                return [val, name];
              }}
            />
            {view === 'area' ? (
              <><Area
                type="monotone"
                dataKey="volumePerSet"
                stroke="none"
                fill="url(#gDensityArea)"
                mask="url(#efMask)"
                dot={false}
                activeDot={false}
                animationDuration={250}
              />
              <Line
                type="monotone"
                dataKey="volumePerSet"
                name={`Volume per Set (${weightUnit})`}
                stroke="#8b5cf6"
                strokeWidth={1.5}
                fill="none"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={250}
                markerEnd="url(#densityArrow)"
              />
              </>
            ) : (
              <Bar
                dataKey="volumePerSet"
                name={`Volume per Set (${weightUnit})`}
                fill="#8b5cf6"
                radius={[8, 8, 0, 0]}
                animationDuration={250}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartDescription>
        <InsightLine>
          {volumeDensityTrend ? (
            <>
              <TrendBadge
                label={
                  <BadgeLabel
                    main={
                      <span className="inline-flex items-center gap-1">
                        <TrendIcon direction={volumeDensityTrend.delta.direction} />
                        <span>{formatDeltaPercentage(volumeDensityTrend.delta.deltaPercent, getDeltaFormatPreset('badge'))}</span>
                      </span>
                    }
                    meta={metaLabel}
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
    </Reveal>
  );
};
