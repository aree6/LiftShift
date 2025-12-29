import React, { useState, useMemo, useEffect, useRef } from 'react';
import { subDays } from 'date-fns';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Search, TrendingUp, TrendingDown, AlertTriangle, Minus, Activity, Hourglass,
  Dumbbell, Scale
} from 'lucide-react';
import { ExerciseStats, ExerciseHistoryEntry } from '../types';
import { CHART_TOOLTIP_STYLE, FANCY_FONT } from '../utils/ui/uiConstants';
import { getExerciseAssets, ExerciseAsset } from '../utils/data/exerciseAssets';
import { createExerciseAssetLookup, ExerciseAssetLookup } from '../utils/exercise/exerciseAssetLookup';
import { getDateKey, TimePeriod, formatRelativeDay, formatDayContraction } from '../utils/date/dateUtils';
import { BodyMap, BodyMapGender } from './BodyMap';
import { LazyRender } from './LazyRender';
import { ChartSkeleton } from './ChartSkeleton';
import { 
  loadExerciseMuscleData, 
  ExerciseMuscleData, 
  getExerciseMuscleVolumes,
  getVolumeColor,
  SVG_MUSCLE_NAMES,
  lookupExerciseMuscleData,
} from '../utils/muscle/muscleMapping';
import { WeightUnit, getSmartFilterMode, TimeFilterMode } from '../utils/storage/localStorage';
import { convertWeight, getStandardWeightIncrementKg } from '../utils/format/units';
import { summarizeExerciseHistory, analyzeExerciseTrendCore, ExerciseSessionEntry, ExerciseTrendStatus, MIN_SESSIONS_FOR_TREND } from '../utils/analysis/exerciseTrend';
import { formatNumber, formatSignedNumber } from '../utils/format/formatters';
import { pickDeterministic } from '../utils/analysis/messageVariations';
import { addEmaSeries, DEFAULT_EMA_HALF_LIFE_DAYS } from '../utils/analysis/ema';

// --- TYPES & LOGIC ---
type ExerciseStatus = ExerciseTrendStatus;

// Delta calculation for exercise progress
interface ExerciseDeltas {
  weightDelta: number;
  repsDelta: number;
  oneRMDelta: number;
  volumeDelta: number;
  sessionsSinceImprovement: number;
  lastSessionDate: Date | null;
  bestWeight: number;
  previousBestWeight: number;  // Best weight before the current best
  bestImprovement: number;     // Current best - previous best
  avgWeightLast3: number;
}

// summarizeExerciseHistory imported from utils/exerciseTrend

const calculateExerciseDeltas = (history: ExerciseHistoryEntry[]): ExerciseDeltas => {
  const sorted = summarizeExerciseHistory(history);
  
  if (sorted.length < 2) {
    return {
      weightDelta: 0,
      repsDelta: 0,
      oneRMDelta: 0,
      volumeDelta: 0,
      sessionsSinceImprovement: 0,
      lastSessionDate: sorted[0]?.date || null,
      bestWeight: sorted[0]?.weight || 0,
      previousBestWeight: 0,
      bestImprovement: 0,
      avgWeightLast3: sorted[0]?.weight || 0,
    };
  }

  const latest = sorted[0];
  const previous = sorted[1];
  
  // Calculate deltas vs last session
  const weightDelta = latest.weight - previous.weight;
  const repsDelta = latest.reps - previous.reps;
  const oneRMDelta = Number((latest.oneRepMax - previous.oneRepMax).toFixed(1));
  const volumeDelta = latest.volume - previous.volume;
  
  // Find current best and previous best weights
  const allWeights = sorted.map(h => h.weight);
  const maxWeight = Math.max(...allWeights);
  
  // Find the second highest unique weight (previous best)
  const uniqueWeights = [...new Set(allWeights)].sort((a, b) => b - a);
  const previousBestWeight = uniqueWeights.length > 1 ? uniqueWeights[1] : uniqueWeights[0];
  const bestImprovement = Number((maxWeight - previousBestWeight).toFixed(2));
  
  // Find sessions since last weight improvement
  let sessionsSinceImprovement = 0;
  for (const entry of sorted) {
    if (entry.weight >= maxWeight) break;
    sessionsSinceImprovement++;
  }
  
  // Average of last 3 sessions
  const last3 = sorted.slice(0, 3);
  const avgWeightLast3 = last3.reduce((sum, h) => sum + h.weight, 0) / last3.length;
  
  return {
    weightDelta: Number(weightDelta.toFixed(2)),
    repsDelta,
    oneRMDelta: Number(oneRMDelta.toFixed(2)),
    volumeDelta: Number(volumeDelta.toFixed(2)),
    sessionsSinceImprovement,
    lastSessionDate: latest.date,
    bestWeight: Number(maxWeight.toFixed(2)),
    previousBestWeight: Number(previousBestWeight.toFixed(2)),
    bestImprovement,
    avgWeightLast3: Number(avgWeightLast3.toFixed(2)),
  };
};

const getLatestHistoryKey = (history: ExerciseHistoryEntry[]): string => {
  let maxTs = -Infinity;
  for (const h of history) {
    const ts = h.date?.getTime?.() ?? NaN;
    if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
  }
  return Number.isFinite(maxTs) ? String(maxTs) : '0';
};

interface StatusResult {
  status: ExerciseStatus;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  title: string;
  description: string;
  subtext?: string;
  confidence?: 'low' | 'medium' | 'high';
  evidence?: string[];
  label: string;
  isBodyweightLike: boolean;
}

