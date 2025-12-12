import React, { useState, useEffect, memo } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, Flame, Zap, Trophy, 
  Calendar, Target, AlertTriangle, Activity, Clock, Dumbbell
} from 'lucide-react';
import { 
  DashboardInsights, 
  SparklinePoint, 
  StreakInfo, 
  PRInsights,
  DeltaResult,
  RecentPR 
} from '../utils/insights';
import { format } from 'date-fns';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { WeightUnit } from '../utils/localStorage';
import { convertWeight } from '../utils/units';

// Mini Sparkline Component
const Sparkline: React.FC<{ data: SparklinePoint[]; color?: string; height?: number }> = ({ 
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

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) / (data.length - 1) * width}
          cy={height - ((data[data.length - 1].value - min) / range) * (height - 4) - 2}
          r="3"
          fill={color}
          className="drop-shadow-md"
        />
      )}
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
  const { direction, deltaPercent } = delta;
  
  if (direction === 'same') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
        <Minus className="w-3 h-3" />
        No change
      </span>
    );
  }

  const isUp = direction === 'up';
  const colorClass = isUp ? 'text-emerald-400' : 'text-rose-400';
  const bgClass = isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bgClass} ${colorClass} text-[10px] font-bold`}>
      <Icon className="w-3 h-3" />
      {isUp ? '+' : ''}{showPercent ? `${deltaPercent}%` : delta.delta}{suffix}{context && ` ${context}`}
    </span>
  );
};

// Streak Badge Component  
const StreakBadge: React.FC<{ streak: StreakInfo }> = ({ streak }) => {
  const { currentStreak, streakType, isOnStreak } = streak;
  
  if (!isOnStreak && currentStreak === 0) {
    return (
      <div className="flex items-center gap-1.5 text-slate-500">
        <div className="w-2 h-2 rounded-full bg-slate-600" />
        <span className="text-[10px] font-medium">No active streak</span>
      </div>
    );
  }

  const config = {
    hot: { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Flame, label: '🔥 On Fire!' },
    warm: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Zap, label: 'Building momentum' },
    cold: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Activity, label: 'Getting started' },
  };

  const { color, bg, label } = config[streakType];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${bg}`}>
      <Flame className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-[10px] font-bold ${color}`}>{currentStreak} week{currentStreak !== 1 ? 's' : ''}</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
};

// PR Status Badge
const PRStatusBadge: React.FC<{ prInsights: PRInsights }> = ({ prInsights }) => {
  const { daysSinceLastPR, prDrought, lastPRExercise } = prInsights;

  if (daysSinceLastPR < 0) {
    return (
      <div className="text-[10px] text-slate-500">No PRs recorded yet</div>
    );
  }

  if (prDrought) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold text-amber-400">{daysSinceLastPR}d</span>
        <span className="text-[10px] text-amber-400/80">since last PR</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10">
      <Trophy className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-[10px] font-bold text-emerald-400">
        {daysSinceLastPR === 0 ? 'Today!' : `${daysSinceLastPR}d ago`}
      </span>
      {lastPRExercise && (
        <span className="text-[10px] text-emerald-400/80 truncate max-w-[100px]">{lastPRExercise}</span>
      )}
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
  return (
    <div className={`bg-black/70 border border-slate-700/50 rounded-xl ${compact ? 'p-3' : 'p-4'} flex flex-col gap-2 hover:border-slate-600/50 transition-all group`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-black/50 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
        </div>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} color={sparklineColor} />
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
          {subtitle && <div className="text-[10px] text-slate-500">{subtitle}</div>}
        </div>
      </div>

      {/* Badge and Delta */}
      <div className="flex items-center justify-between">
        {delta && <DeltaBadge delta={delta} context={deltaContext} />}
        {badge && <div className={delta ? '' : 'w-full'}>{badge}</div>}
      </div>
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
          stroke="#1e293b"
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
        <span className="text-[9px] font-bold text-white leading-none">{score}%</span>
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
}

export const InsightsPanel: React.FC<InsightsPanelProps> = memo(function InsightsPanel(props) {
  const { insights, totalWorkouts, totalSets, totalPRs } = props;
  const { weekComparison, streakInfo, prInsights, volumeSparkline, workoutSparkline, prSparkline, setsSparkline, consistencySparkline } = insights;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Workouts This Week */}
      <KPICard
        title="This Week"
        value={weekComparison.workouts.current}
        subtitle="workouts"
        icon={Calendar}
        iconColor="text-blue-400"
        delta={weekComparison.workouts}
        deltaContext="vs last wk"
        sparkline={workoutSparkline}
        sparklineColor="#3b82f6"
      />

      {/* Sets This Week */}
      <KPICard
        title="Sets"
        value={weekComparison.sets.current}
        subtitle="this week"
        icon={Dumbbell}
        iconColor="text-purple-400"
        delta={weekComparison.sets}
        deltaContext="vs last wk"
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

      {/* Consistency */}
      <KPICard
        title="Consistency"
        value={`${streakInfo.consistencyScore}%`}
        subtitle={`${streakInfo.avgWorkoutsPerWeek}/wk avg`}
        icon={Target}
        iconColor="text-emerald-400"
        sparkline={consistencySparkline}
        sparklineColor="#10b981"
        badge={<StreakBadge streak={streakInfo} />}
      />
    </div>
  );
});

// Compact Alert Card for Plateaus
interface PlateauAlertProps {
  exerciseName: string;
  weeksStuck: number;
  suggestion: string;
  asset?: ExerciseAsset;
}

export const PlateauAlert: React.FC<PlateauAlertProps> = ({ exerciseName, weeksStuck, suggestion, asset }) => {
  const imgSrc = asset?.sourceType === 'video' ? asset.thumbnail : (asset?.thumbnail || asset?.source);
  
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
      {imgSrc ? (
        <img src={imgSrc} alt="" className="w-9 h-9 rounded-lg object-cover border border-amber-500/30 flex-shrink-0" loading="lazy" />
      ) : (
        <div className="p-1.5 rounded-lg bg-amber-500/10 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{exerciseName}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
            {weeksStuck}+ weeks
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{suggestion}</p>
      </div>
    </div>
  );
};

// Recent PR Card with image and improvement
interface RecentPRCardProps {
  pr: RecentPR;
  isLatest?: boolean;
  asset?: ExerciseAsset;
  weightUnit?: WeightUnit;
}

export const RecentPRCard: React.FC<RecentPRCardProps> = ({ pr, isLatest, asset, weightUnit = 'kg' }) => {
  const { exercise, weight, reps, date, improvement } = pr;
  const imgSrc = asset?.sourceType === 'video' ? asset.thumbnail : (asset?.thumbnail || asset?.source);
  
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${isLatest ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-black/50'}`}>
      {imgSrc ? (
        <img src={imgSrc} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-700 flex-shrink-0" loading="lazy" />
      ) : (
        <div className={`p-1.5 rounded-lg ${isLatest ? 'bg-emerald-500/20' : 'bg-black/50'} flex-shrink-0`}>
          <Dumbbell className={`w-4 h-4 ${isLatest ? 'text-emerald-400' : 'text-slate-500'}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{exercise}</div>
        <div className="text-[10px] text-slate-500">{format(date, 'MMM d, yyyy')}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-white">{convertWeight(weight, weightUnit)}{weightUnit}</div>
        {improvement > 0 ? (
          <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-0.5">
            <TrendingUp className="w-3 h-3" />+{convertWeight(improvement, weightUnit)}{weightUnit}
          </div>
        ) : (
          <div className="text-[10px] text-slate-500">×{reps}</div>
        )}
      </div>
    </div>
  );
};

// Recent PRs Timeline Panel
interface RecentPRsPanelProps {
  prInsights: PRInsights;
  weightUnit?: WeightUnit;
}

export const RecentPRsPanel: React.FC<RecentPRsPanelProps> = memo(function RecentPRsPanel({ prInsights, weightUnit = 'kg' }) {
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
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
