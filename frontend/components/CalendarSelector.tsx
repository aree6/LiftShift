import React, { useMemo, useState } from 'react';
import { addYears, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isSameDay, format } from 'date-fns';
import { formatDayYearContraction, formatDayContraction } from '../utils/date/dateUtils';

// ============================================================================
// Types
// ============================================================================

type Range = { start: Date; end: Date };
type SelectionStatus = 'full' | 'partial' | 'none';

interface CalendarSelectorProps {
  mode?: 'day' | 'week' | 'both';
  initialMonth?: Date | null;
  initialRange?: Range | null;
  minDate?: Date | null;
  maxDate?: Date | null;
  availableDates?: Set<string> | null;
  multipleWeeks?: boolean;
  onSelectWeek?: (range: Range) => void;
  onSelectWeeks?: (ranges: Range[]) => void;
  onSelectDay?: (day: Date) => void;
  onSelectMonth?: (range: Range) => void;
  onSelectYear?: (range: Range) => void;
  onClear?: () => void;
  onClose?: () => void;
  onApply?: (selection: { range: Range | null }) => void;
}

// ============================================================================
// Constants
// ============================================================================

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// ============================================================================
// Reusable Sub-Components
// ============================================================================

/** Tooltip with Start/End buttons for range selection */
const StartEndTooltip: React.FC<{
  position: 'top' | 'bottom' | 'right';
  onStart: (e: React.MouseEvent) => void;
  onEnd: (e: React.MouseEvent) => void;
}> = ({ position, onStart, onEnd }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
  };

  return (
    <div className={`absolute z-50 ${positionClasses[position]} flex gap-1 bg-slate-950/75 border border-slate-700/35 rounded-xl p-1.5 shadow-xl`}>
      <button
        onClick={onStart}
        className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-black/40 hover:bg-white/5 border border-emerald-500/30 text-emerald-200 whitespace-nowrap transition-colors"
        style={{ color: 'rgb(var(--mw-calendar-start-rgb, 16 185 129) / 1)' }}
      >
        Set start
      </button>
      <button
        onClick={onEnd}
        className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-black/40 hover:bg-white/5 border border-rose-500/30 text-rose-200 whitespace-nowrap transition-colors"
        style={{ color: 'rgb(var(--mw-calendar-end-rgb, 244 63 94) / 1)' }}
      >
        Set end
      </button>
    </div>
  );
};

/** Checkmark icon for full selection */
const CheckmarkIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg fill="currentColor" viewBox="0 0 20 20" className={className}>
    <path clipRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 10-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" fillRule="evenodd" />
  </svg>
);

/** Dot indicator for partial selection */
const PartialDot: React.FC<{ className?: string }> = ({ className = 'w-2 h-2' }) => (
  <span className={`${className} rounded-full bg-slate-300`} />
);

// ============================================================================
// Main Component
// ============================================================================

