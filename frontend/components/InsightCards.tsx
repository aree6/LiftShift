import React, { useState, useEffect, memo } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, Flame, Zap, Trophy, 
  Calendar, Target, AlertTriangle, Activity, Clock, Dumbbell, Brain, Check, Copy
} from 'lucide-react';
import CountUp from './CountUp';
import { 
  DashboardInsights, 
  SparklinePoint, 
  StreakInfo, 
  PRInsights,
  DeltaResult,
  RecentPR 
} from '../utils/analysis/insights';
import { getExerciseAssets, ExerciseAsset } from '../utils/data/exerciseAssets';
import { WeightUnit } from '../utils/storage/localStorage';
import { convertWeight } from '../utils/format/units';
import { formatHumanReadableDate } from '../utils/date/dateUtils';
import { formatNumber } from '../utils/format/formatters';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../utils/format/deltaFormat';

// Simple monochrome SVG for Gemini (Google) that inherits color via currentColor
const GeminiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="18" height="18" viewBox="0 0 32 32" className={className} role="img" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M31,14h-1h-6h-8v5h7c-1.3,2.7-3.8,5.1-7,5.1c-4.5,0-8.1-3.6-8.1-8.1s3.6-8.1,8.1-8.1c2,0,3.6,0.8,5,2.1l6.7-3.3 C25,3.2,20.8,1,16,1C7.7,1,1,7.7,1,16s6.7,15,15,15s15-6.7,15-15C31,15.2,31.1,14.8,31,14z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Hook to detect mobile view
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Mini Sparkline Component
export const Sparkline: React.FC<{ data: SparklinePoint[]; color?: string; height?: number }> = ({ 
  data, 
  color = '#3b82f6',
  height = 24 
}) => {
  if (data.length < 2) return null;
  
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  
  const width = 60;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const markerId = `sparkline-arrow-${String(color).replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
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
          <path d="M 0 0 L 6 5 L 0 10 z" fill={color} />
        </marker>
      </defs>

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${markerId})`}
        className="drop-shadow-sm"
      />
    </svg>
  );
};

// Delta Badge Component with context
const DeltaBadge: React.FC<{ delta: DeltaResult; suffix?: string; showPercent?: boolean; context?: string }> = ({ 
  delta, 
  suffix = '',
  showPercent = true,
  context = ''
}) => {
  const { direction, formattedPercent } = delta;
  
  if (direction === 'same') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400">
        <Minus className="w-3 h-3" />
        <span className="text-[10px] font-bold">
          Stable
          {showPercent ? ` (${delta.deltaPercent}%)` : ''}
        </span>
        {context && <span className="text-[9px] opacity-75">{context}</span>}
      </span>
    );
  }

  const isUp = direction === 'up';
  const colorClass = isUp ? 'text-emerald-400' : 'text-rose-400';
  const bgClass = isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bgClass} ${colorClass}`}>
      <Icon className="w-3 h-3" />
      <span className="text-[10px] font-bold">
        {formattedPercent}
        {suffix}
      </span>
      {context && <span className="text-[9px] opacity-75">{context}</span>}
    </span>
  );
};

// Streak Badge Component  
export const StreakBadge: React.FC<{ streak: StreakInfo }> = ({ streak }) => {
  const { currentStreak, streakType, isOnStreak } = streak;
  
  if (!isOnStreak && currentStreak === 0) {
    return (
      <div className="inline-flex items-center gap-1 text-slate-500">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
        <span className="text-[10px] font-medium">Start a streak</span>
      </div>
    );
  }

  const config = {
    hot: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
    warm: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    cold: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  };

  const { color, bg } = config[streakType];

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bg}`}>
      <Flame className={`w-3 h-3 ${color} flex-shrink-0`} />
      <span className={`text-[10px] font-bold ${color} whitespace-nowrap`}>{currentStreak}wk streak</span>
    </div>
  );
};

