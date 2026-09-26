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
import type { TimeFilterMode } from '../../../utils/storage/localStorage';
import { formatSignedNumber } from '../../../utils/format/formatters';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../../../utils/format/deltaFormat';
import {
  BadgeLabel,
  ChartDescription,
  getTrendBadgeTone,
  InsightLine,
  InsightText,
  TrendBadge,
  TrendIcon,
} from '../insights/ChartBits';
import { Reveal } from '../../ui/Reveal';
import { LazyRender } from '../../ui/LazyRender';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import { SegmentControl } from '../../ui/SegmentControl';
import { getRechartsCategoricalTicks, getRechartsTickIndexMap, RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, ValueDot, calculateYAxisDomain, formatAxisNumber } from '../../../utils/chart/chartEnhancements';
import { formatVsPrevRollingWindow, getRollingWindowDaysForMode } from '../../../utils/date/dateUtils';

type PrTrendView = 'area' | 'bar';

export const PrTrendCard = ({
  mode,
  onToggle,
  view,
  onViewToggle,
  prsData,
  tooltipStyle,
  prTrendDelta,
  prTrendDelta7d,
}: {
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

  const primaryWindowDays = getRollingWindowDaysForMode(mode) ?? 30;
  const primaryMeta = formatVsPrevRollingWindow(primaryWindowDays);

  const chartData = useMemo(() => {
    return prsData;
  }, [prsData]);

  const yAxisDomain = useMemo(() => {
    return calculateYAxisDomain(chartData, ['count']);
  }, [chartData]);

  const xTicks = useMemo(() => {
    return getRechartsCategoricalTicks(chartData, (row: any) => row?.dateFormatted);
  }, [chartData]);

  const tickIndexMap = useMemo(() => {
    return getRechartsTickIndexMap(chartData.length);
  }, [chartData.length]);

  const dotShowMap = useMemo(() => {
    if (!tickIndexMap || chartData.length === 0) return {};
    const map = { ...tickIndexMap };
    delete map[chartData.length - 1];
    return map;
  }, [tickIndexMap, chartData.length]);

  return (
    <Reveal className="bg-black/20 border border-slate-700/50 px-2 sm:px-3 py-4 sm:py-6 rounded-xl min-h-[400px] sm:min-h-[480px] flex flex-col transition-colors duration-300" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      <div className="flex flex-row justify-between items-center mb-3 gap-3">
        <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Trophy className="w-5 h-5 text-yellow-500 transition-opacity duration-200 hover:opacity-80" />
          <span>PRs Over Time</span>
        </h3>

        <div className="flex items-center justify-end gap-0.5 sm:gap-1 flex-wrap sm:flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
          <SegmentControl
            dataTrack="charttype-prtrend"
            options={[
              { value: 'area', icon: <AreaChartIcon className="w-3 h-3" />, title: 'Area' },
              { value: 'bar', icon: <BarChart3 className="w-3 h-3" />, title: 'Bar' },
            ]}
            value={view}
            onChange={onViewToggle}
          />

          <SegmentControl
            dataTrack="timerange-prtrend"
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
        <LazyRender className="h-full w-full" placeholder={<ChartSkeleton className="h-full min-h-[250px] sm:min-h-[300px]" />}>
          <ResponsiveContainer width="100%" height={300} minWidth={0}>
            <ComposedChart key={view} data={chartData} margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
              <defs>
                <linearGradient id="gPRs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
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
                <marker id="prArrow" viewBox="0 0 6 10" refX="4.8" refY="5" markerWidth="5" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M 0 0 L 6 5 L 0 10 z" fill="#eab308" />
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
                interval={0}
                ticks={xTicks as any}
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} domain={yAxisDomain} tickFormatter={(val) => formatAxisNumber(Number(val))} />
              <Tooltip
                contentStyle={tooltipStyle as any}
                cursor={view === 'bar' ? ({ fill: 'rgb(var(--overlay-rgb) / 0.12)' } as any) : ({ stroke: 'rgb(var(--border-rgb) / 0.35)' } as any)}
                labelFormatter={(l, p) => (p as any)?.[0]?.payload?.tooltipLabel || l}
                formatter={(val: any, name: any) => {
                  if (name === 'PRs') return [Math.round(val), 'PRs'];
                  return [Math.round(val), name];
                }}
              />
              {view === 'area' ? (
                <><Area
                  type="monotone"
                  dataKey="count"
                  name="PRs"
                  stroke="none"
                  fill="url(#gPRs)"
                  mask="url(#efMask)"
                  dot={false}
                  activeDot={false}
                  animationDuration={250}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="PRs"
                  stroke="#eab308"
                  strokeWidth={1}
                  fill="none"
                  dot={<ValueDot valueKey="count" unit="" data={chartData} color="#eab308" showAtIndexMap={dotShowMap} showDotWhenHidden={false} />}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  isAnimationActive={true}
                  animationDuration={250}
                  markerEnd="url(#prArrow)"
                />
                </>
              ) : (
                <Bar dataKey="count" name="PRs" fill="#eab308" radius={[8, 8, 0, 0]} animationDuration={250} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </LazyRender>
      </div>

      <ChartDescription>
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
                  meta={primaryMeta}
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
                  meta={formatVsPrevRollingWindow(7)}
                />
              }
              tone={getTrendBadgeTone(prTrendDelta7d.deltaPercent, { goodWhen: 'up' })}
            />
          ) : null}
        </InsightLine>
        <InsightText text="PRs are new all-time max weights per exercise. Use this to see whether your progress is clustering in bursts or staying steady." />
      </ChartDescription>
    </Reveal>
  );
};
