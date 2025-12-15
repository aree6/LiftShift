import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, differenceInCalendarDays, isValid } from 'date-fns';
import { WorkoutSet } from '../types';

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DateKeyResult {
  key: string;
  timestamp: number;
  label: string;
}

const MONTH_ABBR = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

export const formatYearContraction = (d: Date): string => {
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return yy;
};

export const formatMonthContraction = (d: Date): string => {
  return MONTH_ABBR[d.getMonth()] ?? 'M';
};

export const formatDayContraction = (d: Date): string => {
  return `${d.getDate()} ${formatMonthContraction(d)}`;
};

export const formatDayYearContraction = (d: Date): string => {
  return `${formatDayContraction(d)} ${formatYearContraction(d)}`;
};

export const formatMonthYearContraction = (d: Date): string => {
  return `${formatMonthContraction(d)} ${formatYearContraction(d)}`;
};

export const formatWeekContraction = (weekStart: Date): string => {
  return `wk ${formatDayContraction(weekStart)}`;
};

export const formatRelativeDay = (d: Date, now: Date = new Date(0)): string => {
  if (!isValid(d) || !isValid(now)) return '—';
  const diffDays = differenceInCalendarDays(now, d);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays === -1) return 'tomorrow';
  if (diffDays > 1) return `${diffDays} days ago`;
  return `in ${Math.abs(diffDays)} days`;
};

export const getEffectiveNowFromWorkoutData = (
  data: WorkoutSet[],
  fallbackNow: Date = new Date(0)
): Date => {
  let maxTs = -Infinity;
  for (const s of data) {
    const ts = s.parsedDate?.getTime?.() ?? NaN;
    if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
  }
  return Number.isFinite(maxTs) ? new Date(maxTs) : fallbackNow;
};

export const formatHumanReadableDate = (
  d: Date,
  opts?: { now?: Date; cutoffDays?: number }
): string => {
  const now = opts?.now ?? new Date(0);
  if (!isValid(d) || !isValid(now)) return '—';
  const cutoffDays = opts?.cutoffDays ?? 30;
  const diffDays = Math.abs(differenceInCalendarDays(now, d));
  return diffDays > cutoffDays ? formatDayYearContraction(d) : formatRelativeDay(d, now);
};

export const formatRelativeWithDate = (
  d: Date,
  opts?: { now?: Date; cutoffDays?: number }
): string => {
  const now = opts?.now ?? new Date(0);
  if (!isValid(d) || !isValid(now)) return '—';
  const cutoffDays = opts?.cutoffDays ?? 30;
  const diffDays = Math.abs(differenceInCalendarDays(now, d));
  if (diffDays > cutoffDays) return formatDayYearContraction(d);
  return `${formatRelativeDay(d, now)} on ${formatDayYearContraction(d)}`;
};

const DATE_KEY_CONFIGS: Record<TimePeriod, {
  getStart: (d: Date) => Date;
  keyFormat: string;
  labelFormat: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}> = {
  daily: {
    getStart: startOfDay,
    keyFormat: 'yyyy-MM-dd',
    labelFormat: 'MMM d',
  },
  weekly: {
    getStart: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
    keyFormat: 'yyyy-ww',
    labelFormat: 'MMM d',
    weekStartsOn: 1,
  },
  monthly: {
    getStart: startOfMonth,
    keyFormat: 'yyyy-MM',
    labelFormat: 'MMM yyyy',
  },
  yearly: {
    getStart: startOfYear,
    keyFormat: 'yyyy',
    labelFormat: 'yyyy',
  },
};

export const getDateKey = (date: Date, period: TimePeriod): DateKeyResult => {
  const config = DATE_KEY_CONFIGS[period];
  const start = config.getStart(date);

  const labelFormatted =
    period === 'daily'
      ? formatDayContraction(start)
      : period === 'weekly'
        ? formatWeekContraction(start)
        : period === 'monthly'
          ? formatMonthYearContraction(start)
          : formatYearContraction(start);

  return {
    key: format(start, config.keyFormat),
    timestamp: start.getTime(),
    label: labelFormatted,
  };
};

export const sortByTimestamp = <T extends { timestamp: number }>(arr: T[], ascending = true): T[] => {
  return [...arr].sort((a, b) => ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
};

export const DATE_FORMAT_HEVY = 'd MMM yyyy, HH:mm';