// PR Status Badge
const PRStatusBadge: React.FC<{ prInsights: PRInsights }> = ({ prInsights }) => {
  const { daysSinceLastPR, prDrought } = prInsights;

  if (daysSinceLastPR < 0) {
    return (
      <span className="text-[10px] text-slate-500">Chase your first PR</span>
    );
  }

  if (prDrought) {
    return (
      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10">
        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
        <span className="text-[10px] font-bold text-amber-400 whitespace-nowrap">{daysSinceLastPR}d drought</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10">
      <Trophy className="w-3 h-3 text-emerald-400 flex-shrink-0" />
      <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap">
        {daysSinceLastPR === 0 ? 'PR today!' : `${daysSinceLastPR}d ago`}
      </span>
    </div>
  );
};

// Main KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  delta?: DeltaResult;
  deltaContext?: string;
  sparkline?: SparklinePoint[];
  sparklineColor?: string;
  badge?: React.ReactNode;
  compact?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  delta,
  deltaContext,
  sparkline,
  sparklineColor = '#3b82f6',
  badge,
  compact = false,
}) => {
  const valueClass = 'text-2xl font-bold text-white tracking-tight leading-none';

  const renderValue = () => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return (
        <CountUp
          from={0}
          to={value}
          separator="," 
          direction="up"
          duration={1}
          className={valueClass}
        />
      );
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const isPercent = trimmed.endsWith('%');
      const numericPart = isPercent ? trimmed.slice(0, -1) : trimmed;
      const parsed = Number(numericPart.replace(/,/g, ''));

      if (Number.isFinite(parsed) && numericPart.length > 0) {
        return (
          <span className={valueClass}>
            <CountUp
              from={0}
              to={parsed}
              separator="," 
              direction="up"
              duration={1}
            />
            {isPercent ? '%' : ''}
          </span>
        );
      }
    }

    return <span className={valueClass}>{value}</span>;
  };

  return (
    <div className={`bg-black/70 border border-slate-700/50 rounded-xl ${compact ? 'p-3' : 'p-4'} hover:border-slate-600/50 transition-all group overflow-hidden`}>
      {/* Header row: icon + title + sparkline */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`p-1.5 rounded-lg bg-black/50 ${iconColor} flex-shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{title}</span>
        </div>
        {sparkline && sparkline.length > 1 && (
          <div className="flex-shrink-0">
            <Sparkline data={sparkline} color={sparklineColor} height={24} />
          </div>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-2 flex-wrap">
        {renderValue()}
        {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
      </div>

      {/* Delta/Badge row */}
      {(delta || badge) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {delta && <DeltaBadge delta={delta} context={deltaContext} />}
          {badge}
        </div>
      )}
    </div>
  );
};

// Consistency Score Ring
const ConsistencyRing: React.FC<{ score: number; size?: number }> = ({ score, size = 40 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = (s: number) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    if (s >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--border-rgb) / 0.5)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-slate-200 leading-none">{score}%</span>
      </div>
    </div>
  );
};

// AI Analysis KPI Card
interface AIAnalysisCardProps {
  onExportAction: () => void;
  exportCopied: boolean;
  showTimelineChips: boolean;
  setShowTimelineChips: (show: boolean) => void;
  exportWindow: string;
  performCopyForTimeline: (k: string) => void;
  timelineSelected: string | null;
  onGeminiAnalyze: () => void;
  onReCopy: () => void;
  reCopyCopied: boolean;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  onExportAction,
  exportCopied,
  showTimelineChips,
  setShowTimelineChips,
  exportWindow,
  performCopyForTimeline,
  timelineSelected,
  onGeminiAnalyze,
  onReCopy,
  reCopyCopied,
}) => {
  return (
    <div className="bg-black/70 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all group overflow-hidden">
      {/* Header row: icon + title */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-black/50 text-purple-400 flex-shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">AI Analysis</span>
        </div>
      </div>

      {/* Value row - Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {!exportCopied ? (
          <button
            onClick={onExportAction}
            className="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-white dark:text-white hover:border-purple-400 hover:bg-purple-500/20 transition-all duration-200"
            title="AI Analyze"
          >
            <Brain className="w-3 h-3" />
            <span>Analyze</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onGeminiAnalyze}
              className="inline-flex items-center gap-1 justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-white dark:text-white hover:border-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
              title="Analyse with Gemini"
            >
              <GeminiIcon className="w-3 h-3" />
              <span>Open in Gemini</span>
            </button>

            <button
              onClick={onReCopy}
              className="inline-flex items-center gap-1 justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-2 py-1.5 bg-blue-500/10 border border-blue-500/30 text-white dark:text-white hover:border-blue-400 hover:bg-blue-500/20 transition-all duration-200"
              title="Copy export to clipboard"
            >
              {reCopyCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Timeline chips */}
      {showTimelineChips && (
        <div className="mt-2 flex flex-wrap gap-1">
          {['1','3','6','all'].map((k) => {
            const label = k === 'all' ? 'All' : `${k}m`;
            return (
              <button
                key={k}
                onClick={() => { performCopyForTimeline(k); setShowTimelineChips(false); }}
                className="text-xs px-2 py-1 bg-black/50 border border-slate-600/50 text-white dark:text-white hover:bg-white/5 rounded-md transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Status indicator */}
      <div className="mt-2 flex items-center gap-2">
        {exportCopied && timelineSelected && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
            <Check className="w-3 h-3" />
            <span className="text-[10px] font-bold">Ready</span>
          </span>
        )}
        {!exportCopied && (
          <span className="text-[10px] text-slate-500">Click to analyze</span>
        )}
      </div>
    </div>
  );
};

// Main Insights Panel Component
interface InsightsPanelProps {
  insights: DashboardInsights;
  totalWorkouts: number;
  totalSets: number;
  totalPRs: number;
  // AI Analysis props
  onExportAction?: () => void;
  exportCopied?: boolean;
  showTimelineChips?: boolean;
  setShowTimelineChips?: (show: boolean) => void;
  exportWindow?: string;
  performCopyForTimeline?: (k: string) => void;
  timelineSelected?: string | null;
  onGeminiAnalyze?: () => void;
  onReCopy?: () => void;
  reCopyCopied?: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = memo(function InsightsPanel(props) {
  const { 
    insights, 
    totalWorkouts, 
    totalSets, 
    totalPRs,
    onExportAction,
    exportCopied = false,
    showTimelineChips = false,
    setShowTimelineChips,
    exportWindow = '1',
    performCopyForTimeline,
    timelineSelected,
    onGeminiAnalyze,
    onReCopy,
    reCopyCopied = false,
  } = props;
  const { rolling7d, streakInfo, prInsights, volumeSparkline, workoutSparkline, prSparkline, setsSparkline, consistencySparkline } = insights;

  // Only show AI Analysis card on mobile (hidden on desktop where it's in the header)
  const isMobile = useIsMobile();
  const showAICard = onExportAction && isMobile;

  return (
    <div className={`grid gap-2 sm:gap-3 ${showAICard ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
      {/* Workouts This Week */}
      <KPICard
        title="Last 7d"
        value={rolling7d.current.totalWorkouts}
        subtitle="workouts"
        icon={Calendar}
        iconColor="text-blue-400"
        delta={rolling7d.workouts ?? undefined}
        deltaContext="vs prev 7d"
        sparkline={workoutSparkline}
        sparklineColor="#3b82f6"
      />

      {/* Sets This Week */}
      <KPICard
        title="Sets"
        value={rolling7d.current.totalSets}
        subtitle="last 7d"
        icon={Dumbbell}
        iconColor="text-purple-400"
        delta={rolling7d.sets ?? undefined}
        deltaContext="vs prev 7d"
        sparkline={setsSparkline}
        sparklineColor="#a855f7"
      />

      {/* PRs */}
      <KPICard
        title="PRs"
        value={totalPRs}
        subtitle="total"
        icon={Trophy}
        iconColor="text-yellow-400"
        sparkline={prSparkline}
        sparklineColor="#eab308"
        badge={<PRStatusBadge prInsights={prInsights} />}
      />

      {/* AI Analysis Card - Mobile Only */}
      {showAICard && onExportAction && setShowTimelineChips && performCopyForTimeline && onGeminiAnalyze && onReCopy && (
        <AIAnalysisCard
          onExportAction={onExportAction}
          exportCopied={exportCopied}
          showTimelineChips={showTimelineChips}
          setShowTimelineChips={setShowTimelineChips}
          exportWindow={exportWindow}
          performCopyForTimeline={performCopyForTimeline}
          timelineSelected={timelineSelected}
          onGeminiAnalyze={onGeminiAnalyze}
          onReCopy={onReCopy}
          reCopyCopied={reCopyCopied}
        />
      )}
    </div>
  );
});

