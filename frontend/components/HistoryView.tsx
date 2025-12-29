import React, { useMemo, useState, useEffect, useId } from 'react';
import { WorkoutSet, AnalysisResult, SetWisdom, StructuredTooltip, TooltipLine } from '../types';
import { 
  ChevronLeft, ChevronRight, Trophy, Target, Hash, HelpCircle,
  AlertTriangle, Info, TrendingUp, TrendingDown, Calendar, Clock, Dumbbell
} from 'lucide-react';
import { analyzeSetProgression, getStatusColor, analyzeProgression, getWisdomColor, isWarmupSet } from '../utils/analysis/masterAlgorithm';
import { getExerciseAssets, ExerciseAsset } from '../utils/data/exerciseAssets';
import { BodyMap, BodyMapGender } from './BodyMap';
import { 
  loadExerciseMuscleData, 
  ExerciseMuscleData, 
  CSV_TO_SVG_MUSCLE_MAP,
  FULL_BODY_MUSCLES,
  getExerciseMuscleVolumes,
  SVG_MUSCLE_NAMES,
  lookupExerciseMuscleData,
  getSvgIdsForCsvMuscleName,
} from '../utils/muscle/muscleMapping';
import { ViewHeader } from './ViewHeader';
import { FANCY_FONT, TOOLTIP_THEMES, calculateCenteredTooltipPosition } from '../utils/ui/uiConstants';
import { format } from 'date-fns';
import { WeightUnit } from '../utils/storage/localStorage';
import { convertWeight } from '../utils/format/units';
import { formatSignedNumber } from '../utils/format/formatters';
import { formatDisplayVolume } from '../utils/format/volumeDisplay';
import { formatRelativeWithDate, getEffectiveNowFromWorkoutData, getSessionKey } from '../utils/date/dateUtils';
import { parseHevyDateString } from '../utils/date/parseHevyDateString';
import { LazyRender } from './LazyRender';

interface HistoryViewProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
  weightUnit?: WeightUnit;
  bodyMapGender?: BodyMapGender;
  stickyHeader?: boolean;
  onExerciseClick?: (exerciseName: string) => void;
  onDayTitleClick?: (date: Date) => void;
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
  current, previous, suffix = '', label, context = 'vs lst'
}) => {
  const delta = current - previous;
  if (delta === 0 || previous === 0) return null;
  
  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
  const pct = Math.round((delta / previous) * 100);
  
  return (
    <span
      className={`relative -top-[2px] inline-flex items-center gap-0.5 ml-1 text-[10px] font-bold leading-none ${colorClass}`}
      title={`${pct}% ${label} ${context}`}
    >
      <Icon className={`w-3 h-3 ${colorClass}`} />
      <span>{pct}%</span>
    </span>
  );
};

const buildSessionMuscleHeatmap = (
  sets: WorkoutSet[],
  exerciseMuscleData: Map<string, ExerciseMuscleData>
): { volumes: Map<string, number>; maxVolume: number } => {
  const volumes = new Map<string, number>();
  let maxVolume = 0;

  for (const set of sets) {
    if (!set.exercise_title) continue;
    if (isWarmupSet(set)) continue;
    const ex = lookupExerciseMuscleData(set.exercise_title, exerciseMuscleData);
    if (!ex) continue;

    const primary = ex.primary_muscle;
    if (primary === 'Cardio') continue;

    if (primary === 'Full Body') {
      for (const muscleName of FULL_BODY_MUSCLES) {
        const svgIds = CSV_TO_SVG_MUSCLE_MAP[muscleName] || [];
        for (const svgId of svgIds) {
          const next = (volumes.get(svgId) || 0) + 1;
          volumes.set(svgId, next);
          if (next > maxVolume) maxVolume = next;
        }
      }
      continue;
    }

    const primarySvgIds = getSvgIdsForCsvMuscleName(primary);
    for (const svgId of primarySvgIds) {
      const next = (volumes.get(svgId) || 0) + 1;
      volumes.set(svgId, next);
      if (next > maxVolume) maxVolume = next;
    }

    const secondaries = String(ex.secondary_muscle || '')
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m && m !== 'None');

    for (const secondary of secondaries) {
      const secondarySvgIds = getSvgIdsForCsvMuscleName(secondary);
      for (const svgId of secondarySvgIds) {
        const next = (volumes.get(svgId) || 0) + 0.5;
        volumes.set(svgId, next);
        if (next > maxVolume) maxVolume = next;
      }
    }
  }

  // Propagate volume across muscle groups - if any part of a group is hit, all parts should light up
  // This ensures e.g. all 3 deltoid heads light up when any one is targeted
  const muscleGroups: Record<string, string[]> = {
    'Shoulders': ['anterior-deltoid', 'lateral-deltoid', 'posterior-deltoid'],
    'Traps': ['upper-trapezius', 'lower-trapezius', 'traps-middle'],
    'Biceps': ['long-head-bicep', 'short-head-bicep'],
    'Triceps': ['medial-head-triceps', 'long-head-triceps', 'lateral-head-triceps'],
    'Chest': ['mid-lower-pectoralis', 'upper-pectoralis'],
    'Quadriceps': ['outer-quadricep', 'rectus-femoris', 'inner-quadricep'],
    'Hamstrings': ['medial-hamstrings', 'lateral-hamstrings'],
    'Glutes': ['gluteus-maximus', 'gluteus-medius'],
    'Calves': ['gastrocnemius', 'soleus', 'tibialis'],
    'Abdominals': ['lower-abdominals', 'upper-abdominals'],
    'Forearms': ['wrist-extensors', 'wrist-flexors'],
  };
  
  for (const groupParts of Object.values(muscleGroups)) {
    // Find max volume in this group
    let maxGroupVolume = 0;
    for (const part of groupParts) {
      const vol = volumes.get(part) || 0;
      if (vol > maxGroupVolume) maxGroupVolume = vol;
    }
    // If any part has volume, propagate to all parts
    if (maxGroupVolume > 0) {
      for (const part of groupParts) {
        if (!volumes.has(part)) {
          volumes.set(part, maxGroupVolume);
        }
      }
      // Update maxVolume after propagation
      if (maxGroupVolume > maxVolume) maxVolume = maxGroupVolume;
    }
  }

  return { volumes, maxVolume: Math.max(maxVolume, 1) };
};

