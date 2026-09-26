import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity, Infinity } from 'lucide-react';
import { ExerciseStats } from '../../../types';
import { LazyRender } from '../../ui/LazyRender';
import { ChartSkeleton } from '../../ui/ChartSkeleton';
import { SegmentControl } from '../../ui/SegmentControl';
import { Reveal } from '../../ui/Reveal';
import { formatNumber } from '../../../utils/format/formatters';
import { RECHARTS_XAXIS_PADDING, RECHARTS_YAXIS_MARGIN, calculateYAxisDomain, formatAxisNumber } from '../../../utils/chart/chartEnhancements';
import type { ExerciseSessionEntry } from '../../../utils/analysis/exerciseTrend';
import { GAINING_PCT_THRESHOLD, LOSING_PCT_THRESHOLD } from '../../../utils/analysis/exerciseTrend';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import { CustomTooltip } from './ExerciseChartTooltip';
import { StrengthProgressionValueDot } from './StrengthProgressionValueDot';
import { getThemeMode } from '../../../utils/storage/localStorage';
import { getLoadProgressionDirection } from '../../../utils/exercise/loadProgression';

interface ExerciseProgressChartProps {
  selectedStats: ExerciseStats;
  selectedSessions: ExerciseSessionEntry[];
  chartData: any[];
  viewMode: 'all' | 'weekly' | 'monthly' | 'yearly';
  setViewMode: (mode: 'all' | 'weekly' | 'monthly' | 'yearly') => void;
  allAggregationMode: 'daily' | 'weekly' | 'monthly';
  weightUnit: WeightUnit;
  isBodyweightLike: boolean;
  showUnilateral: boolean;
  setShowUnilateral: (show: boolean) => void;
  hasUnilateralChartData: boolean;
  sessionsCount: number;
  xTicks: any;
  tickIndexMap: Record<number, boolean>;
}

