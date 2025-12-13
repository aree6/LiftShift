import React, { useMemo, useState, useEffect } from 'react';
import { WorkoutSet, AnalysisResult, SetWisdom, StructuredTooltip, TooltipLine } from '../types';
import { 
  ChevronLeft, ChevronRight, Trophy, Target, Hash, HelpCircle,
  AlertTriangle, Info, TrendingUp, TrendingDown, Calendar, Clock, Dumbbell
} from 'lucide-react';
import { analyzeSetProgression, analyzeSession, getStatusColor, analyzeProgression, getWisdomColor, isWarmupSet } from '../utils/masterAlgorithm';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { BodyMap, BodyMapGender } from './BodyMap';
import { 
  loadExerciseMuscleData, 
  ExerciseMuscleData, 
  getExerciseMuscleVolumes,
  getVolumeColor,
  SVG_MUSCLE_NAMES
} from '../utils/muscleMapping';
import { ViewHeader } from './ViewHeader';
import { FANCY_FONT, TOOLTIP_THEMES, calculateTooltipPosition } from '../utils/uiConstants';
import { format } from 'date-fns';
import { WeightUnit } from '../utils/localStorage';
import { convertWeight, convertVolume } from '../utils/units';

interface HistoryViewProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
  weightUnit?: WeightUnit;
  bodyMapGender?: BodyMapGender;
  onExerciseClick?: (exerciseName: string) => void;
}

interface GroupedExercise {
  exerciseName: string;
  sets: WorkoutSet[];
}

interface Session {
  key: string;
  date: Date | undefined;
  title: string;
  startTime: string;
  exercises: GroupedExercise[];
  totalSets: number;
  totalVolume: number;
  totalPRs: number;
}