const buildExerciseMuscleHeatmap = (
  sets: WorkoutSet[],
  exerciseData: ExerciseMuscleData | undefined
): { volumes: Map<string, number>; maxVolume: number } => {
  const workingSetCount = sets.filter((s) => !isWarmupSet(s)).length;
  const base = getExerciseMuscleVolumes(exerciseData);
  const volumes = new Map<string, number>();
  let maxVolume = 0;

  if (workingSetCount <= 0 || base.volumes.size === 0) {
    return { volumes, maxVolume: 1 };
  }

  base.volumes.forEach((w, svgId) => {
    const v = w * workingSetCount;
    volumes.set(svgId, v);
    if (v > maxVolume) maxVolume = v;
  });

  return { volumes, maxVolume: Math.max(maxVolume, 1) };
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

const isSameCalendarDay = (a: Date, b: Date) => format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd');

const HistoryCardSkeleton: React.FC<{ minHeight?: number }> = ({ minHeight = 220 }) => (
  <div
    className="bg-black/70 border border-slate-700/50 rounded-2xl p-4 sm:p-5 overflow-hidden"
    style={{ minHeight }}
  >
    <div className="animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded bg-slate-800/60" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-2/3 rounded bg-slate-800/60" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-800/50" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-10 rounded bg-slate-800/40" />
        <div className="h-10 rounded bg-slate-800/35" />
        <div className="h-10 rounded bg-slate-800/30" />
      </div>
    </div>
  </div>
);

const formatRestDuration = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  const days = Math.floor(ms / dayMs);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} rest`;

  const hours = Math.floor(ms / hourMs);
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} rest`;

  const mins = Math.floor(ms / minuteMs);
  if (mins >= 1) return `${mins} min rest`;

  return 'less than 1 min rest';
};

const formatWorkoutDuration = (ms: number): string | null => {
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const totalMinutes = Math.round(ms / (60 * 1000));
  if (totalMinutes <= 0) return 'less than 1 min';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hourPart = hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : '';
  const minutePart = minutes > 0 ? `${minutes} min${minutes === 1 ? '' : 's'}` : '';

  if (hourPart && minutePart) return `${hourPart} ${minutePart}`;
  return hourPart || minutePart;
};

const getSessionDurationMs = (session: Session): number | null => {
  const start = session.date;
  if (!start) return null;

  // Hevy exports the same end_time for all sets in a session; Strong derives end_time.
  // Still: pick the latest parseable end_time across the session to be safe.
  let endMs = NaN;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      const end = parseHevyDateString(String(s.end_time ?? '').trim());
      const t = end?.getTime?.() ?? NaN;
      if (Number.isFinite(t)) endMs = Math.max(Number.isFinite(endMs) ? endMs : t, t);
    }
  }

  if (!Number.isFinite(endMs)) return null;
  const dur = endMs - start.getTime();
  return Number.isFinite(dur) && dur > 0 ? dur : null;
};

