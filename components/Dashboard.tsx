import React, { useMemo, useState } from 'react';
import { DailySummary, ExerciseStats } from '../types';
import { 
  getHeatmapData, 
  getIntensityEvolution, 
  getDayOfWeekShape, 
  getTopExercisesRadial,
  getPrsOverTime 
} from '../utils/analytics';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ComposedChart, AreaChart, Area, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Calendar, Zap, Layers, Eye, Layout, ChevronDown, 
  Clock, Dumbbell, Trophy, Timer, Info
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

interface DashboardProps {
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  fullData: any[]; // The raw set data
  onDayClick?: (date: Date) => void; 
}

type ChartKey = 'heatmap' | 'prTrend' | 'volumeVsDuration' | 'intensityEvo' | 'weekShape' | 'topExercises';

const CHART_LABELS: Record<ChartKey, string> = {
  heatmap: 'Consistency Heatmap',
  prTrend: 'PRs Over Time',
  volumeVsDuration: 'Volume vs Duration',
  intensityEvo: 'Training Style Evolution',
  weekShape: 'Weekly Rhythm',
  topExercises: 'Most Frequent Exercises'
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
const ChartDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 pt-4 border-t border-slate-800 flex items-start gap-3">
    <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
    <p className="text-xs text-slate-400 leading-relaxed">
      {children}
    </p>
  </div>
);

