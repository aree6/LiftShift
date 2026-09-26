import React, { useMemo } from 'react';
import { Sprout, Leaf, TreePine, Hammer, Pickaxe, Gem, Target, Crown, Zap, TrendingUp, BarChart3, ScatterChart } from 'lucide-react';
import {
  ScatterChart as ReScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '../../../utils/format/formatters';
import { Tooltip, useTooltip } from '../../ui/Tooltip';
import { SegmentControl } from '../../ui/SegmentControl';
import {
  JOURNEY_TIERS,
  calculateAchievement,
  findTierByAchievement,
  getNextTier,
  estimateWeeksToNextTier,
  getTierColor,
} from '../../../utils/training/tierUtils';
import { useIsMobile } from '../../insights/useIsMobile';
import { SEMI_FANCY_FONT } from '../../../utils/ui/uiConstants';
import type { WorkoutSet } from '../../../types';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import {
  calculateAllMuscleHypertrophyScores,
  FACTOR_COLORS,
  FACTOR_WEIGHTS,
  getScoreRating,
  type MuscleHypertrophyData,
} from '../../../utils/muscle/hypertrophy/hypertrophyScore';
import { weeklyStimulusFromThresholds } from '../../../utils/muscle/hypertrophy/hypertrophyCalculations';
import { getVolumeThresholds, type TrainingLevel } from '../../../utils/muscle/hypertrophy/muscleParams';
import { Reveal } from '../../ui/Reveal';

/** Format weeks to human-readable string */
function formatEta(weeks: number | null): string {
  if (weeks === null || weeks <= 0) return 'Reached';
  if (weeks === Infinity) return '∞ yrs';
  if (weeks <= 1) return '~1 wk';
  if (weeks < 6) return `~${weeks} wks`;
  const months = Math.round(weeks / 4.33);
  if (months <= 1) return '~1 mo';
  if (months < 12) return `~${months} mo`;
  const years = Math.round((months / 12) * 10) / 10;
  if (years <= 1) return '~1 yr';
  return `~${years} yrs`;
}

interface LifetimeAchievementData {
  overallPercent: number;
  overallTier: { key: string; label: string; description: string; color: string; hexColor: string };
  muscles: Array<{
    muscleId: string;
    name: string;
    lifetimeSets: number;
    weeklySets: number;
  }>;
  totalLifetimeSets: number;
}

interface LifetimeAchievementCardProps {
  data?: LifetimeAchievementData;
  muscles?: LifetimeAchievementCardProps['data'] extends never ? never : LifetimeAchievementData['muscles'];
  selectedMuscleId?: string | null;
  onMuscleClick?: (muscleId: string) => void;
  /** Workout data for hypertrophy score calculation */
  workoutData?: WorkoutSet[];
  /** Exercise assets map for muscle identification */
  assetsMap?: Map<string, ExerciseAsset>;
  /** Reference date for hypertrophy window calculations (defaults to latest data date) */
  effectiveNow?: Date;
  /** Only include sets on or after this date (respects weekly sets window filter) */
  windowStart?: Date | null;
  /** Pre-computed weekly set rates per muscle from the body map (single source of truth for volume) */
  muscleRatesMap?: ReadonlyMap<string, number>;
  /** Training level for volume threshold selection (matches body map) */
  trainingLevel?: TrainingLevel;
  /** Pre-computed hypertrophy scores (when lifted to parent, skips internal calculation) */
  hypertrophyScores?: MuscleHypertrophyData[];
}

const TIER_ICONS: Record<string, React.FC<{ className?: string }>> = {
  seedling: Sprout,
  sprout: Leaf,
  sapling: TreePine,
  foundation: Hammer,
  builder: Pickaxe,
  sculptor: Gem,
  elite: Target,
  master: Crown,
  legend: Zap,
};

const TierIcon: React.FC<{ tierKey: string; className?: string }> = ({
  tierKey,
  className = 'w-3 h-3',
}) => {
  const Icon = TIER_ICONS[tierKey] ?? Sprout;
  return <Icon className={className} />;
};

const ProgressBar: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
  const isMobile = useIsMobile(768);
  const TOTAL_PILLS = isMobile ? 6 : 10;
  
  const pillData = useMemo(() => 
    Array.from({ length: TOTAL_PILLS }).map(() => {
      const flexGrow = Math.floor(Math.random() * 3) + 1;
      return {
        flexGrow,
        marginLeft: flexGrow > 1 ? '1px' : '2px',
      };
    }),
    [TOTAL_PILLS]
  );
  
  const totalFlex = pillData.reduce((sum, p) => sum + p.flexGrow, 0);
  const filledFlex = (percent / 100) * totalFlex;
  
  let accumulatedFlex = 0;
  
  return (
    <div className="flex items-center h-2.5">
      {pillData.map((pill, idx) => {
        const pillStart = accumulatedFlex;
        const pillEnd = accumulatedFlex + pill.flexGrow;
        const fillPercent = Math.max(0, Math.min(100, ((filledFlex - pillStart) / pill.flexGrow) * 100));
        accumulatedFlex += pill.flexGrow;
        
        return (
          <div
            key={idx}
            className="h-full rounded-sm relative overflow-hidden"
            style={{
              flexGrow: pill.flexGrow,
              marginLeft: idx === 0 ? 0 : pill.marginLeft,
              backgroundColor: 'rgba(100, 100, 100, 0.15)',
            }}
          >
            {fillPercent > 0 && (
              <div
                className="absolute top-0 left-0 h-full rounded-sm"
                style={{
                  width: `${fillPercent}%`,
                  backgroundColor: color,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Stacked pill bar: same pill style as ProgressBar, filled proportionally by factor score */
const FactorProgressBar: React.FC<{
  volumeScore: number;
  progressiveOverload: number;
  frequency: number;
}> = ({ volumeScore, progressiveOverload, frequency }) => {
  const isMobile = useIsMobile(768);
  const TOTAL_PILLS = isMobile ? 8 : 14;

  const pillData = useMemo(() =>
    Array.from({ length: TOTAL_PILLS }).map(() => {
      const flexGrow = Math.floor(Math.random() * 3) + 1;
      return {
        flexGrow,
        marginLeft: flexGrow > 1 ? '1px' : '2px',
      };
    }),
    [TOTAL_PILLS]
  );

  const totalFlex = pillData.reduce((sum, p) => sum + p.flexGrow, 0);

  // Each factor fills (score/100 * weight% of total bar)
  // Accumulated left-to-right: Volume → Progress → Frequency
  const segs = [
    { color: FACTOR_COLORS.volumeScore, filled: (volumeScore / 100) * FACTOR_WEIGHTS.volumeScore * totalFlex },
    { color: FACTOR_COLORS.progressiveOverload, filled: (progressiveOverload / 100) * FACTOR_WEIGHTS.progressiveOverload * totalFlex },
    { color: FACTOR_COLORS.frequency, filled: (frequency / 100) * FACTOR_WEIGHTS.frequency * totalFlex },
  ];

  // Build segment boundaries (skip zero-width segments to avoid color-bleeding)
  let segAcc = 0;
  const segBounds = segs
    .filter(s => s.filled > 0)
    .map((s) => {
      const start = segAcc;
      segAcc += s.filled;
      return { ...s, start, end: segAcc };
    });
  const totalFilled = segAcc;

  let accumulatedFlex = 0;

  return (
    <div className="flex items-center h-2.5">
      {pillData.map((pill, idx) => {
        const pillStart = accumulatedFlex;
        const pillEnd = accumulatedFlex + pill.flexGrow;
        accumulatedFlex += pill.flexGrow;

        // How much of this pill is filled?
        const fillStart = Math.max(pillStart, 0);
        const fillEnd = Math.min(pillEnd, totalFilled);
        const fillAmount = Math.max(0, fillEnd - fillStart);
        const fillPercent = pill.flexGrow > 0 ? ((fillAmount / pill.flexGrow) * 100) : 0;

        // Color based on where the filled portion starts (not pill midpoint)
        const seg = segBounds.find(s => fillStart < s.end);

        return (
          <div
            key={idx}
            className="h-full rounded-sm relative overflow-hidden"
            style={{
              flexGrow: pill.flexGrow,
              marginLeft: idx === 0 ? 0 : pill.marginLeft,
              backgroundColor: 'rgba(100, 100, 100, 0.15)',
            }}
          >
            {fillPercent > 0 && (
              <div
                className="absolute top-0 left-0 h-full rounded-sm"
                style={{
                  width: `${fillPercent}%`,
                  backgroundColor: seg?.color ?? 'rgba(100,100,100,0.3)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const SCATTER_DOT_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

const volColor = (v: number) => v <= 15 ? '#ef4444' : v <= 35 ? '#f59e0b' : '#22c55e';
const progColor = (v: number) => v <= 11 ? '#ef4444' : v <= 22 ? '#f59e0b' : '#22c55e';

const HypertrophyScatterChart: React.FC<{ data: MuscleHypertrophyData[] }> = ({ data }) => {
  const chartData = useMemo(() =>
    data.map(m => ({
      name: m.muscleName,
      muscleId: m.muscleId,
      progress: Math.round(m.score.progressiveOverload * FACTOR_WEIGHTS.progressiveOverload),
      volume: Math.round(m.score.volumeScore * FACTOR_WEIGHTS.volumeScore),
      total: m.score.totalScore,
    })),
    [data]
  );

  const getColor = (total: number) => {
    if (total >= 80) return SCATTER_DOT_COLORS[0];
    if (total >= 60) return SCATTER_DOT_COLORS[1];
    if (total >= 40) return SCATTER_DOT_COLORS[2];
    if (total >= 20) return SCATTER_DOT_COLORS[3];
    return SCATTER_DOT_COLORS[4];
  };

  // Diagonal reference: full Cartesian grid diagonal (0,0) → (50,50)
  const diagonalData = [{ progress: 0, volume: 0 }, { progress: 50, volume: 50 }];

  // Extreme muscles for labels (deduplicated by muscleId)
  const extremes = useMemo(() => {
    if (chartData.length === 0) return [];
    const seen = new Set<string>();
    const result: typeof chartData = [];
    const push = (d: (typeof chartData)[number]) => {
      if (d && !seen.has(d.muscleId)) { seen.add(d.muscleId); result.push(d); }
    };
    const by = (k: 'volume' | 'progress' | 'total') => [...chartData].sort((a, b) => b[k] - a[k]);
    push(by('volume')[0]);       // max volume
    push(by('volume').slice(-1)[0]); // min volume
    push(by('progress')[0]);     // max progress
    push(by('progress').slice(-1)[0]); // min progress
    push(by('total')[0]);        // max total score
    push(by('total').slice(-1)[0]); // min total score
    return result;
  }, [chartData]);

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="rounded-lg px-3 py-2 shadow-2xl border text-xs"
        style={{
          backgroundColor: 'rgb(var(--panel-rgb) / 0.95)',
          borderColor: 'rgb(var(--border-rgb) / 0.5)',
          color: 'var(--text-primary)',
        }}>
        <p className="font-semibold mb-1.5">{d?.name} <span className="opacity-60 font-normal">({d?.total}/100)</span></p>
        <div className="flex items-center gap-3">
          <span>Progress <b style={{ color: progColor(d?.progress) }}>{d?.progress}/40</b></span>
          <span>Volume <b style={{ color: volColor(d?.volume) }}>{d?.volume}/50</b></span>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReScatterChart margin={{ top: 28, right: 8, bottom: 28, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.25} />
        <XAxis
          type="number" dataKey="progress" domain={[0, 50]}
          tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#475569' }}
          label={{ value: 'Progress', position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
        />
        <YAxis
          type="number" dataKey="volume" domain={[0, 50]}
          tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#475569' }} width={28}
          label={{ value: 'Volume', angle: 0, position: 'insideTop', offset: -18, dx: +12, fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
        />
        <RechartsTooltip content={<CustomScatterTooltip />} />
        {/* Diagonal reference line across full Cartesian grid */}
        <Scatter data={diagonalData} line={{ stroke: '#94a3b8', strokeDasharray: '4 4', strokeWidth: 1 }} lineType="joint" shape={() => <></>} animationDuration={500} animationEasing="ease-out" legendType="none" />
        {/* Main data dots */}
        <Scatter data={chartData} shape="circle" animationDuration={500} animationEasing="ease-out">
          {chartData.map((entry) => (
            <Cell key={entry.muscleId} fill={getColor(entry.total)} fillOpacity={0.85} stroke={getColor(entry.total)} strokeWidth={0.5} />
          ))}
        </Scatter>
        {/* Extreme point labels only */}
        <Scatter data={extremes} shape="circle" animationDuration={500} animationEasing="ease-out" legendType="none"
          label={{ dataKey: 'name', position: 'top', fontSize: 9, fill: '#94a3b8', offset: 6 }}
        >
          {extremes.map((entry) => (
            <Cell key={entry.muscleId} fill="transparent" stroke="none" />
          ))}
        </Scatter>
      </ReScatterChart>
    </ResponsiveContainer>
  );
};

export const LifetimeAchievementCard: React.FC<LifetimeAchievementCardProps> = ({
  data,
  muscles: musclesProp,
  selectedMuscleId,
  onMuscleClick,
  workoutData,
  assetsMap,
  effectiveNow,
  windowStart,
  muscleRatesMap,
  trainingLevel = 'intermediate',
  hypertrophyScores,
}) => {
  const { tooltip, showTooltip, hideTooltip } = useTooltip();
  const viewMode = 'lifetime' as const;
  const hypertrophyChartMode = 'bar' as const;

  // Support both data prop and direct muscles prop
  const muscles = data?.muscles ?? musclesProp ?? [];
  const overallPercent = data?.overallPercent ?? 0;
  const overallTier = data?.overallTier ?? JOURNEY_TIERS[0];
  const totalSets = data?.totalLifetimeSets ?? 0;

  // Calculate hypertrophy scores or use pre-computed scores from parent
  const hypertrophyData = useMemo(() => {
    if (hypertrophyScores) return hypertrophyScores;
    if (!workoutData || !assetsMap || workoutData.length === 0) return [];
    const windowedData = windowStart
      ? workoutData.filter(s => s.parsedDate && s.parsedDate >= windowStart)
      : workoutData;
    if (windowedData.length === 0) return [];

    // Trend window adapts to filter: longer filter → longer trend lookback
    const refNow = effectiveNow ?? new Date();
    const dataSpanDays = windowStart
      ? Math.max(1, (refNow.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000))
      : 365;
    const trendWindowDays = Math.round(Math.max(14, Math.min(730, dataSpanDays * 2)));

    const scores = calculateAllMuscleHypertrophyScores(windowedData, assetsMap, trainingLevel, true, effectiveNow, trendWindowDays);

    // Override volume scores using the body map's muscleRatesMap (single source of truth)
    // The body map correctly handles: secondary multiplier, unilateral sets, MAX aggregation
    if (muscleRatesMap && muscleRatesMap.size > 0) {
      for (const m of scores) {
        const rate = muscleRatesMap.get(m.muscleId);
        if (rate !== undefined) {
          m.score.volumeScore = Math.round(weeklyStimulusFromThresholds(rate, getVolumeThresholds(trainingLevel)));
          m.score.raw.weeklySets = Math.round(rate * 10) / 10;
          m.score.totalScore = Math.round(
            m.score.volumeScore * FACTOR_WEIGHTS.volumeScore +
            m.score.progressiveOverload +
            m.score.frequency * FACTOR_WEIGHTS.frequency
          );
        }
      }
      scores.sort((a, b) => b.score.totalScore - a.score.totalScore);
    }

    return scores;
  }, [workoutData, assetsMap, effectiveNow, windowStart, muscleRatesMap, trainingLevel, hypertrophyScores]);

  // Overall hypertrophy stats
  const hypertrophyStats = useMemo(() => {
    if (hypertrophyData.length === 0) return null;
    const avgScore = hypertrophyData.reduce((sum, m) => sum + m.score.totalScore, 0) / hypertrophyData.length;
    const bestMuscle = hypertrophyData[0];
    return { avgScore, bestMuscle, count: hypertrophyData.length };
  }, [hypertrophyData]);

  const muscleData = useMemo(() => {
    return muscles
      .map(m => {
        let achievement = calculateAchievement(m.lifetimeSets);
        if (m.muscleId === 'shoulders') achievement *= 0.75;
        const tier = findTierByAchievement(achievement);
        const nextTier = getNextTier(achievement);
        const weeksToNext = nextTier ? estimateWeeksToNextTier(achievement, m.weeklySets) : null;

        return {
          ...m,
          achievement,
          tier,
          nextTier,
          weeksToNext,
        };
      })
      .sort((a, b) => b.achievement - a.achievement);
  }, [muscles]);

  const overallData = useMemo(() => {
    const avgAchievement = muscleData.length > 0 
      ? muscleData.reduce((sum, m) => sum + m.achievement, 0) / muscleData.length
      : 0;
    return { avgAchievement };
  }, [muscleData]);

  const handleMouseEnter = (e: React.MouseEvent, m: typeof muscleData[0]) => {
    let timeText = '';
    let etaText = '';
    
    if (!m.nextTier) {
      timeText = 'Max tier';
    } else if (m.weeksToNext === Infinity) {
      timeText = '∞ yrs';
      etaText = `∞ yrs to ${m.nextTier.label}`;
    } else if (m.weeksToNext) {
      timeText = formatEta(m.weeksToNext);
      etaText = `${timeText} to ${m.nextTier.label}`;
    }
    
    showTooltip(e, {
      title: m.name,
      body: `${m.tier.description}\n\n${Math.round(m.achievement)}%${etaText ? ` · ${etaText}` : ''}`,
      status: 'info',
    });
  };

  const handleHypertrophyMouseEnter = (e: React.MouseEvent, m: MuscleHypertrophyData) => {
    const raw = m.score.raw;
    const volW = Math.round(m.score.volumeScore * FACTOR_WEIGHTS.volumeScore);
    const progW = Math.round(m.score.progressiveOverload * FACTOR_WEIGHTS.progressiveOverload);
    const freqW = Math.round(m.score.frequency * FACTOR_WEIGHTS.frequency);
    const trendSign = raw.oneRMTrend > 0 ? '+' : '';
    const trendLabel = `${trendSign}${raw.oneRMTrend.toFixed(1)}%`;
    const volMax = Math.round(FACTOR_WEIGHTS.volumeScore * 100);
    const progMax = Math.round(FACTOR_WEIGHTS.progressiveOverload * 100);
    const freqMax = Math.round(FACTOR_WEIGHTS.frequency * 100);
    showTooltip(e, {
      title: m.muscleName,
      body: `Volume: ${volW}/${volMax} → ${raw.weeklySets.toFixed(1)} sets/week\n` +
        `Progress: ${progW}/${progMax} → ${trendLabel} trend\n` +
        `Frequency: ${freqW}/${freqMax} → ${raw.daysPerWeek.toFixed(1)} days/week`,
      status: m.score.totalScore >= 60 ? 'success' : m.score.totalScore >= 40 ? 'info' : 'warning',
    });
  };

  // View mode options for SegmentControl
  const viewOptions = [
    { value: 'hypertrophy', label: 'Hypertrophy Score', icon: <TrendingUp className="w-3 h-3" />, title: 'Hypertrophy Score View' },
    { value: 'lifetime', label: 'Lifetime Progress', icon: <Sprout className="w-3 h-3" />, title: 'Lifetime Journey View' },
  ] as const;

  const chartModeOptions = [
    { value: 'bar', icon: <BarChart3 className="w-3 h-3 rotate-90" />, title: 'Bar view' },
    { value: 'scatter', icon: <ScatterChart className="w-3 h-3" />, title: 'Scatter plot' },
  ] as const;

  return (
    <Reveal className="bg-black/20 rounded-xl border border-slate-700/50 overflow-hidden h-full min-h-0 flex flex-col" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.7)' }}>
      {/* Header */}
      <div className="p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs sm:text-lg font-semibold text-white">Lifetime Progress</h2>
        </div>

        {/* Content — always lifetime */}
        {overallData && (
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <svg width="56" height="56" className="transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  strokeWidth="5"
                  stroke="rgba(100, 100, 100, 0.1)"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  strokeWidth="5"
                  stroke={overallTier.hexColor}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - overallData.avgAchievement / 100)}
                  className="transition-[stroke-dashoffset,stroke] duration-200 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[13px] font-bold text-white">
                  {Math.round(overallData.avgAchievement)}%
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold ${overallTier.color}`}
                >
                  <TierIcon tierKey={overallTier.key} />
                  {overallTier.label}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-tight">
                {overallTier.description}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                {Math.round(overallData.avgAchievement)}% of lifetime gains
                {totalSets > 0 && (
                  <span className="text-slate-400"> · {formatNumber(Math.round(totalSets))} sets</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Per-muscle breakdown */}
      <div className="px-3 pb-3 flex-1 min-h-0 overflow-y-auto">
        {muscleData.length > 0 ? (
          <div className="space-y-2 pr-3">
            {muscleData.map((m) => {
              const isSelected = m.muscleId === selectedMuscleId;
              const color = getTierColor(m.tier.key);

              return (
                <div
                  key={m.muscleId}
                  className="flex items-center gap-2 rounded px-1 py-0.5 -mx-1 group relative cursor-pointer"
                  data-track={`muscle-card:${m.muscleId}`}
                  onClick={() => {
                    if (window.innerWidth >= 768) {
                      onMuscleClick?.(m.muscleId);
                    }
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, m)}
                  onMouseLeave={hideTooltip}
                >
                  <span
                    className={`text-[10px] sm:text-xs w-[15%] lg:w-[12%] truncate flex-shrink-0 ${
                      isSelected ? 'font-semibold text-white' : 'text-slate-500'
                    }`}
                    style={SEMI_FANCY_FONT}
                  >
                    {m.name}
                  </span>
                  <div className="w-[43%] lg:w-[55%]">
                    <ProgressBar percent={m.achievement} color={color} />
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-semibold w-[10%] text-right flex-shrink-0 ${
                      isSelected ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {Math.round(m.achievement)}%
                  </span>
                  <span
                    className={`text-[9px] sm:text-[10px] flex items-center gap-1 w-[20%] lg:w-[12%] flex-shrink-0 ${m.tier.color}`}
                  >
                    <span className="truncate">{m.tier.label}</span>
                    <TierIcon tierKey={m.tier.key} />
                  </span>
                  {m.weeksToNext && (
                    <span className="text-[9px] sm:text-[10px] text-slate-500 w-[12%] lg:w-[5%] flex-shrink-0">
                      {formatEta(m.weeksToNext)}
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
      {tooltip && <Tooltip data={tooltip} />}
    </Reveal>
  );
};