const analyzeExerciseTrend = (stats: ExerciseStats, weightUnit: WeightUnit): StatusResult => {
  const core = analyzeExerciseTrendCore(stats);
  const seedBase = `${stats.name}|${core.status}|${getLatestHistoryKey(stats.history)}`;

  if (core.status === 'new') {
    const title = pickDeterministic(`${seedBase}|title`, [
      'Building baseline',
      'Learning your pattern',
      'Collecting reps & load',
    ] as const);
    const description = pickDeterministic(`${seedBase}|desc`, [
      'Log a few more sessions and we’ll summarize your trend.',
      'A few more exposures and we can confidently call your trend.',
      'Keep logging this lift—trend insights unlock after a few sessions.',
    ] as const);
    const subtext = pickDeterministic(`${seedBase}|sub`, [
      'Aim for similar setup and rep range for 2-3 sessions.',
      'Consistency beats randomness here—keep variables steady.',
      'Use a repeatable rep target so the signal is clean.',
    ] as const);
    return {
      status: 'new',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      icon: Hourglass,
      title,
      description,
      subtext,
      confidence: core.confidence,
      evidence: core.evidence,
      label: 'baseline',
      isBodyweightLike: core.isBodyweightLike,
    };
  }

  if (core.status === 'stagnant') {
    const minReps = core.plateau?.minReps ?? 0;
    const maxReps = core.plateau?.maxReps ?? 0;
    const w = core.plateau?.weight ?? 0;
    const plateauWeight = convertWeight(w, weightUnit);
    const suggestedNext = convertWeight(w + getStandardWeightIncrementKg(weightUnit), weightUnit);

    const title = pickDeterministic(`${seedBase}|title`, [
      'Plateauing',
      'Holding steady',
      'Stalled (for now)',
    ] as const);

    const description = pickDeterministic(`${seedBase}|desc`, [
      () => (core.isBodyweightLike
        ? `You've been circling ${minReps}-${maxReps} reps for a few sessions.`
        : `Your top set has hovered at ${plateauWeight}${weightUnit} for ${minReps}-${maxReps} reps.`),
      () => (core.isBodyweightLike
        ? `Recent sessions repeat the same rep ceiling: ${minReps}-${maxReps}.`
        : `Recent sessions repeat: ${plateauWeight}${weightUnit} × ${minReps}-${maxReps}.`),
      () => (core.isBodyweightLike
        ? `Progress is flat—reps are consistently ${minReps}-${maxReps}.`
        : `Progress is flat—load and reps are consistently ${plateauWeight}${weightUnit} × ${minReps}-${maxReps}.`),
    ] as const)();

    const subtext = pickDeterministic(`${seedBase}|sub`, [
      () => (core.isBodyweightLike
        ? 'Next session: add 1 rep on your first working set, then match the rest.'
        : `Next session: try ${suggestedNext}${weightUnit} for a small single-step overload.`),
      () => (core.isBodyweightLike
        ? 'Try adding one extra set (same reps) to force adaptation.'
        : `If jumps feel big, repeat the same weight and chase +1 rep instead.`),
      () => (core.isBodyweightLike
        ? 'Keep reps the same, slow the tempo, and aim for cleaner reps.'
        : 'Keep weight the same, add a rep or two across sets, then increase load.'),
    ] as const)();

    return {
      status: 'stagnant',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      icon: AlertTriangle,
      title,
      description,
      subtext,
      confidence: core.confidence,
      evidence: core.evidence,
      label: 'plateauing',
      isBodyweightLike: core.isBodyweightLike,
    };
  }

  if (core.status === 'overload') {
    const title = pickDeterministic(`${seedBase}|title`, [
      'Gaining',
      'Momentum',
      'Progressing',
    ] as const);
    const description = pickDeterministic(`${seedBase}|desc`, [
      () => (core.isBodyweightLike ? 'Nice. Your reps are trending up.' : 'Nice. Your estimated strength is trending up.'),
      () => (core.isBodyweightLike ? 'Reps are moving in the right direction.' : 'Strength trend is positive—keep steering it.'),
      () => (core.isBodyweightLike ? 'You’re building capacity—rep ceiling is rising.' : 'You’re building strength—your top end is climbing.'),
    ] as const)();
    const subtext = pickDeterministic(`${seedBase}|sub`, [
      () => (core.isBodyweightLike ? 'Keep one rep in reserve and add reps week-to-week.' : 'Keep jumps small and repeatable (microload works).'),
      () => (core.isBodyweightLike ? 'If reps feel easy, add load or add a set.' : 'If bar speed is good, consider a small load bump.'),
      () => (core.isBodyweightLike ? 'Stay consistent with setup so the signal stays clean.' : 'Repeat the same setup/tempo to keep progress comparable.'),
    ] as const)();
    return {
      status: 'overload',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      icon: TrendingUp,
      title,
      description,
      subtext,
      confidence: core.confidence,
      evidence: core.evidence,
      label: 'gaining',
      isBodyweightLike: core.isBodyweightLike,
    };
  }

  if (core.status === 'regression') {
    const title = pickDeterministic(`${seedBase}|title`, [
      'Losing',
      'Downtrend',
      'Fatigue showing',
    ] as const);
    const description = pickDeterministic(`${seedBase}|desc`, [
      () => (core.isBodyweightLike
        ? 'Reps are trending down (often fatigue, stress, or form changes).'
        : 'Strength is trending down (often fatigue, stress, or form changes).'),
      () => (core.isBodyweightLike
        ? 'Performance is slipping a bit—don’t panic, adjust variables.'
        : 'Performance is slipping a bit—don’t panic, adjust variables.'),
      () => (core.isBodyweightLike
        ? 'Short-term dips are common—recover and rebuild the trend.'
        : 'Short-term dips are common—recover and rebuild the trend.'),
    ] as const)();
    const subtext = pickDeterministic(`${seedBase}|sub`, [
      () => 'Consider a deload or a lighter week, then rebuild.',
      () => 'If effort is high but output is low, take an easier week and rebuild.',
      () => 'Short-term dips happen—prioritize sleep, food, and consistent technique.',
    ] as const)();
    return {
      status: 'regression',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      icon: TrendingDown,
      title,
      description,
      subtext,
      confidence: core.confidence,
      evidence: core.evidence,
      label: 'losing',
      isBodyweightLike: core.isBodyweightLike,
    };
  }

  const title = pickDeterministic(`${seedBase}|title`, [
    'Maintaining',
    'Stable',
    'Holding pattern',
  ] as const);
  const description = pickDeterministic(`${seedBase}|desc`, [
    () => (core.isBodyweightLike
      ? 'Performance is stable. Keep building reps with good control.'
      : 'Strength is stable. Keep consistency and small progressions.'),
    () => (core.isBodyweightLike
      ? 'Reps are steady—this is a good place to tighten technique and add volume.'
      : 'Strength is steady—this is a good place to tighten technique and add volume.'),
    () => (core.isBodyweightLike
      ? 'Not a setback—just steady. Pick one lever to progress next.'
      : 'Not a setback—just steady. Pick one lever to progress next.'),
  ] as const)();
  const subtext = pickDeterministic(`${seedBase}|sub`, [
    () => (core.isBodyweightLike
      ? 'Try progressing reps, tempo, or adding external load.'
      : 'Try a small rep increase, then a small load increase.'),
    () => 'Choose one: add a rep, add a set, or add a tiny load jump.',
    () => 'If this feels easy, slightly increase effort (closer to failure) for a week.',
  ] as const)();

  return {
    status: 'neutral',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    icon: Minus,
    title,
    description,
    subtext,
    confidence: core.confidence,
    evidence: core.evidence,
    label: 'maintaining',
    isBodyweightLike: core.isBodyweightLike,
  };
};

// --- SUB-COMPONENTS ---