export const CalendarSelector: React.FC<CalendarSelectorProps> = ({ 
  mode = 'both', 
  initialMonth = null, 
  initialRange = null,
  minDate = null, 
  maxDate = null, 
  availableDates = null, 
  multipleWeeks = false, 
  onSelectWeek,
  onSelectWeeks,
  onSelectDay,
  onSelectMonth,
  onSelectYear,
  onClear,
  onClose,
  onApply
}) => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [viewMonth, setViewMonth] = useState<Date>(() => initialMonth ?? initialRange?.start ?? maxDate ?? new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(() => initialRange?.start ?? null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => initialRange?.end ?? null);
  const [tooltipDay, setTooltipDay] = useState<Date | null>(null);
  const [tooltipWeek, setTooltipWeek] = useState<{ start: Date; end: Date } | null>(null);
  const [tooltipMonth, setTooltipMonth] = useState<number | null>(null);
  const [tooltipYear, setTooltipYear] = useState(false);
  const [jumpHighlightDay, setJumpHighlightDay] = useState<Date | null>(null);

  const today = useMemo(() => maxDate ?? new Date(), [maxDate]);
  const viewYear = viewMonth.getFullYear();
  const hasSelection = rangeStart !== null && rangeEnd !== null;

  // ---------------------------------------------------------------------------
  // Memoized Data
  // ---------------------------------------------------------------------------
  
  /** Sorted array of valid gym dates within constraints */
  const sortedValidDates = useMemo(() => {
    if (!availableDates) return [];
    return Array.from(availableDates)
      .map(s => new Date(`${s}T12:00:00`))
      .filter(d => (!minDate || d >= minDate) && (!maxDate || d <= maxDate))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [availableDates, minDate, maxDate]);

  const yearHasData = useMemo(() => {
    return sortedValidDates.some((d) => d.getFullYear() === viewYear);
  }, [sortedValidDates, viewYear]);

  /** Set for O(1) lookup of valid dates */
  const validDateSet = useMemo(() => {
    return new Set(sortedValidDates.map(d => format(d, 'yyyy-MM-dd')));
  }, [sortedValidDates]);

  /** 6 weeks of dates for the current view month */
  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const rows: Date[][] = [];
    let curr = start;
    for (let r = 0; r < 6; r++) {
      const row: Date[] = [];
      for (let c = 0; c < 7; c++) {
        row.push(curr);
        curr = addDays(curr, 1);
      }
      rows.push(row);
    }
    return rows;
  }, [viewMonth]);

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

  const isDisabled = (d: Date) => (minDate && d < minDate) || (maxDate && d > maxDate);
  const hasData = (d: Date) => !availableDates || validDateSet.has(format(d, 'yyyy-MM-dd'));
  const isValidGymDay = (d: Date) => hasData(d) && !isDisabled(d);
  const weekHasData = (week: Date[]) => week.some(isValidGymDay);
  const isInRange = (d: Date) => rangeStart && rangeEnd && d >= rangeStart && d <= rangeEnd;

  /** Get first and last valid gym day in a date range */
  const getValidRange = (startDate: Date, endDate: Date): { first: Date | null; last: Date | null } => {
    let first: Date | null = null;
    let last: Date | null = null;
    for (const d of sortedValidDates) {
      if (d >= startDate && d <= endDate) {
        if (!first) first = d;
        last = d;
      }
    }
    return { first, last };
  };

  const getMonthValidRange = (year: number, month: number) => 
    getValidRange(new Date(year, month, 1), endOfMonth(new Date(year, month, 1)));

  const getYearValidRange = (year: number) => 
    getValidRange(new Date(year, 0, 1), new Date(year, 11, 31));

  const getWeekValidRange = (weekStart: Date) => {
    let first: Date | null = null;
    let last: Date | null = null;
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (isValidGymDay(d)) {
        if (!first) first = d;
        last = d;
      }
    }
    return { first, last };
  };

  /** Get selection status for a date range */
  const getSelectionStatus = (first: Date | null, last: Date | null): SelectionStatus => {
    if (!rangeStart || !rangeEnd || !first || !last) return 'none';
    const firstInRange = first >= rangeStart && first <= rangeEnd;
    const lastInRange = last >= rangeStart && last <= rangeEnd;
    if (firstInRange && lastInRange) return 'full';
    if (firstInRange || lastInRange) return 'partial';
    if (rangeStart <= first && rangeEnd >= last) return 'full';
    if ((rangeStart >= first && rangeStart <= last) || (rangeEnd >= first && rangeEnd <= last)) return 'partial';
    return 'none';
  };

  const getMonthStatus = (year: number, month: number): SelectionStatus => {
    const { first, last } = getMonthValidRange(year, month);
    return getSelectionStatus(first, last);
  };

  const getYearStatus = (): SelectionStatus => {
    const { first, last } = getYearValidRange(viewYear);
    return getSelectionStatus(first, last);
  };

  const getWeekStatus = (week: Date[]): SelectionStatus => {
    const validDays = week.filter(isValidGymDay);
    if (validDays.length === 0) return 'none';
    const inRangeCount = validDays.filter(d => isInRange(d)).length;
    if (inRangeCount === validDays.length) return 'full';
    if (inRangeCount > 0) return 'partial';
    return 'none';
  };

  const monthHasData = (year: number, month: number) => getMonthValidRange(year, month).first !== null;
  
  const isMonthDisabled = (year: number, month: number) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = endOfMonth(monthStart);
    return (minDate && monthEnd < minDate) || (maxDate && monthStart > maxDate);
  };

  const isRangeEdge = (d: Date): 'start' | 'end' | null => {
    if (!rangeStart || !rangeEnd) return null;
    if (isSameDay(d, rangeStart)) return 'start';
    if (isSameDay(d, rangeEnd)) return 'end';
    return null;
  };

  // ---------------------------------------------------------------------------
  // Range Selection Handlers
  // ---------------------------------------------------------------------------

  /** Set a date as range start, adjusting end if needed */
  const setAsStart = (date: Date, closeTooltip: () => void) => {
    setRangeStart(date);
    if (!rangeEnd || rangeEnd < date) setRangeEnd(date);
    closeTooltip();
  };

  /** Set a date as range end, adjusting start if needed */
  const setAsEnd = (date: Date, closeTooltip: () => void) => {
    setRangeEnd(date);
    if (!rangeStart || rangeStart > date) setRangeStart(date);
    closeTooltip();
  };

  // Day handlers
  const handleDayClick = (day: Date) => {
    if (!isValidGymDay(day)) return;
    setTooltipWeek(null);
    setTooltipMonth(null);
    setTooltipYear(false);
    setTooltipDay(tooltipDay && isSameDay(tooltipDay, day) ? null : day);
  };

  const handleSetDayAsStart = (day: Date) => setAsStart(day, () => setTooltipDay(null));
  const handleSetDayAsEnd = (day: Date) => setAsEnd(day, () => setTooltipDay(null));

  // Week handlers
  const handleWeekClick = (weekStart: Date) => {
    setTooltipDay(null);
    setTooltipMonth(null);
    setTooltipYear(false);
    setTooltipWeek(tooltipWeek && isSameDay(tooltipWeek.start, weekStart) 
      ? null 
      : { start: weekStart, end: addDays(weekStart, 6) });
  };

  const handleSetWeekAsStart = (weekStart: Date) => {
    const { first } = getWeekValidRange(weekStart);
    if (first) setAsStart(first, () => setTooltipWeek(null));
  };

  const handleSetWeekAsEnd = (weekStart: Date) => {
    const { last } = getWeekValidRange(weekStart);
    if (last) setAsEnd(last, () => setTooltipWeek(null));
  };

  // Month handlers
  const handleMonthClick = (monthIndex: number) => {
    const isCurrentView = viewMonth.getMonth() === monthIndex && viewMonth.getFullYear() === viewYear;
    if (!isCurrentView) {
      setViewMonth(new Date(viewYear, monthIndex, 1));
      return;
    }
    setTooltipDay(null);
    setTooltipWeek(null);
    setTooltipYear(false);
    setTooltipMonth(tooltipMonth === monthIndex ? null : monthIndex);
  };

  const handleSetMonthAsStart = (monthIndex: number) => {
    const { first } = getMonthValidRange(viewYear, monthIndex);
    if (first) setAsStart(first, () => setTooltipMonth(null));
  };

  const handleSetMonthAsEnd = (monthIndex: number) => {
    const { last } = getMonthValidRange(viewYear, monthIndex);
    if (last) setAsEnd(last, () => setTooltipMonth(null));
  };

  // Year handler
  const handleYearClick = () => {
    const { first, last } = getYearValidRange(viewYear);
    if (!first || !last) return;
    setTooltipDay(null);
    setTooltipWeek(null);
    setTooltipMonth(null);
    setTooltipYear((v) => !v);
  };

  const handleSetYearAsStart = () => {
    const { first } = getYearValidRange(viewYear);
    if (first) setAsStart(first, () => setTooltipYear(false));
  };

  const handleSetYearAsEnd = () => {
    const { last } = getYearValidRange(viewYear);
    if (last) setAsEnd(last, () => setTooltipYear(false));
  };

  // Clear and Apply
  const handleClear = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onClear?.();
  };

  const handleGoToToday = () => {
    setViewMonth(startOfMonth(today));
    setTooltipDay(null);
    setTooltipWeek(null);
    setTooltipMonth(null);
    setTooltipYear(false);
    setJumpHighlightDay(today);
    setTimeout(() => setJumpHighlightDay(null), 1200);
  };

  const handleApply = () => {
    onApply?.({ range: hasSelection ? { start: rangeStart!, end: rangeEnd! } : null });
  };

  const yearStatus = getYearStatus();

  const jumpToDate = (d: Date) => {
    setViewMonth(startOfMonth(d));
    setJumpHighlightDay(d);
    setTimeout(() => setJumpHighlightDay(null), 1200);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative z-10 bg-black/90 border border-slate-700/50 rounded-2xl p-4 pt-6 w-[440px] max-w-[94vw] text-slate-200 shadow-2xl">
      {/* Close button (desktop) */}
      <button
        onClick={onClose}
        className="hidden sm:flex absolute top-0 right-0 -translate-y-[35%] translate-x-[35%] w-8 h-8 rounded-full bg-red-950/70 hover:bg-red-950 border border-red-500/40 items-center justify-center text-red-200 hover:text-white z-10 shadow-lg"
        title="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Range display banner */}
      {hasSelection && (
        <div className="mb-3 px-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Selected Range</div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <button
                  onClick={() => jumpToDate(rangeStart!)}
                  className="px-2 py-0.5 rounded-md bg-black/50 hover:bg-white/5 text-slate-200 transition-colors"
                  title="Go to start date"
                >
                  {formatDayYearContraction(rangeStart!)}
                </button>
                {!isSameDay(rangeStart!, rangeEnd!) && (
                  <>
                    <span className="text-slate-500">↔</span>
                    <button
                      onClick={() => jumpToDate(rangeEnd!)}
                      className="px-2 py-0.5 rounded-md bg-black/50 hover:bg-white/5 text-slate-200 transition-colors"
                      title="Go to end date"
                    >
                      {formatDayYearContraction(rangeEnd!)}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleClear}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-white/5 text-slate-200 font-semibold transition-colors"
                title="Clear selection"
              >
                Clear
              </button>
              <button
                onClick={handleGoToToday}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-white/5 text-slate-200 font-semibold transition-colors"
                title="Go to today"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasSelection && (
        <div className="mb-3 px-2 flex justify-end">
          <button
            onClick={handleGoToToday}
            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-white/5 text-slate-200 font-semibold transition-colors"
            title="Go to today"
          >
            Today
          </button>
        </div>
      )}

      {/* Year navigation */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={() => setViewMonth(addYears(viewMonth, -1))}
          className="px-3 py-2 rounded-lg bg-black/70 hover:bg-black/60 text-base font-bold text-slate-200 border border-slate-700/50"
          title="Previous year"
        >
          ‹
        </button>
        <div className="relative">
          <button
            onClick={handleYearClick}
            className={`relative px-4 py-1.5 rounded-lg font-bold text-sm border transition-all duration-200 min-w-[80px] ${
              yearStatus === 'full'
                ? 'border-slate-500/60 bg-white/10 text-slate-200'
                : yearStatus === 'partial'
                  ? 'border-slate-600/60 bg-white/5 text-slate-200'
                  : (yearHasData ? 'border-emerald-500/30 bg-emerald-500/10 text-slate-200 hover:bg-emerald-500/15' : 'border-slate-700/50 bg-black/70 text-slate-200 hover:bg-white/5')
            } ${tooltipYear ? 'ring-2 ring-slate-300/30' : ''}`}
            title="Click again to set start/end for the year"
          >
            {yearStatus === 'full' && <CheckmarkIcon className="absolute -top-1.5 -right-1.5 w-4 h-4 text-slate-200" />}
            {yearStatus === 'partial' && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-300" />}
            {viewYear}
          </button>
          {tooltipYear && (
            <StartEndTooltip
              position="bottom"
              onStart={(e) => { e.stopPropagation(); handleSetYearAsStart(); }}
              onEnd={(e) => { e.stopPropagation(); handleSetYearAsEnd(); }}
            />
          )}
        </div>
        <button
          onClick={() => setViewMonth(addYears(viewMonth, 1))}
          className="px-3 py-2 rounded-lg bg-black/70 hover:bg-black/60 text-base font-bold text-slate-200 border border-slate-700/50"
          title="Next year"
        >
          ›
        </button>
      </div>

      {/* Month row */}
      <div className="grid grid-cols-12 gap-1.5 mb-3">
        {MONTH_LABELS.map((label, idx) => {
          const disabled = isMonthDisabled(viewYear, idx);
          const hasDataInMonth = monthHasData(viewYear, idx);
          const isCurrentView = viewMonth.getMonth() === idx && viewMonth.getFullYear() === viewYear;
          const status = getMonthStatus(viewYear, idx);
          const showTooltip = tooltipMonth === idx && isCurrentView;
          
          return (
            <div key={idx} className="relative">
              <button
                onClick={() => !disabled && hasDataInMonth && handleMonthClick(idx)}
                disabled={disabled || !hasDataInMonth}
                className={`group relative aspect-square w-full rounded-md flex items-center justify-center text-[11px] font-semibold border-2 transition-all duration-200
                  ${status === 'full' ? 'border-slate-500/60 bg-white/10 text-white' 
                    : status === 'partial' ? 'border-slate-600/60 bg-white/5 text-slate-200'
                    : isCurrentView ? (hasDataInMonth ? 'border-emerald-500/30 bg-emerald-500/10 text-slate-200' : 'border-slate-600/60 bg-black/50 text-slate-200')
                    : (hasDataInMonth ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-200 hover:bg-emerald-500/10' : 'border-slate-700/50 bg-black/70 text-slate-300 hover:bg-white/5')}
                  ${disabled || !hasDataInMonth ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  ${showTooltip ? 'ring-2 ring-yellow-400' : ''}
                `}
                title={`${MONTH_NAMES[idx]}${isCurrentView ? ' (click again to select)' : ''}`}
              >
                <span className="relative z-10">{label}</span>
                {status === 'full' && <CheckmarkIcon className="absolute -top-1 -right-1 w-3 h-3 text-slate-200" />}
                {status === 'partial' && <PartialDot className="absolute -top-0.5 -right-0.5 w-2 h-2" />}
              </button>
              {showTooltip && (
                <StartEndTooltip
                  position="bottom"
                  onStart={(e) => { e.stopPropagation(); handleSetMonthAsStart(idx); }}
                  onEnd={(e) => { e.stopPropagation(); handleSetMonthAsEnd(idx); }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Day headers */}
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
        {mode !== 'day' && (
          <div
            className={`${multipleWeeks ? 'w-6' : 'w-[72px]'} shrink-0 opacity-0`}
          >
            Wk
          </div>
        )}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="flex items-center justify-center">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const enabledWeek = weekHasData(week);
          const weekStatus = getWeekStatus(week);
          const showWeekTooltip = tooltipWeek && isSameDay(tooltipWeek.start, weekStart);

          return (
            <div key={weekIdx} className={`flex items-center gap-1 ${weekStatus === 'full' ? 'rounded-md bg-white/5' : enabledWeek ? 'rounded-md bg-emerald-500/5' : ''}`}>
              {/* Week checkbox */}
              {mode !== 'day' && (
                multipleWeeks ? (
                  <div className="relative">
                    <button 
                      className={`group flex items-center justify-center cursor-pointer shrink-0 w-6 h-6 rounded-md border-2 transition-all duration-200
                        ${!enabledWeek ? 'opacity-25 cursor-not-allowed border-slate-700 bg-slate-800' : ''}
                        ${weekStatus === 'full' ? 'border-slate-500/60 bg-white/10' : ''}
                        ${weekStatus === 'partial' ? 'border-slate-600/60 bg-white/5' : ''}
                        ${weekStatus === 'none' && enabledWeek ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 hover:scale-105' : ''}
                        ${showWeekTooltip ? 'ring-2 ring-yellow-400' : ''}
                      `}
                      onClick={() => enabledWeek && handleWeekClick(weekStart)}
                      disabled={!enabledWeek}
                      title={`${formatDayContraction(weekStart)}–${formatDayContraction(weekEnd)}`}
                    >
                      {weekStatus === 'full' && <CheckmarkIcon className="w-3 h-3 text-white" />}
                      {weekStatus === 'partial' && <PartialDot />}
                    </button>
                    {showWeekTooltip && (
                      <StartEndTooltip
                        position="right"
                        onStart={(e) => { e.stopPropagation(); handleSetWeekAsStart(weekStart); }}
                        onEnd={(e) => { e.stopPropagation(); handleSetWeekAsEnd(weekStart); }}
                      />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectWeek && enabledWeek && onSelectWeek({ start: weekStart, end: weekEnd })}
                    className={`text-[9px] px-1.5 py-1 rounded border w-[72px] shrink-0 truncate ${
                      enabledWeek ? 'bg-black/70 hover:bg-black/60 border-slate-700/50' : 'bg-black/40 border-slate-700/50 opacity-25 cursor-not-allowed'
                    }`}
                    title={`${formatDayContraction(weekStart)}–${formatDayContraction(weekEnd)}`}
                  >
                    {format(weekStart, 'M/d')}–{format(weekEnd, 'd')}
                  </button>
                )
              )}

              {/* Days */}
              <div className="grid grid-cols-7 gap-1 flex-1">
                {week.map((day) => {
                  const disabled = isDisabled(day);
                  const hasWorkout = isValidGymDay(day);
                  const inMonth = isSameMonth(day, viewMonth);
                  if (!inMonth) {
                    return (
                      <div
                        key={day.toISOString()}
                        className="w-full h-7"
                      />
                    );
                  }
                  const isToday = isSameDay(day, today);
                  const inRange = isInRange(day);
                  const edge = isRangeEdge(day);
                  const isStart = edge === 'start';
                  const isEnd = edge === 'end';
                  const showDayTooltip = tooltipDay && isSameDay(tooltipDay, day);
                  const isJumpTarget = jumpHighlightDay && isSameDay(jumpHighlightDay, day);
                  const showEdgeLetter = hasSelection && !isSameDay(rangeStart!, rangeEnd!) && (isStart || isEnd);
                  
                  return (
                    <div key={day.toISOString()} className="relative">
                      <button
                        onClick={() => mode !== 'week' && hasWorkout && handleDayClick(day)}
                        disabled={disabled || !hasWorkout}
                        className={`relative w-full h-7 rounded flex items-center justify-center text-[11px] border-2 transition-colors
                          ${inRange
                            ? isStart || isEnd
                              ? 'border-sky-400/70 bg-sky-500/25 text-white font-bold shadow-md'
                              : 'border-sky-500/30 bg-sky-500/15 text-white font-medium'
                            : hasWorkout ? 'border-emerald-500/35 bg-emerald-500/12 text-slate-200 hover:bg-emerald-500/18 ring-1 ring-emerald-500/15' : 'border-slate-800/60 bg-black/40 text-slate-500'
                          }
                          ${isToday ? 'ring-1 ring-sky-300/70' : ''}
                          ${isJumpTarget ? 'ring-2 ring-sky-300/70' : ''}
                          ${disabled || !hasWorkout ? 'opacity-20 cursor-not-allowed' : ''}
                          ${showDayTooltip ? 'ring-2 ring-yellow-400' : ''}
                        `}
                      >
                        {showEdgeLetter ? (isStart ? 'S' : 'E') : format(day, 'd')}
                      </button>
                      {showDayTooltip && (
                        <StartEndTooltip
                          position={weekIdx < 2 ? 'bottom' : 'top'}
                          onStart={(e) => { e.stopPropagation(); handleSetDayAsStart(day); }}
                          onEnd={(e) => { e.stopPropagation(); handleSetDayAsEnd(day); }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleApply}
          disabled={!hasSelection}
          className={`flex-1 text-[11px] px-3 py-2 rounded-lg font-semibold transition-colors ${
            hasSelection ? 'bg-white/10 hover:bg-white/15 border border-slate-600/60 text-white' : 'bg-black/40 border border-slate-800/60 text-slate-500 cursor-not-allowed'
          }`}
        >
          Apply
        </button>
      </div>

      {/* Mobile close button */}
      <button
        onClick={() => onClose?.()}
        className="sm:hidden mt-2 w-full text-[11px] px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-950 border border-red-500/40 text-red-200 font-semibold transition-colors"
      >
        Close
      </button>
    </div>
  );
};
