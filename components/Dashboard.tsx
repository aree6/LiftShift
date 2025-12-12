import React, { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { DailySummary, ExerciseStats, WorkoutSet } from '../types';
import { 
  getHeatmapData, 
  getIntensityEvolution, 
  getDayOfWeekShape, 
  getTopExercisesRadial,
  getPrsOverTime,
  getTopExercisesOverTime
} from '../utils/analytics';
import { getMuscleVolumeTimeSeries, getDetailedMuscleCompositionLatest, normalizeMuscleGroup, getMuscleVolumeTimeSeriesDetailed } from '../utils/muscleAnalytics';
import { CSV_TO_SVG_MUSCLE_MAP } from '../utils/muscleMapping';
import { BodyMap, BodyMapGender } from './BodyMap';
import { MUSCLE_COLORS } from '../utils/categories';
import { saveChartModes, getChartModes, TimeFilterMode, WeightUnit } from '../utils/localStorage';
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
  Calendar, Zap, Layers, Eye, Layout, ChevronDown, 
  Clock, Dumbbell, Trophy, Timer, Info
} from 'lucide-react';
import { format, startOfMonth, startOfWeek, subDays, differenceInCalendarDays } from 'date-fns';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { SupportLinks } from './SupportLinks';
import { calculateDashboardInsights, detectPlateaus, DashboardInsights, PlateauAnalysis } from '../utils/insights';
import { InsightsPanel, PlateauAlert, RecentPRsPanel } from './InsightCards';
import { computationCache } from '../utils/computationCache';

interface DashboardProps {
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  fullData: WorkoutSet[]; // The raw set data
  onDayClick?: (date: Date) => void;
  onMuscleClick?: (muscleId: string, viewMode: 'muscle' | 'group') => void;
  filtersSlot?: React.ReactNode;
  bodyMapGender?: BodyMapGender;
  weightUnit?: WeightUnit;
}

type ChartKey = 'heatmap' | 'prTrend' | 'volumeVsDuration' | 'intensityEvo' | 'weekShape' | 'topExercises' | 'muscleVolume';

const CHART_LABELS: Record<ChartKey, string> = {
  heatmap: 'Consistency Heatmap',
  prTrend: 'PRs Over Time',
  volumeVsDuration: 'Volume Density',
  intensityEvo: 'Training Style Evolution',
  weekShape: 'Weekly Rhythm',
  topExercises: 'Most Frequent Exercises',
  muscleVolume: 'Muscle Analysis'
};

// --- SUB-COMPONENTS ---

// 1. Custom Hover Tooltip for DOM elements (Heatmap)
const DashboardTooltip: React.FC<{ data: { rect: DOMRect, title: string, body: string, footer?: string, status: 'success'|'info'|'default' } }> = ({ data }) => {
  const { rect, title, body, footer, status } = data;
  const TOOLTIP_WIDTH = 240;
  const GAP = 12;
  
  // Smart positioning logic
  const left = Math.min(window.innerWidth - TOOLTIP_WIDTH - 20, Math.max(20, rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2)));
  const spaceAbove = rect.top;
  const isFlip = spaceAbove < 150; 

  const style: React.CSSProperties = {
    left: `${left}px`,
    width: `${TOOLTIP_WIDTH}px`,
  };

  if (isFlip) {
    style.top = `${rect.bottom + GAP}px`;
  } else {
    style.bottom = `${window.innerHeight - rect.top + GAP}px`;
  }
  
  const colors = {
    success: 'border-emerald-500/50 bg-emerald-950/95 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    info: 'border-blue-500/50 bg-slate-900/95 text-slate-200 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    default: 'border-slate-700/50 bg-slate-950/95 text-slate-300 shadow-xl'
  };
  const theme = colors[status] || colors.default;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"
      style={style}
    >
      <div className={`border rounded-xl backdrop-blur-md p-3 ${theme}`}>
        <div className="flex items-center gap-2 mb-1 pb-1 border-b border-white/10">
          <span className="font-bold uppercase text-[10px] tracking-wider">{title}</span>
        </div>
        <div className="text-xs leading-relaxed opacity-90 whitespace-pre-line">{body}</div>
        {footer && (
          <div className="mt-2 text-[10px] font-bold text-blue-400">{footer}</div>
        )}
      </div>
    </div>
  );
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
  mode?: TimeFilterMode;
  onToggle?: (mode: TimeFilterMode) => void;
  viewType?: string;
  onViewToggle?: (type: string) => void;
  viewOptions?: { value: string; label: string }[];
  isMounted?: boolean;
}