// Delta Badge for showing +/- changes
const DeltaBadge: React.FC<{ delta: number; suffix?: string; invert?: boolean; size?: 'default' | 'compact' }> = ({ delta, suffix = '', invert = false, size = 'default' }) => {
  if (delta === 0) return null;
  
  const isPositive = invert ? delta < 0 : delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10';
  const text = formatSignedNumber(delta, { maxDecimals: 2 });
  
  return (
    <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold ${colorClass} ${size === 'compact' ? 'scale-90 origin-left' : ''}`}>
      <Icon className="w-2.5 h-2.5" />
      {text}{suffix}
    </span>
  );
};

const ConfidenceBadge: React.FC<{ confidence?: 'low' | 'medium' | 'high' }> = ({ confidence }) => {
  if (!confidence) return null;

  const meta = (() => {
    switch (confidence) {
      case 'high':
        return {
          label: 'High confidence',
          cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'medium':
        return {
          label: 'Medium confidence',
          cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'low':
      default:
        return {
          label: 'Low confidence',
          cls: 'bg-slate-700/20 text-slate-400 border-slate-700/30',
        };
    }
  })();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold whitespace-nowrap ${meta.cls}`}
      title="Confidence reflects how consistent/recent your logged sessions are for this exercise."
      aria-label={meta.label}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
};

