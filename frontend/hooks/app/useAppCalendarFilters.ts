import { useState, useMemo, useCallback, startTransition } from 'react';
import { isSameDay, startOfDay, endOfDay } from 'date-fns';
import { WorkoutSet } from '../../types';
import { formatDayYearContraction, formatHumanReadableDate } from '../../utils/date/dateUtils';

export interface UseAppCalendarFiltersReturn {
  selectedMonth: string;
  selectedDay: Date | null;
  selectedRange: { start: Date; end: Date } | null;
  selectedWeeks: Array<{ start: Date; end: Date }>;
  calendarOpen: boolean;
  availableMonths: string[];
  filteredData: WorkoutSet[];
  hasActiveCalendarFilter: boolean;
  calendarSummaryText: string;
  minDate: Date | null;
  maxDate: Date | null;
  availableDatesSet: Set<string>;
  filterCacheKey: string;
  setSelectedMonth: (month: string) => void;
  setSelectedDay: (day: Date | null) => void;
  setSelectedRange: (range: { start: Date; end: Date } | null) => void;
  setSelectedWeeks: (weeks: Array<{ start: Date; end: Date }>) => void;
  setCalendarOpen: (open: boolean) => void;
  toggleCalendarOpen: () => void;
  clearAllFilters: () => void;
}

export interface UseAppCalendarFiltersProps {
  parsedData: WorkoutSet[];
  effectiveNow: Date;
}