// Compact Alert Card for Plateaus
interface PlateauAlertProps {
  exerciseName: string;
  suggestion: string;
  asset?: ExerciseAsset;
  onClick?: () => void;
}

export const PlateauAlert: React.FC<PlateauAlertProps> = ({ exerciseName, suggestion, asset, onClick }) => {
  const imgSrc = asset?.sourceType === 'video' ? asset.thumbnail : (asset?.thumbnail || asset?.source);
  const clickable = typeof onClick === 'function';
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`w-full flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-left ${clickable ? 'cursor-pointer hover:bg-amber-500/10 transition-colors' : 'cursor-default'}`}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="" className="w-9 h-9 rounded-lg object-cover border border-amber-500/30 flex-shrink-0 bg-white" loading="lazy" />
      ) : (
        <div className="p-1.5 rounded-lg bg-amber-500/10 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{exerciseName}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{suggestion}</p>
      </div>
    </button>
  );
};

// Recent PR Card with image and improvement
interface RecentPRCardProps {
  pr: RecentPR;
  isLatest?: boolean;
  asset?: ExerciseAsset;
  weightUnit?: WeightUnit;
  now?: Date;
  onExerciseClick?: (exerciseName: string) => void;
}

export const RecentPRCard: React.FC<RecentPRCardProps> = ({ pr, isLatest, asset, weightUnit = 'kg', now, onExerciseClick }) => {
  const { exercise, weight, reps, date, improvement } = pr;
  const imgSrc = asset?.sourceType === 'video' ? asset.thumbnail : (asset?.thumbnail || asset?.source);
  const clickable = typeof onExerciseClick === 'function';
  
  return (
    <button
      type="button"
      onClick={() => onExerciseClick?.(exercise)}
      disabled={!clickable}
      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left ${isLatest ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-black/50'} ${clickable ? 'cursor-pointer hover:bg-black/60 transition-colors' : 'cursor-default'}`}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-white" loading="lazy" />
      ) : (
        <div className={`p-1.5 rounded-lg ${isLatest ? 'bg-emerald-500/20' : 'bg-black/50'} flex-shrink-0`}>
          <Dumbbell className={`w-4 h-4 ${isLatest ? 'text-emerald-400' : 'text-slate-500'}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[color:var(--text-primary)] truncate">{exercise}</div>
        <div className="text-[10px] text-slate-500">{formatHumanReadableDate(date, { now })}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-[color:var(--text-primary)]">{convertWeight(weight, weightUnit)}{weightUnit}</div>
        {improvement > 0 ? (
          <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-0.5">
            <TrendingUp className="w-3 h-3" />+{convertWeight(improvement, weightUnit)}{weightUnit}
          </div>
        ) : (
          <div className="text-[10px] text-slate-500">×{reps}</div>
        )}
      </div>
    </button>
  );
};

// Recent PRs Timeline Panel
interface RecentPRsPanelProps {
  prInsights: PRInsights;
  weightUnit?: WeightUnit;
  now?: Date;
  onExerciseClick?: (exerciseName: string) => void;
}

export const RecentPRsPanel: React.FC<RecentPRsPanelProps> = memo(function RecentPRsPanel({ prInsights, weightUnit = 'kg', now, onExerciseClick }) {
  const { recentPRs, daysSinceLastPR, prDrought, prFrequency } = prInsights;
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset> | null>(null);

  useEffect(() => {
    getExerciseAssets().then(setAssetsMap).catch(() => setAssetsMap(new Map()));
  }, []);

  if (recentPRs.length === 0) return null;

  // Show up to 5 PRs
  const displayPRs = recentPRs.slice(0, 5);

  return (
    <div className="bg-black/70 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/10">
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="text-sm font-semibold text-white">Recent PRs</span>
        </div>
        <div className="flex items-center gap-3">
          {prFrequency > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">
              ~{prFrequency}/week
            </span>
          )}
          {prDrought && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold">
              {daysSinceLastPR}d drought
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto -mx-2 px-2 pb-2">
        <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
          {displayPRs.map((pr, idx) => (
            <div key={`${pr.exercise}-${pr.date.getTime()}`} className="min-w-[220px] flex-shrink-0">
              <RecentPRCard
                pr={pr}
                isLatest={idx === 0}
                asset={assetsMap?.get(pr.exercise)}
                weightUnit={weightUnit}
                now={now}
                onExerciseClick={onExerciseClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