const StatCard = ({ label, value, unit, icon: Icon, delta, deltaSuffix }: { 
  label: string; 
  value: string | number; 
  unit?: string; 
  icon: React.ElementType;
  delta?: number;
  deltaSuffix?: string;
}) => (
  <div className="bg-black/70 border border-slate-700/50 p-4 md:p-5 rounded-lg flex items-center justify-between group hover:border-slate-600/50 transition-colors duration-300 h-full">
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
      {delta !== undefined && delta !== 0 && (
        <div className="mt-1">
          <DeltaBadge delta={delta} suffix={deltaSuffix} />
        </div>
      )}
    </div>
    <div className="h-9 w-9 rounded-md bg-black/50 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors flex-shrink-0">
      <Icon size={16} />
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label, weightUnit }: any) => {
  if (active && payload && payload.length) {
    const unit = weightUnit || 'kg';
    const oneRM = payload.find((p: any) => p.dataKey === 'oneRepMax')?.value;
    const emaValue = payload.find((p: any) => p.dataKey === 'emaValue')?.value;
    const lifted = payload.find((p: any) => p.dataKey === 'weight')?.value;
    const reps = payload.find((p: any) => p.dataKey === 'reps')?.value;
    const sets = payload.find((p: any) => p.dataKey === 'sets')?.value;

    const fmt1 = (v: unknown) => formatNumber(typeof v === 'number' ? v : Number(v), { maxDecimals: 1 });
    return (
      <div
        className="p-3 rounded-lg shadow-2xl"
        style={{
          ...CHART_TOOLTIP_STYLE,
          borderStyle: 'solid',
          borderWidth: 1,
          boxShadow: '0 20px 50px -15px rgb(0 0 0 / 0.35)',
        }}
      >
        <p className="text-slate-400 text-xs mb-2 font-mono">{label}</p>
        <div className="space-y-1">
          {typeof reps === 'number' ? (
            <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Reps: <span style={FANCY_FONT}>{Math.round(reps)}</span>
            </p>
          ) : (
            <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              1RM: <span style={FANCY_FONT}>{fmt1(oneRM)} {unit}</span>
            </p>
          )}

          {typeof emaValue === 'number' ? (
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-0.5 bg-white/80"></span>
              EMA:{' '}
              <span style={FANCY_FONT}>
                {typeof reps === 'number' ? fmt1(emaValue) : `${fmt1(emaValue)} ${unit}`}
              </span>
            </p>
          ) : null}
          {typeof sets === 'number' ? (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              Sets: {Math.round(sets)}
            </p>
          ) : typeof lifted === 'number' ? (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              Lifted: {fmt1(lifted)} {unit}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  return null;
};

// --- MAIN COMPONENT ---

interface ExerciseViewProps {
  stats: ExerciseStats[];
  filtersSlot?: React.ReactNode;
  highlightedExercise?: string | null;
  onHighlightApplied?: () => void;
  weightUnit?: WeightUnit;
  bodyMapGender?: BodyMapGender;
  stickyHeader?: boolean;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({ stats, filtersSlot, highlightedExercise, onHighlightApplied, weightUnit = 'kg' as WeightUnit, bodyMapGender = 'male', stickyHeader = false }) => {
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(highlightedExercise || stats[0]?.name || "");
  const [trendFilter, setTrendFilter] = useState<ExerciseTrendStatus | null>(null);

  const exerciseButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const getSelectedHighlightClasses = (status: ExerciseStatus, intensity: 'strong' | 'soft' = 'strong') => {
    switch (status) {
      case 'overload':
        return {
          button: intensity === 'soft'
            ? 'bg-emerald-500/5 border-emerald-400/40 ring-1 ring-emerald-500/15'
            : 'bg-emerald-500/10 border-emerald-400/70 ring-2 ring-emerald-500/25 shadow-[0_0_0_1px_rgba(52,211,153,0.25),0_0_18px_rgba(16,185,129,0.12)]',
          thumbBorder: intensity === 'soft' ? 'border-emerald-400/40' : 'border-emerald-400/70',
        };
      case 'regression':
        return {
          button: intensity === 'soft'
            ? 'bg-rose-500/5 border-rose-400/40 ring-1 ring-rose-500/15'
            : 'bg-rose-500/10 border-rose-400/70 ring-2 ring-rose-500/25 shadow-[0_0_0_1px_rgba(251,113,133,0.25),0_0_18px_rgba(244,63,94,0.12)]',
          thumbBorder: intensity === 'soft' ? 'border-rose-400/40' : 'border-rose-400/70',
        };
      case 'stagnant':
        return {
          button: intensity === 'soft'
            ? 'bg-amber-500/5 border-amber-400/40 ring-1 ring-amber-500/15'
            : 'bg-amber-500/10 border-amber-400/70 ring-2 ring-amber-500/25 shadow-[0_0_0_1px_rgba(251,191,36,0.22),0_0_18px_rgba(245,158,11,0.10)]',
          thumbBorder: intensity === 'soft' ? 'border-amber-400/40' : 'border-amber-400/70',
        };
      case 'neutral':
        return {
          button: intensity === 'soft'
            ? 'bg-indigo-500/5 border-indigo-400/40 ring-1 ring-indigo-500/15'
            : 'bg-indigo-500/10 border-indigo-400/70 ring-2 ring-indigo-500/25 shadow-[0_0_0_1px_rgba(129,140,248,0.22),0_0_18px_rgba(99,102,241,0.10)]',
          thumbBorder: intensity === 'soft' ? 'border-indigo-400/40' : 'border-indigo-400/70',
        };
      case 'new':
      default:
        return {
          button: intensity === 'soft'
            ? 'bg-blue-600/10 border-blue-400/40 ring-1 ring-blue-500/15'
            : 'bg-blue-600/15 border-blue-400/70 ring-2 ring-blue-500/25 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_18px_rgba(59,130,246,0.12)]',
          thumbBorder: intensity === 'soft' ? 'border-blue-400/40' : 'border-blue-400/70',
        };
    }
  };
  
  // Update selection when highlightedExercise changes
  useEffect(() => {
    if (!highlightedExercise) return;

    const trimmed = highlightedExercise.trim();
    const exact = stats.find(s => s.name === trimmed)?.name;
    const caseInsensitive = exact
      ? exact
      : stats.find(s => s.name.trim().toLowerCase() === trimmed.toLowerCase())?.name;

    if (!caseInsensitive) return;

    setSelectedExerciseName(caseInsensitive);
    requestAnimationFrame(() => {
      const el = exerciseButtonRefs.current[caseInsensitive];
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    onHighlightApplied?.();
  }, [highlightedExercise, onHighlightApplied, stats]);

  const effectiveNow = useMemo(() => {
    let maxTs = -Infinity;
    for (const s of stats) {
      for (const h of s.history) {
        const ts = h.date?.getTime?.() ?? NaN;
        if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
      }
    }
    return Number.isFinite(maxTs) ? new Date(maxTs) : new Date(0);
  }, [stats]);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);
  const [viewModeOverride, setViewModeOverride] = useState<TimeFilterMode | null>(null);
  const [exerciseMuscleData, setExerciseMuscleData] = useState<Map<string, ExerciseMuscleData>>(new Map());

  // Create fuzzy asset lookup that can resolve exercise name variations
  const assetLookup = useMemo<ExerciseAssetLookup | null>(() => {
    if (!assetsMap) return null;
    return createExerciseAssetLookup(assetsMap);
  }, [assetsMap]);

  // Selected exercise stats
  const selectedStats = useMemo(() => 
    stats.find(s => s.name === selectedExerciseName), 
  [stats, selectedExerciseName]);

  const selectedSessions = useMemo(() => {
    if (!selectedStats) return [] as ExerciseSessionEntry[];
    return summarizeExerciseHistory(selectedStats.history);
  }, [selectedStats]);

  const inactiveReason = useMemo(() => {
    if (!selectedStats) return null;

    const activeSince = subDays(effectiveNow, 60);
    const lastDate = selectedSessions[0]?.date ?? null;
    const tooOld = !lastDate || lastDate < activeSince;
    const notEnoughData = selectedSessions.length < MIN_SESSIONS_FOR_TREND;

    if (!tooOld && !notEnoughData) return null;

    const parts: string[] = [];
    if (tooOld) parts.push('You haven\'t trained this exercise recently');
    if (notEnoughData) parts.push('Building baseline (need a few more sessions)');

    return {
      parts,
      tooOld,
      notEnoughData,
    };
  }, [effectiveNow, selectedSessions, selectedStats]);

  // Calculate date range span for selected exercise
  const exerciseSpanDays = useMemo(() => {
    if (selectedSessions.length === 0) return 0;
    const dates = selectedSessions.map(h => h.date.getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
  }, [selectedSessions]);

  // Smart mode based on date range span
  const smartMode = useMemo(() => getSmartFilterMode(exerciseSpanDays), [exerciseSpanDays]);

  // Reset override when exercise or smart mode changes
  useEffect(() => {
    setViewModeOverride(null);
  }, [smartMode, selectedExerciseName]);

  // Effective view mode: override if set, otherwise smart mode
  const viewMode = viewModeOverride ?? smartMode;
  const setViewMode = setViewModeOverride;

  useEffect(() => {
    let mounted = true;
    getExerciseAssets()
      .then(m => { if (mounted) setAssetsMap(m); })
      .catch(() => setAssetsMap(new Map()));
    loadExerciseMuscleData()
      .then(m => { if (mounted) setExerciseMuscleData(m); });
    return () => { mounted = false; };
  }, []);

  // Memoize status map to prevent recalc on every render
  const statusMap = useMemo<Record<string, StatusResult>>(() => {
    const map: Record<string, StatusResult> = Object.create(null);
    for (const s of stats) {
      map[s.name] = analyzeExerciseTrend(s, weightUnit);
    }
    return map;
  }, [stats, weightUnit]);

  const lastSessionByName = useMemo(() => {
    const map = new Map<string, Date | null>();
    for (const s of stats) {
      let last: Date | null = null;
      for (const h of s.history) {
        const d = h.date;
        if (!d) continue;
        if (!last || d.getTime() > last.getTime()) last = d;
      }
      map.set(s.name, last);
    }
    return map;
  }, [stats]);

  const selectedExerciseMuscleInfo = useMemo(() => {
    const exData = selectedStats ? lookupExerciseMuscleData(selectedStats.name, exerciseMuscleData) : undefined;
    const { volumes, maxVolume } = getExerciseMuscleVolumes(exData);

    // Aggregate by display name (e.g. Chest has multiple SVG ids)
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

    return { exData, volumes, maxVolume, primaryTargets, secondaryTargets };
  }, [selectedStats, exerciseMuscleData]);

  const getTargetTextColor = (sets: number, maxSets: number): string => {
    const ratio = sets / Math.max(maxSets, 1);
    return ratio >= 0.55 ? '#ffffff' : '#0f172a';
  };

  const trainingStructure = useMemo(() => {
    const activeSince = subDays(effectiveNow, 60);

    let activeCount = 0;
    let overloadCount = 0;
    let plateauCount = 0;
    let regressionCount = 0;
    let neutralCount = 0;
    let newCount = 0;

    const statusByName = new Map<string, ExerciseTrendStatus>();
    const eligibleNames = new Set<string>();
    const eligibilityByName = new Map<string, { isEligible: boolean; inactiveLabel: string }>();

    for (const stat of stats) {
      const sessions = summarizeExerciseHistory(stat.history);
      const lastDate = sessions[0]?.date ?? null;
      const tooOld = !lastDate || lastDate < activeSince;
      const notEnoughData = sessions.length < MIN_SESSIONS_FOR_TREND;
      const isEligible = !tooOld && !notEnoughData;
      eligibilityByName.set(stat.name, {
        isEligible,
        inactiveLabel: notEnoughData ? 'baseline' : 'inactive',
      });

      if (!isEligible) continue;

      eligibleNames.add(stat.name);

      activeCount += 1;
      const core = analyzeExerciseTrendCore(stat);
      statusByName.set(stat.name, core.status);
      if (core.status === 'overload') overloadCount += 1;
      else if (core.status === 'stagnant') plateauCount += 1;
      else if (core.status === 'regression') regressionCount += 1;
      else if (core.status === 'neutral') neutralCount += 1;
      else newCount += 1;
    }

    return {
      activeCount,
      overloadCount,
      plateauCount,
      regressionCount,
      neutralCount,
      newCount,
      statusByName,
      eligibleNames,
      eligibilityByName,
    };
  }, [effectiveNow, stats]);

  useEffect(() => {
    if (!trendFilter) return;
    if (!selectedStats) return;
    if (!trainingStructure.eligibleNames.has(selectedStats.name)) {
      const firstEligible = Array.from(trainingStructure.eligibleNames)[0];
      if (firstEligible) setSelectedExerciseName(firstEligible);
      return;
    }
    const s = trainingStructure.statusByName.get(selectedStats.name);
    if (s && s !== trendFilter) {
      const firstMatch = Array.from(trainingStructure.statusByName.entries()).find(([, st]) => st === trendFilter)?.[0];
      if (firstMatch) setSelectedExerciseName(firstMatch);
    }
  }, [selectedStats, trendFilter, trainingStructure.eligibleNames, trainingStructure.statusByName]);

  const filteredExercises = useMemo(() => 
    stats
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(s => {
        if (!trendFilter) return true;
        if (!trainingStructure.eligibleNames.has(s.name)) return false;
        const st = trainingStructure.statusByName.get(s.name);
        return st === trendFilter;
      })
      .sort((a, b) => {
        const at = lastSessionByName.get(a.name)?.getTime() ?? -Infinity;
        const bt = lastSessionByName.get(b.name)?.getTime() ?? -Infinity;
        if (bt !== at) return bt - at;
        return a.name.localeCompare(b.name);
      }),
  [lastSessionByName, stats, searchTerm, trendFilter, trainingStructure.eligibleNames, trainingStructure.statusByName]);

  const capitalizeLabel = (s: string): string => {
    const trimmed = String(s ?? '').trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const headerCenterSlot = useMemo(() => {
    if (trainingStructure.activeCount <= 0) return filtersSlot;

    const isSelected = (s: ExerciseTrendStatus) => trendFilter === s;
    const chipCls = (s: ExerciseTrendStatus, tone: 'good' | 'warn' | 'bad' | 'neutral' | 'info') => {
      const base = 'text-[10px] px-2 py-1 rounded font-bold border whitespace-nowrap transition-colors';
      const selected = isSelected(s) ? ' ring-2 ring-white/25 border-white/30 shadow-sm' : '';
      if (tone === 'good') return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:border-emerald-400/40${selected}`;
      if (tone === 'warn') return `${base} bg-amber-500/10 text-amber-300 border-amber-500/20 hover:border-amber-400/40${selected}`;
      if (tone === 'bad') return `${base} bg-rose-500/10 text-rose-300 border-rose-500/20 hover:border-rose-400/40${selected}`;
      if (tone === 'neutral') return `${base} bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:border-indigo-400/40${selected}`;
      return `${base} bg-blue-500/10 text-blue-300 border-blue-500/20 hover:border-blue-400/40${selected}`;
    };

    const toggle = (s: ExerciseTrendStatus) => {
      setTrendFilter(prev => (prev === s ? null : s));
    };

    return (
      <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2 justify-start min-w-0">
          <span className="text-xs text-slate-200 font-semibold whitespace-nowrap">
            {trainingStructure.activeCount} active exercises
          </span>
          <button type="button" onClick={() => toggle('overload')} className={chipCls('overload', 'good')}>
            {trainingStructure.overloadCount} Gaining
          </button>
          <button type="button" onClick={() => toggle('stagnant')} className={chipCls('stagnant', 'warn')}>
            {trainingStructure.plateauCount} Plateauing
          </button>
        </div>

        <div className="justify-self-center">{filtersSlot}</div>

        <div className="flex items-center gap-2 justify-end min-w-0">
          <button type="button" onClick={() => toggle('regression')} className={chipCls('regression', 'bad')}>
            {trainingStructure.regressionCount} Losing
          </button>
          <button type="button" onClick={() => toggle('neutral')} className={chipCls('neutral', 'neutral')}>
            {trainingStructure.neutralCount} Maintaining
          </button>
          <button type="button" onClick={() => toggle('new')} className={chipCls('new', 'info')}>
            {trainingStructure.newCount} Baseline
          </button>
        </div>
      </div>
    );
  }, [filtersSlot, trainingStructure.activeCount, trainingStructure.neutralCount, trainingStructure.newCount, trainingStructure.overloadCount, trainingStructure.plateauCount, trainingStructure.regressionCount, trendFilter]);

  const chartData = useMemo(() => {
    if (!selectedStats || selectedSessions.length === 0) return [];
    const history = [...selectedSessions].sort((a, b) => a.date.getTime() - b.date.getTime());
    if (viewMode === 'all') {
      return history.map(h => ({
        timestamp: h.date.getTime(),
        date: formatDayContraction(h.date),
        weight: convertWeight(h.weight, weightUnit),
        oneRepMax: convertWeight(h.oneRepMax, weightUnit),
        reps: h.maxReps,
        sets: h.sets,
        volume: h.volume,
      }));
    }
    const period: TimePeriod = viewMode === 'weekly' ? 'weekly' : 'monthly';
    const buckets = new Map<string, { ts: number; label: string; oneRmMax: number; weightMax: number; repsMax: number; sets: number }>();

    history.forEach(h => {
      const { key, timestamp, label } = getDateKey(h.date, period);
      let b = buckets.get(key);
      if (!b) {
        b = { ts: timestamp, label, oneRmMax: 0, weightMax: 0, repsMax: 0, sets: 0 };
        buckets.set(key, b);
      }
      b.oneRmMax = Math.max(b.oneRmMax, h.oneRepMax);
      b.weightMax = Math.max(b.weightMax, h.weight);
      b.repsMax = Math.max(b.repsMax, h.maxReps);
      b.sets += h.sets;
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.ts - b.ts)
      .map(b => ({
        timestamp: b.ts,
        date: b.label,
        oneRepMax: convertWeight(Number(b.oneRmMax.toFixed(1)), weightUnit),
        weight: convertWeight(Number(b.weightMax.toFixed(1)), weightUnit),
        reps: b.repsMax,
        sets: b.sets,
      }));
  }, [selectedStats, selectedSessions, viewMode, weightUnit]);

  const currentStatus = selectedStats ? statusMap[selectedStats.name] : null;
  const isBodyweightLike = currentStatus?.isBodyweightLike ?? false;

  const chartDataWithEma = useMemo(() => {
    const key = isBodyweightLike ? 'reps' : 'oneRepMax';
    return addEmaSeries(chartData, key, 'emaValue', {
      halfLifeDays: DEFAULT_EMA_HALF_LIFE_DAYS,
      timestampKey: 'timestamp',
    });
  }, [chartData, isBodyweightLike]);
  const isSelectedEligible = useMemo(() => {
    if (!selectedStats) return true;
    return trainingStructure.eligibilityByName.get(selectedStats.name)?.isEligible ?? false;
  }, [selectedStats, trainingStructure.eligibilityByName]);

  // Calculate deltas for selected exercise
  const exerciseDeltas = useMemo(() => {
    if (!selectedStats || selectedStats.history.length < 2) return null;
    return calculateExerciseDeltas(selectedStats.history);
  }, [selectedStats]);

  // Stats for header
  const sessionsCount = selectedStats ? selectedSessions.length : 0;

  const bestReps = useMemo(() => {
    if (selectedSessions.length === 0) return 0;
    let max = 0;
    for (const s of selectedSessions) max = Math.max(max, s.maxReps);
    return max;
  }, [selectedSessions]);

  const bestRepsImprovement = useMemo(() => {
    if (selectedSessions.length === 0) return 0;
    const reps: number[] = selectedSessions.map((s) => s.maxReps);
    const unique: number[] = Array.from(new Set<number>(reps)).sort((a, b) => b - a);
    if (unique.length < 2) return 0;
    return unique[0] - unique[1];
  }, [selectedSessions]);

  const repsDeltaFromLastSession = useMemo(() => {
    if (selectedSessions.length < 2) return 0;
    return (selectedSessions[0]?.maxReps ?? 0) - (selectedSessions[1]?.maxReps ?? 0);
  }, [selectedSessions]);

  const avgRepsLast3 = useMemo(() => {
    if (selectedSessions.length === 0) return 0;
    const last3 = selectedSessions.slice(0, 3);
    const sum = last3.reduce((acc, s) => acc + s.maxReps, 0);
    return sum / last3.length;
  }, [selectedSessions]);

  return (
    <div className="flex flex-col gap-2 w-full text-slate-200 pb-10">
      <div className="sm:hidden">
        <div className="bg-black/70 p-2 rounded-xl">
          {trainingStructure.activeCount > 0 ? (
            <div className="flex items-center gap-0.5 overflow-x-auto whitespace-nowrap custom-scrollbar">
              <button type="button" onClick={() => setTrendFilter(null)} className={`text-[9px] px-2 py-1 rounded font-bold border whitespace-nowrap transition-colors bg-slate-700/30 text-slate-200 border-slate-600/30 ${trendFilter === null ? 'ring-2 ring-white/25 border-white/30 shadow-sm' : ''}`}>
                {trainingStructure.activeCount} active
              </button>
              <button type="button" onClick={() => setTrendFilter(prev => (prev === 'overload' ? null : 'overload'))} className={`text-[9px] px-2 py-1 rounded font-bold border whitespace-nowrap transition-colors bg-emerald-500/10 text-emerald-300 border-emerald-500/20 ${trendFilter === 'overload' ? 'ring-2 ring-white/25 border-white/30 shadow-sm' : ''}`}>
                {trainingStructure.overloadCount} Gaining
              </button>
              <button type="button" onClick={() => setTrendFilter(prev => (prev === 'stagnant' ? null : 'stagnant'))} className={`text-[9px] px-2 py-1 rounded font-bold border whitespace-nowrap transition-colors bg-amber-500/10 text-amber-300 border-amber-500/20 ${trendFilter === 'stagnant' ? 'ring-2 ring-white/25 border-white/30 shadow-sm' : ''}`}>
                {trainingStructure.plateauCount} Plateauing
              </button>
              <button type="button" onClick={() => setTrendFilter(prev => (prev === 'regression' ? null : 'regression'))} className={`text-[9px] px-2 py-1 rounded font-bold border whitespace-nowrap transition-colors bg-rose-500/10 text-rose-300 border-rose-500/20 ${trendFilter === 'regression' ? 'ring-2 ring-white/25 border-white/30 shadow-sm' : ''}`}>
                {trainingStructure.regressionCount} Losing
              </button>
              <button type="button" onClick={() => setTrendFilter(prev => (prev === 'neutral' ? null : 'neutral'))} className={`text-[9px] px-2 py-1 rounded font-bold border whitespace-nowrap transition-colors bg-indigo-500/10 text-indigo-300 border-indigo-500/20 ${trendFilter === 'neutral' ? 'ring-2 ring-white/25 border-white/30 shadow-sm' : ''}`}>
                {trainingStructure.neutralCount} Maintaining
              </button>
              <button type="button" onClick={() => setTrendFilter(prev => (prev === 'new' ? null : 'new'))} className={`text-[9px] px-2 py-1 rounded font-bold border whitespace-nowrap transition-colors bg-blue-500/10 text-blue-300 border-blue-500/20 ${trendFilter === 'new' ? 'ring-2 ring-white/25 border-white/30 shadow-sm' : ''}`}>
                {trainingStructure.newCount} Baseline
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden sm:contents">
        <div className={`${stickyHeader ? 'sticky top-0 z-30' : ''} bg-black/70 p-2 sm:p-3 rounded-xl`}>
          {headerCenterSlot}
        </div>
      </div>
      
      {/* 
          TOP SECTION: GRID LAYOUT 
          Grid items default to stretch, so columns will be equal height.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-stretch">
        
        {/* --- LEFT: SIDEBAR --- */}
        {/* 
            Height logic:
            Mobile: h-[40.5vh]
            Desktop (lg): h-0 + min-h-full. 
            This forces the grid row height to be determined by the RIGHT panel (the bottleneck),
            and the left panel stretches to match it, then scrolls internally.
        */}
        <div className="lg:col-span-1 flex flex-col gap-1 h-[25vh] lg:h-0 lg:min-h-full">
          {/* Search Header */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter..."
              className="w-full bg-black/70 border border-slate-700/50 rounded-lg pl-9 pr-3 py-1 sm:py-2 text-[11px] sm:text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* LIST WRAPPER */}
          <div className="flex-1 bg-black/70 border border-slate-700/50 rounded-lg overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar flex-1">
              {filteredExercises.map((ex) => {
                const status = statusMap[ex.name];
                const isSelected = selectedExerciseName === ex.name;
                const asset = assetLookup?.getAsset(ex.name);
                const isEligible = trainingStructure.eligibilityByName.get(ex.name)?.isEligible ?? false;
                const subLabel = isEligible
                  ? status.label
                  : (trainingStructure.eligibilityByName.get(ex.name)?.inactiveLabel ?? 'inactive');

                const lastDone = lastSessionByName.get(ex.name) ?? null;
                const lastDoneLabel = lastDone
                  ? formatRelativeDay(lastDone, effectiveNow)
                  : '—';

                const selectedHighlight = getSelectedHighlightClasses(status.status, !isEligible ? 'soft' : 'strong');
                const RowStatusIcon = status.icon;
                const displayLabel = capitalizeLabel(subLabel);
                const IneligibleStatusIcon = displayLabel === 'Baseline' ? Hourglass : null;

                return (
                  <button
                    key={ex.name}
                    ref={(el) => {
                      exerciseButtonRefs.current[ex.name] = el;
                    }}
                    onClick={() => setSelectedExerciseName(ex.name)}
                    className={`w-full text-left px-2 py-1.5 rounded-md transition-all duration-200 flex items-center justify-between group border ${
                      isSelected
                        ? selectedHighlight.button
                        : 'border-transparent hover:bg-black/60 hover:border-slate-600/50'
                    } ${!isEligible ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {(() => {
                        if (!asset) return (
                          <div className="w-6 h-6 rounded bg-black/50 flex items-center justify-center text-slate-500 flex-shrink-0">
                            <Dumbbell className="w-3.5 h-3.5" />
                          </div>
                        );
                        const imgUrl = asset.sourceType === 'video' ? asset.thumbnail : (asset.thumbnail || asset.source);
                        return imgUrl ? (
                          <img src={imgUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0 bg-white" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-black/50 flex items-center justify-center text-slate-500 flex-shrink-0">
                            <Dumbbell className="w-3.5 h-3.5" />
                          </div>
                        );
                      })()}
                      <div className="flex flex-col min-w-0">
                        <span className={`truncate text-xs ${isSelected ? 'text-slate-200 font-semibold' : 'text-slate-300 group-hover:text-white'}`}>
                          {ex.name}
                        </span>
                        <span className={`truncate text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                          {lastDoneLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEligible ? (
                        <div className={`px-1.5 py-1 rounded-md ${status.bgColor} ${isSelected ? 'animate-in zoom-in-50 duration-200' : ''} flex items-center gap-1`}>
                          <RowStatusIcon className={`w-3 h-3 ${status.color}`} />
                          <span className={`text-[10px] font-bold ${status.color}`}>{displayLabel}</span>
                        </div>
                      ) : (
                        <div className={`px-1.5 py-1 rounded-md bg-slate-700/20 border border-slate-700/30 ${isSelected ? 'animate-in zoom-in-50 duration-200' : ''} flex items-center gap-1`}>
                          {IneligibleStatusIcon ? (
                            <IneligibleStatusIcon className="w-3 h-3 text-slate-400" />
                          ) : null}
                          <span className="text-[10px] font-bold text-slate-400">{displayLabel}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- RIGHT: HEADER & METRICS --- */}
        <div className="lg:col-span-2 flex flex-col gap-2 h-full min-h-0">
          {selectedStats && currentStatus ? (
            <div className="flex flex-col h-full gap-2">
              
              {/* 1. Header with exercise image and mini heatmap */}
              <div className="inline-flex items-start gap-4 shrink-0 bg-white rounded-xl p-3 self-start w-fit max-w-full">
                {/* Mini Body Map showing muscles this exercise targets */}
                <div className="flex items-start gap-3">
                  <div className="w-24 h-20 flex items-center justify-center rounded-lg ">
                    <BodyMap
                      onPartClick={() => {}}
                      selectedPart={null}
                      muscleVolumes={selectedExerciseMuscleInfo.volumes}
                      maxVolume={selectedExerciseMuscleInfo.maxVolume}
                      compact
                      gender={bodyMapGender}
                    />
                  </div>

                  {(selectedExerciseMuscleInfo.primaryTargets.length > 0 || selectedExerciseMuscleInfo.secondaryTargets.length > 0) && (
                    <div className="space-y-2 min-w-0 max-w-[220px]">
                      {selectedExerciseMuscleInfo.primaryTargets.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-700">Primary</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedExerciseMuscleInfo.primaryTargets.map(t => (
                              <span
                                key={`primary-${t.label}`}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-900/10"
                                style={{
                                  backgroundColor: getVolumeColor(t.sets, selectedExerciseMuscleInfo.maxVolume),
                                  color: getTargetTextColor(t.sets, selectedExerciseMuscleInfo.maxVolume),
                                }}
                              >
                                {t.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedExerciseMuscleInfo.secondaryTargets.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-700">Secondary</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedExerciseMuscleInfo.secondaryTargets.map(t => (
                              <span
                                key={`secondary-${t.label}`}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-900/10"
                                style={{
                                  backgroundColor: getVolumeColor(t.sets, selectedExerciseMuscleInfo.maxVolume),
                                  color: getTargetTextColor(t.sets, selectedExerciseMuscleInfo.maxVolume),
                                }}
                              >
                                {t.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {assetLookup && selectedStats && (() => {
                  const a = assetLookup.getAsset(selectedStats.name);
                  if (!a) return null;

                  const videoSrc = (a.sourceType === 'video' ? (a.video ?? a.source) : undefined) ?? undefined;
                  const imgSrc = a.sourceType === 'video' ? a.thumbnail : (a.thumbnail || a.source);

                  if (videoSrc) {
                    return (
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-none">
                        <video
                          key={videoSrc}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          poster={a.thumbnail}
                          src={videoSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                        />
                      </div>
                    );
                  }

                  return imgSrc ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-none">
                      <img src={imgSrc} alt={selectedStats.name} width={80} height={80} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                  ) : null;
                })()}
              </div>

              {/* 2. Key Metrics Grid (Bottom Half - Fills Remaining Height) */}
              <div className="hidden" />

              <div className="flex items-baseline gap-3">
                <h2 
                  className="text-xl sm:text-3xl text-white tracking-tight drop-shadow-lg"
                  style={FANCY_FONT}
                >
                  {selectedStats.name}
                </h2>
              </div>

              {!isSelectedEligible ? (
                <div
                  className="rounded-lg p-3 border border-slate-700/50 relative overflow-hidden"
                  style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.85)' }}
                >
                  <div className="absolute inset-0 bg-slate-700/10 pointer-events-none" />
                  <div className="relative z-10">
                    <h4 className="text-sm sm:text-base text-slate-300 mb-1" style={FANCY_FONT}>
                      Inactive
                    </h4>
                    <p className="text-slate-300 text-xs sm:text-sm leading-tight">
                      {inactiveReason?.parts?.length
                        ? inactiveReason.parts.join(' · ')
                        : 'This exercise is inactive because it has not been trained recently or there is not enough data to generate meaningful insights.'}
                    </p>
                  </div>
                  <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-10 bg-slate-600" />
                </div>
              ) : (
                <div
                  className={`rounded-lg p-2.5 sm:p-3 border ${currentStatus.borderColor} relative overflow-hidden transition-all duration-500`}
                  style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.85)' }}
                >
                  <div className={`absolute inset-0 ${currentStatus.bgColor} pointer-events-none`} />
                  <div className="relative z-10 flex items-start gap-2.5">
                    <div className={`p-2 rounded-lg bg-black/40 ${currentStatus.color} flex-shrink-0`}>
                      <currentStatus.icon size={20} />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-sm sm:text-base ${currentStatus.color} leading-tight`}
                          style={FANCY_FONT}
                        >
                          {currentStatus.title}
                        </h4>

                        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                          <ConfidenceBadge confidence={currentStatus.confidence} />
                        </div>
                      </div>

                      <p className="mt-0.5 text-slate-300 text-xs sm:text-sm leading-snug">
                        {currentStatus.description}
                      </p>

                      {currentStatus.evidence && currentStatus.evidence.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {currentStatus.evidence.slice(0, 2).map((t, i) => {
                            const isStrengthLike = /^(Strength|Reps):\s/.test(t);
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border max-w-full ${currentStatus.bgColor} ${currentStatus.borderColor} ${isStrengthLike ? currentStatus.color : 'text-slate-300'} ${isStrengthLike ? 'font-bold' : 'font-mono'} text-[10px] whitespace-normal break-words`}
                              >
                                {t}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {currentStatus.subtext && (
                        <div className="mt-2">
                          <div className={`relative inline-flex flex-col w-fit max-w-full rounded-md border px-2 py-1.5 ${currentStatus.borderColor} overflow-hidden`}>
                            <div className="absolute inset-0 bg-black/30" />
                            <div className={`absolute inset-0 ${currentStatus.bgColor}`} />
                            <div className="relative z-10">
                              <div className={`text-[10px] uppercase tracking-wider font-bold ${currentStatus.color}`}>Next</div>
                              <div className="mt-0.5 text-[11px] sm:text-xs font-mono text-slate-200 leading-snug whitespace-normal">
                                {currentStatus.subtext}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 border border-dashed border-slate-800 rounded-xl bg-black/40">
              <div className="p-4 bg-black/70 rounded-full">
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
        <div className="w-full bg-black/70 border border-slate-700/50 rounded-2xl p-4 sm:p-6 relative flex flex-col h-[400px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-6 gap-2 shrink-0">
             <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">{isBodyweightLike ? 'Reps Progression' : 'Strength Progression'}</h3>
                <p className="text-[11px] sm:text-xs text-slate-500">{isBodyweightLike ? 'Top reps vs sets' : 'Estimated 1RM vs Actual Lift Weight'}</p>
             </div>
             <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2 py-1.5 min-h-8 bg-black/70 border border-slate-700/50 rounded-lg">
                    <Activity className="w-3 h-3 text-slate-400" />
                    <div className="text-[10px]">
                      <div className="text-white font-bold leading-4">{sessionsCount}</div>
                      <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Sessions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 min-h-8 bg-black/70 border border-slate-700/50 rounded-lg">
                    <Scale className="w-3 h-3 text-slate-400" />
                    <div className="text-[10px]">
                        <div className="text-white font-bold leading-4">
                          {isBodyweightLike ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-white font-bold leading-4">{bestReps}</span>
                              <span className="text-slate-500">reps</span>
                              {bestRepsImprovement > 0 ? (
                                <span className="relative top-[3px]"><DeltaBadge delta={bestRepsImprovement} suffix=" reps" size="compact" /></span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-white font-bold leading-4">{convertWeight(selectedStats.maxWeight, weightUnit)}</span>
                              <span className="text-slate-500">{weightUnit}</span>
                              {exerciseDeltas && exerciseDeltas.bestImprovement > 0 ? (
                                <span className="relative top-[3px]"><DeltaBadge delta={convertWeight(exerciseDeltas.bestImprovement, weightUnit)} suffix={` ${weightUnit}`} size="compact" /></span>
                              ) : null}
                            </span>
                          )}
                        </div>
                        <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Best</div>
                      </div>
                    </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 min-h-8 bg-black/70 border border-slate-700/50 rounded-lg">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <div className="text-[10px]">
                        <div className="text-white font-bold leading-4">
                          {isBodyweightLike ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-white font-bold leading-4">{avgRepsLast3.toFixed(1)}</span>
                              <span className="text-slate-500">reps</span>
                              {repsDeltaFromLastSession !== 0 ? (
                                <span className="relative top-[3px]"><DeltaBadge delta={repsDeltaFromLastSession} suffix=" reps" size="compact" /></span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-white font-bold leading-4">{exerciseDeltas ? convertWeight(exerciseDeltas.avgWeightLast3, weightUnit) : '—'}</span>
                              <span className="text-slate-500">{weightUnit}</span>
                              {exerciseDeltas && exerciseDeltas.weightDelta !== 0 ? (
                                <span className="relative top-[3px]"><DeltaBadge delta={convertWeight(exerciseDeltas.weightDelta, weightUnit)} suffix={` ${weightUnit}`} size="compact" /></span>
                              ) : null}
                            </span>
                          )}
                        </div>
                        <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">lst session</div>
                      </div>
                    </div>
                </div>
                {isBodyweightLike ? (
                  <>
                    <div className="flex items-center gap-2 text-blue-400">
                      <span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500"></span> Top reps
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="w-2.5 h-0.5 bg-white/80"></span> EMA
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="w-2.5 h-0.5 bg-slate-500 border-t border-dashed border-slate-500"></span> Sets
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-blue-400">
                      <span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500"></span> Est. 1RM
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="w-2.5 h-0.5 bg-white/80"></span> EMA
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="w-2.5 h-0.5 bg-slate-500 border-t border-dashed border-slate-500"></span> Lift Weight
                    </div>
                  </>
                )}

                <div className="bg-black/70 p-1 rounded-lg flex gap-1 border border-slate-700/50">
                  <button onClick={() => setViewMode('all')} className={`px-2 py-1 rounded text-[10px] font-bold ${viewMode==='all'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-black/60'}`}>all</button>
                  <button onClick={() => setViewMode('weekly')} className={`px-2 py-1 rounded text-[10px] font-bold ${viewMode==='weekly'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-black/60'}`}>wk</button>
                  <button onClick={() => setViewMode('monthly')} className={`px-2 py-1 rounded text-[10px] font-bold ${viewMode==='monthly'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-black/60'}`}>mo</button>
                </div>
             </div>
          </div>

          <div className="w-full flex-1 min-h-0">
            {chartData.length === 0 ? (
              <div className="w-full h-full min-h-[260px] flex items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                Building baseline — log a few more sessions to see Strength Progression.
              </div>
            ) : (
            <LazyRender className="w-full h-full" placeholder={<ChartSkeleton className="h-full min-h-[260px]" />}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataWithEma} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="color1RM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-rgb) / 0.35)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    animationDuration={1000}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      isBodyweightLike
                        ? `${formatNumber(Number(val), { maxDecimals: 0 })}`
                        : `${formatNumber(Number(val), { maxDecimals: 1 })}${weightUnit}`
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip weightUnit={weightUnit} />}
                    cursor={{ stroke: 'rgb(var(--border-rgb) / 0.5)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={isBodyweightLike ? 'reps' : 'oneRepMax'}
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#color1RM)"
                    dot={{ r: 3, fill: '#3b82f6' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />

                  <Line
                    type="monotone"
                    dataKey="emaValue"
                    stroke="var(--text-primary)"
                    strokeOpacity={0.9}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                  
                  <Line 
                    type="stepAfter" 
                    dataKey={isBodyweightLike ? 'sets' : 'weight'}
                    stroke="var(--text-muted)" 
                    strokeWidth={1}
                    strokeDasharray="4 4" 
                    dot={false}
                    activeDot={false}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </LazyRender>
            )}
          </div>
        </div>
      )}
    </div>
  );
};