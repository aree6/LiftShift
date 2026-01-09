import React from 'react';
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
import { formatDeltaPercentage } from '../../utils/format/deltaFormat';
import {
  BadgeLabel,
  ChartDescription,
  InsightLine,
  InsightText,
  TrendBadge,
} from './ChartBits';
import { RECHARTS_XAXIS_PADDING } from '../../utils/chart/chartEnhancements';

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
  isMounted,
  view,
  onViewToggle,
  weekShapeData,
  weeklyRhythmInsight,
  tooltipStyle,
}: {
  isMounted: boolean;
  view: WeekShapeView;
  onViewToggle: (v: WeekShapeView) => void;
  weekShapeData: WeekShapeDatum[];
  weeklyRhythmInsight: WeeklyRhythmInsight;
  tooltipStyle: Record<string, unknown>;
}) => {
  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl">
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
          <Clock className="w-5 h-5 text-pink-500 transition-opacity duration-200 hover:opacity-80" />
          <span>Weekly Rhythm</span>
        </h3>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible max-w-full">
          <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
            <button
              onClick={() => onViewToggle('radar')}
              title="Radar"
              aria-label="Radar"
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                view === 'radar'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Scan className="w-4 h-4" />
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
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
                animationDuration={1500}
              />
              <Tooltip contentStyle={tooltipStyle as any} />
            </RadarChart>
          ) : (
            <BarChart key="bar" data={weekShapeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} padding={RECHARTS_XAXIS_PADDING as any} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle as any} cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }} />
              <Bar dataKey="A" name="Workouts" fill="#ec4899" radius={[8, 8, 0, 0]} animationDuration={1500} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <ChartDescription isMounted={isMounted}>
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