// 3. Reusable Chart Header with Toggles
const ChartHeader = ({ title, icon: Icon, color, mode, onToggle }: { title: string, icon: any, color: string, mode?: 'daily'|'monthly', onToggle?: (m: 'daily'|'monthly') => void }) => (
  <div className="flex justify-between items-start mb-6">
    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
      <Icon className={`w-5 h-5 ${color}`} />
      {title}
    </h3>
    {mode && onToggle && (
      <div className="bg-slate-950 p-1 rounded-lg flex gap-1 border border-slate-800">
        <button 
          onClick={() => onToggle('monthly')} 
          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors ${mode === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Avg
        </button>
        <button 
          onClick={() => onToggle('daily')} 
          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors ${mode === 'daily' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Day
        </button>
      </div>
    )}
  </div>
);

// 4. Heatmap Component
const Heatmap = ({ dailyData, totalPrs, onDayClick }: { dailyData: DailySummary[], totalPrs: number, onDayClick?: (date: Date) => void }) => {
  const heatmapData = useMemo(() => getHeatmapData(dailyData), [dailyData]);
  const [tooltip, setTooltip] = useState<any | null>(null);

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
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row gap-6 overflow-hidden">
      <div className="flex-shrink-0 flex flex-col justify-between min-w-[180px] border-r border-slate-800/50 pr-6 mr-2">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center mb-1">
            <Calendar className="w-5 h-5 mr-2 text-blue-500" />
            Consistency
          </h3>
          <p className="text-sm text-slate-500">Last 365 Days</p>
        </div>
        <div className="mt-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Dumbbell className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalPrs}</p>
                <p className="text-xs font-medium text-slate-400 uppercase">PRs Set</p>
              </div>
           </div>
        </div>
      </div>
      <div className="flex-1 w-full overflow-x-auto pb-2 custom-scrollbar">
         <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-max">
            {heatmapData.map((day) => (
              <div 
                key={day.date.toISOString()}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-all duration-300 ${day.count > 0 ? 'cursor-pointer hover:scale-125 hover:z-10 ring-0 hover:ring-2 ring-white/20' : 'cursor-default'}`}
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
  // Chart View State
  const [chartModes, setChartModes] = useState<Record<string, 'monthly'|'daily'>>({
    volumeVsDuration: 'monthly',
    intensityEvo: 'monthly',
    prTrend: 'monthly'
  });

  const [visibleCharts, setVisibleCharts] = useState<Record<ChartKey, boolean>>({
    heatmap: true,
    prTrend: true,
    volumeVsDuration: true,
    intensityEvo: true,
    weekShape: true,
    topExercises: true
  });
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [topExerciseLimit, setTopExerciseLimit] = useState(5);

  const toggleChartMode = (chart: string, mode: 'daily'|'monthly') => {
    setChartModes(prev => ({ ...prev, [chart]: mode }));
  };

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
    console.log('Dashboard intensityData memo - fullData length:', fullData.length, 'intensityData:', result);
    return result;
  }, [fullData, chartModes.intensityEvo]);

  // 3. Volume vs Duration Data (with Auto-aggregation logic)
  const volumeDurationData = useMemo(() => {
    const mode = chartModes.volumeVsDuration;
    
    if (mode === 'daily') {
      return dailyData.map(d => ({
        ...d,
        dateFormatted: format(new Date(d.timestamp), 'MMM d'),
        tooltipLabel: format(new Date(d.timestamp), 'MMM d, yyyy'),
        density: d.durationMinutes > 0 ? Math.round(d.totalVolume / d.durationMinutes) : 0
      }));
    } else {
      // Manual aggregation for monthly view if util doesn't exist
      const monthlyData: Record<string, { volSum: number, durSum: number, count: number, timestamp: number }> = {};
      dailyData.forEach(d => {
        const monthKey = format(new Date(d.timestamp), 'yyyy-MM');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { volSum: 0, durSum: 0, count: 0, timestamp: startOfMonth(new Date(d.timestamp)).getTime() };
        }
        monthlyData[monthKey].volSum += d.totalVolume;
        monthlyData[monthKey].durSum += d.durationMinutes;
        monthlyData[monthKey].count += 1;
      });
      return Object.values(monthlyData).sort((a,b) => a.timestamp - b.timestamp).map(m => {
        const avgVol = Math.round(m.volSum / m.count);
        const avgDur = Math.round(m.durSum / m.count);
        return {
          dateFormatted: format(new Date(m.timestamp), 'MMM yyyy'),
          tooltipLabel: format(new Date(m.timestamp), 'MMMM yyyy'),
          totalVolume: avgVol,
          durationMinutes: avgDur,
          density: avgDur > 0 ? Math.round(avgVol / avgDur) : 0
        };
      });
    }
  }, [dailyData, chartModes.volumeVsDuration]);

  // Static Data
  const weekShapeData = useMemo(() => getDayOfWeekShape(dailyData), [dailyData]);
  const topExercisesData = useMemo(() => getTopExercisesRadial(exerciseStats).slice(0, topExerciseLimit), [exerciseStats, topExerciseLimit]);


  // Shared Recharts Styles
  const TooltipStyle = { backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px', borderRadius: '8px' };
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444'];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layout className="w-5 h-5 text-blue-500" />
          Analytics Dashboard
        </h2>
        
        {/* View Toggle Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 transition-colors"
          >
            <Eye className="w-4 h-4" /> Configure View <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Visible Charts</p>
              {Object.entries(CHART_LABELS).map(([key, label]) => (
                <button 
                  key={key} 
                  onClick={() => toggleChart(key as ChartKey)} 
                  className="w-full flex justify-between px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. PR TRENDS (Line) */}
        {visibleCharts.prTrend && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg min-h-[480px] flex flex-col">
            <ChartHeader 
              title="PRs Over Time" 
              icon={Trophy} 
              color="text-yellow-500" 
              mode={chartModes.prTrend}
              onToggle={(m) => toggleChartMode('prTrend', m)}
            />
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TooltipStyle} cursor={{stroke: 'rgba(255,255,255,0.1)'}} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="PRs Set" 
                    stroke="#eab308" 
                    strokeWidth={3} 
                    dot={{r:4, fill:'#eab308'}} 
                    activeDot={{r:6, strokeWidth: 0}} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ChartDescription>
              <span className="font-semibold text-slate-300">Analysis:</span> This chart tracks the cumulative number of Personal Records set over time. A steep upward slope indicates periods of rapid strength gain (e.g., beginner gains or peaking blocks), while a plateau suggests maintenance.
            </ChartDescription>
          </div>
        )}

        {/* 3. VOLUME vs DURATION (Composed) */}
        {visibleCharts.volumeVsDuration && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg min-h-[480px] flex flex-col">
            <ChartHeader 
              title="Volume vs Duration" 
              icon={Timer} 
              color="text-purple-500" 
              mode={chartModes.volumeVsDuration}
              onToggle={(m) => toggleChartMode('volumeVsDuration', m)}
            />
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={volumeDurationData}>
                  <defs>
                    <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}m`} />
                  <Tooltip 
                    contentStyle={TooltipStyle} 
                    labelFormatter={(l, p) => p[0]?.payload?.tooltipLabel || l} 
                    formatter={(val: number, name, props) => {
                        if (name === 'Volume (kg)') return [`${val.toLocaleString()} kg`, name];
                        if (name === 'Duration (min)') {
                            const density = props.payload.density;
                            return [`${val} min`, `Duration`];
                        }
                        return [val, name];
                    }}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="totalVolume" name="Volume (kg)" fill="url(#gVol)" stroke="#10b981" />
                  <Line yAxisId="right" type="monotone" dataKey="durationMinutes" name="Duration (min)" stroke="#8b5cf6" strokeWidth={3} dot={{r:4, fill:'#8b5cf6'}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <ChartDescription>
              <span className="font-semibold text-slate-300">Analysis:</span> If volume (green) increases while duration (purple) stays flat, your training <strong className="text-white">Density</strong> is improving—meaning you are doing more work in less time.
            </ChartDescription>
          </div>
        )}
      </div>

      {/* 4. INTENSITY EVOLUTION (Stacked Area) */}
      {visibleCharts.intensityEvo && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg min-h-[480px] flex flex-col">
          <ChartHeader 
            title="Training Style Evolution (Sets per Month)" 
            icon={Layers} 
            color="text-orange-500"
            mode={chartModes.intensityEvo}
            onToggle={(m) => toggleChartMode('intensityEvo', m)} 
          />
          {intensityData && intensityData.length > 0 ? (
            <div className="flex-1 w-full" style={{minHeight: '300px', height: '100%'}}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={intensityData}>
                  <defs>
                    <linearGradient id="gStrength" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gHyper" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gEndure" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="Strength" name="Strength (1-5)" stackId="1" stroke="#3b82f6" fill="url(#gStrength)" />
                  <Area type="monotone" dataKey="Hypertrophy" name="Hypertrophy (6-12)" stackId="1" stroke="#10b981" fill="url(#gHyper)" />
                  <Area type="monotone" dataKey="Endurance" name="Endurance (13+)" stackId="1" stroke="#a855f7" fill="url(#gEndure)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[300px] flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="text-center">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No data available for Training Style Evolution</p>
                <p className="text-xs text-slate-500 mt-1">Upload workout data or adjust your filters</p>
              </div>
            </div>
          )}
          <ChartDescription>
             <span className="font-semibold text-slate-300">Analysis:</span> Visualizes your rep ranges over time. <span className="text-blue-400">Strength</span> (1-5 reps) builds power, <span className="text-emerald-400">Hypertrophy</span> (6-12 reps) builds size, and <span className="text-purple-400">Endurance</span> (13+) builds stamina.
          </ChartDescription>
        </div>
      )}

      {/* 5. RADAR & PIE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Radar Chart: Weekly Rhythm */}
        {visibleCharts.weekShape && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg min-h-[520px] flex flex-col">
            <ChartHeader title="Weekly Rhythm" icon={Clock} color="text-pink-500" />
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={weekShapeData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar name="Workouts" dataKey="A" stroke="#ec4899" strokeWidth={3} fill="#ec4899" fillOpacity={0.4} />
                  <Tooltip contentStyle={TooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <ChartDescription>
              <span className="font-semibold text-slate-300">Analysis:</span> Shows workout frequency by day of the week. A balanced shape indicates consistent daily habits, while a skewed shape reveals your preferred "gym days."
            </ChartDescription>
          </div>
        )}

        {/* Donut Chart: Top Exercises */}
        {visibleCharts.topExercises && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg min-h-[520px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Most Frequent Exercises
              </h3>
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Show: {topExerciseLimit}</span>
                <input 
                  type="range" 
                  min="3" 
                  max="8" 
                  value={topExerciseLimit} 
                  onChange={(e) => setTopExerciseLimit(parseInt(e.target.value))}
                  className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-[300px] relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                     data={topExercisesData} 
                     cx="50%" 
                     cy="50%" 
                     innerRadius={60} 
                     outerRadius={100} 
                     paddingAngle={4} 
                     dataKey="count"
                     cornerRadius={6}
                   >
                     {topExercisesData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={TooltipStyle} formatter={(val, name) => [`${val} sets`, name]} />
                   <Legend 
                     layout="horizontal" 
                     verticalAlign="bottom" 
                     align="center"
                     wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '20px' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
               {/* Center Text for Donut */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                  <span className="text-3xl font-bold text-white">{topExercisesData.reduce((a,b) => a + b.count, 0)}</span>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sets</span>
               </div>
            </div>
            <ChartDescription>
              <span className="font-semibold text-slate-300">Analysis:</span> Highlights your most practiced movements by total set count. Ideally, your "Big 3" compounds should be the largest slices here.
            </ChartDescription>
          </div>
        )}
      </div>

    </div>
  );
};