const ChartHeader = ({ 
  title, 
  icon: Icon, 
  color, 
  mode, 
  onToggle,
  viewType,
  onViewToggle,
  viewOptions,
  isMounted = true
}: ChartHeaderProps) => (
  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
    <h3 className="text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
      <Icon className={`w-5 h-5 ${color} transition-opacity duration-200 hover:opacity-80`} />
      {title}
    </h3>
    <div className="flex items-center gap-2 flex-wrap">
      {/* View Type Toggle (Line/Area, Area/Line, Radar/Bar) */}
      {viewType && onViewToggle && viewOptions && (
        <div className="bg-black/70 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onViewToggle(option.value)}
              className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                viewType === option.value 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      
      {/* All/Weekly/Monthly Toggle */}
    {mode && onToggle && (
      <div className="bg-black/70 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
        <button 
          onClick={() => onToggle('all')} 
          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 transform hover:scale-105 active:scale-95 ${
            mode === 'all' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          All
        </button>
        <button 
          onClick={() => onToggle('weekly')} 
          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 transform hover:scale-105 active:scale-95 ${
            mode === 'weekly' 
              ? 'bg-blue-600 text-white shadow-lg shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          Weekly
        </button>
        <button 
          onClick={() => onToggle('monthly')} 
          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 transform hover:scale-105 active:scale-95 ${
            mode === 'monthly' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          Monthly
        </button>
      </div>
    )}
    </div>
  </div>
);

// 4. Heatmap Component - Memoized to prevent unnecessary re-renders
const Heatmap = memo(({ dailyData, totalPrs, onDayClick }: { dailyData: DailySummary[], totalPrs: number, onDayClick?: (date: Date) => void }) => {
  // Cache heatmap data across tab switches
  const heatmapData = useMemo(() => {
    return computationCache.getOrCompute(
      'heatmapData',
      dailyData,
      () => getHeatmapData(dailyData),
      { ttl: 10 * 60 * 1000 }
    );
  }, [dailyData]);
  const [tooltip, setTooltip] = useState<any | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest (rightmost) position
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered, especially on mobile
      requestAnimationFrame(() => {
        // Add a small delay for mobile browsers to complete layout
        setTimeout(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
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
    if (day.count === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      rect,
      title: day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      body: `${day.count} Sets${day.title ? `\n${day.title}` : ''}`,
      footer: 'Click to view details',
      status: day.count > 30 ? 'success' : 'info'
    });
  };

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 sm:gap-6 overflow-hidden">
      <div className="flex-shrink-0 flex flex-col justify-between min-w-full md:min-w-[180px] border-b md:border-b-0 md:border-r border-slate-800/50 pb-4 md:pb-0 md:pr-6 md:mr-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white flex items-center mb-1">
            <Calendar className="w-5 h-5 mr-2 text-blue-500" />
            Consistency
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">Last 365 Days</p>
        </div>
        <div className="mt-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white">{totalPrs}</p>
                <p className="text-xs font-medium text-slate-400 uppercase">PRs Set</p>
              </div>
           </div>
        </div>
      </div>
      <div className="flex-1 w-full overflow-x-auto pb-2 custom-scrollbar" ref={scrollContainerRef}>
         <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-max">
            {heatmapData.map((day) => (
              <div 
                key={day.date.toISOString()}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-all duration-300 ${day.count > 0 ? 'cursor-pointer hover:z-10 ring-0 hover:ring-2 ring-white/20' : 'cursor-default'}`}
                onClick={() => day.count > 0 && onDayClick?.(day.date)}
                onMouseEnter={(e) => handleMouseEnter(e, day)}
                onMouseLeave={() => setTooltip(null)}
              >
              </div>
            ))}
         </div>
      </div>
      {tooltip && <DashboardTooltip data={tooltip} />}
    </div>
  );
});


// --- MAIN DASHBOARD ---

export const Dashboard: React.FC<DashboardProps> = ({ dailyData, exerciseStats, fullData, onDayClick, onMuscleClick, filtersSlot, bodyMapGender = 'male', weightUnit = 'kg' }) => {
  const DEFAULT_CHART_MODES: Record<string, TimeFilterMode> = {
    volumeVsDuration: 'monthly',
    intensityEvo: 'monthly',
    prTrend: 'monthly',
  };

  // State to control animation retriggering on mount
  const [isMounted, setIsMounted] = useState(false);

  // FIXED: Initialize state lazily from local storage to prevent double-render
  const [chartModes, setChartModes] = useState<Record<string, TimeFilterMode>>(() => {
    return getChartModes() || DEFAULT_CHART_MODES;
  });

  // FIXED: Simple effect to trigger animation after mount
  useEffect(() => {
    // A small timeout ensures the DOM nodes exist and layout is calculated
    // before we toggle opacity, preventing the "start-stop" glitch.
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Save chart modes to localStorage whenever they change
  const toggleChartMode = (chart: string, mode: TimeFilterMode) => {
    const newModes = { ...chartModes, [chart]: mode };
    setChartModes(newModes);
    saveChartModes(newModes);
  };

  const [visibleCharts, setVisibleCharts] = useState<Record<ChartKey, boolean>>({
    heatmap: true,
    prTrend: true,
    volumeVsDuration: true,
    intensityEvo: true,
    weekShape: true,
    topExercises: true,
    muscleVolume: true
  });
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [topExerciseLimit, setTopExerciseLimit] = useState(5);
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

  // Determine span of currently filtered data
  const spanDays = useMemo(() => {
    const dates: number[] = [];
    for (const s of fullData) {
      if (s.parsedDate) dates.push(s.parsedDate.getTime());
    }
    // Fallback to daily summaries if needed
    if (dates.length === 0 && dailyData?.length) {
      for (const d of dailyData) {
        if (d?.timestamp) dates.push(new Date(d.timestamp).getTime());
      }
    }
    if (dates.length === 0) return 0;
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
  }, [fullData, dailyData]);

  // Detect rough granularity by counting unique periods in the filtered data
  const granularity = useMemo(() => {
    const days = new Set<string>();
    const weeks = new Set<string>();
    const months = new Set<string>();
    const years = new Set<string>();
    for (const s of fullData) {
      const d = s.parsedDate;
      if (!d) continue;
      days.add(format(d, 'yyyy-MM-dd'));
      weeks.add(format(d, 'yyyy-ww'));
      months.add(format(d, 'yyyy-MM'));
      years.add(format(d, 'yyyy'));
    }
    return { days: days.size, weeks: weeks.size, months: months.size, years: years.size };
  }, [fullData]);

  // Auto-adjust periods/modes based on selected range span
  useEffect(() => {
    if (spanDays === 0) return;
    // Rule of thumb:
    // - If < 30 days or a single week/month selected -> show daily where it makes sense
    // - If a few weeks -> weekly; if a few months -> monthly; if multiple years -> yearly
    if (granularity.years >= 2) {
      // Multi-year
      const next = { ...chartModes, prTrend: 'monthly', intensityEvo: 'monthly', volumeVsDuration: 'monthly' as const };
      setChartModes(next); saveChartModes(next);
      return;
    }
    if (granularity.months >= 2) {
      // Multi-month
      const next = { ...chartModes, prTrend: 'monthly', intensityEvo: 'monthly', volumeVsDuration: 'monthly' as const };
      setChartModes(next); saveChartModes(next);
      return;
    }
    if (granularity.weeks >= 2) {
      // Multi-week
      const next = { ...chartModes, prTrend: 'daily', intensityEvo: 'daily', volumeVsDuration: 'daily' as const };
      setChartModes(next); saveChartModes(next);
      return;
    }
    if (spanDays < 30) {
      if (chartModes.prTrend !== 'daily' || chartModes.intensityEvo !== 'daily' || chartModes.volumeVsDuration !== 'daily') {
        const next = { ...chartModes, prTrend: 'daily', intensityEvo: 'daily', volumeVsDuration: 'daily' as const };
        setChartModes(next); saveChartModes(next);
      }
    } else if (spanDays <= 60) {
      if (chartModes.prTrend !== 'daily' || chartModes.intensityEvo !== 'daily' || chartModes.volumeVsDuration !== 'daily') {
        const next = { ...chartModes, prTrend: 'daily', intensityEvo: 'daily', volumeVsDuration: 'daily' as const };
        setChartModes(next); saveChartModes(next);
      }
    } else if (spanDays <= 400) {
      if (chartModes.prTrend !== 'monthly' || chartModes.intensityEvo !== 'monthly' || chartModes.volumeVsDuration !== 'monthly') {
        const next = { ...chartModes, prTrend: 'monthly', intensityEvo: 'monthly', volumeVsDuration: 'monthly' as const };
        setChartModes(next); saveChartModes(next);
      }
    } else {
      if (chartModes.prTrend !== 'monthly' || chartModes.intensityEvo !== 'monthly' || chartModes.volumeVsDuration !== 'monthly') {
        const next = { ...chartModes, prTrend: 'monthly', intensityEvo: 'monthly', volumeVsDuration: 'monthly' as const };
        setChartModes(next); saveChartModes(next);
      }
    }
  }, [spanDays, granularity]);

  const toggleChart = (key: ChartKey) => {
    setVisibleCharts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- MEMOIZED DATA LOGIC ---

  const totalPrs = useMemo(() => exerciseStats.reduce((acc, curr) => acc + curr.prCount, 0), [exerciseStats]);

  const totalSets = useMemo(() => fullData.length, [fullData]);
  const totalWorkouts = useMemo(() => {
    const sessions = new Set<string>();
    for (const s of fullData) {
      if (!s.start_time) continue;
      sessions.add(s.start_time);
    }
    return sessions.size;
  }, [fullData]);

  // Dashboard Insights (deltas, streaks, PR info, sparklines) - cached across tab switches
  const dashboardInsights = useMemo(() => {
    return computationCache.getOrCompute(
      'dashboardInsights',
      fullData,
      () => calculateDashboardInsights(fullData, dailyData),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, dailyData]);

  // Plateau Detection - cached across tab switches
  const plateauAnalysis = useMemo(() => {
    return computationCache.getOrCompute(
      'plateauAnalysis',
      fullData,
      () => detectPlateaus(fullData, exerciseStats),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, exerciseStats]);
  
  // 1. PRs Over Time Data
  const prsData = useMemo(() => {
    const mode = chartModes.prTrend === 'all' ? 'daily' : chartModes.prTrend;
    return getPrsOverTime(fullData, mode as any);
  }, [fullData, chartModes.prTrend]);

  // 2. Intensity Evolution Data
  const intensityData = useMemo(() => {
    const mode = chartModes.intensityEvo === 'all' ? 'daily' : chartModes.intensityEvo;
    const result = getIntensityEvolution(fullData, mode as any);
    return result;
  }, [fullData, chartModes.intensityEvo]);

  // 3. Volume Density Data (volume done per set)
  const volumeDurationData = useMemo(() => {
    const mode = chartModes.volumeVsDuration;

    if (mode === 'all') {
      return dailyData.map(d => ({
        ...d,
        dateFormatted: format(new Date(d.timestamp), 'MMM d'),
        tooltipLabel: format(new Date(d.timestamp), 'MMM d, yyyy'),
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
        const avgVol = Math.round(w.volSum / w.count);
        const avgSets = Math.round(w.setSum / w.count);
        return {
          dateFormatted: `Wk of ${format(new Date(w.timestamp), 'MMM d')}`,
          tooltipLabel: `Week of ${format(new Date(w.timestamp), 'MMM d, yyyy')}`,
          totalVolume: convertVolume(avgVol, weightUnit),
          sets: avgSets,
          volumePerSet: avgSets > 0 ? convertVolume(Math.round(avgVol / avgSets), weightUnit) : 0
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
        const avgVol = Math.round(m.volSum / m.count);
        const avgSets = Math.round(m.setSum / m.count);
        return {
          dateFormatted: format(new Date(m.timestamp), 'MMM yyyy'),
          tooltipLabel: format(new Date(m.timestamp), 'MMMM yyyy'),
          totalVolume: convertVolume(avgVol, weightUnit),
          sets: avgSets,
          volumePerSet: avgSets > 0 ? convertVolume(Math.round(avgVol / avgSets), weightUnit) : 0
        };
      });
    }
  }, [dailyData, chartModes.volumeVsDuration, weightUnit]);

  // Static Data
  const weekShapeData = useMemo(() => getDayOfWeekShape(dailyData), [dailyData]);
  const topExercisesData = useMemo(() => getTopExercisesRadial(exerciseStats).slice(0, topExerciseLimit), [exerciseStats, topExerciseLimit]);
  
  // Data for horizontal bars (simple) with time filters: All, Monthly (30d), Weekly (7d)
  const topExercisesBarData = useMemo(() => {
    const now = new Date();
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
    return arr.slice(0, topExerciseLimit);
  }, [fullData, topExerciseMode, topExerciseLimit]);

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
      () => getMuscleVolumeTimeSeries(fullData, assetsMap, musclePeriod),
      { ttl: 10 * 60 * 1000 }
    );
  }, [fullData, assetsMap, musclePeriod]);

  const muscleSeriesMuscles = useMemo(() => {
    if (!assetsMap) return { data: [], keys: [] as string[] } as { data: any[]; keys: string[] };
    return computationCache.getOrCompute(
      `muscleSeriesMuscles:${musclePeriod}`,
      fullData,
      () => getMuscleVolumeTimeSeriesDetailed(fullData, assetsMap, musclePeriod),
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

  const compositionQuickData = useMemo(() => {
    if (!assetsMap) return [] as { subject: string; value: number }[];
    const now = new Date();
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
  }, [assetsMap, fullData, muscleCompQuick, compositionGrouping]);

  // Heat map muscle volumes - maps SVG muscle IDs to weekly sets values (cached)
  const heatmapMuscleVolumes = useMemo(() => {
    if (!assetsMap) return { volumes: new Map<string, number>(), maxVolume: 1, totalSets: 0 };
    const cacheKey = `heatmapMuscleVolumes:${muscleCompQuick}:${compositionGrouping}`;
    return computationCache.getOrCompute(cacheKey, fullData, () => {
    const now = new Date();
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
  }, [assetsMap, fullData, muscleCompQuick, compositionGrouping]);

  // Compute hovered muscle IDs for group highlighting in heatmap
  const heatmapHoveredMuscleIds = useMemo(() => {
    if (!heatmapHoveredMuscle) return undefined;
    if (compositionGrouping !== 'groups') return undefined;
    return getGroupHighlightIds(heatmapHoveredMuscle);
  }, [heatmapHoveredMuscle, compositionGrouping]);

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
    const today = new Date();
    const minDate = isFinite(minTs) ? new Date(minTs) : null;
    const maxInData = maxTs > 0 ? new Date(maxTs) : null;
    const maxDate = maxInData ? (maxInData > today ? today : maxInData) : today;
    return { minDate, maxDate, availableDatesSet: set };
  }, [fullData]);


  // Use shared constants for Recharts styles
  const TooltipStyle = CHART_TOOLTIP_STYLE;
  const PIE_COLORS = CHART_COLORS;

  return (
    <>
      <style>{ANIMATION_KEYFRAMES}</style>
      <div className={`space-y-6 pb-20 transition-opacity duration-700 ease-out ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      
        {/* HEADER & CONTROLS */}
        <div className="bg-black/70 p-3 sm:p-4 rounded-xl border border-slate-700/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 justify-start">
            <div className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-slate-700/50 rounded-lg">
              <Clock className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <div className="text-white font-bold leading-4">{totalWorkouts}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Workouts</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-black/50 border border-slate-700/50 rounded-lg">
              <Dumbbell className="w-4 h-4 text-slate-400" />
              <div className="text-xs">
                <div className="text-white font-bold leading-4">{totalSets}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Sets</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full sm:w-auto flex justify-center">
              {filtersSlot}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="flex items-center gap-2 px-3 py-2 bg-black/70 hover:bg-black/60 rounded-lg text-xs sm:text-sm font-medium border border-slate-700/50 text-slate-200 transition-colors w-full sm:w-auto justify-center sm:justify-start"
              >
                <Eye className="w-4 h-4" /> Configure View <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-black/90 border border-slate-700/50 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Visible Charts</p>
                  {Object.entries(CHART_LABELS).map(([key, label]) => (
                    <button 
                      key={key} 
                      onClick={() => toggleChart(key as ChartKey)} 
                      className="w-full flex justify-between px-3 py-2 text-xs sm:text-sm text-slate-300 hover:bg-black/60 rounded-lg transition-colors"
                    >
                      <span>{label}</span>
                      <div className={`w-3 h-3 rounded-full border ${visibleCharts[key as ChartKey] ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-600'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* INSIGHTS PANEL - KPIs with Deltas & Sparklines */}
      <InsightsPanel 
        insights={dashboardInsights}
        totalWorkouts={totalWorkouts}
        totalSets={totalSets}
        totalPRs={totalPrs}
      />

      {/* RECENT PRs TIMELINE */}
      <RecentPRsPanel prInsights={dashboardInsights.prInsights} weightUnit={weightUnit} />

      {/* PLATEAU ALERTS */}
      {plateauAnalysis.plateauedExercises.length > 0 && (
        <div className="bg-black/70 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-amber-400">⚠️ Potential Plateaus Detected</span>
           
          </div>
          <div className="overflow-x-auto -mx-2 px-2 pb-2">
            <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
              {plateauAnalysis.plateauedExercises.slice(0, 3).map((p) => (
                <div key={p.exerciseName} className="min-w-[280px] flex-shrink-0">
                  <PlateauAlert 
                    exerciseName={p.exerciseName}
                    weeksStuck={p.weeksAtSameWeight}
                    suggestion={p.suggestion}
                    asset={assetsMap?.get(p.exerciseName) || assetsLowerMap?.get(p.exerciseName.toLowerCase())}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. HEATMAP (Full Width) */}
      {visibleCharts.heatmap && <Heatmap dailyData={dailyData} totalPrs={totalPrs} onDayClick={onDayClick} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* 2. PR TRENDS (Area/Bar) */}
        {visibleCharts.prTrend && (
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
                  <Tooltip contentStyle={TooltipStyle} cursor={{stroke: 'rgba(255,255,255,0.1)'}} />
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
                    <Tooltip contentStyle={TooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.35)' }} />
                    <Bar dataKey="count" name="PRs Set" fill="#eab308" radius={[8, 8, 0, 0]} animationDuration={1500} />
                  </BarChart>
                  )}
                </div>
              </ResponsiveContainer>
            </div>
            <ChartDescription isMounted={isMounted}>
              <p>
                <span className="font-semibold text-slate-300">Track your strength milestones.</span> This chart reveals when you're hitting new personal records—those breakthrough moments that define your progress.
              </p>
              <p>
                Higher values indicate periods of rapid strength gain (beginner gains, peaking blocks), while lower values suggest maintenance or deload phases.
              </p>
              <p className="text-slate-500 italic">
                💡 Switch between <span className="text-blue-400">Area</span> and <span className="text-blue-400">Bar</span> views to see smooth trends or compare discrete periods.
              </p>
            </ChartDescription>
          </div>
        )}

        {/* 3. WEEKLY SETS (Radar/Heatmap) */}
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <ChartHeader 
              title="Weekly sets"
              icon={Dumbbell}
              color="text-cyan-500"
              isMounted={isMounted}
            />
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* View Toggle: Radar / Heatmap */}
              <div className="bg-black/70 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
                <button onClick={() => setWeeklySetsView('radar')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${weeklySetsView==='radar'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Radar</button>
                <button onClick={() => setWeeklySetsView('heatmap')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${weeklySetsView==='heatmap'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Heatmap</button>
              </div>
              {/* Grouping Toggle - available for both views */}
              <div className="bg-black/70 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
                <button onClick={() => setCompositionGrouping('groups')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${compositionGrouping==='groups'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Groups</button>
                <button onClick={() => setCompositionGrouping('muscles')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${compositionGrouping==='muscles'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Muscles</button>
              </div>
              {/* Quick Filters */}
              <div className="bg-black/70 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
                <button onClick={() => setMuscleCompQuick('all')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='all'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>All</button>
                <button onClick={() => setMuscleCompQuick('7d')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='7d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Last Week</button>
                <button onClick={() => setMuscleCompQuick('30d')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='30d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Last Month</button>
                <button onClick={() => setMuscleCompQuick('365d')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='365d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Last Year</button>
              </div>
            </div>
          </div>
          <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
            {weeklySetsView === 'radar' ? (
              compositionQuickData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  Not enough data to render Muscle Composition.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={compositionQuickData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar name="Weekly Sets" dataKey="value" stroke="#06b6d4" strokeWidth={3} fill="#06b6d4" fillOpacity={0.35} animationDuration={1500} />
                    <Tooltip contentStyle={TooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                {heatmapMuscleVolumes.volumes.size === 0 ? (
                  <div className="text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg p-8">
                    Not enough data to render Heat Map.
                  </div>
                ) : (
                  <>
                    <div className="transform scale-[0.55] origin-center -mt-4">
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
                  </>
                )}
              </div>
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
            <p>
              <span className="font-semibold text-slate-300">Quick slice.</span> Values represent weekly sets. {weeklySetsView === 'heatmap' ? 'Body heat map shows muscle activation intensity.' : ''} Group by {compositionGrouping === 'groups' ? <span className="text-cyan-400">muscle group</span> : <span className="text-cyan-400">individual muscle</span>}. View for All time, Last Week, Month, or Year.
            </p>
          </ChartDescription>
        </div>
      </div>

      {/* 4. INTENSITY EVOLUTION (Area/Stacked Bar) */}
      {visibleCharts.intensityEvo && (
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
             <p>
               <span className="font-semibold text-slate-300">Discover your training style.</span> This chart breaks down your workouts by rep ranges, revealing what you're actually training for.
             </p>
             <p>
               <span className="text-blue-400">Strength</span> (1-5 reps) builds raw power, <span className="text-emerald-400">Hypertrophy</span> (6-12 reps) builds muscle size, and <span className="text-purple-400">Endurance</span> (13+ reps) builds stamina. The balance between these tells your training story.
             </p>
             <p className="text-slate-500 italic">
               💡 Switch between <span className="text-orange-400">Area</span> and <span className="text-orange-400">Stacked Bar</span> views to see layered trends or detailed composition breakdowns.
             </p>
          </ChartDescription>
        </div>
      )}

      {/* MUSCLE ANALYSIS (Unified) */}
      {visibleCharts.muscleVolume && (
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <ChartHeader 
            title="Muscle Analysis" 
            icon={Dumbbell} 
            color="text-emerald-500"
            isMounted={isMounted}
          />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="bg-black/70 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
              <button onClick={() => setMuscleGrouping('groups')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleGrouping==='groups'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Groups</button>
              <button onClick={() => setMuscleGrouping('muscles')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleGrouping==='muscles'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Muscles</button>
            </div>
            <div className="bg-black/70 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
              <button onClick={() => setMusclePeriod('weekly')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${musclePeriod==='weekly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Weekly</button>
              <button onClick={() => setMusclePeriod('monthly')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${musclePeriod==='monthly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Monthly</button>
              <button onClick={() => setMusclePeriod('yearly')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${musclePeriod==='yearly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Yearly</button>
            </div>
            <div className="bg-black/70 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
              <button onClick={() => setMuscleTrendView('stackedBar')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleTrendView==='stackedBar'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Stacked</button>
              <button onClick={() => setMuscleTrendView('area')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleTrendView==='area'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Area</button>
            </div>

          </div>
          <div className={`flex-1 w-full min-h-[250px] sm:min-h-[320px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
            {trendData.length === 0 || trendKeys.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                Not enough data to render Muscle Analysis trend.
              </div>
            ) : (
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
            )}
          </div>
          <ChartDescription isMounted={isMounted}>
            <p>
              <span className="font-semibold text-slate-300">Weighted by muscle involvement.</span> <span className="text-emerald-400 font-semibold">Primary</span> = 1 set, <span className="text-cyan-400 font-semibold">Secondary</span> = 0.5 set. Cardio is ignored; Full Body adds 1 set to every group.
            </p>
            <p className="text-slate-500 italic">Use <span className="text-blue-400">Groups</span>/<span className="text-blue-400">Muscles</span>, choose <span className="text-purple-400">Weekly/Monthly/Yearly</span>, and switch <span className="text-emerald-400">Stacked</span>/<span className="text-emerald-400">Area</span>.</p>
          </ChartDescription>
        </div>
      )}

      {/* 5. Weekly Rhythm + Muscle Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Weekly Rhythm: Radar/Bar */}
        {visibleCharts.weekShape && (
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
            </div>
            <ChartDescription isMounted={isMounted}>
              <p>
                <span className="font-semibold text-slate-300">Find your rhythm.</span> This chart reveals your workout patterns—when you train and how consistently.
              </p>
              <p>
                A balanced pattern shows consistent daily habits, while a skewed shape reveals your preferred "gym days." Are you a weekend warrior or a weekday warrior?
              </p>
              <p className="text-slate-500 italic">
                💡 Switch between <span className="text-pink-400">Radar</span> and <span className="text-pink-400">Bar</span> views to see a circular pattern or traditional comparison.
              </p>
            </ChartDescription>
          </div>
        )}

        {/* Volume Density (Area/Bar) */}
        {visibleCharts.volumeVsDuration && (
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
            </div>
            <ChartDescription isMounted={isMounted}>
              <p>
                <span className="font-semibold text-slate-300">Measure your training intensity.</span> This metric shows how much volume you're moving per set—a key indicator of workout difficulty.
              </p>
              <p>
                Higher values mean you're pushing heavier weights or doing more reps per set. Watch the trends to see how your work capacity evolves over time.
              </p>
              <p className="text-slate-500 italic">
                💡 Switch between <span className="text-purple-400">Area</span> and <span className="text-purple-400">Bar</span> views to see smooth trends or compare discrete periods.
              </p>
            </ChartDescription>
          </div>
        )}
      </div>

      {/* 6. Top Exercises (Full Width, Bars/Area Views) */}
      {visibleCharts.topExercises && (
        <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[360px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Most Frequent Exercises
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* All / Monthly / Weekly Toggle */}
              <div className="bg-black/70 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
                <button 
                  onClick={() => setTopExerciseMode('all')} 
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                    topExerciseMode === 'all' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => setTopExerciseMode('monthly')} 
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                    topExerciseMode === 'monthly' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setTopExerciseMode('weekly')} 
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                    topExerciseMode === 'weekly' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Weekly
                </button>
              </div>
              {/* View: Bars / Area */}
              <div className="bg-black/70 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
                <button 
                  onClick={() => setTopExercisesView('barh')} 
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                    topExercisesView === 'barh' 
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Bars
                </button>
                <button 
                  onClick={() => setTopExercisesView('area')} 
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                    topExercisesView === 'area' 
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Area
                </button>
              </div>
              {/* Exercise Count Dropdown */}
              <div className="flex items-center gap-2 bg-black/70 p-1.5 rounded-lg border border-slate-700/50">
                <span className="text-xs text-slate-400 font-medium">Show:</span>
                <select 
                  value={topExerciseLimit} 
                  onChange={(e) => setTopExerciseLimit(parseInt(e.target.value))}
                  className="bg-black/70 border border-slate-600/50 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {[3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
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
                            const gap = Math.max(6, Math.min(14, Math.floor(available * 0.06)));
                            const rowH = Math.max(40, Math.floor((available - gap * (n - 1)) / n));
                            const avatar = Math.min(rowH, 64);

                            return (
                              <div
                                className="relative"
                                style={{
                                  display: 'grid',
                                  rowGap: `${gap}px`,
                                  height: `${available}px`,
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
                                    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.15))',
                                    animation: 'textShimmer 1.05s linear infinite',
                                  }
                                : undefined;

                              // Filled-only bar width. Keep a small minimum so the label/avatar can fit.
                              const barWidthPct = Math.max(8, pct);

                              const countReservePx = 88;

                              return (
                                <div key={exercise.name} className="w-full min-w-0">
                                  {/* Mobile layout: stack count below so it never pushes off-screen */}
                                  <div className="flex flex-col gap-1 sm:hidden min-w-0">
                                    <div
                                      className="relative rounded-full overflow-hidden min-w-0"
                                      style={{
                                        height: `${rowH}px`,
                                        width: `${barWidthPct}%`,
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
                                      style={{ opacity: 0.95 }}
                                    >
                                      <div
                                        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/90 to-transparent"
                                        style={{
                                          animation: 'medalShimmer 1.15s ease-in-out infinite',
                                        }}
                                      />
                                    </div>
                                  )}

                                    {/* Name inside the filled portion */}
                                    <div
                                      className="relative z-10 h-full flex items-center pl-4"
                                      style={{ paddingRight: `${avatar + 10}px` }}
                                    >
                                      <div className="text-white font-semibold text-sm sm:text-base truncate">
                                        {medalEmoji ? `${medalEmoji} ${exercise.name}` : exercise.name}
                                      </div>
                                    </div>

                                    {/* Avatar at the end of the filled bar */}
                                    <div
                                      className={`absolute top-0 bottom-0 right-0 rounded-full overflow-hidden bg-white ${medalRing}`}
                                      style={{ width: `${avatar}px` }}
                                    >
                                      {thumbnail ? (
                                        <img
                                          src={thumbnail}
                                          alt={exercise.name}
                                          className="w-full h-full object-cover rounded-full"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-white/95 flex items-center justify-center">
                                          <Dumbbell className="w-5 h-5 text-slate-500" />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                    <div className={`self-end pr-1 font-extrabold text-xl tracking-tight ${countClass}`}>
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
                                        style={{ opacity: 0.95 }}
                                      >
                                        <div
                                          className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/90 to-transparent"
                                          style={{
                                            animation: 'medalShimmer 1.15s ease-in-out infinite',
                                          }}
                                        />
                                      </div>
                                    )}

                                      {/* Name inside the filled portion */}
                                      <div
                                        className="relative z-10 h-full flex items-center pl-4"
                                        style={{ paddingRight: `${avatar + 10}px` }}
                                      >
                                        <div className="text-white font-semibold text-sm sm:text-base truncate">
                                          {medalEmoji ? `${medalEmoji} ${exercise.name}` : exercise.name}
                                        </div>
                                      </div>

                                      {/* Avatar at the end of the filled bar */}
                                      <div
                                        className={`absolute top-0 bottom-0 right-0 rounded-full overflow-hidden bg-white ${medalRing}`}
                                        style={{ width: `${avatar}px` }}
                                      >
                                        {thumbnail ? (
                                          <img
                                            src={thumbnail}
                                            alt={exercise.name}
                                            className="w-full h-full object-cover rounded-full"
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
                                </div>
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
              )
            )}
          </div>

          <ChartDescription isMounted={isMounted}>
            <p>
              <span className="font-semibold text-slate-300">Your most-used movements.</span> The horizontal bars show total set counts for each exercise.
            </p>
          </ChartDescription>
        </div>
      )}

      <SupportLinks />
      </div>
    </>
  );
};