// Session comparison delta badge
const SessionDeltaBadge: React.FC<{ current: number; previous: number; suffix?: string; label: string; context?: string }> = ({ 
  current, previous, suffix = '', label, context = 'vs prev'
}) => {
  const delta = current - previous;
  if (delta === 0 || previous === 0) return null;
  
  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
  const bgClass = isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const sign = delta > 0 ? '+' : '';
  const pct = Math.round((delta / previous) * 100);
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${bgClass}`}>
      <Icon className={`w-3 h-3 ${colorClass}`} />
      <span className={`text-[10px] font-bold ${colorClass}`}>
        {sign}{pct}% {label} {context}
      </span>
    </div>
  );
};

const ITEMS_PER_PAGE = 3; 

interface TooltipState {
  rect: DOMRect;
  title: string;
  body: string;
  status: AnalysisResult['status'];
  metrics?: { label: string; value: string }[];
  structured?: StructuredTooltip;
}

const HISTORY_TOOLTIP_WIDTH = 320;

// Color classes for tooltip lines (using orange for warnings to differentiate from gold PRs)
const LINE_COLORS: Record<NonNullable<TooltipLine['color']>, string> = {
  green: 'text-emerald-400',
  red: 'text-rose-400',
  yellow: 'text-orange-400',
  blue: 'text-sky-400',
  gray: 'text-slate-400',
};

// Simple sparkline component for volume trend
const Sparkline: React.FC<{ data: number[]; width?: number; height?: number; color?: string }> = ({ 
  data, 
  width = 60, 
  height = 20,
  color = '#10b981'
}) => {
  if (data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  // Determine trend color
  const trend = data[data.length - 1] - data[0];
  const strokeColor = trend >= 0 ? '#10b981' : '#f43f5e';
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* End dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
};

const TREND_COLORS = {
  up: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingUp },
  down: { bg: 'bg-rose-500/20', text: 'text-rose-400', icon: TrendingDown },
  same: { bg: 'bg-slate-500/20', text: 'text-slate-300', icon: Target },
};

const TooltipPortal: React.FC<{ data: TooltipState }> = ({ data }) => {
  const { rect, title, body, status, metrics, structured } = data;
  const positionStyle = calculateTooltipPosition(rect, HISTORY_TOOLTIP_WIDTH);
  const theme = TOOLTIP_THEMES[status] || TOOLTIP_THEMES.info;

  // Render a single tooltip line with color
  const renderLine = (line: TooltipLine, idx: number) => (
    <div 
      key={idx} 
      className={`text-xs leading-relaxed ${line.color ? LINE_COLORS[line.color] : 'text-slate-300'} ${line.bold ? 'font-semibold' : ''}`}
    >
      {line.text}
    </div>
  );

  return (
    <div 
      className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"
      style={positionStyle}
    >
      <div className={`border rounded-xl p-4 ${theme}`} style={{ width: HISTORY_TOOLTIP_WIDTH }}>
        {/* Header with title and trend */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
          <span className="font-bold uppercase text-xs tracking-wider">{title}</span>
          {structured && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${TREND_COLORS[structured.trend.direction].bg}`}>
              {React.createElement(TREND_COLORS[structured.trend.direction].icon, { className: `w-3 h-3 ${TREND_COLORS[structured.trend.direction].text}` })}
              <span className={`text-xs font-bold ${TREND_COLORS[structured.trend.direction].text}`}>
                {structured.trend.value}
              </span>
            </div>
          )}
        </div>
        
        {/* Structured content */}
        {structured ? (
          <div className="space-y-3">
            {/* Why section */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">Why</div>
              <div className="space-y-0.5">
                {structured.why.map(renderLine)}
              </div>
            </div>
            
            {/* Improve section (if exists) */}
            {structured.improve && structured.improve.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-semibold">Tips</div>
                <div className="space-y-0.5">
                  {structured.improve.map(renderLine)}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Fallback to simple body text */
          <div className="text-sm leading-relaxed opacity-90">{body}</div>
        )}
        
        {/* Metrics footer */}
        {metrics && (
          <div className="mt-3 pt-2 border-t border-white/10 flex gap-4 text-xs font-mono opacity-80">
            {metrics.map((m, i) => (
              <div key={i}><span>{m.label}:</span> <span className="font-bold ml-1">{m.value}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to calculate exercise volume delta vs last time
const useExerciseVolumeHistory = (data: WorkoutSet[]) => {
  return useMemo(() => {
    const exerciseHistory = new Map<string, { date: Date; volume: number; sessionKey: string }[]>();
    const sessionExercises = new Map<string, Map<string, { volume: number; date: Date }>>();
    
    for (const set of data) {
      if (!set.parsedDate) continue;
      const sessionKey = `${set.start_time}_${set.title}`;
      const exercise = set.exercise_title;
      
      if (!sessionExercises.has(sessionKey)) {
        sessionExercises.set(sessionKey, new Map());
      }
      const sessionMap = sessionExercises.get(sessionKey)!;
      
      if (!sessionMap.has(exercise)) {
        sessionMap.set(exercise, { volume: 0, date: set.parsedDate });
      }
      const exData = sessionMap.get(exercise)!;
      exData.volume += (set.weight_kg || 0) * (set.reps || 0);
    }
    
    sessionExercises.forEach((exercises, sessionKey) => {
      exercises.forEach((data, exerciseName) => {
        if (!exerciseHistory.has(exerciseName)) {
          exerciseHistory.set(exerciseName, []);
        }
        exerciseHistory.get(exerciseName)!.push({
          date: data.date,
          volume: Number(data.volume.toFixed(2)),
          sessionKey,
        });
      });
    });
    
    exerciseHistory.forEach(history => {
      history.sort((a, b) => b.date.getTime() - a.date.getTime());
    });
    
    return exerciseHistory;
  }, [data]);
};

// Helper to track exercise best weights over time
const useExerciseBestHistory = (data: WorkoutSet[]) => {
  return useMemo(() => {
    // For each exercise, track the best weight at each point in time
    // Key: exercise name, Value: array of { date, bestWeight, sessionKey }
    const exerciseBests = new Map<string, { date: Date; weight: number; sessionKey: string; previousBest: number }[]>();
    
    // First, collect all sets sorted by date ascending (oldest first)
    const sortedSets = [...data]
      .filter(s => s.parsedDate && s.weight_kg > 0)
      .sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());
    
    // Track running best for each exercise
    const runningBest = new Map<string, number>();
    
    for (const set of sortedSets) {
      const exercise = set.exercise_title;
      const currentBest = runningBest.get(exercise) || 0;
      const sessionKey = `${set.start_time}_${set.title}`;
      
      if (set.weight_kg > currentBest) {
        // New PR!
        if (!exerciseBests.has(exercise)) {
          exerciseBests.set(exercise, []);
        }
        exerciseBests.get(exercise)!.push({
          date: set.parsedDate!,
          weight: set.weight_kg,
          sessionKey,
          previousBest: currentBest,
        });
        runningBest.set(exercise, set.weight_kg);
      }
    }
    
    // Also create a map of current best per exercise for quick lookup
    const currentBests = new Map<string, number>();
    runningBest.forEach((best, exercise) => {
      currentBests.set(exercise, best);
    });
    
    return { exerciseBests, currentBests };
  }, [data]);
};

export const HistoryView: React.FC<HistoryViewProps> = ({ data, filtersSlot, weightUnit = 'kg', bodyMapGender = 'male', onExerciseClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());
  
  // Exercise volume history for deltas
  const exerciseVolumeHistory = useExerciseVolumeHistory(data);
  
  // Exercise best weights for PR tracking
  const { currentBests } = useExerciseBestHistory(data);

  useEffect(() => setCurrentPage(1), [data]);

  useEffect(() => {
    let mounted = true;
    getExerciseAssets()
      .then(m => { if (mounted) setAssetsMap(m); })
      .catch(() => setAssetsMap(new Map()));
    loadExerciseMuscleData()
      .then(m => { if (mounted) setExerciseMuscleData(m); });
    return () => { mounted = false; };
  }, []);

  // Data Grouping Logic
  const sessions: Session[] = useMemo(() => {
    const sessionMap = new Map<string, WorkoutSet[]>();
    data.forEach(set => {
      const key = `${set.start_time}_${set.title}`;
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(set);
    });
    
    return Array.from(sessionMap.entries()).map(([key, sets]) => {
      const groupedExercises: GroupedExercise[] = [];
      let currentExercise: GroupedExercise | null = null;

      // Calculate session totals
      let totalVolume = 0;
      let totalPRs = 0;
      
      sets.forEach(set => {
        if (!currentExercise || currentExercise.exerciseName !== set.exercise_title) {
          if (currentExercise) groupedExercises.push(currentExercise);
          currentExercise = { exerciseName: set.exercise_title, sets: [] };
        }
        currentExercise.sets.push(set);
        totalVolume += (set.weight_kg || 0) * (set.reps || 0);
        if (set.isPr) totalPRs++;
      });
      if (currentExercise) groupedExercises.push(currentExercise);

      return {
        key,
        date: sets[0].parsedDate,
        title: sets[0].title,
        startTime: sets[0].start_time,
        exercises: groupedExercises,
        totalSets: sets.length,
        totalVolume,
        totalPRs,
      };
    }).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [data]);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const currentSessions = sessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Tooltip Logic
  const handleMouseEnter = (e: React.MouseEvent, data: any, variant: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let title = '', body = '', status: AnalysisResult['status'] = 'info', metrics;
    let structured: StructuredTooltip | undefined;

    if (variant === 'set') {
        const insight = data as AnalysisResult;
        title = insight.shortMessage;
        body = insight.tooltip;
        status = insight.status;
        structured = insight.structured;
        // Only show metrics if no structured tooltip
        if (!structured) {
          metrics = [{ label: 'Vol', value: insight.metrics.vol_drop_pct }, { label: 'Weight', value: insight.metrics.weight_change_pct }];
        }
    } else if (variant === 'macro') {
        const insight = data as SetWisdom;
        title = insight.message;
        body = insight.tooltip || '';
        status = insight.type === 'promote' ? 'success' : insight.type === 'demote' ? 'warning' : 'info';
    } else if (variant === 'session') {
        title = 'Session Goal';
        body = data.tooltip;
        status = 'info';
    }
    setTooltip({ rect, title, body, status, metrics, structured });
  };

  // Stats for header
  const totalSessions = sessions.length;
  const totalSets = data.length;

  // Pagination controls for header
  const paginationControls = (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
        disabled={currentPage === 1}
        className="p-1.5 hover:bg-black/60 rounded-lg disabled:opacity-30 transition-all"
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
      <span className="text-xs font-medium text-slate-400 min-w-[80px] text-center">
        Page {currentPage}/{totalPages}
      </span>
      <button 
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
        disabled={currentPage === totalPages}
        className="p-1.5 hover:bg-black/60 rounded-lg disabled:opacity-30 transition-all"
      >
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200 pb-10">
      {/* Header - consistent with Dashboard */}
      <div className="hidden sm:block">
        <ViewHeader
          leftStats={[{ icon: Calendar, value: totalSessions, label: 'Sessions' }]}
          rightStats={[{ icon: Dumbbell, value: totalSets, label: 'Sets' }]}
          filtersSlot={filtersSlot}
          rightSlot={paginationControls}
        />
      </div>

      {/* 
        Animation Wrapper: 
        Keying by currentPage forces the animation to replay when page changes.
      */}
      <div key={currentPage} className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-forwards">
        {currentSessions.map((session, index) => {
          const allSessionSets = session.exercises.flatMap(e => e.sets);
          const sessionStats = analyzeSession(allSessionSets);
          
          // Find previous session for comparison
          const sessionIdx = sessions.findIndex(s => s.key === session.key);
          const prevSession = sessionIdx < sessions.length - 1 ? sessions[sessionIdx + 1] : null;

          return (
            <div 
              key={session.key} 
              className="space-y-3 sm:space-y-4"
              style={{ animationDelay: `${index * 100}ms` }} // Staggered entrance
            >
              
              {/* --- Session Header Card --- */}
              <div className="bg-black/70 border border-slate-700/50 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-6 shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-slate-600/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-500/10 transition-all duration-700"></div>
                
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                    <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg text-blue-400 flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 
                      className="text-lg sm:text-2xl text-white tracking-tight truncate"
                      style={FANCY_FONT}
                    >
                      {session.title}
                    </h3>
                    {session.totalPRs > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">
                        <Trophy className="w-3 h-3" />
                        {session.totalPRs} PR{session.totalPRs > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400 pl-1 flex-wrap">
                    <span className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> {session.startTime}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="whitespace-nowrap">{session.totalSets} Sets</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="whitespace-nowrap">{Math.round(convertVolume(session.totalVolume, weightUnit)).toLocaleString()} {weightUnit}</span>
                    {prevSession && (
                      <SessionDeltaBadge 
                        current={session.totalVolume} 
                        previous={prevSession.totalVolume} 
                        label="vol"
                        context="vs prev"
                      />
                    )}
                  </div>
                </div>

                {/* Stats Pills */}
                <div className="flex gap-2 sm:gap-3 relative z-10 w-full md:w-auto flex-wrap md:flex-nowrap">
                  <div 
                    onMouseEnter={(e) => handleMouseEnter(e, sessionStats, 'session')}
                    onMouseLeave={() => setTooltip(null)}
                    className="px-3 sm:px-4 py-2 bg-black/70 border border-slate-700/50 rounded-xl flex flex-col items-center min-w-[70px] hover:border-blue-500/30 transition-colors cursor-help text-xs sm:text-sm"
                  >
                      <span className="text-[8px] sm:text-[10px] uppercase font-bold text-slate-500">Focus</span>
                      <span className="font-bold text-blue-400">{sessionStats.goalLabel}</span>
                  </div>
                  <div className="px-3 sm:px-4 py-2 bg-black/70 border border-slate-700/50 rounded-xl flex flex-col items-center min-w-[70px] text-xs sm:text-sm">
                      <span className="font-bold text-emerald-400">{sessionStats.avgReps} <span className="text-[8px] sm:text-[10px] text-slate-600">reps/avg</span></span>
                  </div>
                </div>
              </div>

              {/* --- Exercises Grid --- */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {session.exercises.map((group, idx) => {
                  const insights = analyzeSetProgression(group.sets);
                  const macroInsight = analyzeProgression(group.sets);
                  
                  // Calculate exercise volume delta vs last time
                  const exerciseVolume = group.sets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0);
                  const history = exerciseVolumeHistory.get(group.exerciseName) || [];
                  const currentIdx = history.findIndex(h => h.sessionKey === session.key);
                  const prevEntry = currentIdx >= 0 && currentIdx < history.length - 1 ? history[currentIdx + 1] : null;
                  const volumeDelta = prevEntry ? {
                    current: exerciseVolume,
                    previous: prevEntry.volume,
                    pct: prevEntry.volume > 0 ? Math.round(((exerciseVolume - prevEntry.volume) / prevEntry.volume) * 100) : 0,
                  } : null;
                  
                  // Get exercise best weight and check for PRs in this session
                  const exerciseBest = currentBests.get(group.exerciseName) || 0;
                  const sessionMaxWeight = Math.max(...group.sets.map(s => s.weight_kg || 0));
                  const hasPRInSession = group.sets.some(s => s.isPr);
                  // Find the PR set to get the improvement
                  const prSet = group.sets.find(s => s.isPr);
                  const prImprovement = prSet ? (() => {
                    // Calculate previous best before this PR
                    const allWeightsBefore = data
                      .filter(s => s.exercise_title === group.exerciseName && s.parsedDate && prSet.parsedDate && s.parsedDate < prSet.parsedDate)
                      .map(s => s.weight_kg);
                    const prevBest = allWeightsBefore.length > 0 ? Math.max(...allWeightsBefore) : 0;
                    return prevBest > 0 ? Number((prSet.weight_kg - prevBest).toFixed(2)) : 0;
                  })() : 0;
                  
                  // Get volume trend for sparkline (last 6 sessions, reversed for chronological order)
                  const volHistory = exerciseVolumeHistory.get(group.exerciseName) || [];
                  const sparklineData = volHistory.slice(0, 6).map(v => v.volume).reverse();

                  return (
                    <div key={idx} className="bg-black/70 border border-slate-700/50 rounded-2xl p-4 sm:p-5 hover:border-slate-600/50 transition-all flex flex-col h-full hover:shadow-lg hover:shadow-black/20">
                      
                      {/* Exercise Title with thumbnail */}
                      <div
                        className="grid grid-cols-[2.5rem_1fr_auto] grid-rows-2 gap-x-3 gap-y-1 mb-4 cursor-pointer select-none sm:flex sm:items-center sm:gap-3"
                        onClick={() => onExerciseClick?.(group.exerciseName)}
                        title="Open exercise analysis"
                      >
                        {(() => {
                          const asset = assetsMap?.get(group.exerciseName);
                          if (asset && (asset.thumbnail || asset.source)) {
                            return (
                              <img
                                src={asset.thumbnail || asset.source}
                                alt=""
                                className="w-10 h-10 rounded object-cover border border-slate-800 flex-shrink-0 row-span-2"
                                loading="lazy"
                                decoding="async"
                              />
                            );
                          }
                          return (
                            <div className="w-10 h-10 rounded bg-black/50 border border-slate-700 row-span-2" />
                          );
                        })()}

                        <h4
                          className="text-slate-200 text-sm sm:text-lg line-clamp-1 min-w-0 col-start-2 row-start-1"
                          style={FANCY_FONT}
                          title={group.exerciseName}
                        >
                          {group.exerciseName}
                        </h4>

                        {/* Stats: placed after name, slightly larger */}
                        <div className="min-w-0 col-start-2 row-start-2 sm:flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-sm text-slate-400 sm:flex-nowrap sm:whitespace-nowrap sm:overflow-x-auto">
                            <span className="font-semibold text-slate-200/90">
                              {Math.round(convertVolume(exerciseVolume, weightUnit)).toLocaleString()} {weightUnit}
                            </span>
                            {volumeDelta && volumeDelta.pct !== 0 && (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${
                                volumeDelta.pct > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {volumeDelta.pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {volumeDelta.pct > 0 ? '+' : ''}{volumeDelta.pct}%
                              </span>
                            )}
                            {sparklineData.length >= 2 && (
                              <span className="inline-flex items-center opacity-70" title="Volume trend (last 6 sessions)">
                                <Sparkline data={sparklineData} width={60} height={20} />
                              </span>
                            )}
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300">
                              Best: <span className="font-semibold">{convertWeight(exerciseBest, weightUnit)}{weightUnit}</span>
                            </span>
                            {hasPRInSession && prImprovement > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                                <TrendingUp className="w-3 h-3" />
                                +{convertWeight(prImprovement, weightUnit)}{weightUnit} PR
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Macro Badge (Promotion) */}
                        {macroInsight && (
                          <div 
                            onMouseEnter={(e) => handleMouseEnter(e, macroInsight, 'macro')}
                            onMouseLeave={() => setTooltip(null)}
                            className={`p-1.5 rounded-lg cursor-help flex-shrink-0 self-center justify-self-end col-start-3 row-span-2 ${getWisdomColor(macroInsight.type)} animate-in zoom-in duration-300`}
                          >
                            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                        )}
                      </div>

                      {/* Main content: Sets on left, Muscle map on right */}
                      <div className="flex gap-4 flex-1">
                        {/* Sets Timeline */}
                        <div className="space-y-2 relative flex-1 min-w-0">
                        {(() => {
                          // Count working sets for proper numbering (warmup = W, working = 1,2,3...)
                          let workingSetNumber = 0;
                          return group.sets.map((set, sIdx) => {
                          // Check if this is a warmup set (based on set_type field only)
                          const isWarmup = isWarmupSet(set);
                          // Track working set number for display
                          if (!isWarmup) workingSetNumber++;
                          // Only show insights for non-warmup sets (insights array is for working sets only)
                          const workingSetIdx = group.sets.slice(0, sIdx).filter(s => !isWarmupSet(s)).length;
                          const insight = !isWarmup && workingSetIdx > 0 ? insights[workingSetIdx - 1] : undefined;
                          
                          // Determine row color based on status or PR
                          let rowStatusClass = "border-transparent";
                          let dotClass = "bg-black/50 border-slate-700";
                          let isPrRow = false;
                          
                          // PR takes priority for color (show even for warmup - user may have mislabeled)
                          if (set.isPr) {
                              isPrRow = true;
                              rowStatusClass = "border-yellow-500/30";
                              dotClass = "bg-yellow-500 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
                          } 
                          // If no PR, check insights (only for working sets)
                          else if (insight?.status === 'danger') {
                              rowStatusClass = "bg-rose-500/5 border-rose-500/20";
                              dotClass = "bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
                          } else if (insight?.status === 'success') {
                              rowStatusClass = "bg-emerald-500/5 border-emerald-500/20";
                              dotClass = "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
                          } else if (insight?.status === 'warning') {
                              rowStatusClass = "bg-orange-500/5 border-orange-500/20";
                              dotClass = "bg-orange-500 border-orange-400";
                          }

                          // PR row shimmer style
                          const prShimmerStyle: React.CSSProperties = isPrRow ? {
                            background: 'linear-gradient(90deg, transparent 0%, rgba(234,179,8,0.08) 25%, rgba(234,179,8,0.15) 50%, rgba(234,179,8,0.08) 75%, transparent 100%)',
                            backgroundSize: '200% 100%',
                            animation: 'prRowShimmer 3s ease-in-out infinite',
                          } : {};

                          return (
                            <div 
                              key={sIdx} 
                              className={`relative z-10 flex items-center gap-3 p-2 rounded-lg border ${rowStatusClass} transition-all hover:bg-black/60 group overflow-hidden`}
                              style={prShimmerStyle}
                            >
                              {/* Set Number Bubble - W for warmup, 1,2,3... for working sets */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${dotClass} text-white`}>
                                {isWarmup ? 'W' : workingSetNumber}
                              </div>

                              {/* Set Data */}
                              <div className="flex-1 flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                  <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                                    {convertWeight(set.weight_kg, weightUnit)}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">{weightUnit}</span>
                                  <span className="text-slate-700 mx-1">×</span>
                                  <span className="text-xl font-bold text-slate-200 tabular-nums tracking-tight">
                                    {set.reps}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">reps</span>
                                </div>

                                {/* Right side: PR badge + Insight indicator */}
                                <div className="flex items-center gap-2">
                                  {/* PR INDICATOR - positioned before tooltip */}
                                  {set.isPr && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-[9px] font-bold uppercase tracking-wider border border-yellow-500/20 animate-pulse">
                                      <Trophy className="w-3 h-3" /> New Record!
                                    </span>
                                  )}
                                  
                                  {/* Insight Indicator */}
                                  {insight && (
                                    <div 
                                      onMouseEnter={(e) => handleMouseEnter(e, insight, 'set')}
                                      onMouseLeave={() => setTooltip(null)}
                                      className="cursor-help flex items-center justify-center w-6 h-6 rounded hover:bg-black/60 transition-colors"
                                    >
                                      {insight.status === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                                      {insight.status === 'success' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                                      {insight.status === 'warning' && <TrendingDown className="w-4 h-4 text-amber-500" />}
                                      {insight.status === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })})()}
                        </div>

                        {/* Muscle Heat Map - Right Side */}
                        {(() => {
                          const exData = exerciseMuscleData.get(group.exerciseName.toLowerCase());
                          const { volumes, maxVolume } = getExerciseMuscleVolumes(exData);
                          
                          // Aggregate by display name
                          const aggregated = new Map<string, { sets: number }>();
                          volumes.forEach((sets, svgId) => {
                            const label = SVG_MUSCLE_NAMES[svgId] || svgId;
                            const prev = aggregated.get(label);
                            if (!prev || sets > prev.sets) {
                              aggregated.set(label, { sets });
                            }
                          });

                          const primaryTargets: Array<{ label: string; sets: number }> = [];
                          const secondaryTargets: Array<{ label: string; sets: number }> = [];

                          for (const [label, { sets }] of aggregated.entries()) {
                            if (sets >= 1) primaryTargets.push({ label, sets });
                            else secondaryTargets.push({ label, sets });
                          }

                          primaryTargets.sort((a, b) => a.label.localeCompare(b.label));
                          secondaryTargets.sort((a, b) => a.label.localeCompare(b.label));

                          const getTargetTextColor = (sets: number, maxSets: number): string => {
                            const ratio = sets / Math.max(maxSets, 1);
                            return ratio >= 0.55 ? '#ffffff' : '#0f172a';
                          };

                          if (volumes.size === 0) return null;

                          return (
                            <div className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0 pl-2 py-2 border-l border-slate-800/50 ">
                              <div className="w-40 h-40 flex items-center justify-center">
                                <BodyMap
                                  onPartClick={() => {}}
                                  selectedPart={null}
                                  muscleVolumes={volumes}
                                  maxVolume={maxVolume}
                                  compact
                                  gender={bodyMapGender}
                                />
                              </div>
                             
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {tooltip && <TooltipPortal data={tooltip} />}
    </div>
  );
};