// Simple sparkline component for volume trend
const Sparkline: React.FC<{ data: number[]; width?: number; height?: number; color?: string }> = ({ 
  data, 
  width = 60, 
  height = 20,
  color = '#10b981'
}) => {
  if (data.length < 2) return null;
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 4;
  const padY = 4;
  const innerW = Math.max(width - padX * 2, 1);
  const innerH = Math.max(height - padY * 2, 1);
  
  const points = data.map((val, i) => {
    const x = padX + (i / (data.length - 1)) * innerW;
    const y = padY + (innerH - ((val - min) / range) * innerH);
    return `${x},${y}`;
  }).join(' ');
  
  // Determine trend color
  const trend = data[data.length - 1] - data[0];
  const strokeColor = trend >= 0 ? '#10b981' : '#f43f5e';
  const markerId = `sparkline-arrow-${safeId}`;
  
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 6 10"
          refX="4.8"
          refY="5"
          markerWidth="5"
          markerHeight="9"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 6 5 L 0 10 z" fill={strokeColor} />
        </marker>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${markerId})`}
        opacity="0.8"
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
  const positionStyle = calculateCenteredTooltipPosition(rect, HISTORY_TOOLTIP_WIDTH);
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
      <div
        className={`border rounded-xl p-4 ${theme} inline-block w-fit`}
        style={{ maxWidth: HISTORY_TOOLTIP_WIDTH }}
      >
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
          <div className="text-sm leading-relaxed opacity-90 break-words whitespace-pre-line">{body}</div>
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
      if (isWarmupSet(set)) continue;
      if (!Number.isFinite(set.weight_kg) || !Number.isFinite(set.reps)) continue;
      if ((set.weight_kg || 0) <= 0 || (set.reps || 0) <= 0) continue;
      const sessionKey = getSessionKey(set);
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
      .filter(s => s.parsedDate && s.weight_kg > 0 && !isWarmupSet(s))
      .map((s, i) => ({ s, i }))
      .sort((a, b) => {
        const dt = a.s.parsedDate!.getTime() - b.s.parsedDate!.getTime();
        if (dt !== 0) return dt;
        const dsi = (a.s.set_index || 0) - (b.s.set_index || 0);
        if (dsi !== 0) return dsi;
        return a.i - b.i;
      })
      .map((x) => x.s);
    
    // Track running best for each exercise
    const runningBest = new Map<string, number>();
    
    for (const set of sortedSets) {
      const exercise = set.exercise_title;
      const currentBest = runningBest.get(exercise) || 0;
      const sessionKey = getSessionKey(set);
      
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

// Helper to track exercise best single-set volume over time ("Volume PR")
const useExerciseVolumePrHistory = (data: WorkoutSet[]) => {
  return useMemo(() => {
    const exerciseVolumePrBests = new Map<
      string,
      {
        date: Date;
        volume: number;
        sessionKey: string;
        previousBest: number;
        weight: number;
        reps: number;
        setIndex: number;
      }[]
    >();

    const runningBest = new Map<string, number>();

    const sortedSets = [...data]
      .filter(s => s.parsedDate && !isWarmupSet(s) && (s.weight_kg || 0) > 0 && (s.reps || 0) > 0)
      .sort((a, b) => {
        const dt = a.parsedDate!.getTime() - b.parsedDate!.getTime();
        if (dt !== 0) return dt;
        return (a.set_index || 0) - (b.set_index || 0);
      });

    for (const set of sortedSets) {
      const exercise = set.exercise_title;
      const vol = (set.weight_kg || 0) * (set.reps || 0);
      const currentBest = runningBest.get(exercise) || 0;
      if (vol <= currentBest) continue;

      if (!exerciseVolumePrBests.has(exercise)) {
        exerciseVolumePrBests.set(exercise, []);
      }

      exerciseVolumePrBests.get(exercise)!.push({
        date: set.parsedDate!,
        volume: Number(vol.toFixed(2)),
        sessionKey: getSessionKey(set),
        previousBest: Number(currentBest.toFixed(2)),
        weight: set.weight_kg,
        reps: set.reps,
        setIndex: set.set_index,
      });

      runningBest.set(exercise, vol);
    }

    return { exerciseVolumePrBests };
  }, [data]);
};

export const HistoryView: React.FC<HistoryViewProps> = ({ data, filtersSlot, weightUnit = 'kg' as import('../utils/storage/localStorage').WeightUnit, bodyMapGender = 'male', stickyHeader = false, onExerciseClick, onDayTitleClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());
  const [collapsedSessions, setCollapsedSessions] = useState<Set<string>>(() => new Set());

  const effectiveNow = useMemo(() => getEffectiveNowFromWorkoutData(data, new Date(0)), [data]);
  
  // Exercise volume history for deltas
  const exerciseVolumeHistory = useExerciseVolumeHistory(data);
  
  // Exercise best weights for PR tracking
  const { exerciseBests, currentBests } = useExerciseBestHistory(data);

  // Exercise best single-set volume PR tracking
  const { exerciseVolumePrBests } = useExerciseVolumePrHistory(data);

  useEffect(() => setCurrentPage(1), [data]);

  useEffect(() => {
    // When the dataset changes significantly (e.g. import/new filter), reset collapses.
    setCollapsedSessions(new Set());
  }, [data]);

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
      const key = getSessionKey(set);
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(set);
    });
    
    return Array.from(sessionMap.entries()).map(([key, sets]) => {
      // Group sets by exercise name (preserving first-seen order) so supersets/interleaving
      // don't split the same exercise into multiple cards.
      const groupedExercises: GroupedExercise[] = [];
      const setsByExercise = new Map<string, WorkoutSet[]>();
      const exerciseOrder: string[] = [];

      // Calculate session totals (working sets only)
      let totalVolume = 0;
      let totalPRs = 0;
      let totalSets = 0;
      
      sets.forEach((set) => {
        const exerciseName = set.exercise_title || 'Unknown';
        if (!setsByExercise.has(exerciseName)) {
          setsByExercise.set(exerciseName, []);
          exerciseOrder.push(exerciseName);
        }
        setsByExercise.get(exerciseName)!.push(set);

        if (!isWarmupSet(set)) {
          totalSets += 1;
          totalVolume += (set.weight_kg || 0) * (set.reps || 0);
          if (set.isPr) totalPRs++;
        }
      });

      for (const exerciseName of exerciseOrder) {
        const exerciseSets = setsByExercise.get(exerciseName) || [];
        const sortedSets = exerciseSets
          .map((s, i) => ({ s, i }))
          .sort((a, b) => (a.s.set_index || 0) - (b.s.set_index || 0) || a.i - b.i)
          .map((x) => x.s);

        groupedExercises.push({ exerciseName, sets: sortedSets });
      }

      return {
        key,
        date: sets[0].parsedDate,
        title: sets[0].title,
        startTime: sets[0].start_time,
        exercises: groupedExercises,
        totalSets,
        totalVolume,
        totalPRs,
      };
    })
      .filter((s) => s.totalSets > 0)
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [data]);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const currentSessions = sessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Tooltip Logic
  const buildTooltipState = (rect: DOMRect, data: any, variant: 'set' | 'macro'): TooltipState => {
    let title = '';
    let body = '';
    let status: AnalysisResult['status'] = 'info';
    let metrics: TooltipState['metrics'];
    let structured: StructuredTooltip | undefined;

    if (variant === 'set') {
      const insight = data as AnalysisResult;
      title = insight.shortMessage;
      body = insight.tooltip;
      status = insight.status;
      structured = insight.structured;
      if (!structured) {
        metrics = [{ label: 'Vol', value: insight.metrics.vol_drop_pct }, { label: 'Weight', value: insight.metrics.weight_change_pct }];
      }
    } else if (variant === 'macro') {
      const insight = data as SetWisdom;
      title = insight.message;
      body = insight.tooltip || '';
      status = insight.type === 'promote' ? 'success' : insight.type === 'demote' ? 'warning' : 'info';
    }

    return { rect, title, body, status, metrics, structured };
  };

  const handleMouseEnter = (e: React.MouseEvent, data: any, variant: 'set' | 'macro') => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip(buildTooltipState(rect, data, variant));
  };

  const handleTooltipToggle = (e: React.MouseEvent, data: any, variant: 'set' | 'macro') => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const next = buildTooltipState(rect, data, variant);

    setTooltip((prev) => {
      if (!prev) return next;
      const isSame = prev.title === next.title && prev.body === next.body;
      return isSame ? null : next;
    });
  };

  // Stats for header
  const totalSessions = sessions.length;
  const totalSets = useMemo(() => {
    let count = 0;
    for (const s of data) {
      if (isWarmupSet(s)) continue;
      count += 1;
    }
    return count;
  }, [data]);

  // Pagination controls for header
  const paginationControls = (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
        disabled={currentPage === 1}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 w-9 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200"
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
      <span className="text-xs font-medium text-slate-400 min-w-[80px] text-center">
        Page {currentPage} of {totalPages}
      </span>
      <button 
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
        disabled={currentPage === totalPages}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 w-9 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200"
      >
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );

  return (
    <div
      className="flex flex-col gap-2 w-full text-slate-200 pb-10"
      onClick={() => {
        if (tooltip) setTooltip(null);
      }}
    >
      {/* Header - sticky when a calendar filter is active */}
      <div className="hidden sm:contents">
        <ViewHeader
          leftStats={[{ icon: Calendar, value: totalSessions, label: 'Sessions' }]}
          rightStats={[{ icon: Dumbbell, value: totalSets, label: 'Sets' }]}
          filtersSlot={filtersSlot}
          sticky={stickyHeader}
          rightSlot={totalPages > 1 ? paginationControls : null}
        />
      </div>

      {/* 
        Animation Wrapper: 
        Keying by currentPage forces the animation to replay when page changes.
      */}
      <div key={currentPage} className="space-y-2 sm:space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-forwards">
        {currentSessions.map((session, index) => {
          const allSessionSets = session.exercises.flatMap(e => e.sets);
          const sessionHeatmap = buildSessionMuscleHeatmap(allSessionSets, exerciseMuscleData);
          const isCollapsed = collapsedSessions.has(session.key);
          const sessionDurationMs = getSessionDurationMs(session);
          const sessionDurationText = sessionDurationMs != null ? formatWorkoutDuration(sessionDurationMs) : null;
          const exerciseCount = session.exercises.length;

          const previousDisplayedSession = index > 0 ? currentSessions[index - 1] : null;
          const restMs = previousDisplayedSession?.date && session.date
            ? previousDisplayedSession.date.getTime() - session.date.getTime()
            : null;
          const restText = restMs != null ? formatRestDuration(restMs) : null;
          const restIsDayBreak = !!(previousDisplayedSession?.date && session.date && !isSameCalendarDay(previousDisplayedSession.date, session.date));
          
          // Find previous session for comparison
          const sessionIdx = sessions.findIndex(s => s.key === session.key);
          const prevSession = sessionIdx < sessions.length - 1 ? sessions[sessionIdx + 1] : null;

          return (
            <React.Fragment key={session.key}>
              {index > 0 && restText && (
                <div className={`${restIsDayBreak ? 'my-20 sm:my-28' : 'my-10 sm:my-12'} w-full flex justify-center`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-px ${restIsDayBreak ? 'h-24 sm:h-32' : 'h-14 sm:h-20'} bg-slate-800/70`} aria-hidden />
                    <div className="my-4 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm sm:text-base font-extrabold tracking-wide shadow-[0_0_18px_rgba(16,185,129,0.15)]">
                      {restText}
                    </div>
                    <div className={`w-px ${restIsDayBreak ? 'h-24 sm:h-32' : 'h-14 sm:h-20'} bg-slate-800/70`} aria-hidden />
                  </div>
                </div>
              )}
              <div 
                className="space-y-1 sm:space-y-2"
                style={{ animationDelay: `${index * 100}ms` }} // Staggered entrance
              >
              
              {/* --- Session Header Card --- */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  setCollapsedSessions((prev) => {
                    const next = new Set(prev);
                    if (next.has(session.key)) next.delete(session.key);
                    else next.add(session.key);
                    return next;
                  });
                }}
                onClick={(e) => {
                  const el = e.target as Element | null;
                  if (el?.closest('button,a,input,select,textarea,[data-no-toggle]')) return;
                  setCollapsedSessions((prev) => {
                    const next = new Set(prev);
                    if (next.has(session.key)) next.delete(session.key);
                    else next.add(session.key);
                    return next;
                  });
                }}
                className="border border-slate-700/50 rounded-2xl p-5 sm:p-7 min-h-[160px] sm:min-h-[168px] flex flex-row justify-between items-stretch gap-3 sm:gap-6 shadow-xl relative overflow-visible group transition-all duration-300 hover:border-slate-600/50 cursor-pointer active:scale-[0.99]"
                style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.78)' }}
              >
                <div
                  className="absolute inset-0 pointer-events-none rounded-2xl"
                  style={{ backgroundColor: 'rgb(var(--mw-history-header-tint-rgb) / var(--mw-history-header-tint-alpha))' }}
                />
                <div className="absolute inset-0 bg-slate-700/10 pointer-events-none rounded-2xl" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-500/10 transition-all duration-700"></div>
                
                <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-between gap-2 md:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg text-blue-400 flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3
                      className="text-lg sm:text-2xl md:text-3xl text-slate-200 tracking-tight truncate capitalize"
                      style={FANCY_FONT}
                      title={session.title}
                    >
                      {session.title}
                    </h3>
                    {session.totalPRs > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold flex-shrink-0">
                        <Trophy className="w-3 h-3" />
                        {session.totalPRs} PR{session.totalPRs > 1 ? 's' : ''}
                      </span>
                    )}

                    <div className="ml-auto flex items-center gap-1.5 pl-2 flex-shrink-0 text-black dark:text-slate-300">
                      <ChevronRight
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                        aria-hidden
                      />
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 pl-1">
                    {session.date ? formatRelativeWithDate(session.date, { now: effectiveNow }) : session.startTime}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 pl-1 min-w-0">
                    <span className="whitespace-nowrap">{session.totalSets} Sets</span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" aria-hidden />
                      <span>{exerciseCount} Exercise{exerciseCount === 1 ? '' : 's'}</span>
                    </span>
                    {sessionDurationText && (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" aria-hidden />
                        <span>{sessionDurationText}</span>
                      </span>
                    )}

                    <span className="flex items-baseline min-w-0">
                      <span className="whitespace-nowrap min-w-0 truncate">
                        {formatDisplayVolume(session.totalVolume, weightUnit, { round: 'int' })} {weightUnit}
                      </span>
                      {prevSession && (
                        <span className="flex-none overflow-visible">
                          <SessionDeltaBadge
                            current={session.totalVolume}
                            previous={prevSession.totalVolume}
                            label="volume"
                            context="vs lst"
                          />
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {sessionHeatmap.volumes.size > 0 && (
                  <div data-no-toggle className="relative z-10 flex-shrink-0 flex items-stretch pl-3 sm:pl-4 py-1 sm:py-2 border-l border-slate-800/50 self-stretch overflow-visible">
                    <div className="w-28 h-24 sm:w-32 sm:h-28 md:w-60 md:h-36 md:-mr-6 flex items-center justify-center overflow-visible">
                      <div className="w-full h-full md:scale-[1.25] origin-center overflow-visible">
                        <BodyMap
                          onPartClick={() => {}}
                          selectedPart={null}
                          muscleVolumes={sessionHeatmap.volumes}
                          maxVolume={sessionHeatmap.maxVolume}
                          compact
                          compactFill
                          interactive
                          gender={bodyMapGender}
                          onPartHover={(muscleId, ev) => {
                            if (!muscleId || !ev) {
                              setTooltip(null);
                              return;
                            }
                            const hoveredEl = (ev.target as Element | null)?.closest('g[id]');
                            const rect = hoveredEl?.getBoundingClientRect();
                            if (!rect) return;
                            const sets = sessionHeatmap.volumes.get(muscleId) || 0;
                            const label = SVG_MUSCLE_NAMES[muscleId] || muscleId;
                            const setsText = Number.isInteger(sets) ? `${sets}` : `${sets.toFixed(1)}`;
                            setTooltip({ rect, title: label, body: `${setsText} sets`, status: 'info' });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* --- Exercises Grid --- */}
              {!isCollapsed && (
              <div className="grid grid-cols-1 gap-2 sm:gap-2 animate-in fade-in duration-300">
                {session.exercises.map((group, idx) => {
                  const insights = analyzeSetProgression(group.sets);
                  const macroInsight = analyzeProgression(group.sets);
                  
                  // Get exercise best weight and check for PRs / Volume PRs in this session
                  const exerciseBest = currentBests.get(group.exerciseName) || 0;
                  const prEventsForSession = (exerciseBests.get(group.exerciseName) || []).filter((e) => e.sessionKey === session.key);

                  const volPrEventsForSession = (exerciseVolumePrBests.get(group.exerciseName) || []).filter((e) => e.sessionKey === session.key);
                  const volPrEvent = volPrEventsForSession.reduce(
                    (best, e) => (!best || e.volume > best.volume ? e : best),
                    null as (typeof volPrEventsForSession)[number] | null
                  );
                  
                  // Get volume trend for sparkline (last 6 sessions, reversed for chronological order)
                  const volHistory = exerciseVolumeHistory.get(group.exerciseName) || [];
                  const sparklineData = volHistory.slice(0, 6).map(v => v.volume).reverse();

                  const volPrAnchorIndex = (() => {
                    if (!volPrEvent) return -1;

                    const idx = group.sets.findIndex(
                      (s) =>
                        !isWarmupSet(s) &&
                        s.set_index === volPrEvent.setIndex &&
                        s.weight_kg === volPrEvent.weight &&
                        s.reps === volPrEvent.reps
                    );
                    if (idx >= 0) return idx;

                    // Fallback: anchor to the highest-volume working set within this session.
                    let bestIdx = -1;
                    let bestVol = -Infinity;
                    for (let i = 0; i < group.sets.length; i++) {
                      const s = group.sets[i];
                      if (isWarmupSet(s)) continue;
                      const v = (s.weight_kg || 0) * (s.reps || 0);
                      if (v > bestVol) {
                        bestVol = v;
                        bestIdx = i;
                      }
                    }
                    return bestIdx;
                  })();

                  return (
                    <LazyRender
                      key={`${session.key}:${group.exerciseName}`}
                      className="w-full"
                      placeholder={<HistoryCardSkeleton minHeight={260} />}
                      rootMargin="400px 0px"
                    >
                    <div className="bg-black/70 border border-slate-700/50 rounded-2xl p-4 sm:p-5 hover:border-slate-600/50 transition-all flex flex-col h-full hover:shadow-lg hover:shadow-black/20">
                      
                      {/* Exercise Title with thumbnail */}
                      <div
                        className="grid grid-cols-[2.5rem_1fr] grid-rows-2 gap-x-3 gap-y-1 mb-4 cursor-pointer select-none sm:flex sm:items-center sm:gap-3"
                        onClick={() => onExerciseClick?.(group.exerciseName)}
                        title="Open exercise details"
                      >
                        {(() => {
                          const asset = assetsMap?.get(group.exerciseName);
                          if (asset && (asset.thumbnail || asset.source)) {
                            return (
                              <img
                                src={asset.thumbnail || asset.source}
                                alt=""
                                className="w-10 h-10 rounded object-cover flex-shrink-0 row-span-2 bg-white"
                                loading="lazy"
                                decoding="async"
                              />
                            );
                          }
                          return (
                            <div className="w-10 h-10 rounded bg-black/50 row-span-2" />
                          );
                        })()}

                        <div className="flex items-center gap-2 min-w-0 col-start-2 row-start-1">
                          <h4
                            className="text-slate-200 text-sm sm:text-lg line-clamp-1 min-w-0 flex-1"
                            style={FANCY_FONT}
                            title={group.exerciseName}
                          >
                            {group.exerciseName}
                          </h4>

                          {/* Macro Badge (Promotion) */}
                          {macroInsight && (
                            <button
                              type="button"
                              onClick={(e) => handleTooltipToggle(e, macroInsight, 'macro')}
                              onMouseEnter={(e) => handleMouseEnter(e, macroInsight, 'macro')}
                              onMouseLeave={() => setTooltip(null)}
                              className={`p-1.5 rounded-lg cursor-help flex-shrink-0 ${getWisdomColor(macroInsight.type)} animate-in zoom-in duration-300`}
                              aria-label={macroInsight.message}
                            >
                              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>

                        {/* Stats: placed after name, slightly larger */}
                        <div className="min-w-0 col-start-2 row-start-2 sm:flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-sm text-slate-400 overflow-visible">
                            {sparklineData.length >= 2 && (
                              <span className="inline-flex items-center opacity-70 pr-1" title="Volume trend (last 6 sessions)">
                                <Sparkline data={sparklineData} width={62} height={20} />
                              </span>
                            )}
                            <span className="text-slate-300">
                              PR: <span className="font-semibold">{convertWeight(exerciseBest, weightUnit)}{weightUnit}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main content: Sets on left, Muscle map on right */}
                      <div className="flex gap-4 flex-1 items-stretch">
                        {/* Sets Timeline */}
                        <div className="relative flex-1 min-w-0 flex flex-col justify-center gap-2">
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

                          const prDelta = (() => {
                            if (!set.isPr || !set.parsedDate) return 0;
                            const ev = prEventsForSession.find(
                              (p) => p.date.getTime() === set.parsedDate!.getTime() && p.weight === set.weight_kg
                            );
                            if (!ev) return 0;
                            const deltaKg = set.weight_kg - ev.previousBest;
                            return deltaKg > 0 ? deltaKg : 0;
                          })();
                          
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
                              className={`relative z-10 flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg border ${rowStatusClass} transition-all hover:bg-black/60 group overflow-visible`}
                              style={prShimmerStyle}
                            >
                              {/* Set Number Bubble - W for warmup, 1,2,3... for working sets */}
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold border-2 transition-all ${dotClass} text-white`}>
                                {isWarmup ? 'W' : workingSetNumber}
                              </div>

                              {/* Set Data */}
                              <div className="flex-1 flex justify-between items-center min-w-0">
                                <div className="flex items-baseline gap-0.5 sm:gap-1 min-w-0">
                                  <span className="text-[clamp(12px,4.2vw,20px)] font-bold text-white tabular-nums tracking-tight">
                                    {convertWeight(set.weight_kg, weightUnit)}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{weightUnit}</span>
                                  <span className="text-slate-700 mx-0.5 sm:mx-1">×</span>
                                  <span className="text-[clamp(12px,4.2vw,20px)] font-bold text-slate-200 tabular-nums tracking-tight">
                                    {set.reps}
                                  </span>
                                  <span className="text-[10px] sm:text-xs text-slate-500 font-medium">reps</span>
                                </div>

                                {/* Right side: PR badge + Insight indicator */}
                                <div className="flex items-center gap-1 sm:gap-2 flex-none pl-2">
                                  {/* PR INDICATOR - positioned before tooltip */}
                                  {(set.isPr || (volPrEvent && sIdx === volPrAnchorIndex)) && (
                                    <span className="flex items-center gap-1 px-1 py-0.5 bg-amber-200/70 text-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 rounded text-[7px] sm:text-[9px] font-bold uppercase tracking-wider border border-amber-300/80 dark:border-yellow-500/20 animate-pulse whitespace-nowrap leading-none">
                                      <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-none" />

                                      {set.isPr && (
                                        <span className="inline-flex items-center leading-none">
                                          <span>PR</span>
                                          {prDelta > 0 && (
                                            <span className="ml-0.5 text-[5px] sm:text-[8px] font-extrabold text-yellow-500 leading-none">
                                              {formatSignedNumber(convertWeight(prDelta, weightUnit), { maxDecimals: 2 })}{weightUnit}
                                            </span>
                                          )}
                                        </span>
                                      )}

                                      {volPrEvent && sIdx === volPrAnchorIndex && (
                                        <span
                                          className="inline-flex items-center leading-none"
                                          title="Volume PR (best-ever single-set volume)"
                                          aria-label="Volume PR (best-ever single-set volume)"
                                        >
                                          {set.isPr && <span className="hidden sm:inline text-slate-600 dark:text-slate-300 mx-1">·</span>}
                                          <span>Vol PR</span>
                                          {volPrEvent.previousBest > 0 && (
                                            <span className="ml-0.5 text-[5px] sm:text-[8px] font-extrabold text-yellow-500 dark:text-yellow-300 leading-none">
                                              {formatSignedNumber(((volPrEvent.volume - volPrEvent.previousBest) / volPrEvent.previousBest) * 100, { maxDecimals: 0 })}%
                                            </span>
                                          )}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  
                                  {/* Insight Indicator */}
                                  {insight && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleTooltipToggle(e, insight, 'set')}
                                      onMouseEnter={(e) => handleMouseEnter(e, insight, 'set')}
                                      onMouseLeave={() => setTooltip(null)}
                                      className="cursor-help flex items-center justify-center w-6 h-6 rounded hover:bg-black/60 transition-colors"
                                      aria-label={insight.shortMessage}
                                    >
                                      {insight.status === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                                      {insight.status === 'success' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                                      {insight.status === 'warning' && <TrendingDown className="w-4 h-4 text-amber-500" />}
                                      {insight.status === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })})()}
                        </div>

                        {/* Muscle Heat Map - Right Side */}
                        {(() => {
                          const exData = lookupExerciseMuscleData(group.exerciseName, exerciseMuscleData);
                          const { volumes, maxVolume } = buildExerciseMuscleHeatmap(group.sets, exData);
                          
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
                            <div className="hidden sm:flex flex-col flex-shrink-0 pl-3 py-2 border-l border-slate-800/50 self-stretch">
                              <div className="flex-1 w-52 md:w-60 flex items-center justify-center">
                                <BodyMap
                                  onPartClick={() => {}}
                                  selectedPart={null}
                                  muscleVolumes={volumes}
                                  maxVolume={maxVolume}
                                  compact
                                  compactFill
                                  interactive
                                  gender={bodyMapGender}
                                  onPartHover={(muscleId, ev) => {
                                    if (!muscleId || !ev) {
                                      setTooltip(null);
                                      return;
                                    }
                                    const hoveredEl = (ev.target as Element | null)?.closest('g[id]');
                                    const rect = hoveredEl?.getBoundingClientRect();
                                    if (!rect) return;
                                    const sets = volumes.get(muscleId) || 0;
                                    const label = SVG_MUSCLE_NAMES[muscleId] || muscleId;
                                    const setsText = Number.isInteger(sets) ? `${sets}` : `${sets.toFixed(1)}`;
                                    setTooltip({ rect, title: label, body: `${setsText} sets`, status: 'info' });
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    </LazyRender>
                  );
                })}
              </div>
              )}

              </div>
            </React.Fragment>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="sm:hidden flex justify-center pt-4 pb-6">
          {paginationControls}
        </div>
      )}

      {tooltip && <TooltipPortal data={tooltip} />}
    </div>
  );
};