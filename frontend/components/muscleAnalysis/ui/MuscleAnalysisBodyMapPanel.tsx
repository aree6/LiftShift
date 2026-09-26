import React from 'react';
import { BodyMap, BodyMapGender } from '../../bodyMap/BodyMap';
import { Grid3X3, Infinity, Scan } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Tooltip as HoverTooltip, type TooltipData } from '../../ui/Tooltip';
import { CHART_TOOLTIP_STYLE, RADAR_TICK_FILL } from '../../../utils/ui/uiConstants';

import type { WeeklySetsWindow } from '../../../utils/muscle/analytics';
import type { MuscleVolumeThresholds } from '../../../utils/muscle/hypertrophy/muscleParams';
import { SegmentControl } from '../../ui/SegmentControl';
import { Reveal } from '../../ui/Reveal';

interface MuscleAnalysisBodyMapPanelProps {
  bodyMapGender: BodyMapGender;
  weeklySetsChartView: 'heatmap' | 'radar';
  setWeeklySetsChartView: (value: 'heatmap' | 'radar') => void;
  weeklySetsWindow: WeeklySetsWindow;
  setWeeklySetsWindow: (value: WeeklySetsWindow) => void;
  selectedSvgIdForUrlRef: React.MutableRefObject<string | null>;
  updateSelectionUrl: (payload: { svgId: string; window: WeeklySetsWindow }) => void;
  muscleVolumes: Map<string, number>;
  maxVolume: number;
  volumeThresholds: MuscleVolumeThresholds;
  selectedMuscle: string | null;
  selectedBodyMapIds?: string[];
  hoveredBodyMapIds?: string[];
  handleMuscleClick: (muscleId: string) => void;
  handleMuscleHover: (muscleId: string | null, e?: MouseEvent) => void;
  radarData: Array<{ subject: string; value: number }>;
  hoverTooltip: TooltipData | null;
}

export const MuscleAnalysisBodyMapPanel: React.FC<MuscleAnalysisBodyMapPanelProps> = ({
  bodyMapGender,
  weeklySetsChartView,
  setWeeklySetsChartView,
  weeklySetsWindow,
  setWeeklySetsWindow,
  selectedSvgIdForUrlRef,
  updateSelectionUrl,
  muscleVolumes,
  maxVolume,
  volumeThresholds,
  selectedMuscle,
  selectedBodyMapIds,
  hoveredBodyMapIds,
  handleMuscleClick,
  handleMuscleHover,
  radarData,
  hoverTooltip,
}) => {
  const handleClick = (muscleId: string) => {
    handleMuscleClick(muscleId);
    // Scroll to graph on mobile/tablet (< 768px)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        const target = document.getElementById('all-muscles-graph');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  return (
    <Reveal className="bg-black/20 rounded-xl border border-slate-700/50 p-4 relative flex flex-col h-full">
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-end gap-2">
        <SegmentControl
          dataTrack="charttype-muscleanalysis"
          options={[
            { value: 'heatmap', icon: <Grid3X3 className="w-3 h-3" />, title: 'Heatmap' },
            { value: 'radar', icon: <Scan className="w-3 h-3" />, title: 'Radar' },
          ]}
          value={weeklySetsChartView}
          onChange={setWeeklySetsChartView}
        />

        <SegmentControl
          dataTrack="timerange-muscleanalysis"
          options={[
            { value: 'all', icon: <Infinity className="w-2.5 h-2.5" />, title: 'All time' },
            { value: '7d', label: 'lst wk', title: 'Last week' },
            { value: '30d', label: 'lst mo', title: 'Last month' },
            { value: '365d', label: 'lst yr', title: 'Last year' },
          ]}
          value={weeklySetsWindow as 'all' | '7d' | '30d' | '365d'}
          onChange={(v) => {
            setWeeklySetsWindow(v);
            const svgId = selectedSvgIdForUrlRef.current;
            if (!svgId) return;
            updateSelectionUrl({ svgId, window: v });
          }}
        />
      </div>

      {weeklySetsChartView === 'radar' ? (
        <div className="flex-1 flex flex-col items-center justify-center h-full pt-10">
          {radarData.some((d) => (d.value ?? 0) > 0) ? (
            <div className="w-full min-h-[280px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={(props: any) => {
                      const { payload, x, y, index, cx, cy } = props;
                      const label = radarData[index ?? 0]?.subject ?? payload?.subject ?? '';
                      const px = x ?? 0;
                      const py = y ?? 0;
                      const outward = 1.18;
                      const tx = cx != null && cy != null ? cx + (px - cx) * outward : px;
                      const ty = cx != null && cy != null ? cy + (py - cy) * outward : py;
                      return (
                        <g transform={`translate(${tx},${ty})`}>
                          <text fill={RADAR_TICK_FILL} fontSize={11} textAnchor="middle" dominantBaseline="middle">
                            {label}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar
                    name="Weekly Sets"
                    dataKey="value"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fill="#06b6d4"
                    fillOpacity={0.35}
                    animationDuration={250}
                  />
                  <RechartsTooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value: any) => [`${Number(value).toFixed(1)} sets/wk`]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[280px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg mx-2 w-full">
              No muscle composition for this period yet.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full pt-10 pb-6">
          <div className="flex-1 h-full flex items-center justify-center">
            <div className="scale-85">
              <BodyMap
                onPartClick={handleClick}
                selectedPart={selectedMuscle}
                selectedMuscleIdsOverride={selectedBodyMapIds}
                hoveredMuscleIdsOverride={hoveredBodyMapIds}
                muscleVolumes={muscleVolumes}
                maxVolume={maxVolume}
                volumeThresholds={volumeThresholds}
                onPartHover={handleMuscleHover}
                gender={bodyMapGender}
                useHypertrophyColors
                stroke={{ width: 2, color: '#484a68', opacity: 0.5 }}
              />
            </div>
          </div>

          <div className="sm:hidden text-center text-[11px] sm:text-xs font-semibold text-slate-600 mt-3">
            Tap to see more details
          </div>
          <div className="flex flex-col items-center justify-center w-full mt-3">
            <div className="hidden sm:block text-center text-[11px] sm:text-xs text-slate-500">
              Hover over muscles to preview, click to view exercises
            </div>
          </div>
          
        </div>
      )}

      {hoverTooltip && <HoverTooltip data={hoverTooltip} />}
    </Reveal>
  );
};
