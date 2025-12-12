import React, { useMemo, useState, useEffect } from 'react';
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
import { MUSCLE_COLORS } from '../utils/categories';
import { saveChartModes, getChartModes } from '../utils/localStorage';
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
import { format, startOfMonth, subDays, differenceInCalendarDays } from 'date-fns';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
 

interface DashboardProps {
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  fullData: WorkoutSet[]; // The raw set data
  onDayClick?: (date: Date) => void; 
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
const ChartDescription = ({ children, isMounted = true }: { children: React.ReactNode, isMounted?: boolean }) => (
  <div className={`mt-4 pt-4 border-t border-slate-800 flex items-start gap-3 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
    <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0 transition-opacity duration-200 hover:opacity-80" />
    <div className="text-xs text-slate-400 leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

// 3. Reusable Chart Header with Toggles
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
}: { 
  title: string, 
  icon: any, 
  color: string, 
  mode?: 'daily'|'monthly', 
  onToggle?: (m: 'daily'|'monthly') => void,
  viewType?: string,
  onViewToggle?: (v: string) => void,
  viewOptions?: { value: string, label: string }[],
  isMounted?: boolean
}) => (
  <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
    <h3 className="text-lg font-semibold text-white flex items-center gap-2 transition-opacity duration-200 hover:opacity-90">
      <Icon className={`w-5 h-5 ${color} transition-opacity duration-200 hover:opacity-80`} />
      {title}
    </h3>
    <div className="flex items-center gap-2 flex-wrap">
      {/* View Type Toggle (Line/Area, Area/Line, Radar/Bar) */}
      {viewType && onViewToggle && viewOptions && (
        <div className="bg-slate-950 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
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

      
      {/* Daily/Monthly Toggle */}
    {mode && onToggle && (
      <div className="bg-slate-950 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
        <button 
          onClick={() => onToggle('monthly')} 
          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 transform hover:scale-105 active:scale-95 ${
            mode === 'monthly' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          Avg
        </button>
        <button 
          onClick={() => onToggle('daily')} 
          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 transform hover:scale-105 active:scale-95 ${
            mode === 'daily' 
              ? 'bg-blue-600 text-white shadow-lg shadow-lg shadow-blue-600/30' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
        >
          Day
        </button>
      </div>
    )}
    </div>
  </div>
);

// 4. Heatmap Component
const Heatmap = ({ dailyData, totalPrs, onDayClick }: { dailyData: DailySummary[], totalPrs: number, onDayClick?: (date: Date) => void }) => {
  const heatmapData = useMemo(() => getHeatmapData(dailyData), [dailyData]);
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
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 sm:gap-6 overflow-hidden">
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
};


// --- MAIN DASHBOARD ---

export const Dashboard: React.FC<DashboardProps> = ({ dailyData, exerciseStats, fullData, onDayClick }) => {
  // Default chart modes: all 'daily' except volumeVsDuration which is 'monthly' (average)
  const DEFAULT_CHART_MODES: Record<string, 'monthly'|'daily'> = {
    volumeVsDuration: 'monthly',
    intensityEvo: 'monthly',
    prTrend: 'monthly'
  };

  // State to control animation retriggering on mount
  const [isMounted, setIsMounted] = useState(false);

  // FIXED: Initialize state lazily from local storage to prevent double-render
  const [chartModes, setChartModes] = useState<Record<string, 'monthly'|'daily'>>(() => {
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
  const toggleChartMode = (chart: string, mode: 'daily'|'monthly') => {
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
  const [topExerciseMode, setTopExerciseMode] = useState<'avg' | 'daily' | 'monthly'>('monthly');
  const [topExercisesView, setTopExercisesView] = useState<'barh' | 'area'>('barh');
  
  // Chart view type states (defaults keep existing chart types)
  const [prTrendView, setPrTrendView] = useState<'area' | 'bar'>('area');
  const [volumeView, setVolumeView] = useState<'area' | 'bar'>('area');
  const [intensityView, setIntensityView] = useState<'area' | 'stackedBar'>('area');
  const [weekShapeView, setWeekShapeView] = useState<'radar' | 'bar'>('radar');
  
  const [muscleGrouping, setMuscleGrouping] = useState<'groups' | 'muscles'>('groups');
  const [musclePeriod, setMusclePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [muscleTrendView, setMuscleTrendView] = useState<'area' | 'stackedBar'>('stackedBar');
  const [muscleCompQuick, setMuscleCompQuick] = useState<'all'|'7d'|'30d'|'365d'>('all');
  const [compositionGrouping, setCompositionGrouping] = useState<'groups' | 'muscles'>('groups');
  
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);

  useEffect(() => {
    let mounted = true;
    getExerciseAssets().then(m => { if (mounted) setAssetsMap(m); }).catch(() => setAssetsMap(new Map()));
    return () => { mounted = false; };
  }, []);

  // Determine span of currently filtered data
  const spanDays = useMemo(() => {
    const dates: number[] = [];
    // Prefer set-level dates if present (likely filtered upstream)
    for (const s of (fullData as any[])) {
      if (s?.parsedDate instanceof Date) dates.push((s.parsedDate as Date).getTime());
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
    for (const s of (fullData as any[])) {
      const d: Date | undefined = s?.parsedDate;
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
      if (musclePeriod !== 'yearly') setMusclePeriod('yearly');
      if (topExerciseMode !== 'monthly') setTopExerciseMode('monthly');
      return;
    }
    if (granularity.months >= 2) {
      // Multi-month
      const next = { ...chartModes, prTrend: 'monthly', intensityEvo: 'monthly', volumeVsDuration: 'monthly' as const };
      setChartModes(next); saveChartModes(next);
      if (musclePeriod !== 'monthly') setMusclePeriod('monthly');
      if (topExerciseMode !== 'monthly') setTopExerciseMode('monthly');
      return;
    }
    if (granularity.weeks >= 2) {
      // Multi-week
      const next = { ...chartModes, prTrend: 'daily', intensityEvo: 'daily', volumeVsDuration: 'daily' as const };
      setChartModes(next); saveChartModes(next);
      if (musclePeriod !== 'weekly') setMusclePeriod('weekly');
      if (topExerciseMode !== 'monthly') setTopExerciseMode('monthly');
      return;
    }
    if (spanDays < 30) {
      if (chartModes.prTrend !== 'daily' || chartModes.intensityEvo !== 'daily' || chartModes.volumeVsDuration !== 'daily') {
        const next = { ...chartModes, prTrend: 'daily', intensityEvo: 'daily', volumeVsDuration: 'daily' as const };
        setChartModes(next); saveChartModes(next);
      }
      if (musclePeriod !== 'daily') setMusclePeriod('daily');
      if (topExerciseMode !== 'daily') setTopExerciseMode('daily');
    } else if (spanDays <= 60) {
      if (chartModes.prTrend !== 'daily' || chartModes.intensityEvo !== 'daily' || chartModes.volumeVsDuration !== 'daily') {
        const next = { ...chartModes, prTrend: 'daily', intensityEvo: 'daily', volumeVsDuration: 'daily' as const };
        setChartModes(next); saveChartModes(next);
      }
      if (musclePeriod !== 'weekly') setMusclePeriod('weekly');
      if (topExerciseMode !== 'monthly') setTopExerciseMode('monthly');
    } else if (spanDays <= 400) {
      if (chartModes.prTrend !== 'monthly' || chartModes.intensityEvo !== 'monthly' || chartModes.volumeVsDuration !== 'monthly') {
        const next = { ...chartModes, prTrend: 'monthly', intensityEvo: 'monthly', volumeVsDuration: 'monthly' as const };
        setChartModes(next); saveChartModes(next);
      }
      if (musclePeriod !== 'monthly') setMusclePeriod('monthly');
      if (topExerciseMode !== 'monthly') setTopExerciseMode('monthly');
    } else {
      if (chartModes.prTrend !== 'monthly' || chartModes.intensityEvo !== 'monthly' || chartModes.volumeVsDuration !== 'monthly') {
        const next = { ...chartModes, prTrend: 'monthly', intensityEvo: 'monthly', volumeVsDuration: 'monthly' as const };
        setChartModes(next); saveChartModes(next);
      }
      if (musclePeriod !== 'yearly') setMusclePeriod('yearly');
      if (topExerciseMode !== 'monthly') setTopExerciseMode('monthly');
    }
  }, [spanDays, granularity]);

  const toggleChart = (key: ChartKey) => {
    setVisibleCharts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- MEMOIZED DATA LOGIC ---

  const totalPrs = useMemo(() => exerciseStats.reduce((acc, curr) => acc + curr.prCount, 0), [exerciseStats]);
  
  // 1. PRs Over Time Data
  const prsData = useMemo(() => {
    return getPrsOverTime(fullData, chartModes.prTrend);
  }, [fullData, chartModes.prTrend]);

  // 2. Intensity Evolution Data
  const intensityData = useMemo(() => {
    const result = getIntensityEvolution(fullData, chartModes.intensityEvo);
    return result;
  }, [fullData, chartModes.intensityEvo]);

  // 3. Volume Density Data (volume done per set)
  const volumeDurationData = useMemo(() => {
    const mode = chartModes.volumeVsDuration;
    
    if (mode === 'daily') {
      return dailyData.map(d => ({
        ...d,
        dateFormatted: format(new Date(d.timestamp), 'MMM d'),
        tooltipLabel: format(new Date(d.timestamp), 'MMM d, yyyy'),
        volumePerSet: d.sets > 0 ? Math.round(d.totalVolume / d.sets) : 0
      }));
    } else {
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
          totalVolume: avgVol,
          sets: avgSets,
          volumePerSet: avgSets > 0 ? Math.round(avgVol / avgSets) : 0
        };
      });
    }
  }, [dailyData, chartModes.volumeVsDuration]);

  // Static Data
  const weekShapeData = useMemo(() => getDayOfWeekShape(dailyData), [dailyData]);
  const topExercisesData = useMemo(() => getTopExercisesRadial(exerciseStats).slice(0, topExerciseLimit), [exerciseStats, topExerciseLimit]);
  
  // Data for horizontal bars (simple) with time filters: Avg (all), Monthly (30d), Day (7d)
  const topExercisesBarData = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    if (topExerciseMode === 'monthly') start = subDays(now, 30);
    else if (topExerciseMode === 'daily') start = subDays(now, 7);
    // 'avg' => start stays null (use all)
    const counts = new Map<string, number>();
    for (const s of fullData as any[]) {
      const d: Date | undefined = s.parsedDate;
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
    const mode = topExerciseMode === 'daily' ? 'daily' : 'monthly';
    return getTopExercisesOverTime(fullData, names, mode as any);
  }, [fullData, topExercisesBarData, topExercisesData, topExerciseMode]);

  // Keys for area stacking in Most Frequent Exercises
  const topExerciseNames = useMemo(() => (topExercisesBarData.length > 0 ? topExercisesBarData : topExercisesData).map(e => e.name), [topExercisesBarData, topExercisesData]);

  // 6. Muscle Volume (sets-based) unified data
  const muscleSeriesGroups = useMemo(() => {
    if (!assetsMap) return { data: [], keys: [] as string[] } as { data: any[]; keys: string[] };
    return getMuscleVolumeTimeSeries(fullData, assetsMap, musclePeriod);
  }, [fullData, assetsMap, musclePeriod]);

  const muscleSeriesMuscles = useMemo(() => {
    if (!assetsMap) return { data: [], keys: [] as string[] } as { data: any[]; keys: string[] };
    return getMuscleVolumeTimeSeriesDetailed(fullData, assetsMap, musclePeriod);
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
      // 'All' => earliest available date in data
      for (const s of fullData as any[]) {
        const d: Date | undefined = s.parsedDate;
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
    for (const s of fullData as any[]) {
      const d: Date | undefined = s.parsedDate;
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

  const muscleCalMeta = useMemo(() => {
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = 0;
    const set = new Set<string>();
    fullData.forEach((d: any) => {
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


  // Shared Recharts Styles
  const TooltipStyle = { backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px', borderRadius: '8px' };
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

  return (
    <div className={`space-y-4 sm:space-y-6 pb-20 transition-opacity duration-700 ease-out ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/50 p-3 sm:p-4 rounded-xl border border-slate-800 gap-3 sm:gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <Layout className="w-5 h-5 text-blue-500" />
          Analytics Dashboard
        </h2>
        
        {/* View Toggle Dropdown */}
        <div className="relative w-full sm:w-auto">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs sm:text-sm font-medium border border-slate-700 text-slate-200 transition-colors w-full sm:w-auto justify-center sm:justify-start"
          >
            <Eye className="w-4 h-4" /> Configure View <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Visible Charts</p>
              {Object.entries(CHART_LABELS).map(([key, label]) => (
                <button 
                  key={key} 
                  onClick={() => toggleChart(key as ChartKey)} 
                  className="w-full flex justify-between px-3 py-2 text-xs sm:text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <span>{label}</span>
                  <div className={`w-3 h-3 rounded-full border ${visibleCharts[key as ChartKey] ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-600'}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. HEATMAP (Full Width) */}
      {visibleCharts.heatmap && <Heatmap dailyData={dailyData} totalPrs={totalPrs} onDayClick={onDayClick} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* 2. PR TRENDS (Area/Bar) */}
        {visibleCharts.prTrend && (
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl">
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
                    <Tooltip contentStyle={TooltipStyle} />
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

        {/* 3. VOLUME DENSITY (Area/Bar) */}
        {visibleCharts.volumeVsDuration && (
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl">
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
                  <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}kg`} />
                  <Tooltip 
                    contentStyle={TooltipStyle} 
                    labelFormatter={(l, p) => p[0]?.payload?.tooltipLabel || l} 
                    formatter={(val: number, name) => {
                        if (name === 'Volume per Set (kg)') return [`${val} kg`, name];
                        return [val, name];
                    }}
                  />
                  <Legend />
                    <Area type="monotone" dataKey="volumePerSet" name="Volume per Set (kg)" stroke="#8b5cf6" strokeWidth={3} fill="url(#gDensityArea)" dot={{r:3, fill:'#8b5cf6'}} activeDot={{r:5, strokeWidth: 0}} animationDuration={1500} />
                  </AreaChart>
                ) : (
                  <BarChart data={volumeDurationData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}kg`} />
                    <Tooltip 
                      contentStyle={TooltipStyle} 
                      labelFormatter={(l, p) => p[0]?.payload?.tooltipLabel || l} 
                      formatter={(val: number, name) => {
                          if (name === 'Volume per Set (kg)') return [`${val} kg`, name];
                          return [val, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="volumePerSet" name="Volume per Set (kg)" fill="#8b5cf6" radius={[8, 8, 0, 0]} animationDuration={1500} />
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

      {/* 4. INTENSITY EVOLUTION (Area/Stacked Bar) */}
      {visibleCharts.intensityEvo && (
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl">
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
                    <linearGradient id="gStrength" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gHyper" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gEndure" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
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
                    <Tooltip contentStyle={TooltipStyle} />
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
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <ChartHeader 
            title="Muscle Analysis" 
            icon={Dumbbell} 
            color="text-emerald-500"
            isMounted={isMounted}
          />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
              <button onClick={() => setMuscleGrouping('groups')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleGrouping==='groups'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Groups</button>
              <button onClick={() => setMuscleGrouping('muscles')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleGrouping==='muscles'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Muscles</button>
            </div>
            <div className="bg-slate-950 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
              <button onClick={() => setMusclePeriod('weekly')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${musclePeriod==='weekly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Weekly</button>
              <button onClick={() => setMusclePeriod('monthly')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${musclePeriod==='monthly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Monthly</button>
              <button onClick={() => setMusclePeriod('yearly')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${musclePeriod==='yearly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Yearly</button>
            </div>
            <div className="bg-slate-950 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
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
                      <Tooltip contentStyle={TooltipStyle} />
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
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl">
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
                    <Tooltip contentStyle={TooltipStyle} />
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

        {/* Muscle Composition (Radar) moved here */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <ChartHeader 
              title="Weekly sets"
              icon={Dumbbell}
              color="text-cyan-500"
              isMounted={isMounted}
            />
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Grouping Toggle */}
              <div className="bg-slate-950 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
                <button onClick={() => setCompositionGrouping('groups')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${compositionGrouping==='groups'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Groups</button>
                <button onClick={() => setCompositionGrouping('muscles')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${compositionGrouping==='muscles'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Muscles</button>
              </div>
              {/* Quick Filters */}
              <div className="bg-slate-950 p-1 rounded-lg inline-flex gap-1 border border-slate-800">
                <button onClick={() => setMuscleCompQuick('all')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='all'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>All</button>
                <button onClick={() => setMuscleCompQuick('7d')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='7d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Last Week</button>
                <button onClick={() => setMuscleCompQuick('30d')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='30d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Last Month</button>
                <button onClick={() => setMuscleCompQuick('365d')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${muscleCompQuick==='365d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Last Year</button>
              </div>
            </div>
          </div>
          <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
            {compositionQuickData.length === 0 ? (
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
            )}
          </div>
          <ChartDescription isMounted={isMounted}>
            <p>
              <span className="font-semibold text-slate-300">Quick slice.</span> Values represent weekly sets. View composition for All time, Last Week, Month, or Year. Group by {compositionGrouping === 'groups' ? 'muscle group' : 'muscle'}.
            </p>
          </ChartDescription>
        </div>
      </div>

      {/* 6. Top Exercises (Full Width, Bars/Area Views) */}
      {visibleCharts.topExercises && (
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[360px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Most Frequent Exercises
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Avg / Monthly / Day Toggle */}
              <div className="bg-slate-950 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
                <button 
                  onClick={() => setTopExerciseMode('avg')} 
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                    topExerciseMode === 'avg' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Avg
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
                  onClick={() => setTopExerciseMode('daily')} 
                  className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                    topExerciseMode === 'daily' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Day
                </button>
              </div>
              {/* View: Bars / Area */}
              <div className="bg-slate-950 p-1 rounded-lg flex gap-1 border border-slate-800 transition-all duration-200 hover:border-slate-700">
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
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Show:</span>
                <select 
                  value={topExerciseLimit} 
                  onChange={(e) => setTopExerciseLimit(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart layout="vertical" data={topExercisesBarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                    <Tooltip contentStyle={TooltipStyle} formatter={(v: number, n: string, p: any) => [`${v} sets`, p.payload?.name]} />
                    <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                      {topExercisesBarData.map((entry, index) => (
                        <Cell key={`cell-barh-${entry.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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

    </div>
  );
};