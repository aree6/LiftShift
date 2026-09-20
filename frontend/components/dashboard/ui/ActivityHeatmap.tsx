import React, { memo, useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Dumbbell, Target } from 'lucide-react';
import type { DailySummary } from '../../../types';
import { computationCache } from '../../../utils/storage/computationCache';
import { useTheme } from '../../theme/ThemeProvider';
import { formatHumanReadableDate, formatMonthYearContraction } from '../../../utils/date/dateUtils';
import { Tooltip as HoverTooltip, type TooltipData } from '../../ui/Tooltip';
import { Sparkline, StreakBadge } from '../../insights/InsightCards';
import type { SparklinePoint, StreakInfo } from '../../../utils/analysis/insights';

const DashboardTooltip: React.FC<{ data: TooltipData }> = ({ data }) => {
  return <HoverTooltip data={data} />;
};

export const ActivityHeatmap = memo(({
  dailyData,
  streakInfo,
  consistencySparkline,
  onDayClick,
  now,
}: {
  dailyData: DailySummary[];
  streakInfo: StreakInfo;
  consistencySparkline: SparklinePoint[];
  onDayClick?: (date: Date) => void;
  now?: Date;
}) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const currentMonthEnd = useMemo(() => endOfMonth(today), [today]);

  const [viewOffset, setViewOffset] = useState(0);

  const heatmapData = useMemo(() => {
    return computationCache.getOrCompute(
      'heatmapData',
      dailyData,
      () => {
        if (dailyData.length === 0) return [];

        const byDayKey = new Map<string, DailySummary>();
        for (const d of dailyData) {
          byDayKey.set(format(new Date(d.timestamp), 'yyyy-MM-dd'), d);
        }

        const firstDate = new Date(dailyData[0].timestamp);
        const lastDateWithData = new Date(dailyData[dailyData.length - 1].timestamp);
        const futureEnd = endOfMonth(today);
        const lastDate = futureEnd.getTime() > lastDateWithData.getTime() ? futureEnd : lastDateWithData;
        const days = eachDayOfInterval({ start: firstDate, end: lastDate });

        return days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const activity = byDayKey.get(key);
          const isFuture = day.getTime() > today.getTime();
          const isCurrentMonthFuture = isFuture && day.getTime() <= currentMonthEnd.getTime();
          return {
            date: day,
            count: activity?.sets ?? 0,
            totalVolume: activity?.totalVolume ?? 0,
            title: activity?.workoutTitle ?? null,
            isFuture,
            isCurrentMonthFuture,
          };
        });
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [dailyData, today]);

  const windowedData = useMemo(() => {
    if (heatmapData.length === 0) return heatmapData;
    const lastDate = heatmapData[heatmapData.length - 1].date;
    const windowEnd = lastDate;
    const windowStart = subMonths(windowEnd, 12 * (viewOffset + 1));
    const actualEnd = subMonths(windowEnd, 12 * viewOffset);
    const firstDate = heatmapData[0].date;
    const clampedStart = windowStart < firstDate ? firstDate : windowStart;
    return heatmapData.filter(d => d.date >= clampedStart && d.date <= actualEnd);
  }, [heatmapData, viewOffset]);

  const { hasOlderData } = useMemo(() => {
    if (heatmapData.length === 0) return { hasOlderData: false };
    const lastDate = heatmapData[heatmapData.length - 1].date;
    const firstDate = heatmapData[0].date;
    const actualEnd = subMonths(lastDate, 12 * viewOffset);
    const actualStart = subMonths(actualEnd, 12);
    return { hasOlderData: firstDate < actualStart };
  }, [heatmapData, viewOffset]);

  const monthBlocks = useMemo(() => {
    type MonthBlock = { key: string; label: string; cells: Array<any | null> };

    if (windowedData.length === 0) return [] as MonthBlock[];

    const byKey = new Map<string, any>();
    for (const d of windowedData) {
      byKey.set(format(d.date, 'yyyy-MM-dd'), d);
    }

    const rangeStart = windowedData[0].date as Date;
    const rangeEnd = windowedData[windowedData.length - 1].date as Date;

    const blocks: MonthBlock[] = [];
    let cursor = startOfMonth(rangeStart);

    while (cursor.getTime() <= rangeEnd.getTime()) {
      const monthStart = cursor;
      const monthEnd = endOfMonth(monthStart);

      const visibleStart = monthStart.getTime() < rangeStart.getTime() ? rangeStart : monthStart;
      const visibleEnd = monthEnd.getTime() > rangeEnd.getTime() ? rangeEnd : monthEnd;

      const days = eachDayOfInterval({ start: visibleStart, end: visibleEnd });
      const dayOfWeekOffset = (getDay(visibleStart) + 6) % 7;
      const totalCells = Math.ceil((dayOfWeekOffset + days.length) / 7) * 7;
      const cells: Array<any | null> = new Array(totalCells).fill(null);

      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const existing = byKey.get(format(day, 'yyyy-MM-dd'));
        const isFuture = day.getTime() > today.getTime();
        const isCurrentMonthFuture = isFuture && day.getTime() <= currentMonthEnd.getTime();
        cells[dayOfWeekOffset + i] = existing || { date: day, count: 0, title: null, isFuture, isCurrentMonthFuture };
      }

      blocks.push({
        key: format(monthStart, 'yyyy-MM'),
        label: formatMonthYearContraction(monthStart),
        cells,
      });

      cursor = addMonths(cursor, 1);
    }

    return blocks;
  }, [windowedData, today]);

  const consistencyTrendColor = useMemo(() => {
    if (consistencySparkline.length < 2) return '#3b82f6';
    const first = consistencySparkline[0].value;
    const last = consistencySparkline[consistencySparkline.length - 1].value;
    const threshold = Math.max(Math.abs(first), Math.abs(last), 1) * 0.05;
    if (last > first + threshold) return '#22c55e';
    if (last < first - threshold) return '#ef4444';
    return '#3b82f6';
  }, [consistencySparkline]);

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  // Scroll to "today" once on mount only. Previously re-ran on every
  // heatmapData change, yanking scroll away from the user mid-interaction.
  const didInitialScrollRef = React.useRef(false);

  useEffect(() => {
    if (!scrollContainerRef.current || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = Math.max(
            0,
            scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
          );
        }
      }, 100);
    });
  }, [heatmapData]);

  const { mode } = useTheme();
  const isLight = mode === 'light';

  if (heatmapData.length === 0) return null;

  const todayStr = format(today, 'yyyy-MM-dd');
  const todayInRange = windowedData.length > 0 && windowedData.some(d => format(d.date, 'yyyy-MM-dd') === todayStr);
  const maxVolume = Math.max(...windowedData.map(d => d.totalVolume), 1);

  const getHSLForIntensity = (intensity: number) => {
    const lightness = isLight
      ? 88 - (intensity * 48)
      : 25 + (intensity * 40);
    const saturation = 70 + (intensity * 20);
    return { lightness, saturation };
  };

  const getColor = (volume: number, isFuture?: boolean, isCurrentMonthFuture?: boolean) => {
    if (isCurrentMonthFuture) return { bgClass: 'bg-slate-800/20 border border-slate-700/20', style: { opacity: 0.6 } };
    if (isFuture) return { bgClass: 'bg-slate-800/40 border border-slate-700/50', style: {} };
    if (volume === 0) return { bgClass: 'bg-slate-800/50', style: {} };
    if (volume === maxVolume) return { bgClass: '', style: { backgroundColor: '#fbbf24' } };

    const intensity = Math.min(volume / maxVolume, 1);
    const { lightness, saturation } = getHSLForIntensity(intensity);

    return { bgClass: '', style: { backgroundColor: `hsl(160, ${saturation}%, ${lightness}%)` } };
  };

  const getDayTextColor = (volume: number, isFuture?: boolean, isCurrentMonthFuture?: boolean) => {
    if (isCurrentMonthFuture) return 'text-slate-500/30';
    if (isFuture) return 'text-slate-600';
    if (volume === 0) return 'text-slate-600';
    if (volume === maxVolume) return 'text-slate-900';

    const intensity = Math.min(volume / maxVolume, 1);
    const { lightness } = getHSLForIntensity(intensity);
    
    return lightness >= 45 ? 'text-slate-900' : 'text-white';
  };


  const isPeakDay = (volume: number) => volume > 0 && volume === maxVolume;

  const handleMouseEnter = (e: React.MouseEvent, day: any) => {
    if (!day || day.count === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const peak = isPeakDay(day.totalVolume);
    const dateStr = formatHumanReadableDate(day.date, { now });
    setTooltip({
      rect,
      title: peak ? `Best Volume Session • ${dateStr}` : dateStr,
      titleColor: peak ? '#fbbf24' : undefined,
      body: `${day.totalVolume.toLocaleString()} kg${day.title ? `\n${day.title}` : ''}`,
      footer: 'See exercises',
      status: (day.totalVolume > 3000 ? 'success' : 'info') as TooltipData['status'],
    });
  };

  return (
    <div className="bg-black/20 border border-slate-700/50 p-2 sm:p-3 rounded-xl flex flex-col lg:flex-row gap-4 lg:gap-5 overflow-hidden" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      <div className="flex-shrink-0 min-w-[160px] sm:min-w-[200px] lg:min-w-[240px] border-b lg:border-b-0 lg:border-r border-slate-700/50 pb-4 lg:pb-0 lg:pr-6 lg:flex lg:flex-col">
        <div className="flex flex-col gap-3 lg:flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Consistency</span>
            </div>
            <StreakBadge streak={streakInfo} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 lg:flex-1 lg:h-full lg:grid-rows-[1fr_auto]">
            <div className="row-span-2 flex flex-col justify-center items-start">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{streakInfo.consistencyScore}</span>
                <span className="text-lg text-slate-500">%</span>
              </div>
            </div>

            <div className="row-span-2 flex items-center mr-3 mb-3 justify-left scale-150 origin-centre">
              <Sparkline data={consistencySparkline} color={consistencyTrendColor} height={44} title="Workout consistency over last 8 weeks" />
            </div>

            <div className="flex items-center justify-start">
              <span className="text-xs text-slate-500">{streakInfo.avgWorkoutsPerWeek} days/wk</span>
            </div>

            <div className="flex items-center justify-end">
              {todayInRange && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                  <span>Less</span>
                  <div className="flex gap-0.5">
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => {
                      const { lightness, saturation } = getHSLForIntensity(intensity);
                      const bgClass = intensity === 0 ? 'bg-slate-800/50' : '';
                      const style = intensity === 0 ? {} : { backgroundColor: `hsl(160, ${saturation}%, ${lightness}%)` };
                      return <div key={i} className={`w-2.5 h-2.5 rounded-sm ${bgClass}`} style={style} />;
                    })}
                  </div>
                  <span>More</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-x-auto pb-2 custom-scrollbar" ref={scrollContainerRef}>
        <div className="w-max">
          <div className="flex items-start gap-5">
            <div className="flex flex-col items-center justify-center min-w-[40px] self-center">
              {hasOlderData && (
                <button
                  onClick={() => setViewOffset(v => v + 1)}
                  className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">Older</span>
                </button>
              )}
            </div>
            {monthBlocks.map((month, monthIdx) => {
              const dayOfWeekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
              return (
              <div key={month.key} className="flex flex-col items-center">
                <div className="h-4 mb-0.5 flex items-center justify-center text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                  {month.label}
                </div>
                {monthIdx === 0 && (
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {dayOfWeekLabels.map((label, i) => (
                      <div key={i} className="w-[18px] h-3 flex items-center justify-center text-[9px] sm:text-[10px] text-slate-600 font-medium">
                        {label}
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative z-10 grid grid-cols-7 gap-1 justify-items-center items-center">
                    {month.cells.map((day, idx) => {
                      if (!day) return <div key={`${month.key}-empty-${idx}`} className="w-[18px] h-[18px]" />;
                      const dayNum = day.date.getDate();
                      const isFuture = day.isFuture;
                      const isCurrentMonthFuture = day.isCurrentMonthFuture;
                      const isToday = format(day.date, 'yyyy-MM-dd') === todayStr;
                      const { bgClass, style } = getColor(day.totalVolume, isFuture, isCurrentMonthFuture);
                      const textColor = getDayTextColor(day.totalVolume, isFuture, isCurrentMonthFuture);
                      return (
                        <div
                          key={day.date.toISOString()}
                          className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-medium ${bgClass} ${textColor} transition-colors duration-200 hover:ring-1 hover:ring-white/20 ${day.totalVolume > 0 && !isFuture ? 'cursor-pointer' : 'cursor-default'} ${isToday ? 'ring-2 ring-blue-400/70' : ''}`}
                          style={style}
                          onClick={() => day.count > 0 && !isFuture && onDayClick?.(day.date)}
                          onMouseEnter={(e) => !isFuture && handleMouseEnter(e, day)}
                          onMouseLeave={() => !isFuture && setTooltip(null)}
                        >
                          {dayNum <= 31 && (day.count > 0 && !isFuture ? <Dumbbell className={`w-3 h-3 ${isLight ? '!text-white' : '!text-black'}`} /> : dayNum)}
                        </div>
                      );
                    })}
                  </div>
                </div>
            );
            })}
            <div className="flex flex-col items-center justify-center min-w-[40px] self-center">
              {viewOffset > 0 && (
                <button
                  onClick={() => setViewOffset(v => v - 1)}
                  className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-[10px] sm:text-xs font-medium">Recent</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {tooltip && <DashboardTooltip data={tooltip} />}
    </div>
  );
});