export const ExerciseProgressChart: React.FC<ExerciseProgressChartProps> = ({
  selectedStats,
  selectedSessions,
  chartData,
  viewMode,
  setViewMode,
  allAggregationMode,
  weightUnit,
  isBodyweightLike,
  showUnilateral,
  setShowUnilateral,
  hasUnilateralChartData,
  sessionsCount,
  xTicks,
  tickIndexMap,
}) => {
  if (!selectedStats) return null;
  const isLowerWeightBetter = getLoadProgressionDirection(selectedStats.name) === 'lower';
  const positiveLabel = isLowerWeightBetter ? 'Easier Loading' : 'Gaining';
  const negativeLabel = isLowerWeightBetter ? 'Harder Loading' : 'Losing';

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const mode = getThemeMode();
    return mode !== 'light';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const mode = getThemeMode();
      setIsDarkMode(mode !== 'light');
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const dataKeys = showUnilateral && hasUnilateralChartData
    ? (isBodyweightLike ? ['leftReps', 'rightReps'] : ['leftOneRepMax', 'rightOneRepMax'])
    : (isBodyweightLike ? ['reps', 'sets'] : ['oneRepMax', 'weight']);
  const yAxisDomain = calculateYAxisDomain(chartData, dataKeys);

  // Calculate gradient stops based on strength progression
  const progressionGradientStops = useMemo(() => {
    if (chartData.length < 2) return [];
    
    const valueKey = isBodyweightLike ? 'reps' : 'oneRepMax';
    const stops: Array<{ offset: number; color: string }> = [];
    // Zone colors: gaining=green, plateauing=yellow, losing=red
    const colors = {
      gaining: '#22c55e',
      plateauing: '#eab308', 
      losing: '#ef4444'
    };
    
    // Helper to get progression type
    const getProgressionType = (current: number, previous: number): keyof typeof colors => {
      if (previous === 0) return 'plateauing';
      const change = (current - previous) / previous;
      if (change >= LOSING_PCT_THRESHOLD / 100 && change <= GAINING_PCT_THRESHOLD / 100) return 'plateauing';
      if (isBodyweightLike) return change > 0 ? 'gaining' : 'losing';
      if (isLowerWeightBetter) return change < 0 ? 'gaining' : 'losing';
      return change > 0 ? 'gaining' : 'losing';
    };
    
    // Add initial stop
    const firstValue = chartData[0][valueKey];
    const secondValue = chartData[1][valueKey];
    const initialType = getProgressionType(secondValue, firstValue);
    stops.push({ offset: 0, color: colors[initialType] });
    
    for (let i = 0; i < chartData.length - 1; i++) {
      const current = chartData[i][valueKey];
      const next = chartData[i + 1][valueKey];
      const type = getProgressionType(next, current);
      const offset = (i + 1) / (chartData.length - 1);
      
      stops.push({ offset, color: colors[type] });
    }
    
    return stops;
  }, [chartData, isBodyweightLike]);

  return (
    <Reveal className="w-full bg-black/50 border border-slate-700/50 rounded-2xl p-1 sm:p-2 relative flex flex-col h-[280px] sm:h-[322px]">
      {/* Mobile header - compact 2-line layout */}
      <div className="sm:hidden flex flex-col gap-1 mb-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">{isBodyweightLike ? 'Reps Progression' : 'Strength Progression'}</h3>
          <SegmentControl
            dataTrack="timerange-exerciseprogress"
            options={[
              { value: 'all', icon: <Infinity className="w-3 h-3" />, title: 'All' },
              { value: 'weekly', label: 'lst wk', title: 'Last Week' },
              { value: 'monthly', label: 'lst mo', title: 'Last Month' },
              { value: 'yearly', label: 'lst yr', title: 'Last Year' },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
          <span className="text-slate-500">
            {isBodyweightLike ? 'Top reps vs sets' : (
              <>
                <span className="text-blue-400">1RM</span> & <span className="text-slate-400">Weight</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-2 font-medium">
            {isBodyweightLike ? (
              <>
                <div className="flex items-center gap-0.5 text-blue-400">
                  <span className="w-2 h-2 rounded bg-blue-500/20 border border-blue-500"></span> Reps
                </div>
                <div className="flex items-center gap-0.5 text-slate-500">
                  <span className="w-2 h-0.5 bg-slate-500"></span> Sets
                </div>
              </>
            ) : showUnilateral && hasUnilateralChartData ? (
              <>
                <div className="flex items-center gap-0.5 text-cyan-400">
                  <span className="w-2 h-2 rounded bg-cyan-500/20 border border-cyan-500"></span> L
                </div>
                <div className="flex items-center gap-0.5 text-violet-400">
                  <span className="w-2 h-2 rounded bg-violet-500/20 border border-violet-500"></span> R
                </div>
              </>
            ) : (
              <>
                 <div className="flex items-center gap-1.5 text-emerald-400/80">
                   <span className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-400/60"></span> <span className="text-[10px] sm:text-xs font-semibold">{positiveLabel}</span>
                 </div>
                <div className="flex items-center gap-1.5 text-yellow-400/80">
                  <span className="w-2 h-2 rounded-full bg-yellow-500/20 border border-yellow-400/60"></span> <span className="text-[10px] sm:text-xs font-semibold">Plateauing</span>
                </div>
                 <div className="flex items-center gap-1.5 text-rose-400/80">
                   <span className="w-2 h-2 rounded-full bg-rose-500/20 border border-rose-400/60"></span> <span className="text-[10px] sm:text-xs font-semibold">{negativeLabel}</span>
                 </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop header - original layout */}
      <div className="hidden sm:flex flex-row justify-between items-end mb-6 gap-2 shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-white">{isBodyweightLike ? 'Reps Progression' : 'Strength Progression'}</h3>
          {isBodyweightLike ? (
            <p className="text-xs text-slate-500">Top reps vs sets</p>
          ) : (
            <p className="text-xs text-slate-500">
              Estimated <span className="text-blue-400">1RM</span> & <span className="text-slate-400">Actual Lift Weight</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1.5 min-h-8 bg-black/20 border border-slate-700/50 rounded-lg">
              <Activity className="w-3 h-3 text-slate-400" />
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <span className="text-white font-bold">{sessionsCount}</span>
                <span className="text-[8px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Sessions</span>
              </div>
            </div>
          </div>
          {isBodyweightLike ? (
            <>
              <div className="flex items-center gap-2 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500/20 border border-blue-500/60"></span> <span className="text-[10px] sm:text-xs font-semibold">Top reps</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="w-2.5 h-0.5 bg-slate-500 border-t border-dashed border-slate-500"></span> <span className="text-[10px] sm:text-xs font-semibold">Sets</span>
              </div>
            </>
          ) : showUnilateral && hasUnilateralChartData ? (
            <>
              <div className="flex items-center gap-2 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/20 border border-cyan-500/60"></span> <span className="text-[10px] sm:text-xs font-semibold">Left</span>
              </div>
              <div className="flex items-center gap-2 text-violet-400">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500/20 border border-violet-500/60"></span> <span className="text-[10px] sm:text-xs font-semibold">Right</span>
              </div>
            </>
          ) : (
            <>
               <div className="flex items-center gap-2 text-emerald-400">
                 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/60"></span> <span className="text-[10px] sm:text-xs font-semibold">{positiveLabel}</span>
               </div>
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/60"></span> <span className="text-[10px] sm:text-xs font-semibold">Plateauing</span>
              </div>
               <div className="flex items-center gap-2 text-rose-400">
                 <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/60"></span> <span className="text-[10px] sm:text-xs font-semibold">{negativeLabel}</span>
               </div>
            </>
          )}

          {hasUnilateralChartData && !isBodyweightLike && (
            <button
              onClick={() => setShowUnilateral(!showUnilateral)}
              title={showUnilateral ? 'Hide L/R split' : 'Show L/R split'}
              aria-label={showUnilateral ? 'Hide L/R split' : 'Show L/R split'}
              className={`px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold whitespace-nowrap border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 cursor-pointer ${showUnilateral
                ? 'bg-blue-600 text-white border-transparent'
                : 'text-slate-500 hover:text-slate-300 hover:bg-black/60 border border-slate-700/50'
                }`}
            >
              L / R
            </button>
          )}

          <SegmentControl
            dataTrack="timerange-exerciseprogress"
            options={[
              { value: 'all', icon: <Infinity className="w-3 h-3" />, title: 'All' },
              { value: 'weekly', label: 'lst wk', title: 'Last Week' },
              { value: 'monthly', label: 'lst mo', title: 'Last Month' },
              { value: 'yearly', label: 'lst yr', title: 'Last Year' },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      <div className="w-full flex-1 min-h-0">
        {chartData.length === 0 ? (
          <div className="w-full h-full min-h-[260px] flex items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg px-4 sm:px-0 text-center">
            Building history, log a few more sessions to see Strength Progression.
          </div>
        ) : (
          <LazyRender className="w-full h-full" placeholder={<ChartSkeleton className="h-full min-h-[260px]" />}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                key={`${selectedStats.name}:${viewMode}:${allAggregationMode}:${weightUnit}:${showUnilateral}`}
                data={chartData}
                margin={{ top: 10, ...RECHARTS_YAXIS_MARGIN, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="color1RM" x1="0" y1="0" x2="1" y2="0">
                    {progressionGradientStops.length > 0 && (
                      <>
                        <stop offset="0%" stopColor={progressionGradientStops[0].color} stopOpacity={0} />
                        <stop offset="6%" stopColor={progressionGradientStops[0].color} stopOpacity={isDarkMode ? 0.2 : 0.5} />
                      </>
                    )}
                    {progressionGradientStops.slice(1, -1).map((stop, idx) => (
                      <stop key={idx} offset={`${stop.offset * 100}%`} stopColor={stop.color} stopOpacity={isDarkMode ? 0.2 : 0.5} />
                    ))}
                    {progressionGradientStops.length > 0 && (
                      <>
                        <stop offset="94%" stopColor={progressionGradientStops[progressionGradientStops.length - 1].color} stopOpacity={isDarkMode ? 0.2 : 0.5} />
                        <stop offset="100%" stopColor={progressionGradientStops[progressionGradientStops.length - 1].color} stopOpacity={0} />
                      </>
                    )}
                  </linearGradient>

                  <linearGradient id="areaTopFadeMask" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
                    <stop offset="40%" stopColor="#ffffff" stopOpacity={0.6} />
                    <stop offset="60%" stopColor="#ffffff" stopOpacity={0.4} />
                    <stop offset="80%" stopColor="#ffffff" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                  <mask id="areaTopFadeMaskDef" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                    <rect x="0" y="0" width="1" height="1" fill="url(#areaTopFadeMask)" />
                  </mask>
                  <linearGradient id="efGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="6%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="94%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  <mask id="efMask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                    <rect x="0" y="0" width="1" height="1" fill="url(#efGrad)" />
                  </mask>
                  <linearGradient id="colorLeftRM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRightRM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-rgb) / 0.2)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  padding={RECHARTS_XAXIS_PADDING as any}
                  interval={0}
                  ticks={xTicks as any}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={yAxisDomain}
                  tickFormatter={(val) => formatAxisNumber(Number(val), isBodyweightLike ? undefined : weightUnit)}
                />
                <Tooltip
                  content={<CustomTooltip weightUnit={weightUnit} hasUnilateralData={hasUnilateralChartData} showUnilateral={showUnilateral} />}
                  cursor={{ stroke: 'rgb(var(--border-rgb) / 0.5)', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                {(!showUnilateral || !hasUnilateralChartData) ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey={isBodyweightLike ? 'reps' : 'oneRepMax'}
                      stroke="none"
                      fill="url(#color1RM)"
                      mask="url(#areaTopFadeMaskDef)"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={true}
                      animationDuration={250}
                    />
                    <Line
                      type="monotone"
                      dataKey={isBodyweightLike ? 'reps' : 'oneRepMax'}
                      stroke="#175c0f"
                      strokeWidth={0.5}
                      fill="none"
                      dot={<StrengthProgressionValueDot
                        valueKey={isBodyweightLike ? 'reps' : 'oneRepMax'}
                        unit={isBodyweightLike ? undefined : weightUnit}
                        data={chartData}
                        color="#2cac1e"
                        showAtIndexMap={tickIndexMap}
                        showDotWhenHidden={false}
                        isBodyweightLike={isBodyweightLike}
                        selectedSessions={selectedSessions}
                        selectedStats={selectedStats}
                        weightUnit={weightUnit}
                        prTypesToShow={['oneRm']}
                        labelPosition="above"
                      />}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      isAnimationActive={true}
                      animationDuration={250}
                    />
                    <Line
                      type="monotone"
                      dataKey={isBodyweightLike ? 'reps' : 'weight'}
                      stroke="transparent"
                      strokeWidth={0}
                      dot={<StrengthProgressionValueDot
                        valueKey={isBodyweightLike ? 'reps' : 'weight'}
                        unit={isBodyweightLike ? undefined : weightUnit}
                        data={chartData}
                        color="var(--text-muted)"
                        showAtIndexMap={tickIndexMap}
                        showDotWhenHidden={false}
                        isBodyweightLike={isBodyweightLike}
                        selectedSessions={selectedSessions}
                        selectedStats={selectedStats}
                        weightUnit={weightUnit}
                        prTypesToShow={['weight', 'volume']}
                        labelPosition="below"
                      />}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      isAnimationActive={true}
                      animationDuration={250}
                    />
                  </>
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey={isBodyweightLike ? 'leftReps' : 'leftOneRepMax'}
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fill="url(#colorLeftRM)"
                      mask="url(#efMask)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#06b6d4' }}
                      isAnimationActive={true}
                      animationDuration={250}
                      name="Left"
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey={isBodyweightLike ? 'rightReps' : 'rightOneRepMax'}
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fill="url(#colorRightRM)"
                      mask="url(#efMask)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#8b5cf6' }}
                      isAnimationActive={true}
                      animationDuration={250}
                      name="Right"
                      connectNulls
                    />
                  </>
                )}

                <Line
                  type="stepAfter"
                  dataKey={isBodyweightLike ? 'sets' : 'weight'}
                  stroke="var(--text-muted)"
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={true}
                  animationDuration={250}
                />
              </AreaChart>
            </ResponsiveContainer>
          </LazyRender>
        )}
      </div>
    </Reveal>
  );
};
