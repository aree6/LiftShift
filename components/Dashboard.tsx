import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { DailySummary, ExerciseStats, WorkoutSet } from '../types';
import { 
  getIntensityEvolution, 
  getDayOfWeekShape, 
  getTopExercisesRadial,
  getPrsOverTime,
  getTopExercisesOverTime
} from '../utils/analytics';
import { normalizeMuscleGroup, getMuscleVolumeTimeSeriesCalendar, getMuscleVolumeTimeSeriesDetailedCalendar } from '../utils/muscleAnalytics';
import { CSV_TO_SVG_MUSCLE_MAP, SVG_MUSCLE_NAMES, getVolumeColor } from '../utils/muscleMapping';
import { BodyMap, BodyMapGender } from './BodyMap';
import { MUSCLE_COLORS } from '../utils/categories';
import { getSmartFilterMode, TimeFilterMode, WeightUnit } from '../utils/localStorage';
import { convertVolume } from '../utils/units';
import { CHART_TOOLTIP_STYLE, CHART_COLORS, ANIMATION_KEYFRAMES } from '../utils/uiConstants';
import {
  SVG_TO_MUSCLE_GROUP,
  MUSCLE_GROUP_TO_SVG_IDS,
  getGroupHighlightIds,
} from '../utils/muscleMappingConstants';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { 
  Calendar, Zap, Layers, 
  Clock, Dumbbell, Trophy, Timer, Info, TrendingUp, TrendingDown, Minus, PersonStanding,
  Infinity, CalendarDays, CalendarRange, CalendarClock,
  BarChart3, AreaChart as AreaChartIcon, LineChart as LineChartIcon,
  Grid3X3, Scan, Square, ChartBarStacked, ChartColumnStacked, BicepsFlexed
} from 'lucide-react';
import { Target } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, eachDayOfInterval, subDays, differenceInCalendarDays } from 'date-fns';
import { formatDayContraction, formatDayYearContraction, formatHumanReadableDate, formatWeekContraction, formatMonthYearContraction, getEffectiveNowFromWorkoutData } from '../utils/dateUtils';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { ViewHeader } from './ViewHeader';
import { calculateDashboardInsights, detectPlateaus, calculateDelta, DashboardInsights, PlateauAnalysis, SparklinePoint, StreakInfo } from '../utils/insights';
import { InsightsPanel, PlateauAlert, RecentPRsPanel, Sparkline, StreakBadge } from './InsightCards';
import { computationCache } from '../utils/computationCache';
import { LazyRender } from './LazyRender';
import { ChartSkeleton } from './ChartSkeleton';
import { summarizeExerciseHistory } from '../utils/exerciseTrend';
import { formatNumber, formatSignedNumber } from '../utils/formatters';
import { Tooltip as HoverTooltip, TooltipData } from './Tooltip';

const formatSigned = (n: number) => formatSignedNumber(n, { maxDecimals: 2 });
const formatSignedFixed = (n: number, digits: number) => {
  const d = Math.min(Math.max(digits, 0), 2);
  return formatSignedNumber(n, { maxDecimals: d, minDecimals: 0 });
};
const formatSignedPctWithNoun = (pct: number, noun: string) => `${formatSignedNumber(pct, { maxDecimals: 0 })}% ${noun}`;
const formatDeltaShort = (
  current: number,
  previous: number,
  opts?: { unit?: string; digits?: number; hidePercentIfNoBaseline?: boolean }
): string => {
  const { unit = '', digits = 0, hidePercentIfNoBaseline = true } = opts || {};
  const d = Math.min(Math.max(digits, 0), 2);
  const delta = calculateDelta(current, previous);
  const currText = d > 0 ? formatNumber(current, { maxDecimals: d }) : formatNumber(Math.round(current), { maxDecimals: 0 });
  const deltaText = d > 0 ? formatSignedFixed(delta.delta, d) : formatSignedNumber(delta.delta, { maxDecimals: 0 });
  const pctText = hidePercentIfNoBaseline && delta.previous <= 0 ? '' : `, ${formatSignedNumber(delta.deltaPercent, { maxDecimals: 0 })}%`;
  return `${currText}${unit} (${deltaText}${unit}${pctText} vs prev)`;
};

const safePct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

const modeToPeriodLabel = (mode?: TimeFilterMode) => {
  if (mode === 'monthly') return 'this month';
  if (mode === 'weekly') return 'this week';
  if (mode === 'all') return 'latest';
  return 'latest';
};

const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'same' }) => {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const offsetCls = direction === 'up' ? 'top-[1px]' : direction === 'down' ? 'top-0' : 'top-0';
  return (
    <span className={`relative inline-flex ${offsetCls}`}>
      <Icon className="w-3 h-3" />
    </span>
  );
};

const ShiftedMeta = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <span className="inline-flex items-center gap-1 ml-2 leading-none">{children}</span>;
};

const BadgeLabel = ({ main, meta }: { main: React.ReactNode; meta?: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2">
    <span className="font-semibold leading-none">{main}</span>
    {meta && <span className="text-[9px] opacity-70 leading-none">{meta}</span>}
  </span>
);

const getTrendBadgeTone = (
  deltaPercent: number,
  opts?: { goodWhen?: 'up' | 'down' | 'either' }
): 'good' | 'bad' | 'neutral' => {
  const goodWhen = opts?.goodWhen ?? 'up';
  if (!isFinite(deltaPercent) || deltaPercent === 0) return 'neutral';
  if (goodWhen === 'either') return deltaPercent > 0 ? 'good' : 'bad';
  if (goodWhen === 'up') return deltaPercent > 0 ? 'good' : 'bad';
  return deltaPercent < 0 ? 'good' : 'bad';
};

const TrendBadge: React.FC<{
  label: React.ReactNode;
  tone: 'good' | 'bad' | 'neutral' | 'info';
}> = ({
  label,
  tone,
}) => {
  const cls =
    tone === 'good'
      ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200'
      : tone === 'bad'
        ? 'border-rose-500/30 bg-rose-950/40 text-rose-200'
        : tone === 'info'
          ? 'border-blue-500/30 bg-slate-900/40 text-slate-200'
          : 'border-slate-700/40 bg-slate-900/20 text-slate-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-normal border ${cls}`}>
      {label}
    </span>
  );
};

const InsightRow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">
    {children}
  </div>
);

