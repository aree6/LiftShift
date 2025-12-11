import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Search, TrendingUp, TrendingDown, AlertTriangle, Minus, Activity,
  Dumbbell, Scale
} from 'lucide-react';
import { ExerciseStats } from '../types';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';

// --- STYLES ---
const FANCY_FONT: React.CSSProperties = {
  fontFamily: '"Libre Baskerville", "Poppins", sans-serif',
  fontWeight: 600,
  fontStyle: 'italic',
};

// --- TYPES & LOGIC ---
type ExerciseStatus = 'overload' | 'stagnant' | 'regression' | 'neutral' | 'new';

interface StatusResult {
  status: ExerciseStatus;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  title: string;
  description: string;
  subtext?: string;
}

const analyzeExerciseTrend = (stats: ExerciseStats): StatusResult => {
  const history = [...stats.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (history.length < 3) {
    return {
      status: 'new',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      icon: Activity,
      title: "Gathering Data",
      description: "Keep training! We need a few more sessions to detect your trend."
    };
  }

  const recent = history.slice(0, 4);
  const weights = recent.map(h => h.weight);
  const reps = recent.map(h => h.reps || (h.weight > 0 ? h.volume/h.weight : 0));
  
  const isWeightStatic = weights.every(w => Math.abs(w - weights[0]) < 1);
  const maxReps = Math.max(...reps);
  const minReps = Math.min(...reps);
  const isRepStatic = (maxReps - minReps) <= 1;

  if (isWeightStatic && isRepStatic) {
    return {
      status: 'stagnant',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      icon: AlertTriangle,
      title: "Plateau Detected",
      description: `You've lifted ${weights[0]}kg for ${minReps}-${maxReps} reps consistently.`,
      subtext: `Try increasing weight to ${(weights[0] + 2.5).toFixed(1)}kg next session.`
    };
  }

  const current1RM = (recent[0].oneRepMax + recent[1].oneRepMax) / 2;
  const previous1RM = (recent[2].oneRepMax + (recent[3]?.oneRepMax || recent[2].oneRepMax)) / 2;
  const diffPct = previous1RM > 0 ? ((current1RM - previous1RM) / previous1RM) * 100 : 0;

  if (diffPct > 2.5) {
    return {
      status: 'overload',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      icon: TrendingUp,
      title: "Progressive Overload",
      description: "Excellent work! Your estimated strength is trending upwards.",
      subtext: `Strength +${diffPct.toFixed(1)}% recently.`
    };
  }

  if (diffPct < -2.5) {
    return {
      status: 'regression',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      icon: TrendingDown,
      title: "Performance Dip",
      description: "Numbers are trending down. Could be fatigue or form correction.",
      subtext: `Strength -${Math.abs(diffPct).toFixed(1)}%. Consider a deload.`
    };
  }

  return {
    status: 'neutral',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    icon: Minus,
    title: "Maintenance Mode",
    description: "Strength levels are stable. Maintaining gains effectively.",
    subtext: "Push intensity to trigger new growth."
  };
};

// --- SUB-COMPONENTS ---

const StatCard = ({ label, value, unit, icon: Icon }: any) => (
  <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 md:p-5 rounded-lg flex items-center justify-between group hover:border-slate-700 transition-colors duration-300 h-full">
    <div>
      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span 
          className="text-xl text-white tracking-tight"
          style={FANCY_FONT}
        >
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
      </div>
    </div>
    <div className="h-9 w-9 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors flex-shrink-0">
      <Icon size={16} />
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-2xl shadow-black/50">
        <p className="text-slate-400 text-xs mb-2 font-mono">{label}</p>
        <div className="space-y-1">
          <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            1RM: <span style={FANCY_FONT}>{payload[0].value} kg</span>
          </p>
          {payload[1] && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              Lifted: {payload[1].value} kg
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// --- MAIN COMPONENT ---

interface ExerciseViewProps {
  stats: ExerciseStats[];
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({ stats }) => {
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(stats[0]?.name || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [viewMode, setViewMode] = useState<'avg'|'day'>('avg');

  useEffect(() => {
    let mounted = true;
    getExerciseAssets()
      .then(m => { if (mounted) setAssetsMap(m); })
      .catch(() => setAssetsMap(new Map()));
    return () => { mounted = false; };
  }, []);

  // Memoize status map to prevent recalc on every render
  const statusMap = useMemo(() => {
    const map: Record<string, StatusResult> = {};
    stats.forEach(s => {
      map[s.name] = analyzeExerciseTrend(s);
    });
    return map;
  }, [stats]);

  const selectedStats = useMemo(() => 
    stats.find(s => s.name === selectedExerciseName), 
  [stats, selectedExerciseName]);

  const filteredExercises = useMemo(() => 
    stats.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [stats, searchTerm]);

  const chartData = useMemo(() => {
    if (!selectedStats) return [];
    const history = [...selectedStats.history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (viewMode === 'day') {
      return history.map(h => ({
        date: h.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: h.weight,
        oneRepMax: h.oneRepMax,
        volume: h.volume
      }));
    }
    // avg: monthly averages
    const buckets: Record<string, { ts: number; label: string; oneRmSum: number; oneRmCount: number; weightSum: number; weightCount: number } > = {};
    history.forEach(h => {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const ts = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      if (!buckets[key]) buckets[key] = { ts, label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), oneRmSum: 0, oneRmCount: 0, weightSum: 0, weightCount: 0 };
      buckets[key].oneRmSum += h.oneRepMax;
      buckets[key].oneRmCount += 1;
      buckets[key].weightSum += h.weight;
      buckets[key].weightCount += 1;
    });
    return Object.values(buckets)
      .sort((a,b) => a.ts - b.ts)
      .map(b => ({
        date: b.label,
        oneRepMax: Number((b.oneRmSum / Math.max(1,b.oneRmCount)).toFixed(1)),
        weight: Number((b.weightSum / Math.max(1,b.weightCount)).toFixed(1)),
      }));
  }, [selectedStats, viewMode]);

  const currentStatus = selectedStats ? statusMap[selectedStats.name] : null;

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200 pb-10">
      
      {/* 
          TOP SECTION: GRID LAYOUT 
          We use lg:h-[380px] to enforce equal height for Sidebar and Metrics on Desktop.
          On mobile, it falls back to auto (stacked).
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 ">
        
        {/* --- LEFT: SIDEBAR --- */}
    {/* UPDATED: Changed max-h-[400px] to h-[25vh] to limit to 1/4 screen height */}
    <div className="lg:col-span-1 flex flex-col gap-1 h-[34.5vh] min-h-[220px]">
      {/* Search Header */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter..."
          className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 sm:py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LIST WRAPPER
         flex-1 ensures it takes remaining space within the 25vh
      */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden flex flex-col min-h-0">
        <div className="overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar flex-1">
          {filteredExercises.map((ex) => {
            const status = statusMap[ex.name];
            const isSelected = selectedExerciseName === ex.name;
            const asset = assetsMap?.get(ex.name);
            
            let IndicatorIcon = Activity;
            let indicatorColor = "text-slate-500";
            if (status.status === 'overload') { IndicatorIcon = TrendingUp; indicatorColor = "text-emerald-400"; }
            if (status.status === 'regression') { IndicatorIcon = TrendingDown; indicatorColor = "text-rose-400"; }
            if (status.status === 'stagnant') { IndicatorIcon = AlertTriangle; indicatorColor = "text-amber-400"; }

            return (
              <button
                key={ex.name}
                onClick={() => setSelectedExerciseName(ex.name)}
                className={`w-full text-left px-2 py-1.5 rounded-md transition-all duration-200 flex items-center justify-between group border border-transparent ${
                  isSelected 
                    ? 'bg-blue-600/10 border-blue-500/30' 
                    : 'hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {(() => {
                    if (!asset) return (
                      <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <Dumbbell className="w-3.5 h-3.5" />
                      </div>
                    );
                    const imgUrl = asset.sourceType === 'video' ? asset.thumbnail : (asset.thumbnail || asset.source);
                    return imgUrl ? (
                      <img src={imgUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0 border border-slate-800" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <Dumbbell className="w-3.5 h-3.5" />
                      </div>
                    );
                  })()}
                  <div className="flex flex-col min-w-0">
                    <span className={`truncate text-xs ${isSelected ? 'text-blue-100 font-semibold' : 'text-slate-300 group-hover:text-white'}`}>
                      {ex.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      Last: {new Date(ex.history[0].date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {isSelected ? (
                   <div className={`p-1 rounded-md ${status.bgColor} animate-in zoom-in-50 duration-200`}>
                      <IndicatorIcon className={`w-3 h-3 ${status.color}`} />
                   </div>
                ) : (
                  <div className={`w-2 h-2 rounded-full ${indicatorColor.replace('text-', 'bg-')} opacity-40 group-hover:opacity-100 transition-opacity`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>

        {/* --- RIGHT: HEADER & METRICS --- */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full min-h-0">
          {selectedStats && currentStatus ? (
            <div className="flex flex-col h-full gap-6">
              
              {/* 1. Header & Insight (Top Half) */}
              <div className="flex flex-col xl:flex-row gap-3 h-auto shrink-0">
                <div className="w-full flex items-start gap-3">
                  {assetsMap && selectedStats && (() => {
                    const a = assetsMap.get(selectedStats.name);
                    if (!a) return null;
                    const imgSrc = a.sourceType === 'video' ? a.thumbnail : (a.thumbnail || a.source);
                    return imgSrc ? (
                      <img src={imgSrc} alt={selectedStats.name} className="w-24 h-24 rounded-lg object-cover border border-slate-800" loading="lazy" decoding="async" />
                    ) : null;
                  })()}
                  <div className="grid grid-cols-3 gap-3 flex-1 h-24">
                    <StatCard label="Personal Record" value={selectedStats.maxWeight} unit="kg" icon={Dumbbell} />
                    <StatCard label="Total Volume" value={(selectedStats.totalVolume / 1000).toFixed(1)} unit="k" icon={Scale} />
                    <StatCard label="Analyzing" value={selectedStats.history.length} unit={selectedStats.history.length === 1 ? 'session' : 'sessions'} icon={Activity} />
                  </div>
                </div>
              </div>

              {/* 2. Key Metrics Grid (Bottom Half - Fills Remaining Height) */}
              <div className="hidden" />

              <div className="flex items-baseline gap-3">
                <h2 
                  className="text-2xl sm:text-3xl text-white tracking-tight drop-shadow-lg"
                  style={FANCY_FONT}
                >
                  {selectedStats.name}
                </h2>
              </div>

              <div className={`rounded-lg p-3 border ${currentStatus.borderColor} ${currentStatus.bgColor} relative overflow-hidden group transition-all duration-500`}>
                <div className="relative z-10 flex gap-3 h-full items-center">
                  <div className={`p-2 rounded-lg bg-slate-950/40 h-fit ${currentStatus.color} flex-shrink-0`}>
                    <currentStatus.icon size={30} />
                  </div>
                  <div>
                    <h4 
                      className={`text-m ${currentStatus.color} mb-0.5`}
                      style={FANCY_FONT}
                    >
                      {currentStatus.title}
                    </h4>
                    <p className="text-slate-300 text-s leading-tight">{currentStatus.description}</p>
                    {currentStatus.subtext && (
                       <div className="mt-1.5 text-[13px] font-mono opacity-75 flex items-center gap-1">
                         <span className="w-1 h-1 bg-current rounded-full" />
                         {currentStatus.subtext}
                       </div>
                    )}
                  </div>
                </div>
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:opacity-30 ${currentStatus.color.replace('text', 'bg')}`} />
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
              <div className="p-4 bg-slate-900 rounded-full">
                <Activity className="w-10 h-10 opacity-50" />
              </div>
              <p className="font-medium text-sm text-center px-4">Select an exercise</p>
            </div>
          )}
        </div>
      </div>

      {/* 
          BOTTOM SECTION: CHART 
          Full width, sits below the grid.
      */}
      {selectedStats && (
        <div className="w-full bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 sm:p-6 relative flex flex-col h-[400px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-6 gap-2 shrink-0">
             <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Strength Progression</h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Estimated 1RM vs Actual Lift Weight</p>
             </div>
             <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium">
                <div className="flex items-center gap-2 text-blue-400">
                   <span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500"></span> Est. 1RM
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                   <span className="w-2.5 h-0.5 bg-slate-500 border-t border-dashed border-slate-500"></span> Lift Weight
                </div>
                <div className="bg-slate-950 p-1 rounded-lg flex gap-1 border border-slate-800">
                  <button onClick={() => setViewMode('avg')} className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${viewMode==='avg'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Avg</button>
                  <button onClick={() => setViewMode('day')} className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${viewMode==='day'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Day</button>
                </div>
             </div>
          </div>

          <div className="w-full flex-1 min-h-0">
            {chartData.length === 0 ? (
              <div className="w-full h-full min-h-[260px] flex items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                Not enough data to render Strength Progression.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="color1RM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${val}kg`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                
                <Area 
                  type="monotone" 
                  dataKey="oneRepMax" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#color1RM)" 
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#60a5fa' }}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
                
                <Line 
                  type="stepAfter" 
                  dataKey="weight" 
                  stroke="#64748b" 
                  strokeWidth={1}
                  strokeDasharray="4 4" 
                  dot={false}
                  activeDot={false}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};