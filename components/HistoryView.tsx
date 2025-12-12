import React, { useMemo, useState, useEffect } from 'react';
import { WorkoutSet, AnalysisResult, SetWisdom } from '../types';
import { 
  ChevronLeft, ChevronRight, Trophy, Target, Hash, HelpCircle,
  AlertTriangle, Info, TrendingUp, TrendingDown, Calendar, Clock, Dumbbell
} from 'lucide-react';
import { analyzeSetProgression, analyzeSession, getStatusColor, analyzeProgression, getWisdomColor } from '../utils/masterAlgorithm';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { ViewHeader } from './ViewHeader';

// --- STYLES ---
const FANCY_FONT: React.CSSProperties = {
  fontFamily: '"Libre Baskerville", "Poppins", sans-serif',
  fontWeight: 600,
  fontStyle: 'italic',
};

interface HistoryViewProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
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
}

const ITEMS_PER_PAGE = 3; 

interface TooltipState {
  rect: DOMRect;
  title: string;
  body: string;
  status: AnalysisResult['status'];
  metrics?: { label: string; value: string }[];
}

const TooltipPortal: React.FC<{ data: TooltipState }> = ({ data }) => {
  const { rect, title, body, status, metrics } = data;
  const TOOLTIP_WIDTH = 300;
  const GAP = 12;
  
  // Horizontal positioning (keep in viewport)
  const left = Math.min(window.innerWidth - TOOLTIP_WIDTH - 20, Math.max(20, rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2)));
  
  // Vertical positioning: Flip if close to top
  const spaceAbove = rect.top;
  const isFlip = spaceAbove < 220; 

  const style: React.CSSProperties = {
    left: `${left}px`,
    width: `${TOOLTIP_WIDTH}px`,
  };

  if (isFlip) {
    style.top = `${rect.bottom + GAP}px`;
  } else {
    style.bottom = `${window.innerHeight - rect.top + GAP}px`;
  }
  
  // Theme logic
  const colors = {
    success: 'border-emerald-500/50 bg-emerald-950/95 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    warning: 'border-amber-500/50 bg-amber-950/95 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    danger: 'border-rose-500/50 bg-rose-950/95 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    info: 'border-blue-500/50 bg-slate-900/95 text-slate-200 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
  };
  const theme = colors[status] || colors.info;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"
      style={style}
    >
      <div className={`border rounded-xl backdrop-blur-md p-4 ${theme}`}>
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
          <span className="font-bold uppercase text-xs tracking-wider">{title}</span>
        </div>
        <div className="text-sm leading-relaxed opacity-90">{body}</div>
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

