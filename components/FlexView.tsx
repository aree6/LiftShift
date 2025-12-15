import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DailySummary, ExerciseStats, WorkoutSet } from '../types';
import { 
  Sun, Moon, Dumbbell,
  Sparkles, Weight, Trophy, Timer, Target, Flame, TrendingUp, Award, Repeat2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { ViewHeader } from './ViewHeader';
import { findBestComparison, formatLargeNumber, getRandomComparison } from '../utils/comparisonData';
import { WeightUnit } from '../utils/localStorage';
import { convertVolume, convertWeight } from '../utils/units';
import { FANCY_FONT } from '../utils/uiConstants';
import { calculateStreakInfo, calculatePRInsights, StreakInfo, PRInsights } from '../utils/insights';
import { getExerciseStats, getDailySummaries } from '../utils/analytics';
import { getExerciseAssets, ExerciseAsset } from '../utils/exerciseAssets';
import { normalizeMuscleGroup, NormalizedMuscleGroup } from '../utils/muscleAnalytics';
import { MUSCLE_GROUP_TO_SVG_IDS } from '../utils/muscleMappingConstants';
import { BodyMap } from './BodyMap';
import { format, getMonth, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { getEffectiveNowFromWorkoutData } from '../utils/dateUtils';
import CountUp from './CountUp';
import { FlexCard, CardTheme, FlexCardFooter } from './FlexCard';
import { LazyRender } from './LazyRender';

interface FlexViewProps {
  data: WorkoutSet[];
  filtersSlot?: React.ReactNode;
  weightUnit?: WeightUnit;
  dailySummaries?: DailySummary[];
  exerciseStats?: ExerciseStats[];
}

type ComparisonMode = 'best' | 'random';

const ZERO_LIFT_MESSAGES = [
  "No weights lifted yet? The bar is waiting for you! 🏋️",
  "Zero volume? Even gravity is confused right now.",
  "Your muscles are on vacation. Time to call them back!",
  "The iron misses you. Go say hello.",
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BEST_MONTH_ACCENTS = [
  { textDark: 'text-sky-200', textLight: 'text-sky-700', barDark: 'bg-sky-400', barLight: 'bg-sky-500', glowDark: 'shadow-[0_0_22px_rgba(56,189,248,0.25)]' },
  { textDark: 'text-violet-200', textLight: 'text-violet-700', barDark: 'bg-violet-400', barLight: 'bg-violet-500', glowDark: 'shadow-[0_0_22px_rgba(167,139,250,0.25)]' },
  { textDark: 'text-emerald-200', textLight: 'text-emerald-700', barDark: 'bg-emerald-400', barLight: 'bg-emerald-500', glowDark: 'shadow-[0_0_22px_rgba(52,211,153,0.22)]' },
  { textDark: 'text-green-200', textLight: 'text-green-700', barDark: 'bg-green-400', barLight: 'bg-green-500', glowDark: 'shadow-[0_0_22px_rgba(74,222,128,0.22)]' },
  { textDark: 'text-lime-200', textLight: 'text-lime-700', barDark: 'bg-lime-400', barLight: 'bg-lime-500', glowDark: 'shadow-[0_0_22px_rgba(163,230,53,0.22)]' },
  { textDark: 'text-yellow-200', textLight: 'text-yellow-700', barDark: 'bg-yellow-400', barLight: 'bg-yellow-500', glowDark: 'shadow-[0_0_22px_rgba(250,204,21,0.22)]' },
  { textDark: 'text-orange-200', textLight: 'text-orange-700', barDark: 'bg-orange-400', barLight: 'bg-orange-500', glowDark: 'shadow-[0_0_22px_rgba(251,146,60,0.22)]' },
  { textDark: 'text-amber-200', textLight: 'text-amber-700', barDark: 'bg-amber-400', barLight: 'bg-amber-500', glowDark: 'shadow-[0_0_22px_rgba(251,191,36,0.22)]' },
  { textDark: 'text-rose-200', textLight: 'text-rose-700', barDark: 'bg-rose-400', barLight: 'bg-rose-500', glowDark: 'shadow-[0_0_22px_rgba(251,113,133,0.22)]' },
  { textDark: 'text-fuchsia-200', textLight: 'text-fuchsia-700', barDark: 'bg-fuchsia-400', barLight: 'bg-fuchsia-500', glowDark: 'shadow-[0_0_22px_rgba(232,121,249,0.22)]' },
  { textDark: 'text-indigo-200', textLight: 'text-indigo-700', barDark: 'bg-indigo-400', barLight: 'bg-indigo-500', glowDark: 'shadow-[0_0_22px_rgba(129,140,248,0.22)]' },
  { textDark: 'text-cyan-200', textLight: 'text-cyan-700', barDark: 'bg-cyan-400', barLight: 'bg-cyan-500', glowDark: 'shadow-[0_0_22px_rgba(34,211,238,0.22)]' },
] as const;

// =========================================================================
// CARD: Yearly Heatmap Card - 12 month mini grids
// =========================================================================
const YearlyHeatmapCard: React.FC<{
  data: WorkoutSet[];
  theme: CardTheme;
}> = ({ data, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  const { selectedYear, effectiveNow, rangeStart, daySetCount, workoutsThisYear } = useMemo(() => {
    const dayCount = new Map<string, number>();
    const workoutSessionsByYear = new Map<number, Set<string>>();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const s of data) {
      const d = s.parsedDate;
      if (!d) continue;
      if (!minDate || d.getTime() < minDate.getTime()) minDate = d;
      if (!maxDate || d.getTime() > maxDate.getTime()) maxDate = d;

      const key = format(d, 'yyyy-MM-dd');
      dayCount.set(key, (dayCount.get(key) || 0) + 1);

      const y = d.getFullYear();
      const st = s.start_time;
      if (st) {
        if (!workoutSessionsByYear.has(y)) workoutSessionsByYear.set(y, new Set());
        workoutSessionsByYear.get(y)!.add(st);
      }
    }

    const effective = maxDate ?? new Date(0);
    const y = effective.getFullYear();
    const workouts = workoutSessionsByYear.get(y)?.size || 0;

    return {
      selectedYear: y,
      effectiveNow: effective,
      rangeStart: minDate || effective,
      daySetCount: dayCount,
      workoutsThisYear: workouts,
    };
  }, [data]);

  const getCellColor = (count: number) => {
    if (count === 0) return isDark ? 'bg-slate-800/50' : 'bg-slate-300/80';
    if (count <= 15) return 'bg-emerald-900';
    if (count <= 30) return 'bg-emerald-700';
    if (count <= 45) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  const months = useMemo(() => {
    const out: { monthIndex: number; cells: (number | null)[]; rowCount: number }[] = [];

    const startMonthIndex = rangeStart.getFullYear() === selectedYear ? rangeStart.getMonth() : 0;
    const endMonthIndex = effectiveNow.getFullYear() === selectedYear ? effectiveNow.getMonth() : 11;

    for (let m = startMonthIndex; m <= endMonthIndex; m++) {
      const monthStart = startOfMonth(new Date(selectedYear, m, 1));
      const monthEnd = endOfMonth(monthStart);

      const visibleEnd =
        selectedYear === effectiveNow.getFullYear() && m === effectiveNow.getMonth()
          ? effectiveNow
          : monthEnd;

      const days = eachDayOfInterval({ start: monthStart, end: visibleEnd });
      const rowCount = Math.ceil(days.length / 7);
      const cells: (number | null)[] = new Array(rowCount * 7).fill(null);
      for (let i = 0; i < days.length; i++) {
        const key = format(days[i], 'yyyy-MM-dd');
        cells[i] = daySetCount.get(key) || 0;
      }

      out.push({ monthIndex: m, cells, rowCount });
    }

    return out;
  }, [daySetCount, effectiveNow, rangeStart, selectedYear]);

  const monthsCount = months.length;
  const isUltraDense = monthsCount >= 10;
  const monthColsForDensity = isUltraDense ? 4 : 3;
  const monthRows = Math.max(1, Math.ceil(monthsCount / monthColsForDensity));
  const isDense = monthRows >= 4;
  const isVeryDense = monthRows >= 5;

  const monthGridColsClass = isUltraDense ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-4' : 'grid-cols-3';
  const monthGridGapX = isUltraDense ? 'gap-x-2' : isVeryDense ? 'gap-x-2' : isDense ? 'gap-x-3' : 'gap-x-6';
  const monthGridGapY = isUltraDense ? 'gap-y-3' : isVeryDense ? 'gap-y-2' : isDense ? 'gap-y-3' : 'gap-y-6';
  const monthLabelClass = isUltraDense
    ? 'text-[10px] mb-0.5'
    : isVeryDense
      ? 'text-[10px] mb-0.5'
      : isDense
        ? 'text-xs mb-1'
        : 'text-sm mb-2';
  const cellGapClass = isUltraDense ? 'gap-0.5' : isVeryDense ? 'gap-0.5' : isDense ? 'gap-0.5' : 'gap-1';
  const headerGapClass = isDense ? 'mb-4' : 'mb-6';
  const contentPadClass = isDense ? 'pt-5 pb-12' : 'pt-6 pb-14';
  const monthGridMaxWClass = isUltraDense ? 'max-w-[80px] lg:max-w-[120px]' : isVeryDense ? 'max-w-[84px]' : isDense ? 'max-w-[96px]' : 'max-w-[120px]';
  const headlineCountClass = isUltraDense
    ? 'text-4xl sm:text-5xl'
    : isVeryDense
      ? 'text-4xl sm:text-5xl'
      : isDense
        ? 'text-5xl sm:text-6xl'
        : 'text-6xl sm:text-7xl';

  return (
    <FlexCard theme={theme} className="h-[500px] flex flex-col">
      <div className={`relative z-[1] px-4 sm:px-6 ${contentPadClass} flex flex-col items-center text-center flex-1`}>
        <div className="w-full flex items-start justify-between gap-3 mb-4">
          <div className="text-left">
            <div className={`text-xs font-semibold uppercase tracking-widest ${textMuted}`}>Hevy in Review</div>
            <div className={`text-lg sm:text-xl font-bold ${textPrimary}`} style={FANCY_FONT}>
              {selectedYear}
            </div>
          </div>
        </div>

        <div className={`${headlineCountClass} font-black ${textPrimary} mb-1 leading-none`} style={FANCY_FONT}>
          <CountUp from={0} to={workoutsThisYear} separator="," direction="up" duration={1} />
        </div>
        <div className={`text-base sm:text-lg ${textSecondary} ${headerGapClass}`}>
          Workouts this year
        </div>

        <div className={`w-full min-w-0 grid ${monthGridColsClass} ${monthGridGapX} ${monthGridGapY}`}>
          {months.map(({ monthIndex, cells, rowCount }) => (
            <div key={monthIndex} className={monthGridMaxWClass}>
              <div className={`text-center ${monthLabelClass} font-semibold ${textMuted}`}>
                {MONTH_SHORT[monthIndex]}
              </div>
              <div className={`grid grid-cols-7 ${cellGapClass} w-full ${monthGridMaxWClass}`}>
                {cells.map((count, idx) => {
                  if (count == null) {
                    return (
                      <div
                        key={idx}
                        className={`aspect-square w-full rounded-sm ${isDark ? 'bg-slate-800/20' : 'bg-slate-200/70'}`}
                      />
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className={`aspect-square w-full rounded-sm ${getCellColor(count)} transition-all duration-300 ${
                        count > 0
                          ? isDark
                            ? 'shadow-[0_0_18px_rgba(16,185,129,0.18)]'
                            : 'shadow-[0_0_16px_rgba(16,185,129,0.16)]'
                          : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FlexCardFooter theme={theme} />
    </FlexCard>
  );
};

// ============================================================================
// CARD 1: Summary Card - Overview stats
// ============================================================================
const SummaryCard: React.FC<{
  totalWorkouts: number;
  totalDuration: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  weightUnit: WeightUnit;
  theme: CardTheme;
}> = ({ totalWorkouts, totalDuration, totalVolume, totalSets, totalReps, weightUnit, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  const hours = Math.round(totalDuration / 60);

  return (
    <FlexCard theme={theme} className="min-h-[500px] flex flex-col">
      <div className="relative z-[1] pt-6 px-6 pb-16 flex flex-col items-center text-center flex-1">
        {/* Decorative blurs */}
        <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-blue-500/10' : 'bg-blue-200/40'}`} />
        <div className={`absolute bottom-20 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-purple-500/10' : 'bg-purple-200/30'}`} />

        {/* Header badge */}
        <div className={`flex items-center gap-2 mb-4 ${textMuted}`}>
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Your Journey</span>
          <Sparkles className="w-4 h-4" />
        </div>

        {/* Title */}
        <h2 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-8`} style={FANCY_FONT}>
          Your Fitness Summary 💪
        </h2>

        {/* Main stat - Workouts */}
        <div className="mb-6">
          <div className={`text-7xl sm:text-8xl font-black ${textPrimary}`} style={FANCY_FONT}>
            <CountUp
              from={0}
              to={totalWorkouts}
              separator="," 
              direction="up"
              duration={1}
              className={textPrimary}
            />
          </div>
          <div className={`text-lg ${textSecondary} font-medium`}>Workouts</div>
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <div className={`text-3xl sm:text-4xl font-bold ${textPrimary}`} style={FANCY_FONT}>
              {hours > 0 ? `${hours}h` : '<1h'}
            </div>
            <div className={`text-sm ${textSecondary}`}>Duration</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl sm:text-4xl font-bold ${textPrimary}`} style={FANCY_FONT}>
              {formatLargeNumber(totalVolume)}
              <span className={`text-lg ml-1 ${textSecondary}`}>{weightUnit}</span>
            </div>
            <div className={`text-sm ${textSecondary}`}>Volume</div>
          </div>
        </div>

        {/* Tertiary stats row */}
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className={`text-2xl sm:text-3xl font-bold ${textPrimary}`} style={FANCY_FONT}>
              {formatLargeNumber(totalSets)}
            </div>
            <div className={`text-sm ${textSecondary}`}>Sets</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl sm:text-3xl font-bold ${textPrimary}`} style={FANCY_FONT}>
              {formatLargeNumber(totalReps)}
            </div>
            <div className={`text-sm ${textSecondary}`}>Reps</div>
          </div>
        </div>
      </div>
      <FlexCardFooter theme={theme} />
    </FlexCard>
  );
};

// ============================================================================
// CARD 2: Streak Card - Longest streak with fire emoji
// ============================================================================
const StreakCard: React.FC<{
  streakInfo: StreakInfo;
  theme: CardTheme;
}> = ({ streakInfo, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <FlexCard theme={theme} className="min-h-[500px] flex flex-col">
      <div className="relative z-[1] pt-6 px-6 pb-16 flex flex-col items-center text-center flex-1 justify-center">
        {/* Decorative blurs */}
        <div className={`absolute top-10 right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-orange-500/20' : 'bg-orange-200/50'}`} />
        <div className={`absolute bottom-32 left-10 w-28 h-28 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-red-500/15' : 'bg-red-200/40'}`} />

        {/* Header */}
        <h2 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-12`} style={FANCY_FONT}>
          Your Longest Streak
        </h2>

        {/* Fire badge with number */}
        <div className="relative mb-8">
          {/* Glow effect */}
          <div className="absolute inset-0 blur-2xl bg-gradient-to-t from-orange-500/40 to-red-500/30 scale-150" />
          
          {/* Fire emoji container */}
          <div className="relative">
            <span className="text-[120px] sm:text-[150px] leading-none filter drop-shadow-lg">🔥</span>
            {/* Number overlay */}
            <div className="absolute inset-0 flex items-center justify-center pt-8">
              <span
                className={`text-5xl sm:text-6xl font-black text-black tabular-nums tracking-tight leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]`}
                style={{ ...FANCY_FONT, fontStyle: 'normal' }}
              >
                <CountUp
                  from={0}
                  to={streakInfo.longestStreak}
                  separator="," 
                  direction="up"
                  duration={1}
                />
              </span>
            </div>
          </div>
        </div>

        {/* Label */}
        <div className={`text-3xl sm:text-4xl font-bold ${textPrimary} mb-3`} style={FANCY_FONT}>
          weeks
        </div>

        {/* Subtext */}
        <p className={`text-base ${textSecondary} max-w-xs`}>
          was your longest streak — keep that fire burning!
        </p>

        {/* Current streak indicator */}
        {streakInfo.currentStreak > 0 && (
          <div className={`mt-6 px-4 py-2 rounded-full ${isDark ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-100 border border-orange-200'}`}>
            <span className={`text-sm font-semibold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
              🔥 Currently on a {streakInfo.currentStreak} week streak!
            </span>
          </div>
        )}
      </div>
      <FlexCardFooter theme={theme} />
    </FlexCard>
  );
};

// ============================================================================
// CARD 3: Personal Records Card - with Laurel Wreath
// ============================================================================
const PersonalRecordsCard: React.FC<{
  prInsights: PRInsights;
  topPRExercises: { name: string; weight: number; thumbnail?: string }[];
  weightUnit: WeightUnit;
  theme: CardTheme;
}> = ({ prInsights, topPRExercises, weightUnit, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const prNumberColor = isDark ? 'text-white' : 'text-slate-900';

  const effectiveTotalPRs = prInsights.totalPRs;

  const isCompactPR = effectiveTotalPRs >= 10000;
  const compactPR = (() => {
    if (!isCompactPR) return { value: effectiveTotalPRs, suffix: '', decimals: 0 };

    const abs = Math.abs(effectiveTotalPRs);
    const base = abs >= 1_000_000_000 ? 1_000_000_000 : abs >= 1_000_000 ? 1_000_000 : 1_000;
    const suffix = base === 1_000_000_000 ? 'B+' : base === 1_000_000 ? 'M+' : 'k+';
    const raw = abs / base;
    const decimals = raw < 10 ? 1 : 0;
    const factor = decimals === 1 ? 10 : 1;
    const floored = Math.floor(raw * factor) / factor;
    const signed = effectiveTotalPRs < 0 ? -floored : floored;

    return { value: signed, suffix, decimals };
  })();

  const prDisplayText = isCompactPR
    ? `${compactPR.value.toFixed(compactPR.decimals)}${compactPR.suffix}`
    : Intl.NumberFormat('en-US').format(effectiveTotalPRs);

  const prCountLen = prDisplayText.length;
  const prCountSizeClass =
    prCountLen >= 9
      ? 'text-2xl sm:text-3xl'
      : prCountLen >= 7
        ? 'text-3xl sm:text-4xl'
        : prCountLen >= 6
          ? 'text-4xl sm:text-5xl'
          : 'text-5xl sm:text-6xl';

  const prCountScale = prCountLen >= 9 ? 0.78 : prCountLen >= 7 ? 0.86 : prCountLen >= 6 ? 0.93 : 1;

  return (
    <FlexCard theme={theme} className="min-h-[500px] flex flex-col">
      <div className="relative z-[1] pt-6 px-6 pb-12 flex flex-col items-center text-center flex-1">
        {/* Decorative blurs */}
        <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-amber-500/10' : 'bg-amber-200/40'}`} />

        {/* Header */}
        <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary} mb-4`} style={FANCY_FONT}>
          In total you had
        </h2>

        {/* Laurel Wreath with PR count */}
        <div className="relative mb-3">
          {/* Laurel wreath image */}
          <img 
            src="/comparisonImages/Laurel-Wreath1.svg" 
            alt="" 
            className="w-56 h-56 sm:w-64 sm:h-64 object-contain opacity-95"
          />
          {/* PR count overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full px-8 flex items-center justify-center">
              <span
                className={`${prCountSizeClass} inline-block origin-center font-black ${prNumberColor} tabular-nums tracking-tight leading-none whitespace-nowrap max-w-[80%] text-center`}
                style={{ ...FANCY_FONT, transform: `scale(${prCountScale})` }}
              >
                {isCompactPR ? (
                  <>
                    <CountUp
                      from={0}
                      to={compactPR.value}
                      separator="," 
                      direction="up"
                      duration={1}
                    />
                    {compactPR.suffix}
                  </>
                ) : (
                  <CountUp
                    from={0}
                    to={effectiveTotalPRs}
                    separator="," 
                    direction="up"
                    duration={1}
                  />
                )}
              </span>
            </div>

            <div
              className={`relative mt-1 px-3.5 py-1 rounded-full border overflow-hidden ${
                isDark
                  ? 'bg-slate-900/35 border-white/10'
                  : 'bg-white/55 border-slate-900/10'
              }`}
            >
              <div
                className={`absolute inset-0 pointer-events-none ${
                  isDark
                    ? 'bg-gradient-to-b from-slate-900/65 via-slate-900/40 to-slate-900/10'
                    : 'bg-gradient-to-b from-white/80 via-white/55 to-white/20'
                }`}
              />
              <div className="absolute inset-0 pointer-events-none" />
              <div className={`relative text-xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`} style={FANCY_FONT}>
                PRs
              </div>
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="hidden" />

        {/* Top PRs list */}
        {topPRExercises.length > 0 && (
          <div className="w-full mt-2">
            {(() => {
              const display = topPRExercises.slice(0, 2);
              const maxW = Math.max(...display.map((e) => e.weight), 1);
              const rowH = 48;
              const avatar = 40;

              return (
                <div className="w-full flex flex-col gap-3 px-1 overflow-x-hidden">
                  {display.map((exercise, idx) => {
                    const pct = Math.max(4, Math.round((exercise.weight / maxW) * 100));
                    const medal = idx === 0 ? 'gold' : 'silver';
                    const medalEmoji = medal === 'gold' ? '🏅' : '✨';
                    const countClass = medal === 'gold'
                      ? (isDark ? 'text-amber-300' : 'text-amber-700')
                      : (isDark ? 'text-slate-200' : 'text-slate-700');

                    const fillBackground = medal === 'gold'
                      ? 'linear-gradient(90deg, rgba(245,158,11,0.95) 0%, rgba(59,130,246,0.85) 100%)'
                      : 'linear-gradient(90deg, rgba(226,232,240,0.92) 0%, rgba(148,163,184,0.82) 40%, rgba(59,130,246,0.75) 100%)';

                    const medalRing = medal === 'gold'
                      ? 'ring-2 ring-amber-300/70'
                      : 'ring-2 ring-slate-200/60';

                    return (
                      <div key={exercise.name} className="flex items-center gap-3 min-w-0">
                        <div
                          className={`relative flex-1 min-w-0 rounded-full overflow-hidden ${isDark ? 'bg-black/25' : 'bg-slate-200/70'} `}
                          style={{ height: `${rowH}px` }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
                            style={{
                              width: `${pct}%`,
                              minWidth: `${avatar + 96}px`,
                              backgroundImage: fillBackground,
                              opacity: 0.95,
                            }}
                          >
                            <div
                              className="relative z-10 h-full flex items-center pl-4"
                              style={{ paddingRight: `${avatar + 14}px` }}
                            >
                              <div className="text-white font-semibold text-sm truncate">
                                {medalEmoji} {exercise.name}
                              </div>
                            </div>

                            <div
                              className={`absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white ${medalRing}`}
                              style={{ width: `${avatar}px`, height: `${avatar}px` }}
                            >
                              {exercise.thumbnail ? (
                                <img
                                  src={exercise.thumbnail}
                                  alt={exercise.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-white/95 flex items-center justify-center">
                                  <Trophy className="w-5 h-5 text-slate-500" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`min-w-[96px] text-right font-extrabold text-lg tracking-tight ${countClass}`} style={FANCY_FONT}>
                          {exercise.weight}
                          <span className={`${isDark ? 'text-white/90' : 'text-slate-900/80'} font-bold ml-1`}>{weightUnit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
      <FlexCardFooter theme={theme} />
    </FlexCard>
  );
};

// ============================================================================
// CARD 4: Best Month Card
// ============================================================================
const BestMonthCard: React.FC<{
  monthlyData: { month: number; workouts: number }[];
  theme: CardTheme;
}> = ({ monthlyData, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Find best month
  const bestMonth = monthlyData.reduce((best, curr) => 
    curr.workouts > best.workouts ? curr : best, 
    { month: 0, workouts: 0 }
  );

  const accent = BEST_MONTH_ACCENTS[bestMonth.month] || BEST_MONTH_ACCENTS[0];
  const mainNumberColor = isDark ? accent.textDark : accent.textLight;

  const maxWorkouts = Math.max(...monthlyData.map(m => m.workouts), 1);

  // Calculate average for active months
  const activeMonths = monthlyData.filter(m => m.workouts > 0);
  const avgWorkouts = activeMonths.length > 0 
    ? Math.round(activeMonths.reduce((sum, m) => sum + m.workouts, 0) / activeMonths.length)
    : 0;

  return (
    <FlexCard theme={theme} className="min-h-[500px] flex flex-col">
      <div className="relative z-[1] pt-6 px-6 pb-14 flex flex-col items-center text-center flex-1">
        {/* Decorative blurs */}
        <div className={`absolute top-0 left-0 w-40 h-40 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-200/40'}`} />

        {/* Header */}
        <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary} mb-2`} style={FANCY_FONT}>
          {bestMonth.workouts > 0 ? MONTH_NAMES[bestMonth.month] : 'No data yet'}
        </h2>
        <p className={`text-sm ${textSecondary} mb-4`}>was your best month with</p>

        {/* Main number */}
        <div className={`text-7xl sm:text-8xl font-black mb-1 ${mainNumberColor}`} style={FANCY_FONT}>
          <CountUp
            from={0}
            to={bestMonth.workouts}
            separator="," 
            direction="up"
            duration={1}
            className={mainNumberColor}
          />
        </div>
        <div className={`text-lg ${textSecondary} mb-6`}>Workouts</div>

        {/* Mini bar chart */}
        <div className="w-full flex items-end justify-center gap-1 h-24 mb-4">
          {MONTH_SHORT.map((month, idx) => {
            const data = monthlyData.find(m => m.month === idx);
            const workouts = data?.workouts || 0;
            const maxBarHeight = 84;
            const heightPx = maxWorkouts > 0 ? (workouts / maxWorkouts) * maxBarHeight : 0;
            const isBest = idx === bestMonth.month && workouts > 0;
            
            return (
              <div key={month} className="flex flex-col items-center gap-1 flex-1 max-w-[28px]">
                <div className="w-full flex items-end" style={{ height: `${maxBarHeight}px` }}>
                  <div 
                    className={`w-full rounded-t-sm transition-all ${
                      isBest 
                        ? isDark
                          ? `${accent.barDark} ${accent.glowDark}`
                          : accent.barLight
                        : isDark ? 'bg-slate-600' : 'bg-slate-400'
                    }`}
                    style={{ height: `${Math.max(heightPx, 6)}px` }}
                  />
                </div>
                <span className={`text-[9px] ${textSecondary}`}>{month[0]}</span>
              </div>
            );
          })}
        </div>

        {/* Average stat */}
        <p className={`text-sm ${textSecondary}`}>
          On average, you trained{' '}
          <span className={`font-bold ${mainNumberColor}`}>{avgWorkouts} times</span>
          {' '}in active months
        </p>
      </div>
      <FlexCardFooter theme={theme} />
    </FlexCard>
  );
};

// ============================================================================
// CARD 5: Top Exercises Card
// ============================================================================
const TopExercisesCard: React.FC<{
  exercises: { name: string; count: number; thumbnail?: string }[];
  theme: CardTheme;
}> = ({ exercises, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const maxCount = exercises.length > 0 ? exercises[0].count : 1;

  return (
    <FlexCard theme={theme} className="min-h-[500px] flex flex-col">
      <div className="relative z-[1] pt-6 px-5 pb-16 flex flex-col items-center flex-1">
        {/* Header */}
        <div className={`flex items-center gap-2 mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <Trophy className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Most Performed</span>
        </div>

        <h2 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-8 text-center`} style={FANCY_FONT}>
          Your Top Exercises
        </h2>

        {/* Most Frequent Exercises (minimal, proportional) */}
        {exercises.length === 0 ? (
          <div className={`flex items-center justify-center h-[220px] text-xs text-slate-500 border border-dashed ${isDark ? 'border-slate-800' : 'border-slate-200'} rounded-lg`}>
            Not enough data to render Most Frequent Exercises.
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-center gap-3 px-1 sm:px-2 overflow-x-hidden">
            {(() => {
              const display = exercises.slice(0, 3);
              const max = Math.max(...display.map((e) => e.count), 1);
              const rowH = 48;
              const avatar = 40;
              const colors = ['#06b6d4', '#3b82f6', '#a855f7'];

              return display.map((exercise, idx) => {
                const color = colors[idx % colors.length];
                const pct = Math.max(4, Math.round((exercise.count / max) * 100));

                const medal = idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze';
                const medalEmoji = medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : '🥉';
                const countClass = medal === 'gold'
                  ? (isDark ? 'text-amber-300' : 'text-amber-700')
                  : medal === 'silver'
                    ? (isDark ? 'text-slate-200' : 'text-slate-700')
                    : (isDark ? 'text-orange-300' : 'text-orange-700');

                const fillBackground = medal === 'gold'
                  ? 'linear-gradient(90deg, rgba(245,158,11,0.95) 0%, rgba(59,130,246,0.9) 100%)'
                  : medal === 'silver'
                    ? 'linear-gradient(90deg, rgba(226,232,240,0.96) 0%, rgba(148,163,184,0.92) 40%, rgba(59,130,246,0.85) 100%)'
                    : 'linear-gradient(90deg, rgba(251,146,60,0.9) 0%, rgba(59,130,246,0.85) 100%)';

                const medalRing = medal === 'gold'
                  ? 'ring-2 ring-amber-300/70'
                  : medal === 'silver'
                    ? 'ring-2 ring-slate-100/80'
                    : 'ring-2 ring-orange-300/60';

                return (
                  <div key={exercise.name} className="flex items-center gap-3 min-w-0">
                    <div
                      className={`relative flex-1 min-w-0 rounded-full overflow-hidden ${isDark ? 'bg-black/25' : 'bg-slate-200/70'}`}
                      style={{ height: `${rowH}px` }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
                        style={{
                          width: `${pct}%`,
                          minWidth: '64px',
                          backgroundColor: fillBackground ? undefined : color,
                          backgroundImage: fillBackground,
                          opacity: 0.95,
                        }}
                      >
                        <div
                          className="relative z-10 h-full flex items-center pl-4"
                          style={{ paddingRight: `${avatar + 14}px` }}
                        >
                          <div className="text-white font-semibold text-sm truncate">
                            {`${medalEmoji} ${exercise.name}`}
                          </div>
                        </div>

                        <div
                          className={`absolute top-1/2 -translate-y-1/2 right-1 rounded-full overflow-hidden bg-white ${medalRing}`}
                          style={{ width: `${avatar}px`, height: `${avatar}px` }}
                        >
                          {exercise.thumbnail ? (
                            <img
                              src={exercise.thumbnail}
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/95 flex items-center justify-center">
                              <Dumbbell className="w-5 h-5 text-slate-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`min-w-[72px] text-right font-extrabold text-xl tracking-tight ${countClass}`} style={FANCY_FONT}>
                      {exercise.count}
                      <span className={`${isDark ? 'text-white/90' : 'text-slate-900/80'} font-bold ml-1`}>x</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
      <FlexCardFooter theme={theme} />
    </FlexCard>
  );
};

// ============================================================================
// CARD 6: Muscle Focus Card - Radar chart style
// ============================================================================
const MuscleFocusCard: React.FC<{
  muscleData: { group: NormalizedMuscleGroup; sets: number }[];
  theme: CardTheme;
}> = ({ muscleData, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const [showHeatmap, setShowHeatmap] = useState(true);

  // Sort by sets and get top 3
  const sorted = [...muscleData].filter(m => m.group !== 'Cardio' && m.group !== 'Other').sort((a, b) => b.sets - a.sets);
  const topMuscles = sorted.slice(0, 3).map(m => m.group);

  // Create radar-style visualization
  const groups: NormalizedMuscleGroup[] = ['Back', 'Chest', 'Core', 'Legs', 'Shoulders', 'Arms'];
  const maxSets = Math.max(...muscleData.map(m => m.sets), 1);

  const heatmap = useMemo(() => {
    const volumes = new Map<string, number>();
    let maxVolume = 0;

    for (const { group, sets } of muscleData) {
      if (group === 'Other' || group === 'Cardio') continue;
      const svgIds = MUSCLE_GROUP_TO_SVG_IDS[group] || [];
      for (const id of svgIds) {
        volumes.set(id, sets);
      }
      if (sets > maxVolume) maxVolume = sets;
    }

    return { volumes, maxVolume: Math.max(maxVolume, 1) };
  }, [muscleData]);

  const centerX = 120;
  const centerY = 100;
  const maxRadius = 70;

  // Calculate points for hexagon shape
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / groups.length - Math.PI / 2;
    const radius = (value / maxSets) * maxRadius;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const dataPoints = groups.map((group, idx) => {
    const data = muscleData.find(m => m.group === group);
    return getPoint(idx, data?.sets || 0);
  });

  const pathData = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Grid hexagons
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const getHexPath = (scale: number) => {
    const points = groups.map((_, idx) => {
      const angle = (Math.PI * 2 * idx) / groups.length - Math.PI / 2;
      const radius = maxRadius * scale;
      return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
    });
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  };

  return (
    <FlexCard theme={theme} className="min-h-[500px] flex flex-col">
      <div className="relative z-[1] pt-6 px-6 pb-14 flex flex-col items-center text-center flex-1">
        <div className="w-full flex items-center justify-between mb-5">
          <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <Target className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">Muscle Focus</span>
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowHeatmap((v) => !v);
            }}
            className={`p-2 rounded-full border transition-all ${
              isDark
                ? 'bg-black/30 border-slate-700/50 text-slate-200 hover:border-slate-600'
                : 'bg-white/70 border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
            title="Flip view"
          >
            <Repeat2 className="w-4 h-4" />
          </button>
        </div>

        <h2 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-6 text-center`} style={FANCY_FONT}>
          You worked mainly on
        </h2>

        {/* Radar Visualization */}
        {!showHeatmap ? (
          <div className="relative mb-8">
            <svg width="240" height="220" viewBox="0 0 240 220" className="drop-shadow-lg">
              {/* Grid */}
              {gridLevels.map((level, idx) => (
                <path
                  key={idx}
                  d={getHexPath(level)}
                  fill="none"
                  stroke={isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.3)'}
                  strokeWidth="1"
                />
              ))}

              {/* Data polygon */}
              <path
                d={pathData}
                fill={isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.18)'}
                stroke={isDark ? 'rgba(59,130,246,0.8)' : 'rgba(37,99,235,0.75)'}
                strokeWidth="2"
              />

              {/* Points */}
              {dataPoints.map((point, idx) => (
                <circle
                  key={idx}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={isDark ? '#60a5fa' : '#2563eb'}
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth="2"
                />
              ))}

              {/* Labels */}
              {groups.map((group, idx) => {
                const angle = (Math.PI * 2 * idx) / groups.length - Math.PI / 2;
                const labelRadius = maxRadius + 25;
                const x = centerX + labelRadius * Math.cos(angle);
                const y = centerY + labelRadius * Math.sin(angle);
                return (
                  <text
                    key={group}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-[10px] font-semibold ${isDark ? 'fill-slate-300' : 'fill-slate-700'}`}
                  >
                    {group}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="w-full flex justify-center mb-8">
            <div
              className="h-44 sm:h-56 flex items-center justify-center"
            >
              <BodyMap
                onPartClick={() => {}}
                selectedPart={null}
                muscleVolumes={heatmap.volumes}
                maxVolume={heatmap.maxVolume}
                compact
                compactFill
                viewMode="group"
              />
            </div>
          </div>
        )}

        {/* Top muscles highlight */}
        <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} style={FANCY_FONT}>
          {topMuscles.length > 0 ? topMuscles.join(', ') : 'All muscles'}
        </div>
      </div>
      <FlexCardFooter theme={theme} />
    </FlexCard>
  );
};

// Card component for volume comparison - designed to be screenshot-friendly
const VolumeComparisonCard: React.FC<{
  totalVolume: number;
  weightUnit: WeightUnit;
  theme: CardTheme;
  comparisonMode?: ComparisonMode;
  randomKey?: number;
  onThemeToggle?: () => void;
  showThemeToggle?: boolean;
}> = ({ totalVolume, weightUnit, theme, comparisonMode = 'best', randomKey = 0, onThemeToggle, showThemeToggle = false }) => {
  const volumeInKg = weightUnit === 'lbs' ? totalVolume / 2.20462 : totalVolume;
  
  const comparison = useMemo(() => {
    if (volumeInKg <= 0) return null;

    if (comparisonMode === 'random') {
      const { filename, item } = getRandomComparison();
      const rawCount = item.weight > 0 ? volumeInKg / item.weight : 0;
      const count = Math.max(0.1, Math.round(rawCount * 10) / 10);
      return { filename, item, count };
    }

    return findBestComparison(volumeInKg);
  }, [volumeInKg, comparisonMode, randomKey]);

  const zeroMessage = useMemo(() => {
    return ZERO_LIFT_MESSAGES[Math.floor(Math.random() * ZERO_LIFT_MESSAGES.length)];
  }, []);

  const isDark = theme === 'dark';

  const formattedCount = useMemo(() => {
    if (!comparison) return null;
    const count = comparison.count;

    if (count > 10) {
      const rounded = Math.round(count);
      return rounded >= 1000 ? formatLargeNumber(rounded) : rounded.toLocaleString();
    }

    const roundedToTenth = Math.round(count * 10) / 10;
    return roundedToTenth.toFixed(1).replace(/\.0$/, '');
  }, [comparison]);
  
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const accentBg = isDark ? 'bg-blue-500/10' : 'bg-blue-100';
  const accentText = isDark ? 'text-blue-400' : 'text-blue-600';

  return (
    <FlexCard theme={theme} className="min-h-[460px] sm:min-h-[500px]">
      {/* Background decorative elements */}
      <div className={`absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/30'}`} />
      <div className={`absolute bottom-0 left-0 w-44 h-44 rounded-full blur-3xl pointer-events-none ${isDark ? 'bg-purple-500/5' : 'bg-purple-200/20'}`} />
      
      {/* Theme toggle button - positioned inside card for screenshot */}
      {showThemeToggle && onThemeToggle && (
        <button
          onClick={onThemeToggle}
          className={`absolute top-3 right-3 z-10 p-2 rounded-xl border transition-all duration-300 ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-yellow-400' 
              : 'bg-white/80 border-slate-300 hover:bg-slate-100 text-slate-700'
          }`}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      )}

      {/* Card content */}
      <div className="relative z-[1] pt-5 px-5 pb-12 sm:pt-6 sm:px-6 sm:pb-14 flex flex-col items-center text-center h-full">
        <div className="w-full flex flex-col items-center">
          {/* Header */}
          <div className={`flex items-center gap-2 mb-1.5 ${textMuted}`}>
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Total Volume Lifted</span>
            <Sparkles className="w-4 h-4" />
          </div>

          {/* Main volume number */}
          <div className={`text-4xl sm:text-5xl font-black ${textPrimary} mb-0.5`} style={FANCY_FONT}>
            {formatLargeNumber(totalVolume)}
            <span className={`text-xl sm:text-2xl ml-2 ${textSecondary}`}>{weightUnit}</span>
          </div>

          {volumeInKg <= 0 ? (
            // Zero volume state
            <div className="flex flex-col items-center justify-center py-6">
              <div className={`w-20 h-20 rounded-full ${accentBg} flex items-center justify-center mb-5`}>
                <Dumbbell className={`w-10 h-10 ${accentText}`} />
              </div>
              <p className={`text-base sm:text-lg ${textSecondary} max-w-xs`}>
                {zeroMessage}
              </p>
            </div>
          ) : comparison ? (
            // Comparison content
            <div className="flex flex-col items-center justify-center py-3">
              {/* Comparison image */}
              <div className="relative mb-3">
                <div className={`absolute inset-0 rounded-full blur-3xl ${
                  isDark
                    ? 'bg-gradient-to-tr from-blue-500/35 via-cyan-500/18 to-purple-500/28'
                    : 'bg-gradient-to-tr from-blue-300/55 via-cyan-200/40 to-purple-300/45'
                }`} />
                <img
                  src={`/comparisonImages/${comparison.filename}`}
                  alt={comparison.item.label}
                  className="relative w-40 h-40 sm:w-52 sm:h-52 object-contain drop-shadow-lg"
                  loading="eager"
                />
              </div>

              <div className="flex flex-col items-center">
                <p className={`text-xs ${textMuted} mb-1 font-medium`}>
                  That&apos;s like lifting
                </p>
                <div className={`text-4xl sm:text-5xl font-black ${accentText} leading-none`} style={FANCY_FONT}>
                  <CountUp from={0} to={comparison.count} separator="," direction="up" duration={1} />
                </div>
                <h3 className={`text-lg sm:text-2xl font-bold ${textPrimary} mt-1`} style={FANCY_FONT}>
                  {comparison.item.label}
                </h3>
                <p className={`text-xs ${textMuted} mt-2 max-w-xs`}>
                  {comparison.item.description.replace(/\s*\n+\s*/g, ' ').replace(/\s+/g, ' ').trim()}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Branding footer */}
        <FlexCardFooter theme={theme} />

        {/* Spacer pushes any remaining space below the footer (keeps description->footer gap consistent) */}
        <div className="hidden" />
      </div>
    </FlexCard>
  );
};

export const FlexView: React.FC<FlexViewProps> = ({
  data,
  filtersSlot,
  weightUnit = 'kg',
  dailySummaries: dailySummariesProp,
  exerciseStats: exerciseStatsProp,
}) => {
  const [cardTheme, setCardTheme] = useState<CardTheme>('dark');

  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [showFocusedNav, setShowFocusedNav] = useState(false);
  const hideNavTimeoutRef = useRef<number | null>(null);
  const canHover = useMemo(
    () => (typeof window !== 'undefined' ? window.matchMedia?.('(hover: hover)')?.matches : true),
    []
  );

  useEffect(() => {
    if (!focusedCardId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusedCardId(null);
    };

    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [focusedCardId]);

  useEffect(() => {
    if (!focusedCardId) {
      setShowFocusedNav(false);
      if (hideNavTimeoutRef.current) {
        window.clearTimeout(hideNavTimeoutRef.current);
        hideNavTimeoutRef.current = null;
      }
      return;
    }
    if (!canHover) {
      setShowFocusedNav(true);
    }
    return () => {
      if (hideNavTimeoutRef.current) {
        window.clearTimeout(hideNavTimeoutRef.current);
        hideNavTimeoutRef.current = null;
      }
    };
  }, [focusedCardId, canHover]);

  const toggleFocusedNavTouch = () => {
    if (canHover) return;
    setShowFocusedNav((v) => !v);
    if (hideNavTimeoutRef.current) {
      window.clearTimeout(hideNavTimeoutRef.current);
      hideNavTimeoutRef.current = null;
    }
  };

  // Get exercise assets for thumbnails
  const [assetsMap, setAssetsMap] = useState<Map<string, ExerciseAsset>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    getExerciseAssets()
      .then((m) => {
        if (!cancelled) setAssetsMap(m);
      })
      .catch(() => {
        if (!cancelled) setAssetsMap(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Calculate all stats from data
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalReps = 0;
    let totalDuration = 0;
    const sessions = new Set<string>();
    const exerciseCounts = new Map<string, number>();
    const monthlyWorkouts = new Map<number, Set<string>>();
    const muscleGroups = new Map<NormalizedMuscleGroup, number>();

    // Case-insensitive lookup cache for assets
    const lowerAssetsMap = new Map<string, ExerciseAsset>();
    assetsMap.forEach((v, k) => lowerAssetsMap.set(k.toLowerCase(), v));

    for (const set of data) {
      totalVolume += (set.weight_kg || 0) * (set.reps || 0);
      totalReps += set.reps || 0;
      
      if (set.start_time) {
        sessions.add(set.start_time);
      }

      // Count exercises
      const exerciseName = set.exercise_title || '';
      if (exerciseName) {
        exerciseCounts.set(exerciseName, (exerciseCounts.get(exerciseName) || 0) + 1);
      }

      // Monthly workouts
      if (set.parsedDate) {
        const month = getMonth(set.parsedDate);
        if (!monthlyWorkouts.has(month)) {
          monthlyWorkouts.set(month, new Set());
        }
        if (set.start_time) {
          monthlyWorkouts.get(month)!.add(set.start_time);
        }

        // Muscle groups
        const asset = assetsMap.get(exerciseName) || lowerAssetsMap.get(exerciseName.toLowerCase());
        if (asset) {
          const primaryMuscle = normalizeMuscleGroup(asset.primary_muscle);
          if (primaryMuscle !== 'Cardio') {
            if (primaryMuscle === 'Full Body') {
              // Distribute to all groups
              const groups: NormalizedMuscleGroup[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
              for (const g of groups) {
                muscleGroups.set(g, (muscleGroups.get(g) || 0) + 1);
              }
            } else {
              muscleGroups.set(primaryMuscle, (muscleGroups.get(primaryMuscle) || 0) + 1);
            }
          }
          // Secondary muscles (0.5 contribution)
          const secondary = asset.secondary_muscle;
          if (secondary && secondary !== 'None') {
            for (const s of secondary.split(',')) {
              const secGroup = normalizeMuscleGroup(s.trim());
              if (secGroup !== 'Cardio' && secGroup !== 'Other' && secGroup !== 'Full Body') {
                muscleGroups.set(secGroup, (muscleGroups.get(secGroup) || 0) + 0.5);
              }
            }
          }
        }
      }
    }

    // Calculate duration from daily summaries
    const dailySummaries = dailySummariesProp ?? getDailySummaries(data);
    totalDuration = dailySummaries.reduce((sum, d) => sum + d.durationMinutes, 0);

    // Top exercises with thumbnails
    const topExercises = Array.from(exerciseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => {
        const asset = assetsMap.get(name) || lowerAssetsMap.get(name.toLowerCase());
        return {
          name,
          count,
          thumbnail: asset?.thumbnail,
        };
      });

    // Monthly data
    const monthlyData = Array.from({ length: 12 }, (_, idx) => ({
      month: idx,
      workouts: monthlyWorkouts.get(idx)?.size || 0,
    }));

    // Muscle data
    const muscleData = Array.from(muscleGroups.entries()).map(([group, sets]) => ({
      group,
      sets: Math.round(sets),
    }));

    return {
      totalVolume: Math.round(convertVolume(totalVolume, weightUnit)),
      totalSets: data.length,
      totalReps,
      totalDuration,
      totalWorkouts: sessions.size,
      topExercises,
      monthlyData,
      muscleData,
    };
  }, [data, weightUnit, assetsMap, dailySummariesProp]);

  const effectiveNow = useMemo(() => getEffectiveNowFromWorkoutData(data, new Date(0)), [data]);

  // Streak info
  const streakInfo = useMemo(() => calculateStreakInfo(data, effectiveNow), [data, effectiveNow]);

  // PR insights
  const prInsights = useMemo(() => calculatePRInsights(data, effectiveNow), [data, effectiveNow]);

  // Top PR exercises
  const topPRExercises = useMemo(() => {
    const exerciseStats = exerciseStatsProp ?? getExerciseStats(data);
    const lowerAssetsMap = new Map<string, ExerciseAsset>();
    assetsMap.forEach((v, k) => lowerAssetsMap.set(k.toLowerCase(), v));
    return exerciseStats
      .filter(s => s.prCount > 0)
      .sort((a, b) => b.maxWeight - a.maxWeight)
      .slice(0, 3)
      .map(s => {
        const asset = assetsMap.get(s.name) || lowerAssetsMap.get(s.name.toLowerCase());
        return {
          name: s.name,
          weight: convertWeight(s.maxWeight, weightUnit),
          thumbnail: asset?.thumbnail,
        };
      });
  }, [data, weightUnit, assetsMap, exerciseStatsProp]);

  // Cards configuration
  const CARDS = [
    { id: 'summary', label: 'Summary' },
    { id: 'volume', label: 'Volume Comparison' },
    { id: 'year-heatmap', label: 'Year Heatmap' },
    { id: 'muscle-focus', label: 'Muscle Focus' },
    { id: 'best-month', label: 'Best Month' },
    { id: 'top-exercises', label: 'Top Exercises' },
    { id: 'prs', label: 'Personal Records' },
    { id: 'streak', label: 'Streak' },
  ];

  const toggleTheme = () => setCardTheme(t => t === 'dark' ? 'light' : 'dark');

  const focusAdjacentCard = (direction: -1 | 1) => {
    setFocusedCardId((currentId) => {
      if (!currentId) return currentId;
      const idx = CARDS.findIndex((c) => c.id === currentId);
      if (idx < 0) return currentId;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= CARDS.length) return currentId;
      return CARDS[nextIdx].id;
    });
  };

  const renderCardById = (id: string) => {
    switch (id) {
      case 'summary':
        return (
          <SummaryCard
            totalWorkouts={stats.totalWorkouts}
            totalDuration={stats.totalDuration}
            totalVolume={stats.totalVolume}
            totalSets={stats.totalSets}
            totalReps={stats.totalReps}
            weightUnit={weightUnit}
            theme={cardTheme}
          />
        );
      case 'volume':
        return (
          <VolumeComparisonCard
            totalVolume={stats.totalVolume}
            weightUnit={weightUnit}
            theme={cardTheme}
            showThemeToggle={false}
          />
        );
      case 'year-heatmap':
        return <YearlyHeatmapCard data={data} theme={cardTheme} />;
      case 'streak':
        return <StreakCard streakInfo={streakInfo} theme={cardTheme} />;
      case 'prs':
        return (
          <PersonalRecordsCard
            prInsights={prInsights}
            topPRExercises={topPRExercises}
            weightUnit={weightUnit}
            theme={cardTheme}
          />
        );
      case 'best-month':
        return <BestMonthCard monthlyData={stats.monthlyData} theme={cardTheme} />;
      case 'top-exercises':
        return <TopExercisesCard exercises={stats.topExercises} theme={cardTheme} />;
      case 'muscle-focus':
        return <MuscleFocusCard muscleData={stats.muscleData} theme={cardTheme} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full text-slate-200 pb-6">
      {/* Header */}
      <div className="hidden sm:block">
        <ViewHeader
          leftStats={[{ icon: Dumbbell, value: stats.totalSets, label: 'Total Sets' }]}
          rightStats={[{ icon: Weight, value: `${formatLargeNumber(stats.totalVolume)} ${weightUnit}`, label: 'Volume' }]}
          filtersSlot={filtersSlot}
        />
      </div>

      {/* Theme toggle */}
      <div className="flex justify-center mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
              cardTheme === 'dark'
                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-white/80 border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
            title={cardTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {cardTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm font-medium">{cardTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>

      {/* Carousel container */}
      <div className="relative w-full overflow-hidden">
        <div
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 pb-2 px-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CARDS.map((card) => (
            <div
              key={card.id}
              className="flex-shrink-0 w-[calc(100%-2rem)] max-w-md snap-center mx-auto cursor-pointer"
              onClick={() => setFocusedCardId(card.id)}
            >
              <LazyRender
                className="w-full"
                placeholder={
                  <div className="min-h-[500px] rounded-2xl border border-slate-700/50 bg-black/70 p-6">
                    <div className="animate-pulse">
                      <div className="h-6 w-1/2 rounded bg-slate-800/60" />
                      <div className="mt-4 h-24 rounded bg-slate-800/40" />
                      <div className="mt-3 h-24 rounded bg-slate-800/35" />
                      <div className="mt-3 h-24 rounded bg-slate-800/30" />
                    </div>
                  </div>
                }
                rootMargin="600px 0px"
              >
                {renderCardById(card.id)}
              </LazyRender>
            </div>
          ))}
        </div>
      </div>

      {/* Card navigation dots */}
      <div className="hidden" />

      {/* Card label */}
      <div className="hidden" />

      {/* Focus modal */}
      {focusedCardId && (
        <div
          className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={() => setFocusedCardId(null)}
        >
          <div
            className="relative w-full max-w-md"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleFocusedNavTouch();
            }}
            onMouseEnter={() => {
              setShowFocusedNav(true);
              if (hideNavTimeoutRef.current) {
                window.clearTimeout(hideNavTimeoutRef.current);
                hideNavTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              setShowFocusedNav(false);
              if (hideNavTimeoutRef.current) {
                window.clearTimeout(hideNavTimeoutRef.current);
                hideNavTimeoutRef.current = null;
              }
            }}
          >
            <div>
              {renderCardById(focusedCardId)}
            </div>

            {/* Tap-to-reveal navigation buttons (auto-hide) */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                focusAdjacentCard(-1);
                if (!canHover) setShowFocusedNav(true);
              }}
              className={`absolute left-2 top-1/2 -translate-y-1/2 transition-opacity duration-200 w-12 h-12 flex items-center justify-center z-[1005] ${
                showFocusedNav ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } ${cardTheme === 'dark' ? 'text-white hover:text-white' : 'text-black hover:text-black'} drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]`}
              aria-label="Previous card"
              title="Previous"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="pointer-events-none w-10 h-10" strokeWidth={3} />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                focusAdjacentCard(1);
                if (!canHover) setShowFocusedNav(true);
              }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-200 w-12 h-12 flex items-center justify-center z-[1005] ${
                showFocusedNav ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } ${cardTheme === 'dark' ? 'text-white hover:text-white' : 'text-black hover:text-black'} drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]`}
              aria-label="Next card"
              title="Next"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="pointer-events-none w-10 h-10" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlexView;
