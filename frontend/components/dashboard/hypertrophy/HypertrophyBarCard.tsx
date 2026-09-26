import React, { useMemo } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { Reveal } from '../../ui/Reveal';
import { Tooltip, useTooltip } from '../../ui/Tooltip';
import { SegmentControl } from '../../ui/SegmentControl';
import { SEMI_FANCY_FONT } from '../../../utils/ui/uiConstants';
import { useIsMobile } from '../../insights/useIsMobile';
import { ChartDescription, InsightText } from '../../dashboard/insights/ChartBits';
import {
  FACTOR_COLORS,
  FACTOR_WEIGHTS,
  getScoreRating,
  type MuscleHypertrophyData,
} from '../../../utils/muscle/hypertrophy/hypertrophyScore';

const FactorProgressBar: React.FC<{
  volumeScore: number;
  progressiveOverload: number;
  frequency: number;
}> = ({ volumeScore, progressiveOverload, frequency }) => {
  const isMobile = useIsMobile(768);
  const TOTAL_PILLS = isMobile ? 7 : 12;

  const pillData = useMemo(() =>
    Array.from({ length: TOTAL_PILLS }).map(() => {
      const flexGrow = Math.floor(Math.random() * 3) + 1;
      return { flexGrow, marginLeft: flexGrow > 1 ? '1px' : '2px' };
    }),
    [TOTAL_PILLS]
  );

  const totalFlex = pillData.reduce((sum, p) => sum + p.flexGrow, 0);
  const segs = [
    { color: FACTOR_COLORS.volumeScore, filled: (volumeScore / 100) * FACTOR_WEIGHTS.volumeScore * totalFlex },
    { color: FACTOR_COLORS.progressiveOverload, filled: (progressiveOverload / 40) * FACTOR_WEIGHTS.progressiveOverload * totalFlex },
    { color: FACTOR_COLORS.frequency, filled: (frequency / 100) * FACTOR_WEIGHTS.frequency * totalFlex },
  ];

  let segAcc = 0;
  const segBounds = segs
    .filter(s => s.filled > 0)
    .map(s => { const start = segAcc; segAcc += s.filled; return { ...s, start, end: segAcc }; });
  const totalFilled = segAcc;

  let accumulatedFlex = 0;
  return (
    <div className="flex items-center h-2.5">
      {pillData.map((pill, idx) => {
        const pillStart = accumulatedFlex;
        const pillEnd = accumulatedFlex + pill.flexGrow;
        accumulatedFlex += pill.flexGrow;
        const fillStart = Math.max(pillStart, 0);
        const fillEnd = Math.min(pillEnd, totalFilled);
        const fillAmount = Math.max(0, fillEnd - fillStart);
        const fillPercent = pill.flexGrow > 0 ? ((fillAmount / pill.flexGrow) * 100) : 0;
        const seg = segBounds.find(s => pillStart < s.end);
        return (
          <div key={idx} className="h-full rounded-sm relative overflow-hidden"
            style={{ flexGrow: pill.flexGrow, marginLeft: idx === 0 ? 0 : pill.marginLeft, backgroundColor: 'rgba(100, 100, 100, 0.15)' }}>
            {fillPercent > 0 && (
              <div className="absolute top-0 left-0 h-full rounded-sm"
                style={{ width: `${fillPercent}%`, backgroundColor: seg?.color ?? 'rgba(100,100,100,0.3)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

interface HypertrophyBarCardProps {
  hypertrophyData: MuscleHypertrophyData[];
  hypertrophyData30d?: MuscleHypertrophyData[];
  selectedMuscleId?: string | null;
  onMuscleClick?: (muscleId: string) => void;
  hypertrophyPeriod: '7d' | '30d';
  setHypertrophyPeriod: (v: '7d' | '30d') => void;
}

const HypertrophySortSelect: React.FC<{
  value: 'total' | 'volume' | 'progress';
  onChange: (v: 'total' | 'volume' | 'progress') => void;
}> = ({ value, onChange }) => {
  const options = [
    { value: 'total', label: 'Score', title: 'Sort by total score' },
    { value: 'volume', label: 'Volume', title: 'Sort by volume' },
    { value: 'progress', label: 'Progress', title: 'Sort by progress' },
  ] as const;
  return (
    <SegmentControl
      options={options}
      value={value}
      onChange={(v) => onChange(v as typeof value)}
    />
  );
};

export const HypertrophyBarCard: React.FC<HypertrophyBarCardProps> = ({
  hypertrophyData,
  hypertrophyData30d,
  selectedMuscleId,
  onMuscleClick,
  hypertrophyPeriod,
  setHypertrophyPeriod,
}) => {
  const { tooltip, showTooltip, hideTooltip } = useTooltip();

  const sortedData = useMemo(() =>
    [...hypertrophyData].sort((a, b) => b.score.totalScore - a.score.totalScore),
    [hypertrophyData]
  );

  const stats = useMemo(() => {
    if (sortedData.length === 0) return null;
    const avgScore = sortedData.reduce((sum, m) => sum + m.score.totalScore, 0) / sortedData.length;
    return { avgScore, bestMuscle: sortedData[0], count: sortedData.length };
  }, [sortedData]);

  const prevPositionMap = useMemo(() => {
    if (!hypertrophyData30d || hypertrophyPeriod !== '7d') return null;
    const map = new Map<string, number>();
    hypertrophyData30d.forEach((m, idx) => {
      map.set(m.muscleId, idx + 1);
    });
    return map;
  }, [hypertrophyData30d, hypertrophyPeriod]);

  const volColor = (v: number) => v <= 15 ? '#ef4444' : v <= 35 ? '#f59e0b' : '#22c55e';
  const progColor = (v: number) => v <= 11 ? '#ef4444' : v <= 22 ? '#f59e0b' : '#22c55e';
  const freqColor = (v: number) => v <= 3 ? '#ef4444' : v <= 6 ? '#f59e0b' : '#22c55e';

  const handleMouseEnter = (e: React.MouseEvent, m: MuscleHypertrophyData) => {
    const raw = m.score.raw;
    const volW = Math.round(m.score.volumeScore * FACTOR_WEIGHTS.volumeScore);
    const progW = Math.round(m.score.progressiveOverload);
    const freqW = Math.round(m.score.frequency * FACTOR_WEIGHTS.frequency);
    const trendSign = raw.oneRMTrend > 0 ? '+' : '';
    const trendLabel = `${trendSign}${raw.oneRMTrend.toFixed(1)}%`;
    const volMax = Math.round(FACTOR_WEIGHTS.volumeScore * 100);
    const progMax = Math.round(FACTOR_WEIGHTS.progressiveOverload * 100);
    const freqMax = Math.round(FACTOR_WEIGHTS.frequency * 100);

    const span = (c: string, t: string) => `<span style="color:${c}">${t}</span>`;

    showTooltip(e, {
      title: m.muscleName,
      bodySections: [
        { text: `${span(FACTOR_COLORS.volumeScore, 'Volume:')} ${span(volColor(volW), `${volW}/${volMax} — ${raw.weeklySets.toFixed(1)} sets/week`)}`, color: '' },
        { text: `${span(FACTOR_COLORS.progressiveOverload, 'Progress:')} ${span(progColor(progW), `${progW}/${progMax} — ${trendLabel} trend`)}`, color: '' },
        { text: `${span(FACTOR_COLORS.frequency, 'Frequency:')} ${span(freqColor(freqW), `${freqW}/${freqMax} — ${raw.daysPerWeek.toFixed(1)} days/week`)}`, color: '' },
      ],
      status: m.score.totalScore >= 60 ? 'success' : m.score.totalScore >= 40 ? 'info' : 'warning',
    });
  };

  return (
    <Reveal className="bg-black/20 rounded-xl border border-slate-700/50 px-2 sm:px-3 py-4 sm:py-6 min-h-[400px] sm:min-h-[520px] lg:min-h-0 lg:h-full flex flex-col" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            <h2 className="text-xs sm:text-lg font-semibold text-white">Hypertrophy Scores</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Per muscle breakdown</p>
          </div>
          <SegmentControl
            dataTrack="timerange-hypertrophy-bar"
            options={[
              { value: '7d', label: 'lst wk', title: 'Last 7 days' },
              { value: '30d', label: 'lst mo', title: 'Last 30 days' },
            ]}
            value={hypertrophyPeriod}
            onChange={(v) => setHypertrophyPeriod(v as '7d' | '30d')}
          />
        </div>

        {stats && (
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <svg width="56" height="56" className="transform -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" stroke="rgba(100, 100, 100, 0.1)" />
                <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5"
                  stroke={getScoreRating(stats.avgScore).color} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - stats.avgScore / 100)}
                  className="transition-[stroke-dashoffset,stroke] duration-200 ease-out" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[13px] font-bold text-white">{Math.round(stats.avgScore)}%</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mt-0.5">
                {(() => {
                  const rating = getScoreRating(stats.avgScore);
                  return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold"
                      style={{ backgroundColor: `${rating.color}20`, color: rating.color }}>
                      <TrendingUp className="w-3 h-3" />
                      {rating.label}
                    </span>
                  );
                })()}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">{stats.count} muscles actively trained</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                {Math.round(stats.avgScore)}% average · Best: {stats.bestMuscle?.muscleName} ({stats.bestMuscle?.score.totalScore}%)
              </p>
            </div>
          </div>
        )}

        {!stats && (
          <div className="text-[10px] sm:text-xs text-slate-500 py-2">No workout data available for hypertrophy scoring.</div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-3">
        {sortedData.length > 0 ? (
          <div className="space-y-2 pr-1">
            <div className="flex items-center justify-center gap-3 px-1 pt-3">
              {([
                { color: FACTOR_COLORS.volumeScore, label: 'Volume' },
                { color: FACTOR_COLORS.progressiveOverload, label: 'Progress' },
                { color: FACTOR_COLORS.frequency, label: 'Frequency' },
              ] as const).map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[8px] sm:text-[10px] text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
            {sortedData.map((m, idx) => {
              const isSelected = m.muscleId === selectedMuscleId;
              const rating = getScoreRating(m.score.totalScore);
              const currentPos = idx + 1;
              const prevPos = prevPositionMap?.get(m.muscleId);
              const movedUp = prevPos !== undefined && currentPos < prevPos;
              const movedDown = prevPos !== undefined && currentPos > prevPos;
              const isNew = prevPos === undefined;
              return (
                <div key={m.muscleId}
                  className="flex items-center gap-1 rounded py-0.5 group relative cursor-pointer"
                  data-track={`muscle-card:${m.muscleId}`}
                  onClick={() => { if (window.innerWidth >= 768) onMuscleClick?.(m.muscleId); }}
                  onMouseEnter={(e) => handleMouseEnter(e, m)}
                  onMouseLeave={hideTooltip}>
              <span className={`text-[10px] sm:text-xs w-[15%] lg:w-[13%] truncate flex-shrink-0 ${isSelected ? 'font-semibold text-white' : 'text-slate-500'}`} style={SEMI_FANCY_FONT}>
                {m.muscleName}
              </span>
                  <div className="flex-1">
                    <FactorProgressBar volumeScore={m.score.volumeScore} progressiveOverload={m.score.progressiveOverload} frequency={m.score.frequency} />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-semibold w-[7%] text-right flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                    {m.score.totalScore}%
                  </span>
                  {prevPositionMap ? (
                    <span
                      className="text-[9px] sm:text-[10px] flex items-center gap-0.5 w-[15%] lg:w-[13%] flex-shrink-0"
                      style={{ color: isNew || movedUp ? '#22c55e' : movedDown ? '#ef4444' : '#3b82f6' }}
                      title={isNew ? 'NEW' : movedUp ? `↑ from #${prevPos}` : movedDown ? `↓ from #${prevPos}` : `= #${currentPos}`}
                    >
                      <span className="font-bold">{isNew || movedUp ? '↑' : movedDown ? '↓' : '='}</span>
                      <span>{isNew ? 'NEW' : (movedUp || movedDown) ? `#${prevPos} → #${currentPos}` : `#${currentPos}`}</span>
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] flex items-center gap-1 w-[15%] lg:w-[13%] flex-shrink-0" style={{ color: rating.color }}>
                      <span className="truncate">{rating.label}</span>
                      <TrendingUp className="w-3 h-3" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[10px] sm:text-xs text-slate-500 py-4 text-center">No muscle data available.</div>
        )}
      </div>
      <ChartDescription>
        <InsightText text="The hypertrophy score estimates muscle growth potential from 0 to 100 percent. It combines three factors: volume how many weekly sets, progress how much your strength is trending up, and frequency how often you train each muscle. Higher scores mean a better stimulus for growth." />
      </ChartDescription>
      {tooltip && <Tooltip data={tooltip} />}
    </Reveal>
  );
};