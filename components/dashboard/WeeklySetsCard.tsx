import React, { useMemo, useState } from 'react';
import {
  Dumbbell,
  Grid3X3,
  Infinity,
  PersonStanding,
  Scan,
  BicepsFlexed,
} from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { BodyMap, type BodyMapGender } from '../BodyMap';
import { LazyRender } from '../LazyRender';
import { ChartSkeleton } from '../ChartSkeleton';
import {
  BadgeLabel,
  ChartDescription,
  InsightLine,
  InsightText,
  TrendBadge,
} from './ChartBits';
import { getVolumeColor, SVG_MUSCLE_NAMES } from '../../utils/muscle/muscleMapping';
import { SVG_TO_MUSCLE_GROUP, getGroupHighlightIds } from '../../utils/muscle/muscleMappingConstants';

type WeeklySetsView = 'radar' | 'heatmap';
type WeeklySetsWindow = 'all' | '7d' | '30d' | '365d';
type WeeklySetsGrouping = 'groups' | 'muscles';

type WeeklySetsPoint = { subject: string; value: number };

type HeatmapData = {
  volumes: Map<string, number>;
  maxVolume: number;
};

const safePct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

export const WeeklySetsCard = ({
  isMounted,
  weeklySetsView,
  setWeeklySetsView,
  compositionGrouping,
  setCompositionGrouping,
  muscleCompQuick,
  setMuscleCompQuick,
  compositionQuickData,
  heatmap,
  tooltipStyle,
  onMuscleClick,
  bodyMapGender,
}: {
  isMounted: boolean;
  weeklySetsView: WeeklySetsView;
  setWeeklySetsView: (v: WeeklySetsView) => void;
  compositionGrouping: WeeklySetsGrouping;
  setCompositionGrouping: (v: WeeklySetsGrouping) => void;
  muscleCompQuick: WeeklySetsWindow;
  setMuscleCompQuick: (v: WeeklySetsWindow) => void;
  compositionQuickData: WeeklySetsPoint[];
  heatmap: HeatmapData;
  tooltipStyle: Record<string, unknown>;
  onMuscleClick?: (muscleId: string, viewMode: 'muscle' | 'group') => void;
  bodyMapGender?: BodyMapGender;
}) => {
  const [heatmapHoveredMuscle, setHeatmapHoveredMuscle] = useState<string | null>(null);

  const weeklySetsInsight = useMemo(() => {
    if (!compositionQuickData || compositionQuickData.length === 0) return null;
    const total = compositionQuickData.reduce((acc, d) => acc + (d.value || 0), 0);
    const sorted = [...compositionQuickData].sort((a, b) => (b.value || 0) - (a.value || 0));
    const top = sorted[0];
    const topShare = total > 0 ? safePct(top.value || 0, total) : 0;
    const top3 = sorted.slice(0, 3).reduce((acc, d) => acc + (d.value || 0), 0);
    const top3Share = total > 0 ? safePct(top3, total) : 0;
    return {
      total,
      top,
      topShare,
      top3Share,
    };
  }, [compositionQuickData]);

  const heatmapHoveredMuscleIds = useMemo(() => {
    if (!heatmapHoveredMuscle) return undefined;
    if (compositionGrouping !== 'groups') return undefined;
    return getGroupHighlightIds(heatmapHoveredMuscle);
  }, [heatmapHoveredMuscle, compositionGrouping]);

  const weeklySetsHoverMeta = useMemo(() => {
    if (!heatmapHoveredMuscle) return null;

    const name =
      compositionGrouping === 'groups'
        ? (SVG_TO_MUSCLE_GROUP as any)[heatmapHoveredMuscle] || 'Unknown'
        : (SVG_MUSCLE_NAMES as any)[heatmapHoveredMuscle] || 'Unknown';

    const value = heatmap.volumes.get(heatmapHoveredMuscle) || 0;
    const accent = getVolumeColor(value, heatmap.maxVolume);

    return { name, value, accent };
  }, [heatmapHoveredMuscle, compositionGrouping, heatmap]);

  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[480px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
      <div className="relative z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-cyan-500" />
          <span>Weekly sets</span>
        </h3>

        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto w-full sm:w-auto sm:overflow-visible">
          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setWeeklySetsView('radar')}
              title="Radar"
              aria-label="Radar"
              className={`w-6 h-5 flex items-center justify-center rounded ${weeklySetsView==='radar'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <Scan className="w-3 h-3" />
              <span className="sr-only">Radar</span>
            </button>
            <button
              onClick={() => setWeeklySetsView('heatmap')}
              title="Heatmap"
              aria-label="Heatmap"
              className={`w-6 h-5 flex items-center justify-center rounded ${weeklySetsView==='heatmap'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <Grid3X3 className="w-3 h-3" />
              <span className="sr-only">Heatmap</span>
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setCompositionGrouping('groups')}
              title="Groups"
              aria-label="Groups"
              className={`w-6 h-5 flex items-center justify-center rounded ${compositionGrouping==='groups'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <PersonStanding className="w-3 h-3 scale-[1.3]" />
              <span className="sr-only">Groups</span>
            </button>
            <button
              onClick={() => setCompositionGrouping('muscles')}
              title="Muscles"
              aria-label="Muscles"
              className={`w-6 h-5 flex items-center justify-center rounded ${compositionGrouping==='muscles'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <BicepsFlexed className="w-3 h-3" />
              <span className="sr-only">Muscles</span>
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setMuscleCompQuick('all')}
              title="All"
              aria-label="All"
              className={`w-6 h-5 flex items-center justify-center rounded ${muscleCompQuick==='all'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <Infinity className="w-3 h-3" />
              <span className="sr-only">All</span>
            </button>
            <button
              onClick={() => setMuscleCompQuick('7d')}
              title="Last week"
              aria-label="Last week"
              className={`px-1 h-5 flex items-center justify-center rounded text-[8px] font-bold leading-none ${muscleCompQuick==='7d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              lst wk
            </button>
            <button
              onClick={() => setMuscleCompQuick('30d')}
              title="Last month"
              aria-label="Last month"
              className={`px-1 h-5 flex items-center justify-center rounded text-[8px] font-bold leading-none ${muscleCompQuick==='30d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              lst mo
            </button>
            <button
              onClick={() => setMuscleCompQuick('365d')}
              title="Last year"
              aria-label="Last year"
              className={`px-1 h-5 flex items-center justify-center rounded text-[8px] font-bold leading-none ${muscleCompQuick==='365d'?'bg-cyan-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              lst yr
            </button>
          </div>
        </div>
      </div>

      <div className={`relative z-10 flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0 pb-10`}>
        {weeklySetsView === 'radar' ? (
          compositionQuickData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              No muscle composition for this period yet.
            </div>
          ) : (
            <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 300 }} />}>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={compositionQuickData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar
                    name="Weekly Sets"
                    dataKey="value"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fill="#06b6d4"
                    fillOpacity={0.35}
                    animationDuration={1500}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </LazyRender>
          )
        ) : (
          <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 300 }} />}>
            <div className="flex flex-col items-center justify-center h-[300px]">
              {heatmap.volumes.size === 0 ? (
                <div className="text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg p-8">
                  No heatmap data for this period yet.
                </div>
              ) : (
                <>
                  <div className="relative flex justify-center w-full mt-4 sm:mt-6">
                    <div className="transform scale-[0.5] origin-center">
                      <BodyMap
                        onPartClick={(muscleId) =>
                          onMuscleClick?.(muscleId, compositionGrouping === 'groups' ? 'group' : 'muscle')
                        }
                        selectedPart={null}
                        muscleVolumes={heatmap.volumes}
                        maxVolume={heatmap.maxVolume}
                        hoveredMuscleIdsOverride={heatmapHoveredMuscleIds}
                        onPartHover={setHeatmapHoveredMuscle}
                        gender={bodyMapGender}
                        viewMode={compositionGrouping === 'groups' ? 'group' : 'muscle'}
                      />
                    </div>

                    {weeklySetsHoverMeta && (
                      <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 bg-black/90 border border-slate-700/50 rounded-lg px-3 py-2 shadow-xl pointer-events-none z-20">
                        <div
                          className="font-semibold text-[11px] text-center whitespace-nowrap"
                          style={{ color: weeklySetsHoverMeta.accent }}
                        >
                          {weeklySetsHoverMeta.name}
                        </div>
                        <div
                          className="text-[10px] text-center font-semibold whitespace-nowrap"
                          style={{ color: weeklySetsHoverMeta.accent }}
                        >
                          {`${weeklySetsHoverMeta.value.toFixed(1)}/wk`}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </LazyRender>
        )}
      </div>

      <ChartDescription
        isMounted={isMounted}
        topSlot={
          weeklySetsView === 'heatmap' ? (
            <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-950/75 border border-slate-700/50 backdrop-blur-sm rounded-lg px-3 py-1.5 w-fit">
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-2 rounded border border-slate-700/50"
                  style={{ backgroundColor: 'rgb(var(--tint-rgb) / 0.06)' }}
                ></div>
                <span>None</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-2 rounded"
                  style={{ backgroundColor: 'hsl(var(--heatmap-hue), 75%, 75%)' }}
                ></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-2 rounded"
                  style={{ backgroundColor: 'hsl(var(--heatmap-hue), 75%, 50%)' }}
                ></div>
                <span>Med</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-2 rounded"
                  style={{ backgroundColor: 'hsl(var(--heatmap-hue), 75%, 25%)' }}
                ></div>
                <span>High</span>
              </div>
            </div>
          ) : null
        }
      >
        <InsightLine>
          {weeklySetsInsight ? (
            <>
              <TrendBadge label={<BadgeLabel main={`~${weeklySetsInsight.total.toFixed(1)}/wk`} />} tone="info" />
              <TrendBadge
                label={`Top: ${weeklySetsInsight.top.subject} ${weeklySetsInsight.top.value.toFixed(1)}/wk`}
                tone="neutral"
              />
              <TrendBadge
                label={`Top3 ${weeklySetsInsight.top3Share.toFixed(0)}%`}
                tone={
                  weeklySetsInsight.top3Share >= 70
                    ? 'bad'
                    : weeklySetsInsight.top3Share >= 55
                      ? 'neutral'
                      : 'good'
                }
              />
            </>
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}
        </InsightLine>
        <InsightText text="Read this as your weekly set allocation. If the Top 3 share is high, your volume is concentrated. This is great for specialization, but watch balance." />
      </ChartDescription>
    </div>
  );
};
