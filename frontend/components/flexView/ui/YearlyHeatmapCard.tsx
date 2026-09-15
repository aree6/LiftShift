import React, { useMemo } from 'react';
import { WorkoutSet } from '../../../types';
import { format, getDay, eachDayOfInterval, endOfMonth, getMonth, startOfMonth } from 'date-fns';
import CountUp from '../../ui/CountUp';
import { FlexCard, type CardTheme, FlexCardFooter } from './FlexCard';
import { FANCY_FONT, FANCY_FONT_NUMBERS } from '../../../utils/ui/uiConstants';
import { isWarmupSet } from '../../../utils/analysis/classification';
import { getSessionKey } from '../../../utils/date/dateUtils';
import { MONTH_SHORT } from '../utils/constants';

// =========================================================================
// CARD: Yearly Heatmap Card - 12 month mini grids
// =========================================================================
export const YearlyHeatmapCard: React.FC<{
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

      if (isWarmupSet(s)) continue;

      const key = format(d, 'yyyy-MM-dd');
      dayCount.set(key, (dayCount.get(key) || 0) + 1);

      const y = d.getFullYear();
      const sessionKey = getSessionKey(s);
      if (sessionKey) {
        if (!workoutSessionsByYear.has(y)) workoutSessionsByYear.set(y, new Set());
        workoutSessionsByYear.get(y)!.add(sessionKey);
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
    if (count <= 15) return 'bg-emerald-400';
    if (count <= 30) return 'bg-emerald-500';
    if (count <= 45) return 'bg-emerald-700';
    return 'bg-emerald-900';
  };

  const months = useMemo(() => {
      const out: { monthIndex: number; cells: (number | null)[] }[] = [];

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
      const dayOfWeekOffset = (getDay(monthStart) + 6) % 7;
      const totalCells = Math.ceil((dayOfWeekOffset + days.length) / 7) * 7;
      const cells: (number | null)[] = new Array(totalCells).fill(null);
      for (let i = 0; i < days.length; i++) {
        const key = format(days[i], 'yyyy-MM-dd');
        cells[dayOfWeekOffset + i] = daySetCount.get(key) || 0;
      }

      out.push({ monthIndex: m, cells });
    }

    return out;
  }, [daySetCount, effectiveNow, rangeStart, selectedYear]);

  const monthsCount = months.length;
  // Cap the grid at 3 rows so card height never grows: 10-12 months switch to
  // 4 columns (still 3 rows) with smaller month boxes instead of adding a row.
  const monthColsForDensity = monthsCount >= 10 ? 4 : 3;
  const monthRows = Math.max(1, Math.ceil(monthsCount / monthColsForDensity));
  const isDense = monthRows >= 3;
  const isFourCol = monthColsForDensity === 4;

  // Fixed col count per density (no viewport breakpoints: card width is capped
  // at max-w-md in the carousel, so md:/lg: only shrank cells without space).
  // Compact spacing so 7-12 months fit the shared 500px card height.
  const monthGridColsClass = isFourCol ? 'grid-cols-4' : 'grid-cols-3';
  const monthGridGapX = isFourCol ? 'gap-x-2' : isDense ? 'gap-x-3' : 'gap-x-6';
  const monthGridGapY = isDense ? 'gap-y-2' : 'gap-y-6';
  const monthLabelClass = isFourCol
    ? 'text-[10px] mb-0.5'
    : isDense
      ? 'text-[11px] mb-0.5'
      : 'text-sm mb-2';
  const cellGapClass = isFourCol ? 'gap-0.5' : isDense ? 'gap-[3px]' : 'gap-1';
  const headerGapClass = isDense ? 'mb-3' : 'mb-6';
  const contentPadClass = isDense ? 'pt-5 pb-14' : 'pt-6 pb-14';
  const subheadClass = isDense ? 'text-sm sm:text-base' : 'text-base sm:text-lg';
  const monthGridMaxWClass = isFourCol ? 'max-w-[84px]' : isDense ? 'max-w-[104px]' : 'max-w-[120px]';
  const headlineCountClass = isDense ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl';

  return (
    <FlexCard theme={theme} className="h-[500px] max-h-[500px] flex flex-col overflow-hidden">
      <div className={`relative z-[1] px-4 sm:px-6 ${contentPadClass} flex flex-col items-center text-center flex-1 w-full`}>
        <div className="w-full flex items-start justify-between gap-3 mb-3">
          <div className="text-left">
            <div className={`text-xs font-semibold uppercase tracking-widest ${textMuted}`}>Highlights</div>
            <div className={`text-lg sm:text-xl font-bold ${textPrimary}`} style={FANCY_FONT}>
              {selectedYear}
            </div>
          </div>
        </div>

        <div className={`${headlineCountClass} font-black ${textPrimary} mb-1 leading-none`} style={FANCY_FONT_NUMBERS}>
          <CountUp from={0} to={workoutsThisYear} separator="," direction="up" duration={1} />
        </div>
        <div className={` ${textSecondary} ${headerGapClass} ${subheadClass}`}>
          Workouts this year
        </div>

        <div className={`w-full min-w-0 grid justify-items-center justify-center ${monthGridColsClass} ${monthGridGapX} ${monthGridGapY}`}>
          {months.map(({ monthIndex, cells }) => (
            <div key={monthIndex} className={`w-full min-w-0 flex flex-col items-center ${monthGridMaxWClass}`}>
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
                      className={`aspect-square w-full rounded-sm ${getCellColor(count)} transition-colors duration-200 ${
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
