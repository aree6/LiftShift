import React, { useMemo } from 'react';
import { BarChart3, Clock, Scan } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDeltaPercentage } from '../../../utils/format/deltaFormat';
import {
  BadgeLabel,
  ChartDescription,
  InsightLine,
  InsightText,
  TrendBadge,
} from '../insights/ChartBits';
import { RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, calculateYAxisDomain, formatAxisNumber } from '../../../utils/chart/chartEnhancements';
import { SegmentControl } from '../../ui/SegmentControl';

type WeekShapeView = 'radar' | 'bar';

type WeekShapeDatum = {
  subject: string;
  A: number;
  fullMark?: number;
};

type WeeklyRhythmInsight = {
  top: { subject: string; share: number };
  bottom: { subject: string; share: number };
  rhythmLabel: string;
  rhythmTone: 'good' | 'neutral' | 'bad';
} | null;

export const WeeklyRhythmCard = ({
  view,
  onViewToggle,
  weekShapeData,
  weeklyRhythmInsight,
  tooltipStyle,
}: {
  view: WeekShapeView;
  onViewToggle: (v: WeekShapeView) => void;
  weekShapeData: WeekShapeDatum[];
  weeklyRhythmInsight: WeeklyRhythmInsight;
  tooltipStyle: Record<string, unknown>;
}) => {
  const yAxisDomain = useMemo(() => {
    return calculateYAxisDomain(weekShapeData, ['A']);
  }, [weekShapeData]);

  return (
    <div className="bg-black/20 border border-slate-700/50 px-2 sm:px-3 py-4 sm:py-6 rounded-xl min-h-[400px] sm:min-h-[520px] flex flex-col transition-[opacity,transform] duration-300" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      <div className="flex flex-row justify-between items-center mb-3 gap-3">
        <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Clock className="w-5 h-5 text-pink-500 transition-opacity duration-200 hover:opacity-80" />
          <span>Weekly Rhythm</span>
        </h3>

        <div className="flex items-center justify-end gap-0.5 sm:gap-1 flex-wrap sm:flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
          <SegmentControl
            dataTrack="charttype-weeklyrhythm"
            options={[
              { value: 'radar', icon: <Scan className="w-4 h-4" />, title: 'Radar' },
              { value: 'bar', icon: <BarChart3 className="w-4 h-4" />, title: 'Bar' },
            ]}
            value={view}
            onChange={onViewToggle}
          />
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px] sm:min-h-[300px]">
        <ResponsiveContainer width="100%" height={300} minWidth={0}>
          {view === 'radar' ? (
            <RadarChart key="radar" cx="50%" cy="50%" outerRadius="70%" data={weekShapeData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar
                name="Workouts"
                dataKey="A"
                stroke="#ec4899"
                strokeWidth={3}
                fill="#ec4899"
                fillOpacity={0.4}
                animationDuration={250}
              />
              <Tooltip contentStyle={tooltipStyle as any} />
            </RadarChart>
          ) : (
            <BarChart key="bar" data={weekShapeData} margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.35} vertical={false} />
              <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} padding={RECHARTS_XAXIS_PADDING as any} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={yAxisDomain} tickFormatter={(val) => formatAxisNumber(Number(val))} />
              <Tooltip contentStyle={tooltipStyle as any} cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }} />
              <Bar dataKey="A" name="Workouts" fill="#ec4899" radius={[8, 8, 0, 0]} animationDuration={250} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <ChartDescription>
        <InsightLine>
          {weeklyRhythmInsight ? (
            <>
              <TrendBadge label={<BadgeLabel main={`Top ${weeklyRhythmInsight.top.subject} ${formatDeltaPercentage(weeklyRhythmInsight.top.share)}`} />} tone="info" />
              <TrendBadge label={<BadgeLabel main={`Low ${weeklyRhythmInsight.bottom.subject} ${formatDeltaPercentage(weeklyRhythmInsight.bottom.share)}`} />} tone="neutral" />
              <TrendBadge label={<BadgeLabel main={weeklyRhythmInsight.rhythmLabel} />} tone={weeklyRhythmInsight.rhythmTone} />
            </>
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}
        </InsightLine>
        <InsightText text="Read this as your training day pattern. A flatter shape means a steadier habit. Big spikes mean your week depends on a couple of key days." />
      </ChartDescription>
    </div>
  );
};