export const HistoryView: React.FC<HistoryViewProps> = ({ data, filtersSlot }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);

  useEffect(() => setCurrentPage(1), [data]);

  useEffect(() => {
    let mounted = true;
    getExerciseAssets()
      .then(m => { if (mounted) setAssetsMap(m); })
      .catch(() => setAssetsMap(new Map()));
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

      sets.forEach(set => {
        if (!currentExercise || currentExercise.exerciseName !== set.exercise_title) {
          if (currentExercise) groupedExercises.push(currentExercise);
          currentExercise = { exerciseName: set.exercise_title, sets: [] };
        }
        currentExercise.sets.push(set);
      });
      if (currentExercise) groupedExercises.push(currentExercise);

      return {
        key,
        date: sets[0].parsedDate,
        title: sets[0].title,
        startTime: sets[0].start_time,
        exercises: groupedExercises,
        totalSets: sets.length
      };
    }).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [data]);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const currentSessions = sessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Tooltip Logic
  const handleMouseEnter = (e: React.MouseEvent, data: any, variant: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let title = '', body = '', status: AnalysisResult['status'] = 'info', metrics;

    if (variant === 'set') {
        const insight = data as AnalysisResult;
        title = insight.shortMessage;
        body = insight.tooltip;
        status = insight.status;
        metrics = [{ label: 'Vol', value: insight.metrics.vol_drop_pct }, { label: 'Weight', value: insight.metrics.weight_change_pct }];
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
    setTooltip({ rect, title, body, status, metrics });
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
        className="p-1.5 hover:bg-slate-700 rounded-lg disabled:opacity-30 transition-all"
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
      <span className="text-xs font-medium text-slate-400 min-w-[80px] text-center">
        Page {currentPage}/{totalPages}
      </span>
      <button 
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
        disabled={currentPage === totalPages}
        className="p-1.5 hover:bg-slate-700 rounded-lg disabled:opacity-30 transition-all"
      >
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 max-w-5xl mx-auto px-1 sm:px-0">
      {/* Header - consistent with Dashboard */}
      <ViewHeader
        stats={[
          { icon: Calendar, value: totalSessions, label: 'Sessions' },
          { icon: Dumbbell, value: totalSets, label: 'Sets' },
        ]}
        filtersSlot={filtersSlot}
        rightSlot={paginationControls}
      />

      {/* 
        Animation Wrapper: 
        Keying by currentPage forces the animation to replay when page changes.
      */}
      <div key={currentPage} className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-forwards">
        {currentSessions.map((session, index) => {
          const allSessionSets = session.exercises.flatMap(e => e.sets);
          const sessionStats = analyzeSession(allSessionSets);

          return (
            <div 
              key={session.key} 
              className="space-y-3 sm:space-y-4"
              style={{ animationDelay: `${index * 100}ms` }} // Staggered entrance
            >
              
              {/* --- Session Header Card --- */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-6 shadow-xl relative overflow-hidden group transition-all duration-300 hover:border-slate-700">
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
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400 pl-1">
                    <span className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> {session.startTime}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="whitespace-nowrap">{session.totalSets} Sets</span>
                  </div>
                </div>

                {/* Stats Pills */}
                <div className="flex gap-2 sm:gap-3 relative z-10 w-full md:w-auto flex-wrap md:flex-nowrap">
                  <div 
                    onMouseEnter={(e) => handleMouseEnter(e, sessionStats, 'session')}
                    onMouseLeave={() => setTooltip(null)}
                    className="px-3 sm:px-4 py-2 bg-slate-950/50 border border-slate-700/50 rounded-xl flex flex-col items-center min-w-[70px] hover:border-blue-500/30 transition-colors cursor-help text-xs sm:text-sm"
                  >
                      <span className="text-[8px] sm:text-[10px] uppercase font-bold text-slate-500">Focus</span>
                      <span className="font-bold text-blue-400">{sessionStats.goalLabel}</span>
                  </div>
                  <div className="px-3 sm:px-4 py-2 bg-slate-950/50 border border-slate-700/50 rounded-xl flex flex-col items-center min-w-[70px] text-xs sm:text-sm">
                      <span className="font-bold text-emerald-400">{sessionStats.avgReps} <span className="text-[8px] sm:text-[10px] text-slate-600">reps/avg</span></span>
                  </div>
                </div>
              </div>

              {/* --- Exercises Grid --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {session.exercises.map((group, idx) => {
                  const insights = analyzeSetProgression(group.sets);
                  const macroInsight = analyzeProgression(group.sets);

                  return (
                    <div key={idx} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all flex flex-col h-full hover:shadow-lg hover:shadow-black/20">
                      
                      {/* Exercise Title with thumbnail */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {(() => {
                            const asset = assetsMap?.get(group.exerciseName);
                            if (asset && (asset.thumbnail || asset.source)) {
                              return (
                                <img src={asset.thumbnail || asset.source} alt="" className="w-10 h-10 rounded object-cover border border-slate-800 flex-shrink-0" loading="lazy" decoding="async" />
                              );
                            }
                            return (
                              <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700" />
                            );
                          })()}
                          <h4 
                            className="text-slate-200 text-sm sm:text-lg line-clamp-1"
                            style={FANCY_FONT}
                            title={group.exerciseName}
                          >
                            {group.exerciseName}
                          </h4>
                        </div>
                        {/* Macro Badge (Promotion) */}
                        {macroInsight && (
                          <div 
                            onMouseEnter={(e) => handleMouseEnter(e, macroInsight, 'macro')}
                            onMouseLeave={() => setTooltip(null)}
                            className={`p-1.5 rounded-lg cursor-help flex-shrink-0 ${getWisdomColor(macroInsight.type)} animate-in zoom-in duration-300`}
                          >
                            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                        )}
                      </div>

                      {/* Sets Timeline */}
                      <div className="space-y-2 relative flex-1">
                        {group.sets.map((set, sIdx) => {
                          const insight = sIdx > 0 ? insights[sIdx - 1] : undefined;
                          
                          // Determine row color based on status or PR
                          let rowStatusClass = "border-transparent";
                          let dotClass = "bg-slate-800 border-slate-700";
                          
                          // PR takes priority for color
                          if (set.isPr) {
                              rowStatusClass = "bg-emerald-500/5 border-emerald-500/20";
                              dotClass = "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
                          } 
                          // If no PR, check insights
                          else if (insight?.status === 'danger') {
                              rowStatusClass = "bg-rose-500/5 border-rose-500/20";
                              dotClass = "bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
                          } else if (insight?.status === 'success') {
                              rowStatusClass = "bg-emerald-500/5 border-emerald-500/20";
                              dotClass = "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
                          } else if (insight?.status === 'warning') {
                              rowStatusClass = "bg-amber-500/5 border-amber-500/20";
                              dotClass = "bg-amber-500 border-amber-400";
                          }

                          return (
                            <div 
                              key={sIdx} 
                              className={`relative z-10 flex items-center gap-3 p-2 rounded-lg border ${rowStatusClass} transition-all hover:bg-slate-800/50 group`}
                            >
                              {/* Set Number Bubble */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${dotClass} text-white`}>
                                {set.set_index + 1}
                              </div>

                              {/* Set Data */}
                              <div className="flex-1 flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                  <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                                    {set.weight_kg}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium mr-1">kg</span>
                                  
                                  {/* EXPLICIT PR INDICATOR */}
                                  {set.isPr && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-[9px] font-bold uppercase tracking-wider border border-yellow-500/20 animate-pulse">
                                      <Trophy className="w-3 h-3" /> New Record!
                                    </span>
                                  )}

                                  <span className="text-slate-700 mx-1">×</span>
                                  <span className="text-xl font-bold text-slate-200 tabular-nums tracking-tight">
                                    {set.reps}
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">reps</span>
                                </div>

                                {/* Insight Indicator (Stable - No hover flash) */}
                                {insight && (
                                  <div 
                                    onMouseEnter={(e) => handleMouseEnter(e, insight, 'set')}
                                    onMouseLeave={() => setTooltip(null)}
                                    className="cursor-help flex items-center justify-center w-6 h-6 rounded hover:bg-slate-700/50 transition-colors"
                                  >
                                    {insight.status === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                                    {insight.status === 'success' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                                    {insight.status === 'warning' && <TrendingDown className="w-4 h-4 text-amber-500" />}
                                    {insight.status === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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