const InsightLine = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="font-semibold text-slate-300">Insights:</span>
    {children}
  </div>
);

 const sanitizeInsightText = (text: string) => {
   return text
     .replace(/[\u201C\u201D"]/g, '')
     .replace(/\u2014|\u2013/g, ',')
     .replace(/;/g, '.')
     .replace(/[()]/g, '')
     .replace(/\s*\/\s*/g, ' and ')
     .replace(/%/g, ' percent')
     .replace(/\s+/g, ' ')
     .trim();
 };

 const splitInsightSentences = (text: string) => {
   const cleaned = sanitizeInsightText(text);
   const sentences: string[] = [];
   let start = 0;
   for (let i = 0; i < cleaned.length; i++) {
     if (cleaned[i] !== '.') continue;
     const prev = i > 0 ? cleaned[i - 1] : '';
     const next = i + 1 < cleaned.length ? cleaned[i + 1] : '';
     const isDecimal = /\d/.test(prev) && /\d/.test(next);
     const isSentenceEnd = !isDecimal && (i === cleaned.length - 1 || /\s/.test(next));
     if (!isSentenceEnd) continue;
     const s = cleaned.slice(start, i + 1).trim();
     if (s) sentences.push(s);
     start = i + 1;
   }
   const tail = cleaned.slice(start).trim();
   if (tail) sentences.push(tail.endsWith('.') ? tail : `${tail}.`);
   return sentences;
 };

 const InsightText = ({ text }: { text: string }) => {
   const sentences = useMemo(() => splitInsightSentences(text), [text]);
   return (
     <div className="text-[11px] text-slate-500 leading-snug">
       {sentences.map((s, i) => (
         <span key={i} className="block">
           {s}
         </span>
       ))}
     </div>
   );
 };

const sumLastN = <T,>(arr: T[], n: number, getVal: (x: T) => number) => {
  if (arr.length < n) return null;
  let s = 0;
  for (let i = arr.length - n; i < arr.length; i++) s += getVal(arr[i]);
  return s;
};

interface DashboardProps {
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  fullData: WorkoutSet[]; // The raw set data
  onDayClick?: (date: Date) => void;
  onMuscleClick?: (muscleId: string, viewMode: 'muscle' | 'group') => void;
  onExerciseClick?: (exerciseName: string) => void;
  filtersSlot?: React.ReactNode;
  bodyMapGender?: BodyMapGender;
  weightUnit?: WeightUnit;
}

// --- SUB-COMPONENTS ---

// 1. Custom Hover Tooltip for DOM elements (Heatmap)
const DashboardTooltip: React.FC<{ data: TooltipData }> = ({ data }) => {
  return <HoverTooltip data={data} />;
};

// 2. Chart Interpretation Footer
const ChartDescription = ({
  children,
  isMounted = true,
  topSlot,
}: {
  children: React.ReactNode;
  isMounted?: boolean;
  topSlot?: React.ReactNode;
}) => (
  <div className={`mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
    {topSlot && <div className="flex justify-center">{topSlot}</div>}
    <div className="flex items-start gap-3">
      <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0 transition-opacity duration-200 hover:opacity-80" />
      <div className="text-xs text-slate-400 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  </div>
);

// 3. Reusable Chart Header with Toggles
interface ChartHeaderProps {
  title: string;
  icon: React.ElementType;
  color: string;
  badgeSlot?: React.ReactNode;
  mode?: TimeFilterMode;
  onToggle?: (mode: TimeFilterMode) => void;
  viewType?: string;
  onViewToggle?: (type: string) => void;
  viewOptions?: { value: string; label: string }[];
  isMounted?: boolean;
}

const iconForViewOption = (opt: { value: string; label: string }) => {
  const key = `${opt.value} ${opt.label}`.toLowerCase();
  if (key.includes('area')) return AreaChartIcon;
  if (key.includes('stack')) return ChartColumnStacked;
  if (key.includes('bar')) return BarChart3;
  if (key.includes('line')) return LineChartIcon;
  if (key.includes('radar')) return Scan;
  if (key.includes('heat')) return Grid3X3;
  return Square;
};

const ChartHeader = ({ 
  title, 
  icon: Icon, 
  color, 
  badgeSlot,
  mode, 
  onToggle,
  viewType,
  onViewToggle,
  viewOptions,
  isMounted = true
}: ChartHeaderProps) => (
  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
    <h3 className="text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
      <Icon className={`w-5 h-5 ${color} transition-opacity duration-200 hover:opacity-80`} />
      <span className="flex items-center gap-2">
        <span>{title}</span>
        {badgeSlot && <span className="relative -top-[2px]">{badgeSlot}</span>}
      </span>
    </h3>
    <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible max-w-full">
      {/* View Type Toggle (Line/Area, Area/Line, Radar/Bar) */}
      {viewType && onViewToggle && viewOptions && (
        <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
          {viewOptions.map((option) => (
            (() => {
              const OptIcon = iconForViewOption(option);
              return (
            <button
              key={option.value}
              onClick={() => onViewToggle(option.value)}
              title={option.label}
              aria-label={option.label}
              className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                viewType === option.value 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <OptIcon className="w-4 h-4" />
              <span className="sr-only">{option.label}</span>
            </button>
              );
            })()
          ))}
        </div>
      )}

      {/* All/Weekly/Monthly Toggle */}
      {mode && onToggle && (
      <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
        <button 
          onClick={() => onToggle('all')} 
          title="All"
          aria-label="All"
          className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
            mode === 'all' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Infinity className="w-4 h-4" />
          <span className="sr-only">All</span>
        </button>
        <button 
          onClick={() => onToggle('weekly')} 
          title="Weekly"
          aria-label="Weekly"
          className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
            mode === 'weekly' 
              ? 'bg-blue-600 text-white shadow-lg shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          wk
        </button>
        <button 
          onClick={() => onToggle('monthly')} 
          title="Monthly"
          aria-label="Monthly"
          className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
            mode === 'monthly' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          mo
        </button>
      </div>
    )}
    </div>
  </div>
);

// 4. Heatmap Component - Memoized to prevent unnecessary re-renders
const Heatmap = memo(({ dailyData, streakInfo, consistencySparkline, onDayClick, now }: { dailyData: DailySummary[], streakInfo: StreakInfo, consistencySparkline: SparklinePoint[], onDayClick?: (date: Date) => void, now?: Date }) => {
  // Cache heatmap data across tab switches
  const heatmapData = useMemo(() => {
    return computationCache.getOrCompute(
      'heatmapData',
      dailyData,
      () => {
        if (dailyData.length === 0) return [];

        const byDayKey = new Map<string, DailySummary>();
        for (const d of dailyData) {
          byDayKey.set(format(new Date(d.timestamp), 'yyyy-MM-dd'), d);
        }

        const firstDate = new Date(dailyData[0].timestamp);
        const lastDate = new Date(dailyData[dailyData.length - 1].timestamp);
        const days = eachDayOfInterval({ start: firstDate, end: lastDate });

        return days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const activity = byDayKey.get(key);
          return {
            date: day,
            count: activity?.sets ?? 0,
            totalVolume: activity?.totalVolume ?? 0,
            title: activity?.workoutTitle ?? null,
          };
        });
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [dailyData]);

  const monthBlocks = useMemo(() => {
    type MonthBlock = { key: string; label: string; cells: Array<any | null> };

    if (heatmapData.length === 0) return [] as MonthBlock[];

    const byKey = new Map<string, any>();
    for (const d of heatmapData) {
      byKey.set(format(d.date, 'yyyy-MM-dd'), d);
    }

    const rangeStart = heatmapData[0].date as Date;
    const rangeEnd = heatmapData[heatmapData.length - 1].date as Date;

    const blocks: MonthBlock[] = [];
    let cursor = startOfMonth(rangeStart);

    while (cursor.getTime() <= rangeEnd.getTime()) {
      const monthStart = cursor;
      const monthEnd = endOfMonth(monthStart);

      const visibleStart = monthStart.getTime() < rangeStart.getTime() ? rangeStart : monthStart;
      const visibleEnd = monthEnd.getTime() > rangeEnd.getTime() ? rangeEnd : monthEnd;

      const days = eachDayOfInterval({ start: visibleStart, end: visibleEnd });
      const rowCount = Math.ceil(days.length / 7);
      const cells: Array<any | null> = new Array(rowCount * 7).fill(null);

      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        cells[i] = byKey.get(format(day, 'yyyy-MM-dd')) || { date: day, count: 0, title: null };
      }

      const monthInitial = format(monthStart, 'MMM').slice(0, 1);
      const yearShort = format(monthStart, 'yy');
      blocks.push({
        key: format(monthStart, 'yyyy-MM'),
        label: `${monthInitial} ${yearShort}`,
        cells,
      });

      cursor = addMonths(cursor, 1);
    }

    return blocks;
  }, [heatmapData]);

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest (rightmost) position
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered, especially on mobile
      requestAnimationFrame(() => {
        // Add a small delay for mobile browsers to complete layout
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = Math.max(
              0,
              scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
            );
          }
        }, 100);
      });
    }
  }, [heatmapData]);

  if (heatmapData.length === 0) return null;

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-800/50';
    if (count <= 15) return 'bg-emerald-900';
    if (count <= 30) return 'bg-emerald-700';
    if (count <= 45) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  const handleMouseEnter = (e: React.MouseEvent, day: any) => {
    if (!day || day.count === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      rect,
      title: formatHumanReadableDate(day.date, { now }),
      body: `${day.count} Sets${day.title ? `\n${day.title}` : ''}`,
      footer: 'Click to view details',
      status: (day.count > 30 ? 'success' : 'info') as TooltipData['status'],
    });
  };

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 sm:gap-6 overflow-hidden">
      <div className="flex-shrink-0 flex flex-col justify-between min-w-full md:min-w-[180px] border-b md:border-b-0 md:border-r border-slate-800/50 pb-4 md:pb-0 md:pr-6 md:mr-2">
        <div className="w-full h-full flex items-center">
          <div className="w-full flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-black/50 text-emerald-400 flex-shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">Consistency</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight leading-none">
                {streakInfo.consistencyScore}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {streakInfo.avgWorkoutsPerWeek}/wk avg
              </div>
            </div>

            <div className="flex-shrink-0">
              <Sparkline data={consistencySparkline} color="#10b981" height={24} />
            </div>

            <div className="flex-shrink-0">
              <StreakBadge streak={streakInfo} />
            </div>
          </div>
        </div>

      </div>
      <div className="flex-1 w-full overflow-x-auto pb-2 custom-scrollbar" ref={scrollContainerRef}>
        <div className="w-max">
          <div className="flex items-start gap-4">
            {monthBlocks.map((month) => (
              <div key={month.key} className="flex flex-col items-center">
                <div className="h-4 mb-2 flex items-center justify-center text-[10px] text-slate-500 whitespace-nowrap">
                  {month.label}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {month.cells.map((day, idx) => {
                    if (!day) return <div key={`${month.key}-empty-${idx}`} className="w-3 h-3" />;
                    return (
                      <div
                        key={day.date.toISOString()}
                        className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-all duration-300 ${day.count > 0 ? 'cursor-pointer hover:z-10 ring-0 hover:ring-2 ring-white/20' : 'cursor-default'}`}
                        onClick={() => day.count > 0 && onDayClick?.(day.date)}
                        onMouseEnter={(e) => handleMouseEnter(e, day)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {tooltip && <DashboardTooltip data={tooltip} />}
    </div>
  );
});


// --- MAIN DASHBOARD ---

export const Dashboard: React.FC<DashboardProps> = ({ dailyData, exerciseStats, fullData, onDayClick, onMuscleClick, onExerciseClick, filtersSlot, bodyMapGender = 'male', weightUnit = 'kg' }) => {
  // State to control animation retriggering on mount
  const [isMounted, setIsMounted] = useState(false);

  const effectiveNow = useMemo(() => getEffectiveNowFromWorkoutData(fullData, new Date(0)), [fullData]);

  // Calculate date range span for smart filter
  const spanDays = useMemo(() => {
    if (!fullData.length) return 0;
    const dates = fullData.map(s => s.parsedDate?.getTime() || 0).filter(t => t > 0);
    if (dates.length === 0) return 0;
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
  }, [fullData]);

  // Smart filter mode based on date range span
  const smartMode = useMemo(() => getSmartFilterMode(spanDays), [spanDays]);

  // Count total workouts (for display purposes)
  const totalWorkouts = useMemo(() => {
    const sessions = new Set<string>();
    for (const s of fullData) {
      if (!s.start_time) continue;
      sessions.add(s.start_time);
    }
    return sessions.size;
  }, [fullData]);

  // Track user overrides only (null = use smart mode)
  const [chartOverrides, setChartOverrides] = useState<Record<string, TimeFilterMode | null>>({
    volumeVsDuration: null,
    intensityEvo: null,
    prTrend: null,
  });

  // Reset overrides when smart mode changes (new filter applied)
  useEffect(() => {
    setChartOverrides({
      volumeVsDuration: null,
      intensityEvo: null,
      prTrend: null,
    });
  }, [smartMode]);

  // Effective chart modes: use override if set, otherwise smart mode
  const chartModes = useMemo(() => ({
    volumeVsDuration: chartOverrides.volumeVsDuration ?? smartMode,
    intensityEvo: chartOverrides.intensityEvo ?? smartMode,
    prTrend: chartOverrides.prTrend ?? smartMode,
  }), [chartOverrides, smartMode]);

  // Simple effect to trigger animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Toggle chart mode (user override)
  const toggleChartMode = (chart: string, mode: TimeFilterMode) => {
    setChartOverrides(prev => ({ ...prev, [chart]: mode }));
  };

  const [topExerciseMode, setTopExerciseMode] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [topExercisesView, setTopExercisesView] = useState<'barh' | 'area'>('barh');
  
  // Chart view type states (defaults keep existing chart types)
  const [prTrendView, setPrTrendView] = useState<'area' | 'bar'>('area');
  const [volumeView, setVolumeView] = useState<'area' | 'bar'>('area');
  const [intensityView, setIntensityView] = useState<'area' | 'stackedBar'>('area');
  const [weekShapeView, setWeekShapeView] = useState<'radar' | 'bar'>('radar');
  
  const [muscleGrouping, setMuscleGrouping] = useState<'groups' | 'muscles'>('groups');
  const [musclePeriod, setMusclePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [muscleTrendView, setMuscleTrendView] = useState<'area' | 'stackedBar'>('stackedBar');
  const [muscleCompQuick, setMuscleCompQuick] = useState<'all'|'7d'|'30d'|'365d'>('all');
  const [compositionGrouping, setCompositionGrouping] = useState<'groups' | 'muscles'>('groups');
  const [weeklySetsView, setWeeklySetsView] = useState<'radar' | 'heatmap'>('heatmap');
  const [heatmapHoveredMuscle, setHeatmapHoveredMuscle] = useState<string | null>(null);
  
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);

  const assetsLowerMap = useMemo(() => {
    if (!assetsMap) return null;
    const m = new Map<string, ExerciseAsset>();
    assetsMap.forEach((v, k) => m.set(k.toLowerCase(), v));
    return m;
  }, [assetsMap]);

  useEffect(() => {
    let mounted = true;
    getExerciseAssets().then(m => { if (mounted) setAssetsMap(m); }).catch(() => setAssetsMap(new Map()));
    return () => { mounted = false; };
  }, []);

  // --- MEMOIZED DATA LOGIC ---

  const totalPrs = useMemo(() => exerciseStats.reduce((acc, curr) => acc + curr.prCount, 0), [exerciseStats]);

  const totalSets = useMemo(() => fullData.length, [fullData]);

  // Dashboard Insights (deltas, streaks, PR info, sparklines) - cached across tab switches
  const dashboardInsights = useMemo(() => {
    return computationCache.getOrCompute(
      'dashboardInsights',
      fullData,
      () => calculateDashboardInsights(fullData, dailyData, effectiveNow),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, dailyData, effectiveNow]);

  // Plateau Detection - cached across tab switches
  const plateauAnalysis = useMemo(() => {
    return computationCache.getOrCompute(
      'plateauAnalysis',
      fullData,
      () => detectPlateaus(fullData, exerciseStats, effectiveNow),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, exerciseStats, effectiveNow]);

  const exerciseStatsMap = useMemo(() => {
    const m = new Map<string, ExerciseStats>();
    for (const s of exerciseStats) m.set(s.name, s);
    return m;
  }, [exerciseStats]);

  const activePlateauExercises = useMemo(() => {
    const activeSince = subDays(effectiveNow, 60);
    return plateauAnalysis.plateauedExercises.filter((p) => {
      const stat = exerciseStatsMap.get(p.exerciseName);
      if (!stat) return false;
      const sessions = summarizeExerciseHistory(stat.history);
      const lastDate = sessions[0]?.date ?? null;
      if (!lastDate) return false;
      if (sessions.length < 5) return false;
      return lastDate >= activeSince;
    });
  }, [plateauAnalysis.plateauedExercises, exerciseStatsMap, effectiveNow]);
  
  // 1. PRs Over Time Data
  type PrsOverTimePoint = {
    count: number;
    dateFormatted: string;
    tooltipLabel?: string;
    timestamp?: number;
  };

  const prsData = useMemo<PrsOverTimePoint[]>(() => {
    const mode = chartModes.prTrend === 'all' ? 'daily' : chartModes.prTrend;
    const data = getPrsOverTime(fullData, mode as any) as PrsOverTimePoint[];

    // Add tooltip labels and mark the current (in-progress) bucket as "to date".
    const now = effectiveNow;
    const currentStart =
      mode === 'weekly'
        ? startOfWeek(now, { weekStartsOn: 1 })
        : mode === 'monthly'
          ? startOfMonth(now)
          : startOfDay(now);

    return data.map((p, idx) => {
      const ts = p.timestamp ?? 0;
      const isCurrent = ts > 0 && ts === currentStart.getTime();
      const baseLabel =
        mode === 'weekly'
          ? `wk of ${formatDayYearContraction(new Date(ts))}`
          : mode === 'monthly'
            ? format(new Date(ts), 'MMMM yyyy')
            : formatDayYearContraction(new Date(ts));

      return {
        ...p,
        tooltipLabel: `${baseLabel}${isCurrent ? ' (to date)' : ''}`,
      };
    });
  }, [fullData, chartModes.prTrend, effectiveNow]);

  const prTrendDelta = useMemo(() => {
    const d = dashboardInsights?.rolling28d;
    return d?.prs ? d.prs : null;
  }, [dashboardInsights]);

  const prTrendDelta7d = useMemo(() => {
    const d = dashboardInsights?.rolling7d;
    return d?.prs ? d.prs : null;
  }, [dashboardInsights]);

  // 2. Intensity Evolution Data
  const intensityData = useMemo(() => {
    const mode = chartModes.intensityEvo === 'all' ? 'daily' : chartModes.intensityEvo;
    const result = getIntensityEvolution(fullData, mode as any);
    return result;
  }, [fullData, chartModes.intensityEvo]);

  const intensityInsight = useMemo(() => {
    const now = effectiveNow;
    const currStart = startOfDay(subDays(now, 27));
    const prevStart = startOfDay(subDays(currStart, 28));
    const prevEnd = endOfDay(subDays(currStart, 1));

    const countStyles = (start: Date, end: Date) => {
      const counts = { Strength: 0, Hypertrophy: 0, Endurance: 0 };
      for (const s of fullData) {
        const d = s.parsedDate;
        if (!d) continue;
        if (d < start || d > end) continue;
        const reps = s.reps || 8;
        if (reps <= 5) counts.Strength += 1;
        else if (reps <= 12) counts.Hypertrophy += 1;
        else counts.Endurance += 1;
      }
      return counts;
    };

    const last = countStyles(currStart, now);
    const prev = countStyles(prevStart, prevEnd);
    const lastTotal = last.Strength + last.Hypertrophy + last.Endurance;
    const prevTotal = prev.Strength + prev.Hypertrophy + prev.Endurance;
    if (lastTotal <= 0 || prevTotal <= 0) return null;

    const shares = {
      Strength: safePct(last.Strength, lastTotal),
      Hypertrophy: safePct(last.Hypertrophy, lastTotal),
      Endurance: safePct(last.Endurance, lastTotal),
    } as const;
    const prevShares = {
      Strength: safePct(prev.Strength, prevTotal),
      Hypertrophy: safePct(prev.Hypertrophy, prevTotal),
      Endurance: safePct(prev.Endurance, prevTotal),
    } as const;

    const entries = (Object.entries(shares) as Array<[keyof typeof shares, number]>).sort((a, b) => b[1] - a[1]);
    const dominant = entries[0];
    const secondary = entries[1];

    const all = (['Hypertrophy', 'Strength', 'Endurance'] as const).map((k) => {
      const short = k === 'Hypertrophy' ? 'HYP' : k === 'Strength' ? 'STR' : 'END';
      const pct = shares[k];
      const prevPct = prevShares[k];
      const delta = calculateDelta(pct, prevPct);
      return { k, short, pct, prevPct, delta };
    });

    return {
      all,
      dominant: {
        k: dominant[0],
        pct: dominant[1],
        delta: calculateDelta(dominant[1], prevShares[dominant[0]]),
      },
      secondary: {
        k: secondary[0],
        pct: secondary[1],
      },
      period: 'Last 28d',
    };
  }, [fullData, effectiveNow]);

  // 3. Volume Density Data (volume done per set)
  const volumeDurationData = useMemo(() => {
    const mode = chartModes.volumeVsDuration;

    if (mode === 'all') {
      return dailyData.map(d => ({
        ...d,
        dateFormatted: formatDayContraction(new Date(d.timestamp)),
        tooltipLabel: formatDayYearContraction(new Date(d.timestamp)),
        volumePerSet: d.sets > 0 ? convertVolume(Math.round(d.totalVolume / d.sets), weightUnit) : 0
      }));
    }

    if (mode === 'weekly') {
      const weeklyData: Record<string, { volSum: number, setSum: number, count: number, timestamp: number }> = {};
      dailyData.forEach(d => {
        const weekStart = startOfWeek(new Date(d.timestamp), { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-ww');
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { volSum: 0, setSum: 0, count: 0, timestamp: weekStart.getTime() };
        }
        weeklyData[weekKey].volSum += d.totalVolume;
        weeklyData[weekKey].setSum += d.sets;
        weeklyData[weekKey].count += 1;
      });
      return Object.values(weeklyData).sort((a,b) => a.timestamp - b.timestamp).map(w => {
        const isCurrent = w.timestamp === startOfWeek(effectiveNow, { weekStartsOn: 1 }).getTime();
        const totalVol = Math.round(w.volSum);
        const totalSets = Math.round(w.setSum);
        return {
          dateFormatted: formatWeekContraction(new Date(w.timestamp)),
          tooltipLabel: `wk of ${formatDayYearContraction(new Date(w.timestamp))}${isCurrent ? ' (to date)' : ''}`,
          totalVolume: convertVolume(totalVol, weightUnit),
          sets: totalSets,
          volumePerSet: totalSets > 0 ? convertVolume(Math.round(totalVol / totalSets), weightUnit) : 0
        };
      });
    }

    {
      // Manual aggregation for monthly view
      const monthlyData: Record<string, { volSum: number, setSum: number, count: number, timestamp: number }> = {};
      dailyData.forEach(d => {
        const monthKey = format(new Date(d.timestamp), 'yyyy-MM');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { volSum: 0, setSum: 0, count: 0, timestamp: startOfMonth(new Date(d.timestamp)).getTime() };
        }
        monthlyData[monthKey].volSum += d.totalVolume;
        monthlyData[monthKey].setSum += d.sets;
        monthlyData[monthKey].count += 1;
      });
      return Object.values(monthlyData).sort((a,b) => a.timestamp - b.timestamp).map(m => {
        const isCurrent = m.timestamp === startOfMonth(effectiveNow).getTime();
        const totalVol = Math.round(m.volSum);
        const totalSets = Math.round(m.setSum);
        return {
          dateFormatted: formatMonthYearContraction(new Date(m.timestamp)),
          tooltipLabel: `${format(new Date(m.timestamp), 'MMMM yyyy')}${isCurrent ? ' (to date)' : ''}`,
          totalVolume: convertVolume(totalVol, weightUnit),
          sets: totalSets,
          volumePerSet: totalSets > 0 ? convertVolume(Math.round(totalVol / totalSets), weightUnit) : 0
        };
      });
    }
  }, [dailyData, chartModes.volumeVsDuration, weightUnit, effectiveNow]);

  const volumeDensityTrend = useMemo(() => {
    const d = dashboardInsights?.rolling28d;
    if (!d) return null;
    if (!d.eligible || !d.volume || !d.sets) return null;
    const curr = d.current.totalSets > 0 ? (d.current.totalVolume / d.current.totalSets) : 0;
    const prev = d.previous.totalSets > 0 ? (d.previous.totalVolume / d.previous.totalSets) : 0;
    const delta = calculateDelta(curr, prev);
    return { label: 'Last 28d', delta, delta4: null };
  }, [dashboardInsights]);

  // Static Data
  const weekShapeData = useMemo(() => getDayOfWeekShape(dailyData), [dailyData]);
  const topExercisesData = useMemo(() => getTopExercisesRadial(exerciseStats).slice(0, 4), [exerciseStats]);

  const weeklyRhythmInsight = useMemo(() => {
    if (!weekShapeData || weekShapeData.length === 0) return null;
    const total = weekShapeData.reduce((acc, d) => acc + (d.A || 0), 0);
    if (total <= 0) return null;
    const sorted = [...weekShapeData].sort((a, b) => (b.A || 0) - (a.A || 0));
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const topShare = safePct(top.A || 0, total);
    const bottomShare = safePct(bottom.A || 0, total);
    const spread = topShare - bottomShare;
    const rhythmLabel = spread <= 12 ? "It's even" : spread <= 22 ? "It's somewhat spiky" : "It's spiky";
    const rhythmTone = spread <= 12 ? 'good' : spread <= 22 ? 'neutral' : 'bad';
    return {
      total,
      top: { subject: top.subject, share: topShare },
      bottom: { subject: bottom.subject, share: bottomShare },
      spread,
      rhythmLabel,
      rhythmTone,
    };
  }, [weekShapeData]);
  
  // Data for horizontal bars (simple) with time filters: All, Monthly (30d), Weekly (7d)
  const topExercisesBarData = useMemo(() => {
    const now = effectiveNow;
    let start: Date | null = null;
    if (topExerciseMode === 'monthly') start = subDays(now, 30);
    else if (topExerciseMode === 'weekly') start = subDays(now, 7);
    // 'all' => start stays null (use all)
    const counts = new Map<string, number>();
    for (const s of fullData) {
      const d = s.parsedDate;
      if (!d) continue;
      if (start && d < start) continue;
      if (d > now) continue;
      const name = s.exercise_title || 'Unknown';
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const arr = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    arr.sort((a,b) => b.count - a.count);
    return arr.slice(0, 4);
  }, [fullData, topExerciseMode, effectiveNow]);

  const topExercisesInsight = useMemo(() => {
    const now = effectiveNow;
    const getSetCountBetween = (start: Date | null, end: Date) => {
      let count = 0;
      for (const s of fullData) {
        const d = s.parsedDate;
        if (!d) continue;
        if (d > end) continue;
        if (start && d < start) continue;
        count += 1;
      }
      return count;
    };

    const getWorkoutCountBetween = (start: Date | null, end: Date) => {
      const sessions = new Set<string>();
      for (const s of fullData) {
        const d = s.parsedDate;
        if (!d || !s.start_time) continue;
        if (d > end) continue;
        if (start && d < start) continue;
        sessions.add(s.start_time);
      }
      return sessions.size;
    };

    const sumShown = topExercisesBarData.reduce((acc, x) => acc + (x.count || 0), 0);
    const top = topExercisesBarData[0];
    const topShare = sumShown > 0 && top ? safePct(top.count || 0, sumShown) : 0;

    if (topExerciseMode === 'all') {
      if (!top) return { windowLabel: 'All time', delta: null as any, top, topShare };
      return { windowLabel: 'All time', delta: null as any, top, topShare };
    }

    const windowDays = topExerciseMode === 'weekly' ? 7 : 28;
    const start = subDays(now, windowDays);
    const prevStart = subDays(now, windowDays * 2);
    const prevEnd = subDays(now, windowDays);

    const currentSets = getSetCountBetween(start, now);
    const prevSets = getSetCountBetween(prevStart, prevEnd);
    const currentWorkouts = getWorkoutCountBetween(start, now);
    const prevWorkouts = getWorkoutCountBetween(prevStart, prevEnd);

    const windowLabel = topExerciseMode === 'weekly' ? '7d' : '28d';
    const eligible = currentWorkouts >= 2 && prevWorkouts >= 2;
    const delta = eligible ? calculateDelta(currentSets, prevSets) : null;
    return { windowLabel, delta, top, topShare, eligible };
  }, [fullData, topExerciseMode, topExercisesBarData, effectiveNow]);

  // Time series for area view of Top Exercises
  const topExercisesOverTimeData = useMemo(() => {
    const names = (topExercisesBarData.length > 0 ? topExercisesBarData : topExercisesData).map(e => e.name);
    const mode = topExerciseMode === 'weekly' ? 'weekly' : 'monthly';
    return getTopExercisesOverTime(fullData, names, mode as any);
  }, [fullData, topExercisesBarData, topExercisesData, topExerciseMode]);

  // Keys for area stacking in Most Frequent Exercises
  const topExerciseNames = useMemo(() => (topExercisesBarData.length > 0 ? topExercisesBarData : topExercisesData).map(e => e.name), [topExercisesBarData, topExercisesData]);

  // 6. Muscle Volume (sets-based) unified data - cached for performance
  const muscleSeriesGroups = useMemo(() => {
    if (!assetsMap) return { data: [], keys: [] as string[] } as { data: any[]; keys: string[] };
    return computationCache.getOrCompute(
      `muscleSeriesGroups:${musclePeriod}`,
      fullData,
      () => getMuscleVolumeTimeSeriesCalendar(fullData, assetsMap, musclePeriod),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, assetsMap, musclePeriod]);

  const muscleSeriesMuscles = useMemo(() => {
    if (!assetsMap) return { data: [], keys: [] as string[] } as { data: any[]; keys: string[] };
    return computationCache.getOrCompute(
      `muscleSeriesMuscles:${musclePeriod}`,
      fullData,
      () => getMuscleVolumeTimeSeriesDetailedCalendar(fullData, assetsMap, musclePeriod),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, assetsMap, musclePeriod]);

  const trendData = muscleGrouping === 'groups' ? muscleSeriesGroups.data : muscleSeriesMuscles.data;
  const trendKeys = useMemo(() => {
    const totals: Record<string, number> = {};
    const keys = muscleGrouping === 'groups' ? muscleSeriesGroups.keys : muscleSeriesMuscles.keys;
    trendData.forEach(row => {
      keys.forEach(k => { totals[k] = (totals[k] || 0) + (row[k] || 0); });
    });
    return [...keys].sort((a,b) => (totals[b]||0) - (totals[a]||0)).slice(0, 6);
  }, [trendData, muscleGrouping, muscleSeriesGroups.keys, muscleSeriesMuscles.keys]);

  const muscleTrendInsight = useMemo(() => {
    if (!assetsMap || !assetsLowerMap) return null;
    if (!trendKeys || trendKeys.length === 0) return null;

    const now = effectiveNow;
    const currStart = startOfDay(subDays(now, 27));
    const prevStart = startOfDay(subDays(currStart, 28));
    const prevEnd = endOfDay(subDays(currStart, 1));

    const getWorkoutCountBetween = (start: Date, end: Date) => {
      const sessions = new Set<string>();
      for (const s of fullData) {
        const d = s.parsedDate;
        if (!d || !s.start_time) continue;
        if (d < start || d > end) continue;
        sessions.add(s.start_time);
      }
      return sessions.size;
    };

    const minWorkoutsRequired = 2;
    const currWorkouts = getWorkoutCountBetween(currStart, now);
    const prevWorkouts = getWorkoutCountBetween(prevStart, prevEnd);
    if (currWorkouts < minWorkoutsRequired || prevWorkouts < minWorkoutsRequired) return null;

    const groupsList = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
    const useGroups = muscleGrouping === 'groups';

    const computeTotals = (start: Date, end: Date) => {
      const totals = new Map<string, number>();
      const add = (k: string, v: number) => totals.set(k, (totals.get(k) || 0) + v);

      for (const s of fullData) {
        const d = s.parsedDate;
        if (!d) continue;
        if (d < start || d > end) continue;
        const name = s.exercise_title || '';
        const asset = assetsMap.get(name) || assetsLowerMap.get(name.toLowerCase());
        if (!asset) continue;

        const primaryRaw = String(asset.primary_muscle || '').trim();
        if (!primaryRaw) continue;

        if (/cardio/i.test(primaryRaw)) continue;

        if (useGroups) {
          const primary = normalizeMuscleGroup(primaryRaw);
          if (primary === 'Cardio') continue;

          if (primary === 'Full Body') {
            for (const g of groupsList) add(g, 1.0);
          } else {
            add(primary, 1.0);
            const secRaw = String(asset.secondary_muscle || '').trim();
            if (secRaw && !/none/i.test(secRaw)) {
              secRaw.split(',').forEach(s2 => {
                const m = normalizeMuscleGroup(s2);
                if (m === 'Cardio' || m === 'Full Body') return;
                add(m, 0.5);
              });
            }
          }
        } else {
          if (/full\s*body/i.test(primaryRaw)) continue;
          add(primaryRaw, 1.0);
          const secRaw = String(asset.secondary_muscle || '').trim();
          if (secRaw && !/none/i.test(secRaw)) {
            secRaw.split(',').forEach(s2 => {
              const m = s2.trim();
              if (!m || /cardio/i.test(m) || /full\s*body/i.test(m)) return;
              add(m, 0.5);
            });
          }
        }
      }

      return totals;
    };

    const currTotals = computeTotals(currStart, now);
    const prevTotals = computeTotals(prevStart, prevEnd);

    const totalLast = trendKeys.reduce((acc, k) => acc + (currTotals.get(k) || 0), 0);
    const totalPrev = trendKeys.reduce((acc, k) => acc + (prevTotals.get(k) || 0), 0);
    const totalDelta = calculateDelta(totalLast, totalPrev);
    const biggestMover = trendKeys
      .map((k) => ({ k, d: (currTotals.get(k) || 0) - (prevTotals.get(k) || 0) }))
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];

    return { label: 'Last 28d', totalDelta, biggestMover };
  }, [assetsMap, assetsLowerMap, fullData, effectiveNow, trendKeys, muscleGrouping]);

  const muscleVsLabel = 'vs prev mo';

  const compositionQuickData = useMemo(() => {
    if (!assetsMap) return [] as { subject: string; value: number }[];
    const now = effectiveNow;
    let windowStart: Date | null = null;
    if (muscleCompQuick === '7d') windowStart = subDays(now, 7);
    else if (muscleCompQuick === '30d') windowStart = subDays(now, 30);
    else if (muscleCompQuick === '365d') windowStart = subDays(now, 365);
    if (!windowStart) {
      for (const s of fullData) {
        const d = s.parsedDate;
        if (!d) continue;
        if (!windowStart || d < windowStart) windowStart = d;
      }
    }
    if (!windowStart) return [];
    const lowerMap = new Map<string, ExerciseAsset>();
    assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));
    const counts = new Map<string, number>();
    const addCount = (key: string, inc: number) => counts.set(key, Number(((counts.get(key) || 0) + inc).toFixed(2)));
    const groupsList = ['Chest','Back','Legs','Shoulders','Arms','Core'];
    for (const s of fullData) {
      const d = s.parsedDate;
      if (!d) continue;
      if (d < windowStart || d > now) continue;
      const name = s.exercise_title || '';
      const asset = assetsMap.get(name) || lowerMap.get(name.toLowerCase());
      if (!asset) continue;
      const primary = normalizeMuscleGroup(asset.primary_muscle);
      if (primary === 'Cardio') continue;
      if (compositionGrouping === 'groups') {
        if (primary === 'Full Body') {
          for (const g of groupsList) addCount(g, 1.0);
        } else {
          addCount(primary, 1.0);
          const secRaw = String(asset.secondary_muscle || '').trim();
          if (secRaw && !/none/i.test(secRaw)) {
            secRaw.split(',').forEach(s2 => {
              const m = normalizeMuscleGroup(s2);
              if (m === 'Cardio' || m === 'Full Body') return;
              addCount(m, 0.5);
            });
          }
        }
      } else {
        const pRaw = String(asset.primary_muscle || '').trim();
        if (!pRaw || /cardio/i.test(pRaw) || /full\s*body/i.test(pRaw)) continue;
        addCount(pRaw, 1.0);
        const secRaw = String(asset.secondary_muscle || '').trim();
        if (secRaw && !/none/i.test(secRaw)) {
          secRaw.split(',').forEach(s2 => {
            const m = s2.trim();
            if (!m || /cardio/i.test(m) || /full\s*body/i.test(m)) return;
            addCount(m, 0.5);
          });
        }
      }
    }
    const days = Math.max(1, differenceInCalendarDays(now, windowStart) + 1);
    const weeks = days / 7;
    const arr = Array.from(counts.entries()).map(([subject, value]) => ({ subject, value: Number((value / weeks).toFixed(1)) }));
    arr.sort((a,b) => b.value - a.value);
    return arr.slice(0, 16);
  }, [assetsMap, fullData, muscleCompQuick, compositionGrouping, effectiveNow]);

  const weeklySetsInsight = useMemo(() => {
    if (!compositionQuickData || compositionQuickData.length === 0) return null;
    const total = compositionQuickData.reduce((acc, d) => acc + (d.value || 0), 0);
    const sorted = [...compositionQuickData].sort((a, b) => (b.value || 0) - (a.value || 0));
    const top = sorted[0];
    const topShare = total > 0 ? safePct(top.value || 0, total) : 0;
    const top3 = sorted.slice(0, 3).reduce((acc, d) => acc + (d.value || 0), 0);
    const top3Share = total > 0 ? safePct(top3, total) : 0;
    return {
      total,
      top,
      topShare,
      top3Share,
    };
  }, [compositionQuickData]);

  // Heat map muscle volumes - maps SVG muscle IDs to weekly sets values (cached)
  const heatmapMuscleVolumes = useMemo(() => {
    if (!assetsMap) return { volumes: new Map<string, number>(), maxVolume: 1, totalSets: 0 };
    const cacheKey = `heatmapMuscleVolumes:${muscleCompQuick}:${compositionGrouping}`;
    return computationCache.getOrCompute(cacheKey, fullData, () => {
    const now = effectiveNow;
    let windowStart: Date | null = null;
    if (muscleCompQuick === '7d') windowStart = subDays(now, 7);
    else if (muscleCompQuick === '30d') windowStart = subDays(now, 30);
    else if (muscleCompQuick === '365d') windowStart = subDays(now, 365);
    if (!windowStart) {
      for (const s of fullData) {
        const d = s.parsedDate;
        if (!d) continue;
        if (!windowStart || d < windowStart) windowStart = d;
      }
    }
    if (!windowStart) return { volumes: new Map<string, number>(), maxVolume: 1, totalSets: 0 };
    const lowerMap = new Map<string, ExerciseAsset>();
    assetsMap.forEach((v, k) => lowerMap.set(k.toLowerCase(), v));
    const counts = new Map<string, number>();
    const addCount = (key: string, inc: number) => counts.set(key, (counts.get(key) || 0) + inc);
    const fullBodyMuscles = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
    
    // Group mode: aggregate by muscle group and apply same value to all SVG IDs in that group
    const groupCounts = new Map<string, number>();
    const addGroupCount = (group: string, inc: number) => groupCounts.set(group, (groupCounts.get(group) || 0) + inc);
    
    let totalSetsRaw = 0;
    
    for (const s of fullData) {
      const d = s.parsedDate;
      if (!d) continue;
      if (d < windowStart || d > now) continue;
      const name = s.exercise_title || '';
      const asset = assetsMap.get(name) || lowerMap.get(name.toLowerCase());
      if (!asset) continue;
      const primary = String(asset.primary_muscle || '').trim();
      if (!primary || /cardio/i.test(primary)) continue;
      
      // Handle Full Body - add to all muscle groups
      if (/full\s*body/i.test(primary)) {
        totalSetsRaw += 1;
        if (compositionGrouping === 'groups') {
          for (const g of fullBodyMuscles) addGroupCount(g, 1.0);
        } else {
          for (const muscle of fullBodyMuscles) {
            const svgIds = CSV_TO_SVG_MUSCLE_MAP[muscle] || [];
            for (const svgId of svgIds) addCount(svgId, 1.0);
          }
        }
        continue;
      }
      
      totalSetsRaw += 1;
      
      if (compositionGrouping === 'groups') {
        // Group mode: normalize to group and count
        const primaryGroup = normalizeMuscleGroup(primary);
        if (primaryGroup !== 'Cardio') addGroupCount(primaryGroup, 1.0);
        
        const secRaw = String(asset.secondary_muscle || '').trim();
        if (secRaw && !/none/i.test(secRaw)) {
          secRaw.split(',').forEach(s2 => {
            const m = normalizeMuscleGroup(s2);
            if (m === 'Cardio' || m === 'Full Body') return;
            addGroupCount(m, 0.5);
          });
        }
      } else {
        // Muscle mode: map directly to SVG IDs
        const primarySvgIds = CSV_TO_SVG_MUSCLE_MAP[primary] || [];
        for (const svgId of primarySvgIds) addCount(svgId, 1.0);
        
        const secRaw = String(asset.secondary_muscle || '').trim();
        if (secRaw && !/none/i.test(secRaw)) {
          secRaw.split(',').forEach(s2 => {
            const m = s2.trim();
            if (!m || /cardio/i.test(m) || /full\s*body/i.test(m)) return;
            const secondarySvgIds = CSV_TO_SVG_MUSCLE_MAP[m] || [];
            for (const svgId of secondarySvgIds) addCount(svgId, 0.5);
          });
        }
      }
    }
    
    const days = Math.max(1, differenceInCalendarDays(now, windowStart) + 1);
    const weeks = Math.max(1, days / 7);
    const volumes = new Map<string, number>();
    let maxVol = 0;
    
    if (compositionGrouping === 'groups') {
      // Map group counts to all SVG IDs in that group using centralized constants
      groupCounts.forEach((count, group) => {
        const weeklyVal = count / weeks;
        if (weeklyVal > maxVol) maxVol = weeklyVal;
        const svgIds = MUSCLE_GROUP_TO_SVG_IDS[group as keyof typeof MUSCLE_GROUP_TO_SVG_IDS] || [];
        for (const svgId of svgIds) {
          volumes.set(svgId, weeklyVal);
        }
      });
    } else {
      counts.forEach((count, svgId) => {
        const weeklyVal = count / weeks;
        volumes.set(svgId, weeklyVal);
        if (weeklyVal > maxVol) maxVol = weeklyVal;
      });
    }
    
    return { volumes, maxVolume: Math.max(maxVol, 1), totalSets: totalSetsRaw };
    }, { ttl: 10 * 60 * 1000 });
  }, [assetsMap, fullData, muscleCompQuick, compositionGrouping, effectiveNow]);

  // Compute hovered muscle IDs for group highlighting in heatmap
  const heatmapHoveredMuscleIds = useMemo(() => {
    if (!heatmapHoveredMuscle) return undefined;
    if (compositionGrouping !== 'groups') return undefined;
    return getGroupHighlightIds(heatmapHoveredMuscle);
  }, [heatmapHoveredMuscle, compositionGrouping]);

  const weeklySetsHoverMeta = useMemo(() => {
    if (!heatmapHoveredMuscle) return null;

    const name =
      compositionGrouping === 'groups'
        ? (SVG_TO_MUSCLE_GROUP as any)[heatmapHoveredMuscle] || 'Unknown'
        : (SVG_MUSCLE_NAMES as any)[heatmapHoveredMuscle] || 'Unknown';

    const value = heatmapMuscleVolumes.volumes.get(heatmapHoveredMuscle) || 0;
    const accent = getVolumeColor(value, heatmapMuscleVolumes.maxVolume);

    return { name, value, accent };
  }, [heatmapHoveredMuscle, compositionGrouping, heatmapMuscleVolumes]);

  const muscleCalMeta = useMemo(() => {
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = 0;
    const set = new Set<string>();
    fullData.forEach((d) => {
      if (!d.parsedDate) return;
      const ts = d.parsedDate.getTime();
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
      set.add(format(d.parsedDate, 'yyyy-MM-dd'));
    });
    const minDate = isFinite(minTs) ? new Date(minTs) : null;
    const maxInData = maxTs > 0 ? new Date(maxTs) : null;
    const maxDate = maxInData ?? effectiveNow;
    return { minDate, maxDate, availableDatesSet: set };
  }, [fullData, effectiveNow]);


  // Use shared constants for Recharts styles
  const TooltipStyle = CHART_TOOLTIP_STYLE;
  const PIE_COLORS = CHART_COLORS;

  return (
    <>
      <style>{ANIMATION_KEYFRAMES}</style>
      <div className={`space-y-2 pb-12 transition-opacity duration-700 ease-out ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      
        <div className="hidden sm:block">
          <ViewHeader
            leftStats={[
              { icon: Clock, value: totalWorkouts, label: 'Workouts' },
            ]}
            rightStats={[
              { icon: Dumbbell, value: totalSets, label: 'Sets' },
            ]}
            filtersSlot={filtersSlot}
          />
        </div>

      {/* INSIGHTS PANEL - KPIs with Deltas & Sparklines */}
      <InsightsPanel 
        insights={dashboardInsights}
        totalWorkouts={totalWorkouts}
        totalSets={totalSets}
        totalPRs={totalPrs}
      />

      {/* RECENT PRs TIMELINE */}
      <RecentPRsPanel prInsights={dashboardInsights.prInsights} weightUnit={weightUnit} now={effectiveNow} onExerciseClick={onExerciseClick} />

      {/* PLATEAU ALERTS */}
      {activePlateauExercises.length > 0 && (
        <div className="bg-black/70 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-amber-400">⚠️ Plateaus</span>
           
          </div>
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
              {activePlateauExercises.map((p) => (
                <div key={p.exerciseName} className="min-w-[280px] flex-shrink-0">
                  <PlateauAlert 
                    exerciseName={p.exerciseName}
                    suggestion={p.suggestion}
                    asset={assetsMap?.get(p.exerciseName) || assetsLowerMap?.get(p.exerciseName.toLowerCase())}
                    onClick={() => onExerciseClick?.(p.exerciseName)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. HEATMAP (Full Width) */}
      <Heatmap
        dailyData={dailyData}
        streakInfo={dashboardInsights.streakInfo}
        consistencySparkline={dashboardInsights.consistencySparkline}
        onDayClick={onDayClick}
        now={effectiveNow}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2">
        
        {/* 2. PR TRENDS (Area/Bar) */}
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl">
            <ChartHeader 
              title="PRs Over Time" 
              icon={Trophy} 
              color="text-yellow-500" 
              mode={chartModes.prTrend}
              onToggle={(m) => toggleChartMode('prTrend', m)}
              viewType={prTrendView}
              onViewToggle={setPrTrendView}
              viewOptions={[{ value: 'area', label: 'Area' }, { value: 'bar', label: 'Bar' }]}
              isMounted={isMounted}
            />
            <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <LazyRender
                className="h-full w-full"
                placeholder={<ChartSkeleton className="h-full min-h-[250px] sm:min-h-[300px]" />}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <div key={prTrendView} className="h-full w-full">
                  {prTrendView === 'area' ? (
                  <AreaChart data={prsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gPRs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={TooltipStyle}
                      cursor={{stroke: 'rgba(255,255,255,0.1)'}}
                      labelFormatter={(l, p) => p[0]?.payload?.tooltipLabel || l}
                    />
                      <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="PRs Set" 
                      stroke="#eab308" 
                      strokeWidth={3} 
                      fill="url(#gPRs)"
                      dot={{r:3, fill:'#eab308'}} 
                      activeDot={{r:5, strokeWidth: 0}} 
                      animationDuration={1500}
                    />
                    </AreaChart>
                  ) : (
                    <BarChart data={prsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={TooltipStyle}
                        cursor={{ fill: 'rgba(0,0,0,0.35)' }}
                        labelFormatter={(l, p) => p[0]?.payload?.tooltipLabel || l}
                      />
                      <Bar dataKey="count" name="PRs Set" fill="#eab308" radius={[8, 8, 0, 0]} animationDuration={1500} />
                    </BarChart>
                    )}
                  </div>
                </ResponsiveContainer>
              </LazyRender>
            </div>
            <ChartDescription isMounted={isMounted}>
              <InsightLine>
                {prTrendDelta ? (
                  <TrendBadge
                    label={
                      <BadgeLabel
                        main={
                          <span className="inline-flex items-center gap-1">
                            <TrendIcon direction={prTrendDelta.direction} />
                            <span>{`${formatSigned(prTrendDelta.deltaPercent)}%`}</span>
                          </span>
                        }
                        meta="vs prev mo"
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
                            <span>{`${formatSigned(prTrendDelta7d.deltaPercent)}%`}</span>
                          </span>
                        }
                        meta="vs prev 7d"
                      />
                    }
                    tone={getTrendBadgeTone(prTrendDelta7d.deltaPercent, { goodWhen: 'up' })}
                  />
                ) : null}
              </InsightLine>
              <InsightText text="PRs are new all-time max weights per exercise. Use this to see whether your progress is clustering in bursts or staying steady." />
            </ChartDescription>
        </div>

        {/* 3. WEEKLY SETS (Radar/Heatmap) */}
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <div className="relative z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-cyan-500" />
              <span>Weekly sets</span>
            </h3>

            <div className="flex items-center gap-1 flex-nowrap overflow-x-auto w-full sm:w-auto sm:overflow-visible">
              {/* View Toggle: Radar / Heatmap */}
              <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
                <button
                  onClick={() => setWeeklySetsView('radar')}
                  title="Radar"
                  aria-label="Radar"
                  className={`w-6 h-5 flex items-center justify-center rounded ${weeklySetsView==='radar'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  <Scan className="w-3 h-3" />
                  <span className="sr-only">Radar</span>
                </button>
                <button
                  onClick={() => setWeeklySetsView('heatmap')}
                  title="Heatmap"
                  aria-label="Heatmap"
                  className={`w-6 h-5 flex items-center justify-center rounded ${weeklySetsView==='heatmap'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  <Grid3X3 className="w-3 h-3" />
                  <span className="sr-only">Heatmap</span>
                </button>
              </div>
              {/* Grouping Toggle - available for both views */}
              <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
                <button
                  onClick={() => setCompositionGrouping('groups')}
                  title="Groups"
                  aria-label="Groups"
                  className={`w-6 h-5 flex items-center justify-center rounded ${compositionGrouping==='groups'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  <PersonStanding className="w-3 h-3 scale-[1.3]" />
                  <span className="sr-only">Groups</span>
                </button>
                <button
                  onClick={() => setCompositionGrouping('muscles')}
                  title="Muscles"
                  aria-label="Muscles"
                  className={`w-6 h-5 flex items-center justify-center rounded ${compositionGrouping==='muscles'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  <BicepsFlexed className="w-3 h-3" />
                  <span className="sr-only">Muscles</span>
                </button>
              </div>
              {/* Quick Filters */}
              <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
                <button
                  onClick={() => setMuscleCompQuick('all')}
                  title="All"
                  aria-label="All"
                  className={`w-6 h-5 flex items-center justify-center rounded ${muscleCompQuick==='all'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  <Infinity className="w-3 h-3" />
                  <span className="sr-only">All</span>
                </button>
                <button
                  onClick={() => setMuscleCompQuick('7d')}
                  title="Last week"
                  aria-label="Last week"
                  className={`px-1 h-5 flex items-center justify-center rounded text-[8px] font-bold leading-none ${muscleCompQuick==='7d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  lst wk
                </button>
                <button
                  onClick={() => setMuscleCompQuick('30d')}
                  title="Last month"
                  aria-label="Last month"
                  className={`px-1 h-5 flex items-center justify-center rounded text-[8px] font-bold leading-none ${muscleCompQuick==='30d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  lst mo
                </button>
                <button
                  onClick={() => setMuscleCompQuick('365d')}
                  title="Last year"
                  aria-label="Last year"
                  className={`px-1 h-5 flex items-center justify-center rounded text-[8px] font-bold leading-none ${muscleCompQuick==='365d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                >
                  lst yr
                </button>
              </div>
            </div>
          </div>
          <div className={`relative z-10 flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0 pb-10`}>
            {weeklySetsView === 'radar' ? (
              compositionQuickData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  No muscle composition for this period yet.
                </div>
              ) : (
                <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 300 }} />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={compositionQuickData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                      <Radar name="Weekly Sets" dataKey="value" stroke="#06b6d4" strokeWidth={3} fill="#06b6d4" fillOpacity={0.35} animationDuration={1500} />
                      <Tooltip contentStyle={TooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                </LazyRender>
              )
            ) : (
              <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 300 }} />}>
                <div className="flex flex-col items-center justify-center h-[300px]">
                  {heatmapMuscleVolumes.volumes.size === 0 ? (
                    <div className="text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg p-8">
                      No heatmap data for this period yet.
                  </div>
                  ) : (
                    <>
                      <div className="relative flex justify-center w-full mt-4 sm:mt-6">
                        <div className="transform scale-[0.5] origin-center">
                          <BodyMap
                            onPartClick={(muscleId) => onMuscleClick?.(muscleId, compositionGrouping === 'groups' ? 'group' : 'muscle')}
                            selectedPart={null}
                            muscleVolumes={heatmapMuscleVolumes.volumes}
                            maxVolume={heatmapMuscleVolumes.maxVolume}
                            hoveredMuscleIdsOverride={heatmapHoveredMuscleIds}
                            onPartHover={setHeatmapHoveredMuscle}
                            gender={bodyMapGender}
                            viewMode={compositionGrouping === 'groups' ? 'group' : 'muscle'}
                          />
                        </div>

                        {weeklySetsHoverMeta && (
                          <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 bg-black/90 border border-slate-700/50 rounded-lg px-3 py-2 shadow-xl pointer-events-none z-20">
                            <div className="font-semibold text-[11px] text-center whitespace-nowrap" style={{ color: weeklySetsHoverMeta.accent }}>
                              {weeklySetsHoverMeta.name}
                            </div>
                            <div className="text-[10px] text-center font-semibold whitespace-nowrap" style={{ color: weeklySetsHoverMeta.accent }}>
                              {`${weeklySetsHoverMeta.value.toFixed(1)}/wk`}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </LazyRender>
            )}
          </div>
          <ChartDescription
            isMounted={isMounted}
            topSlot={
              weeklySetsView === 'heatmap' ? (
                <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-1.5 w-fit">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded border border-slate-600" style={{ backgroundColor: 'hsla(0, 0%, 100%, 0.1)' }}></div>
                    <span>None</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(5, 75%, 75%)' }}></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(5, 75%, 50%)' }}></div>
                    <span>Med</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded" style={{ backgroundColor: 'hsl(5, 75%, 25%)' }}></div>
                    <span>High</span>
                  </div>
                </div>
              ) : null
            }
          >
            <InsightLine>
              {weeklySetsInsight ? (
                <>
                  <TrendBadge label={<BadgeLabel main={`~${weeklySetsInsight.total.toFixed(1)}/wk`} />} tone="info" />
                  <TrendBadge label={`Top: ${weeklySetsInsight.top.subject} ${weeklySetsInsight.top.value.toFixed(1)}/wk`} tone="neutral" />
                  <TrendBadge label={`Top3 ${weeklySetsInsight.top3Share.toFixed(0)}%`} tone={weeklySetsInsight.top3Share >= 70 ? 'bad' : weeklySetsInsight.top3Share >= 55 ? 'neutral' : 'good'} />
                </>
              ) : (
                <TrendBadge label="Building baseline" tone="neutral" />
              )}
            </InsightLine>
            <InsightText text="Read this as your weekly set allocation. If the Top 3 share is high, your volume is concentrated. This is great for specialization, but watch balance." />
          </ChartDescription>
        </div>
      </div>

      {/* 4. INTENSITY EVOLUTION (Area/Stacked Bar) */}
      <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl">
          <ChartHeader 
            title="Training Style Evolution" 
            icon={Layers} 
            color="text-orange-500"
            mode={chartModes.intensityEvo}
            onToggle={(m) => toggleChartMode('intensityEvo', m)} 
            viewType={intensityView}
            onViewToggle={setIntensityView}
            viewOptions={[{ value: 'area', label: 'Area' }, { value: 'stackedBar', label: 'Stacked' }]}
            isMounted={isMounted}
          />
          {intensityData && intensityData.length > 0 ? (
            <div className={`flex-1 w-full transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{minHeight: '250px', height: '100%'}}>
              <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 250 }} />}>
                <ResponsiveContainer width="100%" height={250}>
                  <div key={intensityView} className="h-full w-full">
                  {intensityView === 'area' ? (
                  <AreaChart data={intensityData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gStrength" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gHyper" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gEndure" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TooltipStyle} />
                    <Legend wrapperStyle={{fontSize: '11px'}} />
                    <Area type="monotone" dataKey="Strength" name="Strength (1-5)" stackId="1" stroke="#3b82f6" fill="url(#gStrength)" animationDuration={1500} />
                    <Area type="monotone" dataKey="Hypertrophy" name="Hypertrophy (6-12)" stackId="1" stroke="#10b981" fill="url(#gHyper)" animationDuration={1500} />
                    <Area type="monotone" dataKey="Endurance" name="Endurance (13+)" stackId="1" stroke="#a855f7" fill="url(#gEndure)" animationDuration={1500} />
                  </AreaChart>
                  ) : (
                    <BarChart data={intensityData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={TooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.35)' }} />
                      <Legend wrapperStyle={{fontSize: '11px'}} />
                      <Bar dataKey="Strength" name="Strength (1-5)" stackId="1" fill="#3b82f6" radius={[0, 0, 0, 0]} animationDuration={1500} />
                      <Bar dataKey="Hypertrophy" name="Hypertrophy (6-12)" stackId="1" fill="#10b981" radius={[0, 0, 0, 0]} animationDuration={1500} />
                      <Bar dataKey="Endurance" name="Endurance (13+)" stackId="1" fill="#a855f7" radius={[8, 8, 0, 0]} animationDuration={1500} />
                    </BarChart>
                  )}
                  </div>
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
                     .sort((a, b) => b.pct - a.pct)
                     .map((s) => (
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

        {/* MUSCLE ANALYSIS (Unified) */}
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BicepsFlexed className="w-5 h-5 text-emerald-500" />
              <span>Muscle Analysis</span>
            </h3>

            <div className="flex items-center gap-1 flex-nowrap overflow-x-auto w-full sm:w-auto sm:overflow-visible">
              <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
              <button
                onClick={() => setMuscleGrouping('groups')}
                title="Groups"
                aria-label="Groups"
                className={`w-5 h-5 flex items-center justify-center rounded ${muscleGrouping==='groups'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                <PersonStanding className="w-3.5 h-3.5 scale-[1.3]" />
                <span className="sr-only">Groups</span>
              </button>
              <button
                onClick={() => setMuscleGrouping('muscles')}
                title="Muscles"
                aria-label="Muscles"
                className={`w-5 h-5 flex items-center justify-center rounded ${muscleGrouping==='muscles'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                <BicepsFlexed className="w-3.5 h-3.5" />
                <span className="sr-only">Muscles</span>
              </button>
            </div>
            <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
              <button
                onClick={() => setMusclePeriod('weekly')}
                title="Weekly"
                aria-label="Weekly"
                className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='weekly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                wk
              </button>
              <button
                onClick={() => setMusclePeriod('monthly')}
                title="Monthly"
                aria-label="Monthly"
                className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='monthly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                mo
              </button>
              <button
                onClick={() => setMusclePeriod('yearly')}
                title="Yearly"
                aria-label="Yearly"
                className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='yearly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                yr
              </button>
            </div>
            <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
              <button
                onClick={() => setMuscleTrendView('stackedBar')}
                title="Stacked"
                aria-label="Stacked"
                className={`w-5 h-5 flex items-center justify-center rounded ${muscleTrendView==='stackedBar'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                <ChartColumnStacked className="w-3.5 h-3.5" />
                <span className="sr-only">Stacked</span>
              </button>
              <button
                onClick={() => setMuscleTrendView('area')}
                title="Area"
                aria-label="Area"
                className={`w-5 h-5 flex items-center justify-center rounded ${muscleTrendView==='area'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                <AreaChartIcon className="w-3.5 h-3.5" />
                <span className="sr-only">Area</span>
              </button>
            </div>

            </div>
          </div>
          <div className={`flex-1 w-full min-h-[250px] sm:min-h-[320px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
            {trendData.length === 0 || trendKeys.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                Not enough data to render Muscle Analysis trend.
              </div>
            ) : (
              <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 280 }} />}>
                <ResponsiveContainer width="100%" height={280}>
                  <div key={`${muscleTrendView}-${musclePeriod}-${muscleGrouping}`} className="h-full w-full">
                    {muscleTrendView === 'area' ? (
                      <AreaChart data={trendData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={TooltipStyle} />
                        <Legend wrapperStyle={{fontSize: '11px'}} />
                        {trendKeys.map((k) => (
                          <Area key={k} type="monotone" dataKey={k} name={k} stackId="1" stroke={MUSCLE_COLORS[(muscleGrouping==='groups'?k:normalizeMuscleGroup(k))] || '#94a3b8'} fill={MUSCLE_COLORS[(muscleGrouping==='groups'?k:normalizeMuscleGroup(k))] || '#94a3b8'} fillOpacity={0.25} animationDuration={1200} />
                        ))}
                      </AreaChart>
                    ) : (
                      <BarChart data={trendData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={TooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.35)' }} />
                        <Legend wrapperStyle={{fontSize: '11px'}} />
                        {trendKeys.map((k, idx) => (
                          <Bar key={k} dataKey={k} name={k} stackId="1" fill={MUSCLE_COLORS[(muscleGrouping==='groups'?k:normalizeMuscleGroup(k))] || '#94a3b8'} radius={idx===trendKeys.length-1?[6,6,0,0]:[0,0,0,0]} animationDuration={1200} />
                        ))}
                      </BarChart>
                    )}
                  </div>
                </ResponsiveContainer>
              </LazyRender>
            )}
          </div>
          <ChartDescription isMounted={isMounted}>
            <InsightLine>
              {muscleTrendInsight ? (
                <>
                  <TrendBadge
                    label={
                      <BadgeLabel
                        main={
                          <span className="inline-flex items-center gap-1">
                            <TrendIcon direction={muscleTrendInsight.totalDelta.direction} />
                            <span>{formatSignedPctWithNoun(muscleTrendInsight.totalDelta.deltaPercent, 'sets')}</span>
                          </span>
                        }
                        meta={muscleVsLabel}
                      />
                    }
                    tone={getTrendBadgeTone(muscleTrendInsight.totalDelta.deltaPercent, { goodWhen: 'up' })}
                  />
                  {muscleTrendInsight.biggestMover && (
                    <TrendBadge
                      label={
                        <BadgeLabel
                          main={
                            <span className="inline-flex items-center gap-1">
                              <TrendIcon direction={muscleTrendInsight.biggestMover.d > 0 ? 'up' : muscleTrendInsight.biggestMover.d < 0 ? 'down' : 'same'} />
                              <span>{muscleTrendInsight.biggestMover.k}</span>
                            </span>
                          }
                          meta={
                            <ShiftedMeta>
                              <span>{`biggest mover: ${formatSigned(muscleTrendInsight.biggestMover.d)} sets`}</span>
                            </ShiftedMeta>
                          }
                        />
                      }
                      tone={muscleTrendInsight.biggestMover.d === 0 ? 'neutral' : muscleTrendInsight.biggestMover.d > 0 ? 'good' : 'bad'}
                    />
                  )}
                </>
              ) : (
                <TrendBadge label="Building baseline" tone="neutral" />
              )}
            </InsightLine>
            <p>
              <span className="font-semibold text-slate-300">Weighting:</span> <span className="text-emerald-400 font-semibold">Primary</span>: 1 set, <span className="text-cyan-400 font-semibold">Secondary</span>: 0.5 set. Cardio is ignored. Full Body adds 1 set to every group.
            </p>
            <InsightText text="Use this to spot volume drift. If one area rises while others fade, you are gradually specializing. This can be intentional, or accidental." />
          </ChartDescription>
        </div>

      {/* 5. Weekly Rhythm + Muscle Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2">
        
        {/* Weekly Rhythm: Radar/Bar */}
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl">
            <ChartHeader 
              title="Weekly Rhythm" 
              icon={Clock} 
              color="text-pink-500"
              viewType={weekShapeView}
              onViewToggle={setWeekShapeView}
              viewOptions={[{ value: 'radar', label: 'Radar' }, { value: 'bar', label: 'Bar' }]}
              isMounted={isMounted}
            />
            <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <LazyRender
                className="h-full w-full"
                placeholder={<ChartSkeleton className="h-full min-h-[250px] sm:min-h-[300px]" />}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <div key={weekShapeView} className="h-full w-full">
                  {weekShapeView === 'radar' ? (
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={weekShapeData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar name="Workouts" dataKey="A" stroke="#ec4899" strokeWidth={3} fill="#ec4899" fillOpacity={0.4} animationDuration={1500} />
                    <Tooltip contentStyle={TooltipStyle} />
                  </RadarChart>
                  ) : (
                    <BarChart data={weekShapeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={TooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.35)' }} />
                      <Bar dataKey="A" name="Workouts" fill="#ec4899" radius={[8, 8, 0, 0]} animationDuration={1500} />
                    </BarChart>
                  )}
                  </div>
                </ResponsiveContainer>
              </LazyRender>
            </div>
            <ChartDescription isMounted={isMounted}>
              <InsightLine>
                {weeklyRhythmInsight ? (
                  <>
                    <TrendBadge
                      label={<BadgeLabel main={`Top ${weeklyRhythmInsight.top.subject} ${weeklyRhythmInsight.top.share.toFixed(0)}%`} />}
                      tone="info"
                    />
                    <TrendBadge
                      label={<BadgeLabel main={`Low ${weeklyRhythmInsight.bottom.subject} ${weeklyRhythmInsight.bottom.share.toFixed(0)}%`} />}
                      tone="neutral"
                    />
                    <TrendBadge
                      label={<BadgeLabel main={weeklyRhythmInsight.rhythmLabel} />}
                      tone={weeklyRhythmInsight.rhythmTone}
                    />
                  </>
                ) : (
                  <TrendBadge label="Building baseline" tone="neutral" />
                )}
              </InsightLine>
              <InsightText text="Read this as your training day pattern. A flatter shape means a steadier habit. Big spikes mean your week depends on a couple of key days." />
            </ChartDescription>
          </div>

        {/* Volume Density (Area/Bar) */}
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl">
            <ChartHeader 
              title="Volume Density" 
              icon={Timer} 
              color="text-purple-500" 
              mode={chartModes.volumeVsDuration}
              onToggle={(m) => toggleChartMode('volumeVsDuration', m)}
              viewType={volumeView}
              onViewToggle={setVolumeView}
              viewOptions={[{ value: 'area', label: 'Area' }, { value: 'bar', label: 'Bar' }]}
              isMounted={isMounted}
            />
            <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <LazyRender
                className="h-full w-full"
                placeholder={<ChartSkeleton className="h-full min-h-[250px] sm:min-h-[300px]" />}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <div key={volumeView} className="h-full w-full">
                  {volumeView === 'area' ? (
                    <AreaChart data={volumeDurationData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gDensityArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}${weightUnit}`} />
                    <Tooltip 
                      contentStyle={TooltipStyle} 
                      labelFormatter={(l, p) => p[0]?.payload?.tooltipLabel || l} 
                      formatter={(val: number, name) => {
                          if (name === `Volume per Set (${weightUnit})`) return [`${val} ${weightUnit}`, name];
                          return [val, name];
                      }}
                    />
                    <Legend />
                      <Area type="monotone" dataKey="volumePerSet" name={`Volume per Set (${weightUnit})`} stroke="#8b5cf6" strokeWidth={3} fill="url(#gDensityArea)" dot={{r:3, fill:'#8b5cf6'}} activeDot={{r:5, strokeWidth: 0}} animationDuration={1500} />
                    </AreaChart>
                  ) : (
                    <BarChart data={volumeDurationData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}${weightUnit}`} />
                      <Tooltip 
                        contentStyle={TooltipStyle} 
                        cursor={{ fill: 'rgba(0,0,0,0.35)' }}
                        labelFormatter={(l, p) => p[0]?.payload?.tooltipLabel || l} 
                        formatter={(val: number, name) => {
                            if (name === `Volume per Set (${weightUnit})`) return [`${val} ${weightUnit}`, name];
                            return [val, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="volumePerSet" name={`Volume per Set (${weightUnit})`} fill="#8b5cf6" radius={[8, 8, 0, 0]} animationDuration={1500} />
                    </BarChart>
                  )}
                  </div>
                </ResponsiveContainer>
              </LazyRender>
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
      </div>

      {/* 6. Top Exercises (Full Width, Bars/Area Views) */}
      <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[360px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Most Frequent Exercises
            </h3>
            <div className="flex items-center gap-1 flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
              {/* All / Monthly / Weekly Toggle */}
              <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
                <button 
                  onClick={() => setTopExerciseMode('all')} 
                  title="All"
                  aria-label="All"
                  className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                    topExerciseMode === 'all' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Infinity className="w-3 h-3" />
                  <span className="sr-only">All</span>
                </button>
                <button 
                  onClick={() => setTopExerciseMode('monthly')} 
                  title="Monthly"
                  aria-label="Monthly"
                  className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
                    topExerciseMode === 'monthly' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  mo
                </button>
                <button 
                  onClick={() => setTopExerciseMode('weekly')} 
                  title="Weekly"
                  aria-label="Weekly"
                  className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 text-[9px] font-bold leading-none ${
                    topExerciseMode === 'weekly' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  wk
                </button>
              </div>
              {/* View: Bars / Area */}
              <div className="bg-black/70 p-0.5 rounded-lg flex gap-0.5 border border-slate-800 transition-all duration-200 hover:border-slate-700 shrink-0">
                <button 
                  onClick={() => setTopExercisesView('barh')} 
                  title="Bars"
                  aria-label="Bars"
                  className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                    topExercisesView === 'barh' 
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ChartBarStacked className="w-3 h-3" />
                  <span className="sr-only">Bars</span>
                </button>
                <button 
                  onClick={() => setTopExercisesView('area')} 
                  title="Area"
                  aria-label="Area"
                  className={`w-6 h-5 flex items-center justify-center rounded transition-all duration-200 ${
                    topExercisesView === 'area' 
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <AreaChartIcon className="w-3 h-3" />
                  <span className="sr-only">Area</span>
                </button>
              </div>
            </div>
          </div>

          <div className={`flex-1 w-full min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
            {topExercisesView === 'barh' ? (
              topExercisesBarData.length === 0 ? (
                <div className="flex items-center justify-center h-[320px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  Not enough data to render Most Frequent Exercises.
                </div>
              ) : (
                <div className="w-full h-[320px] flex flex-col px-1 sm:px-2 overflow-x-hidden">
                  {(() => {
                    const max = Math.max(...topExercisesBarData.map(e => e.count), 1);
                    const tickValues = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

                    return (
                      <>
                        <div className="flex items-center gap-3 px-1 mb-2">
                          <div className="flex-1 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Exercise</div>
                          <div className="min-w-[64px] text-right text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sets</div>
                        </div>

                        <div className="relative flex-1 overflow-hidden">
                          <div className="pointer-events-none absolute inset-0">
                            {[0, 25, 50, 75, 100].map(p => (
                              <div
                                key={p}
                                className="absolute top-0 bottom-0 border-l border-slate-800/70"
                                style={{ left: `${p}%` }}
                              />
                            ))}
                          </div>

                          {(() => {
                            const n = Math.max(topExercisesBarData.length, 1);
                            const headerH = 22;
                            const axisH = 18;
                            const padding = 8;
                            const available = 320 - headerH - axisH - padding;
                            const gap = 12;
                            const rowH = 48;
                            const avatar = 40;
                            const contentH = n * rowH + (n - 1) * gap;
                            const verticalPad = Math.max(0, available - contentH);

                            return (
                              <div
                                className="relative"
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: `${gap}px`,
                                  height: `${available}px`,
                                  paddingTop: `${Math.floor(verticalPad / 2)}px`,
                                  paddingBottom: `${Math.ceil(verticalPad / 2)}px`,
                                  overflow: 'hidden',
                                }}
                              >
                                {topExercisesBarData.map((exercise, idx) => {
                              const color = PIE_COLORS[idx % PIE_COLORS.length];
                              const asset = assetsMap?.get(exercise.name) || assetsLowerMap?.get(exercise.name.toLowerCase());
                              const thumbnail = asset?.thumbnail;
                              const pct = Math.max(6, Math.round((exercise.count / max) * 100));

                              const medal = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null;
                              const medalEmoji = medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : medal === 'bronze' ? '🥉' : '';
                              const countClass = medal === 'gold'
                                ? 'text-amber-300'
                                : medal === 'silver'
                                  ? 'text-slate-200'
                                  : medal === 'bronze'
                                    ? 'text-orange-300'
                                    : 'text-white';

                              const fillBackground = medal === 'gold'
                                ? 'linear-gradient(90deg, rgba(245,158,11,0.95) 0%, rgba(59,130,246,0.9) 100%)'
                                : medal === 'silver'
                                  ? 'linear-gradient(90deg, rgba(226,232,240,0.96) 0%, rgba(148,163,184,0.92) 40%, rgba(59,130,246,0.85) 100%)'
                                  : medal === 'bronze'
                                    ? 'linear-gradient(90deg, rgba(251,146,60,0.9) 0%, rgba(59,130,246,0.85) 100%)'
                                    : undefined;

                              const medalRing = medal === 'gold'
                                ? 'ring-2 ring-amber-300/70'
                                : medal === 'silver'
                                  ? 'ring-2 ring-slate-100/80'
                                  : medal === 'bronze'
                                    ? 'ring-2 ring-orange-300/60'
                                    : '';

                              const countShimmerStyle: React.CSSProperties | undefined = medal
                                ? {
                                    backgroundImage:
                                      medal === 'gold'
                                        ? 'linear-gradient(90deg, rgba(245,158,11,1) 0%, rgba(255,255,255,0.95) 18%, rgba(245,158,11,1) 36%, rgba(251,191,36,1) 100%)'
                                        : medal === 'silver'
                                          ? 'linear-gradient(90deg, rgba(148,163,184,1) 0%, rgba(255,255,255,0.98) 18%, rgba(148,163,184,1) 36%, rgba(226,232,240,1) 100%)'
                                          : 'linear-gradient(90deg, rgba(251,146,60,1) 0%, rgba(255,255,255,0.92) 18%, rgba(251,146,60,1) 36%, rgba(253,186,116,1) 100%)',
                                    backgroundSize: '220% 100%',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                    filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.08))',
                                    animation: 'textShimmer 2.4s linear infinite',
                                  }
                                : undefined;

                              // Filled-only bar width. Keep a small minimum so the label/avatar can fit.
                              const barWidthPct = Math.max(8, pct);

                              const countReservePx = 88;

                              return (
                                <button
                                  key={exercise.name}
                                  type="button"
                                  onClick={() => onExerciseClick?.(exercise.name)}
                                  className="w-full min-w-0 text-left"
                                  title={`View ${exercise.name}`}
                                >
                                  {/* Mobile layout: stack count below so it never pushes off-screen */}
                                  <div className="flex flex-col gap-1 sm:hidden min-w-0">
                                    <div
                                      className="relative rounded-full overflow-hidden min-w-0"
                                      style={{
                                        height: `${rowH}px`,
                                        width: `${barWidthPct}%`,
                                        minWidth: `${avatar + 72}px`,
                                        maxWidth: '100%',
                                      }}
                                    >
                                    <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                      backgroundColor: fillBackground ? undefined : color,
                                      backgroundImage: fillBackground,
                                      opacity: 0.95,
                                    }}
                                  />

                                  {medal && (
                                    <div
                                      className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                                      style={{ opacity: 0.45 }}
                                    >
                                      <div
                                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                                        style={{
                                          animation: 'medalShimmer 2.2s ease-in-out infinite',
                                        }}
                                      />
                                    </div>
                                  )}

                                    {/* Name inside the filled portion */}
                                    <div
                                      className="relative z-10 h-full flex items-center pl-4"
                                      style={{ paddingRight: `${avatar + 14}px` }}
                                    >
                                      <div className="text-white font-semibold text-sm sm:text-base truncate">
                                        {medalEmoji ? `${medalEmoji} ${exercise.name}` : exercise.name}
                                      </div>
                                    </div>

                                    {/* Avatar at the end of the filled bar */}
                                    <div
                                      className={`absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white ${medalRing}`}
                                      style={{ width: `${avatar}px`, height: `${avatar}px` }}
                                    >
                                      {thumbnail ? (
                                        <img
                                          src={thumbnail}
                                          alt={exercise.name}
                                          className="w-full h-full object-cover object-center"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-white/95 flex items-center justify-center">
                                          <Dumbbell className="w-5 h-5 text-slate-500" />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                    <div className={`hidden self-end pr-1 font-extrabold text-xl tracking-tight ${countClass}`}>
                                      {medal ? (
                                        <span style={countShimmerStyle}>{exercise.count}x</span>
                                      ) : (
                                        <>
                                          {exercise.count}
                                          <span className="text-white/90 font-bold ml-1">x</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Desktop layout: reserve room for count so 100% bars don't overflow */}
                                  <div className="hidden sm:flex items-center gap-2 min-w-0">
                                    <div
                                      className="relative rounded-full overflow-hidden min-w-0"
                                      style={{
                                        height: `${rowH}px`,
                                        width: `${barWidthPct}%`,
                                        minWidth: `${avatar + 72}px`,
                                        maxWidth: `calc(100% - ${countReservePx}px)`,
                                      }}
                                    >
                                      <div
                                      className="absolute inset-0 rounded-full"
                                      style={{
                                        backgroundColor: fillBackground ? undefined : color,
                                        backgroundImage: fillBackground,
                                        opacity: 0.95,
                                      }}
                                    />

                                    {medal && (
                                      <div
                                        className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                                        style={{ opacity: 0.45 }}
                                      >
                                        <div
                                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                                          style={{
                                            animation: 'medalShimmer 2.2s ease-in-out infinite',
                                          }}
                                        />
                                      </div>
                                    )}

                                      {/* Name inside the filled portion */}
                                      <div
                                        className="relative z-10 h-full flex items-center pl-4"
                                        style={{ paddingRight: `${avatar + 14}px` }}
                                      >
                                        <div className="text-white font-semibold text-sm sm:text-base truncate">
                                          {medalEmoji ? `${medalEmoji} ${exercise.name}` : exercise.name}
                                        </div>
                                      </div>

                                      {/* Avatar at the end of the filled bar */}
                                      <div
                                        className={`absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white ${medalRing}`}
                                        style={{ width: `${avatar}px`, height: `${avatar}px` }}
                                      >
                                        {thumbnail ? (
                                          <img
                                            src={thumbnail}
                                            alt={exercise.name}
                                            className="w-full h-full object-cover object-center"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-white/95 flex items-center justify-center">
                                            <Dumbbell className="w-5 h-5 text-slate-500" />
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Count placed immediately after the filled bar ends */}
                                    <div className={`shrink-0 font-extrabold text-xl tracking-tight ${countClass}`}>
                                      {medal ? (
                                        <span style={countShimmerStyle}>{exercise.count}x</span>
                                      ) : (
                                        <>
                                          {exercise.count}
                                          <span className="text-white/90 font-bold ml-1">x</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="mt-2 flex items-center gap-3 px-1">
                          <div className="flex-1 flex justify-between text-[10px] text-slate-500 font-medium">
                            {tickValues.map((v, i) => (
                              <span key={`${v}-${i}`}>{v}</span>
                            ))}
                          </div>
                          <div className="min-w-[64px]" />
                        </div>
                      </>
                    );
                  })()}
                </div>
              )
            ) : (
              topExercisesOverTimeData.length === 0 || topExerciseNames.length === 0 ? (
                <div className="flex items-center justify-center h-[320px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  Not enough data to render Most Frequent Exercises area view.
                </div>
              ) : (
                <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 320 }} />}>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={topExercisesOverTimeData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend wrapperStyle={{fontSize: '11px'}} />
                      {topExerciseNames.map((name, idx) => (
                        <Area key={name} type="monotone" dataKey={name} name={name} stackId="1" stroke={PIE_COLORS[idx % PIE_COLORS.length]} fill={PIE_COLORS[idx % PIE_COLORS.length]} fillOpacity={0.25} animationDuration={1200} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </LazyRender>
              )
            )}
          </div>

          <ChartDescription isMounted={isMounted}>
            <InsightLine>
              {topExercisesInsight.windowLabel === 'All time' ? (
                <>
                  <TrendBadge label="All time" tone="info" />
                  {topExercisesInsight.top && <TrendBadge label={<BadgeLabel main={`Top: ${topExercisesInsight.top.name}`} />} tone="neutral" />}
                  {topExercisesInsight.top && <TrendBadge label={<BadgeLabel main={`${topExercisesInsight.topShare.toFixed(0)}%`} meta="of shown" />} tone="neutral" />}
                </>
              ) : (
                <>
                  {topExercisesInsight.delta ? (
                    <TrendBadge
                      label={
                        <BadgeLabel
                          main={
                            <span className="inline-flex items-center gap-1">
                              <TrendIcon direction={topExercisesInsight.delta.direction} />
                              <span>{formatSignedPctWithNoun(topExercisesInsight.delta.deltaPercent, 'sets')}</span>
                            </span>
                          }
                          meta={`vs prev ${topExercisesInsight.windowLabel}`}
                        />
                      }
                      tone={getTrendBadgeTone(topExercisesInsight.delta.deltaPercent, { goodWhen: 'up' })}
                    />
                  ) : (
                    <TrendBadge label="Building baseline" tone="neutral" />
                  )}
                  {topExercisesInsight.top && <TrendBadge label={<BadgeLabel main={`Top: ${topExercisesInsight.top.name}`} />} tone="neutral" />}
                  {topExercisesInsight.top && <TrendBadge label={<BadgeLabel main={`${topExercisesInsight.topShare.toFixed(0)}%`} meta="of shown" />} tone={topExercisesInsight.topShare >= 45 ? 'bad' : topExercisesInsight.topShare >= 30 ? 'neutral' : 'good'} />}
                </>
              )}
              {topExercisesInsight.top ? (
                <TrendBadge
                  label={topExercisesInsight.topShare >= 45 ? 'Variety is low' : topExercisesInsight.topShare >= 30 ? 'Variety is ok' : 'Variety is high'}
                  tone={topExercisesInsight.topShare >= 45 ? 'bad' : topExercisesInsight.topShare >= 30 ? 'neutral' : 'good'}
                />
              ) : null}
            </InsightLine>
            <InsightText text="This highlights your staples. If one movement takes a very large share, you may be rotating too little. More variation can help manage overuse." />
          </ChartDescription>
        </div>

      </div>
    </>
  );
};