export function useAppCalendarFilters({
  parsedData,
  effectiveNow,
}: UseAppCalendarFiltersProps): UseAppCalendarFiltersReturn {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState<Array<{ start: Date; end: Date }>>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Available months + calendar boundaries in a SINGLE pass over parsedData.
  // Previously three separate loops each called date-fns `format` per set
  // (~10-15k format calls per filter interaction on 5k sets). Manual
  // year/month/day math is allocation-light and format-free.
  const { availableMonths, minDate, maxDate, availableDatesSet } = useMemo(() => {
    const months = new Set<string>();
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = 0;
    const set = new Set<string>();
    for (const d of parsedData) {
      const pd = d.parsedDate;
      if (!pd) continue;
      const ts = pd.getTime();
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
      const y = pd.getFullYear();
      const m = pd.getMonth() + 1;
      months.add(`${y}-${m < 10 ? `0${m}` : m}`);
      const day = pd.getDate();
      set.add(`${y}-${m < 10 ? `0${m}` : m}-${day < 10 ? `0${day}` : day}`);
    }
    const minDate = isFinite(minTs) ? startOfDay(new Date(minTs)) : null;
    const maxInData = maxTs > 0 ? endOfDay(new Date(maxTs)) : null;
    // Use effectiveNow consistently - respect user's dateMode preference
    const maxDate = maxInData ?? (effectiveNow.getTime() > 0 ? endOfDay(effectiveNow) : null);
    return {
      availableMonths: Array.from(months).sort().reverse(),
      minDate,
      maxDate,
      availableDatesSet: set,
    };
  }, [effectiveNow, parsedData]);

  // Normalized bounds, hoisted out of the per-set filter: startOfDay/endOfDay
  // were re-allocated for every set × every selected week on each keystroke.
  const normalizedWeeks = useMemo(
    () => selectedWeeks.map((r) => ({ start: startOfDay(r.start).getTime(), end: endOfDay(r.end).getTime() })),
    [selectedWeeks],
  );
  const normalizedRange = useMemo(
    () => (selectedRange ? { start: startOfDay(selectedRange.start).getTime(), end: endOfDay(selectedRange.end).getTime() } : null),
    [selectedRange],
  );

  // Apply filters (month compare is manual yyyy-MM math — date-fns `format`
  // per set was the dominant filter INP cost).
  const filteredData = useMemo(() => {
    const wantMonth = selectedMonth !== 'all';
    return parsedData.filter(d => {
      const pd = d.parsedDate;
      if (!pd) return false;
      const ts = pd.getTime();
      if (selectedDay) return isSameDay(pd, selectedDay);
      if (normalizedWeeks.length > 0) {
        return normalizedWeeks.some(r => ts >= r.start && ts <= r.end);
      }
      if (normalizedRange) {
        return ts >= normalizedRange.start && ts <= normalizedRange.end;
      }
      if (wantMonth) {
        const m = pd.getMonth() + 1;
        return `${pd.getFullYear()}-${m < 10 ? `0${m}` : m}` === selectedMonth;
      }
      return true;
    });
  }, [parsedData, selectedMonth, selectedDay, normalizedRange, normalizedWeeks]);

  const hasActiveCalendarFilter = !!selectedDay || selectedWeeks.length > 0 || !!selectedRange;

  const calendarSummaryText = useMemo(() => {
    if (selectedDay) return formatHumanReadableDate(selectedDay, { now: effectiveNow });
    if (selectedRange) return `${formatDayYearContraction(selectedRange.start)} – ${formatDayYearContraction(selectedRange.end)}`;
    if (selectedWeeks.length === 1) return `${formatDayYearContraction(selectedWeeks[0].start)} – ${formatDayYearContraction(selectedWeeks[0].end)}`;
    if (selectedWeeks.length > 1) return `Weeks: ${selectedWeeks.length}`;
    return 'No filter';
  }, [effectiveNow, selectedDay, selectedRange, selectedWeeks]);

  // (Boundaries + months + date set are computed together above in one pass.)

  // Cache key carries the actual week bounds (was count-only `w:length`,
  // so two different week selections with the same count shared entries).
  // Numeric getTime() avoids toISOString allocation per keystroke.
  const filterCacheKey = useMemo(() => {
    const parts: string[] = [];
    if (selectedMonth !== 'all') parts.push(`m:${selectedMonth}`);
    if (selectedDay) parts.push(`d:${selectedDay.getTime()}`);
    if (selectedRange) parts.push(`r:${selectedRange.start.getTime()}-${selectedRange.end.getTime()}`);
    if (selectedWeeks.length > 0) {
      const weeks = selectedWeeks
        .map((w) => `${w.start.getTime()}-${w.end.getTime()}`)
        .sort()
        .join(',');
      parts.push(`w:${weeks}`);
    }
    return parts.join('|') || 'all';
  }, [selectedMonth, selectedDay, selectedRange, selectedWeeks]);

  const toggleCalendarOpen = useCallback(() => {
    setCalendarOpen(prev => !prev);
  }, []);

  // Data-affecting setters run inside startTransition so calendar input stays
  // responsive while the expensive downstream (filters → derived data →
  // charts) renders at non-urgent priority. Overlay open/close stays urgent.
  const setSelectedMonthT = useCallback((month: string) => {
    startTransition(() => setSelectedMonth(month));
  }, []);
  const setSelectedDayT = useCallback((day: Date | null) => {
    startTransition(() => setSelectedDay(day));
  }, []);
  const setSelectedRangeT = useCallback((range: { start: Date; end: Date } | null) => {
    startTransition(() => setSelectedRange(range));
  }, []);
  const setSelectedWeeksT = useCallback((weeks: Array<{ start: Date; end: Date }>) => {
    startTransition(() => setSelectedWeeks(weeks));
  }, []);

  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      setSelectedRange(null);
      setSelectedDay(null);
      setSelectedWeeks([]);
      setSelectedMonth('all');
    });
  }, []);

  return {
    selectedMonth,
    selectedDay,
    selectedRange,
    selectedWeeks,
    calendarOpen,
    availableMonths,
    filteredData,
    hasActiveCalendarFilter,
    calendarSummaryText,
    minDate,
    maxDate,
    availableDatesSet,
    filterCacheKey,
    setSelectedMonth: setSelectedMonthT,
    setSelectedDay: setSelectedDayT,
    setSelectedRange: setSelectedRangeT,
    setSelectedWeeks: setSelectedWeeksT,
    setCalendarOpen,
    toggleCalendarOpen,
    clearAllFilters,
  };
}
