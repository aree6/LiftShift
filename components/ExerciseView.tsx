import React, { useState, useMemo } from 'react';
import { ExerciseStats } from '../types';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Minus, 
  Activity,
  Dumbbell,
  Layers,
  Scale,
  Calendar
} from 'lucide-react';

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

/**
 * MASTER LOGIC: Analyzes the long-term trend of an exercise
 */
const analyzeExerciseTrend = (stats: ExerciseStats): StatusResult => {
  const history = [...stats.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // 1. Not enough data
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

  // 2. CHECK FOR STAGNATION
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

  // 3. CHECK FOR TREND
  const current1RM = (recent[0].oneRepMax + recent[1].oneRepMax) / 2;
  const previous1RM = (recent[2].oneRepMax + (recent[3]?.oneRepMax || recent[2].oneRepMax)) / 2;
  const diffPct = ((current1RM - previous1RM) / previous1RM) * 100;

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
  <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-slate-700 transition-all duration-300">
    <div>
      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>
    </div>
    <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
      <Icon size={20} />
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
            1RM: {payload[0].value} kg
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
    const sortedHistory = [...selectedStats.history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sortedHistory.map(h => ({
      date: h.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: h.weight,
      oneRepMax: h.oneRepMax,
      volume: h.volume
    }));
  }, [selectedStats]);

  const currentStatus = selectedStats ? statusMap[selectedStats.name] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] max-h-[900px] text-slate-200">
      
      {/* --- SIDEBAR --- */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Search Header */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter exercises..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredExercises.map((ex) => {
              const status = statusMap[ex.name];
              const isSelected = selectedExerciseName === ex.name;
              
              // Status Indicator Logic
              let IndicatorIcon = Activity;
              let indicatorColor = "text-slate-500";
              if (status.status === 'overload') { IndicatorIcon = TrendingUp; indicatorColor = "text-emerald-400"; }
              if (status.status === 'regression') { IndicatorIcon = TrendingDown; indicatorColor = "text-rose-400"; }
              if (status.status === 'stagnant') { IndicatorIcon = AlertTriangle; indicatorColor = "text-amber-400"; }

              return (
                <button
                  key={ex.name}
                  onClick={() => setSelectedExerciseName(ex.name)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group border border-transparent ${
                    isSelected 
                      ? 'bg-blue-600/10 border-blue-500/30' 
                      : 'hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className={`truncate font-medium text-sm ${isSelected ? 'text-blue-100' : 'text-slate-300 group-hover:text-white'}`}>
                      {ex.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">
                      Last: {new Date(ex.history[0].date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {isSelected ? (
                     <div className={`p-1.5 rounded-md ${status.bgColor}`}>
                        <IndicatorIcon className={`w-3.5 h-3.5 ${status.color}`} />
                     </div>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${indicatorColor.replace('text-', 'bg-')} opacity-40 group-hover:opacity-100`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- MAIN DASHBOARD --- */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto lg:overflow-hidden pr-1">
        {selectedStats && currentStatus ? (
          <>
            {/* 1. Header & Insight */}
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Title Section */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{selectedStats.name}</h2>
                <div className="flex gap-2">
                   <span className="px-2 py-1 bg-slate-800 rounded text-[10px] uppercase font-bold text-slate-400 tracking-wider">Strength</span>
                   <span className="px-2 py-1 bg-slate-800 rounded text-[10px] uppercase font-bold text-slate-400 tracking-wider">Compound</span>
                </div>
              </div>

              {/* Insight Card */}
              <div className={`flex-1 xl:max-w-md rounded-xl p-4 border ${currentStatus.borderColor} ${currentStatus.bgColor} relative overflow-hidden group`}>
                <div className="relative z-10 flex gap-4">
                  <div className={`p-3 rounded-lg bg-slate-950/40 h-fit ${currentStatus.color}`}>
                    <currentStatus.icon size={24} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-base ${currentStatus.color}`}>{currentStatus.title}</h4>
                    <p className="text-slate-300 text-sm mt-1 leading-snug">{currentStatus.description}</p>
                    {currentStatus.subtext && (
                       <div className="mt-2 text-xs font-mono opacity-80 flex items-center gap-1.5">
                         <span className="w-1 h-1 bg-current rounded-full" />
                         {currentStatus.subtext}
                       </div>
                    )}
                  </div>
                </div>
                {/* Decorative Glow */}
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${currentStatus.color.replace('text', 'bg')}`} />
              </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Personal Record" value={selectedStats.maxWeight} unit="kg" icon={Dumbbell} />
              <StatCard label="Total Volume" value={(selectedStats.totalVolume / 1000).toFixed(1)} unit="k" icon={Scale} />
              <StatCard label="Sessions" value={selectedStats.totalSets} unit="" icon={Layers} />
            </div>

            {/* 3. The Chart */}
            <div className="flex-1 min-h-[350px] bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 relative">
              <div className="flex justify-between items-end mb-6">
                 <div>
                    <h3 className="text-lg font-semibold text-white">Strength Progression</h3>
                    <p className="text-xs text-slate-500">Estimated 1RM vs Actual Lift Weight</p>
                 </div>
                 {/* Legend */}
                 <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2 text-blue-400">
                       <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500"></span> Est. 1RM
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                       <span className="w-3 h-0.5 bg-slate-500 border-t border-dashed border-slate-500"></span> Lift Weight
                    </div>
                 </div>
              </div>

              <div className="w-full h-[calc(100%-60px)]">
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
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `${val}kg`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    
                    {/* The 1RM Area (The main visual) */}
                    <Area 
                      type="monotone" 
                      dataKey="oneRepMax" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#color1RM)" 
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }}
                    />
                    
                    {/* The Actual Weight Line (Context) */}
                    <Line 
                      type="stepAfter" 
                      dataKey="weight" 
                      stroke="#64748b" 
                      strokeWidth={1}
                      strokeDasharray="4 4" 
                      dot={false}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <div className="p-4 bg-slate-900 rounded-full">
              <Activity className="w-12 h-12 opacity-50" />
            </div>
            <p className="font-medium">Select an exercise to analyze performance</p>
          </div>
        )}
      </div>
    </div>
  );
};