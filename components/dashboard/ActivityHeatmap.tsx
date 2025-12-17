import React, { memo, useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, eachDayOfInterval } from 'date-fns';
import { Target } from 'lucide-react';
import type { DailySummary } from '../../types';
import { computationCache } from '../../utils/storage/computationCache';
import { formatHumanReadableDate } from '../../utils/date/dateUtils';
import { Tooltip as HoverTooltip, type TooltipData } from '../Tooltip';
import { Sparkline, StreakBadge } from '../InsightCards';
import type { SparklinePoint, StreakInfo } from '../../utils/analysis/insights';

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
        const lastDate = new Date(dailyData[dailyData.length - 1].timestamp);
        const days = eachDayOfInterval({ start: firstDate, end: lastDate });

        return days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const activity = byDayKey.get(key);
          return {
            date: day,
            count: activity?.sets ?? 0,
            totalVolume: activity?.totalVolume ?? 0,
            title: activity?.workoutTitle ?? null,
          };
        });
      },
      { ttl: 10 * 60 * 1000 }
    );
  }, [dailyData]);

  const monthBlocks = useMemo(() => {
    type MonthBlock = { key: string; label: string; cells: Array<any | null> };

    if (heatmapData.length === 0) return [] as MonthBlock[];

    const byKey = new Map<string, any>();
    for (const d of heatmapData) {
      byKey.set(format(d.date, 'yyyy-MM-dd'), d);
    }

    const rangeStart = heatmapData[0].date as Date;
    const rangeEnd = heatmapData[heatmapData.length - 1].date as Date;

    const blocks: MonthBlock[] = [];
    let cursor = startOfMonth(rangeStart);

    while (cursor.getTime() <= rangeEnd.getTime()) {
      const monthStart = cursor;
      const monthEnd = endOfMonth(monthStart);

      const visibleStart = monthStart.getTime() < rangeStart.getTime() ? rangeStart : monthStart;
      const visibleEnd = monthEnd.getTime() > rangeEnd.getTime() ? rangeEnd : monthEnd;

      const days = eachDayOfInterval({ start: visibleStart, end: visibleEnd });
      const rowCount = Math.ceil(days.length / 7);
      const cells: Array<any | null> = new Array(rowCount * 7).fill(null);

      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        cells[i] = byKey.get(format(day, 'yyyy-MM-dd')) || { date: day, count: 0, title: null };
      }

      const monthInitial = format(monthStart, 'MMM').slice(0, 1);
      const yearShort = format(monthStart, 'yy');
      blocks.push({
        key: format(monthStart, 'yyyy-MM'),
        label: `${monthInitial} ${yearShort}`,
        cells,
      });

      cursor = addMonths(cursor, 1);
    }

    return blocks;
  }, [heatmapData]);

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

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

  if (heatmapData.length === 0) return null;

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-800/50';
    if (count <= 15) return 'bg-emerald-400';
    if (count <= 30) return 'bg-emerald-500';
    if (count <= 45) return 'bg-emerald-700';
    return 'bg-emerald-900';
  };

  const handleMouseEnter = (e: React.MouseEvent, day: any) => {
    if (!day || day.count === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      rect,
      title: formatHumanReadableDate(day.date, { now }),
      body: `${day.count} Sets${day.title ? `\n${day.title}` : ''}`,
      footer: 'Click to view details',
      status: (day.count > 30 ? 'success' : 'info') as TooltipData['status'],
    });
  };

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 sm:gap-6 overflow-hidden">
      <div className="flex-shrink-0 flex flex-col justify-between min-w-full md:min-w-[180px] border-b md:border-b-0 md:border-r border-slate-800/50 pb-4 md:pb-0 md:pr-6 md:mr-2">
        <div className="w-full h-full flex items-center">
          <div className="w-full flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-black/50 text-emerald-400 flex-shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">Consistency</span>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight leading-none">{streakInfo.consistencyScore}%</div>
              <div className="text-[11px] text-slate-500 mt-1">{streakInfo.avgWorkoutsPerWeek}/wk avg</div>
            </div>

            <div className="flex-shrink-0">
              <Sparkline data={consistencySparkline} color="#10b981" height={24} />
            </div>

            <div className="flex-shrink-0">
              <StreakBadge streak={streakInfo} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-x-auto pb-2 custom-scrollbar" ref={scrollContainerRef}>
        <div className="w-max">
          <div className="flex items-start gap-4">
            {monthBlocks.map((month) => (
              <div key={month.key} className="flex flex-col items-center">
                <div className="h-4 mb-2 flex items-center justify-center text-[10px] text-slate-500 whitespace-nowrap">
                  {month.label}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {month.cells.map((day, idx) => {
                    if (!day) return <div key={`${month.key}-empty-${idx}`} className="w-3 h-3" />;
                    return (
                      <div
                        key={day.date.toISOString()}
                        className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-all duration-300 ${day.count > 0 ? 'cursor-pointer hover:z-10 ring-0 hover:ring-2 ring-white/20' : 'cursor-default'}`}
                        onClick={() => day.count > 0 && onDayClick?.(day.date)}
                        onMouseEnter={(e) => handleMouseEnter(e, day)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && <DashboardTooltip data={tooltip} />}
    </div>
  );
});
