import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AreaChart as AreaChartIcon, BicepsFlexed, ChartColumnStacked, PersonStanding } from 'lucide-react';
import { LazyRender } from '../LazyRender';
import { ChartSkeleton } from '../ChartSkeleton';
import { normalizeMuscleGroup } from '../../utils/muscle/muscleNormalization';
import { MUSCLE_COLORS, INDIVIDUAL_MUSCLE_COLORS } from '../../utils/domain/categories';
import { formatSignedNumber } from '../../utils/format/formatters';
import { formatDeltaPercentage, getDeltaFormatPreset } from '../../utils/format/deltaFormat';
import {
  BadgeLabel,
  ChartDescription,
  getTrendBadgeTone,
  InsightLine,
  InsightText,
  ShiftedMeta,
  TrendBadge,
  TrendIcon,
} from './ChartBits';

type MuscleGrouping = 'groups' | 'muscles';
type MusclePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
type MuscleTrendView = 'area' | 'stackedBar';

type MuscleTrendInsight = {
  totalDelta: { direction: 'up' | 'down' | 'same'; deltaPercent: number };
  biggestMover?: { k: string; d: number };
} | null;

const formatSigned = (n: number) => formatSignedNumber(n, { maxDecimals: 2 });
const formatSignedPctWithNoun = (pct: number, noun: string) =>
  `${formatDeltaPercentage(pct, getDeltaFormatPreset('badge'))} ${noun}`;

export const MuscleTrendCard = ({
  isMounted,
  muscleGrouping,
  setMuscleGrouping,
  musclePeriod,
  setMusclePeriod,
  muscleTrendView,
  setMuscleTrendView,
  trendData,
  trendKeys,
  muscleTrendInsight,
  tooltipStyle,
  muscleVsLabel,
}: {
  isMounted: boolean;
  muscleGrouping: MuscleGrouping;
  setMuscleGrouping: (v: MuscleGrouping) => void;
  musclePeriod: MusclePeriod;
  setMusclePeriod: (v: MusclePeriod) => void;
  muscleTrendView: MuscleTrendView;
  setMuscleTrendView: (v: MuscleTrendView) => void;
  trendData: any[];
  trendKeys: string[];
  muscleTrendInsight: MuscleTrendInsight;
  tooltipStyle: Record<string, unknown>;
  muscleVsLabel: string;
}) => {
  return (
    <div className="bg-black/70 border border-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px] sm:min-h-[520px] flex flex-col transition-all duration-300 hover:shadow-xl min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 487.172 487.172" fill="currentColor">
            <path d="M80.147,315.971c-2.072,4.694-4.343,10.061-6.252,14.598c-12.218,29.043-24.851,59.074-72.827,113.241 c-1.556,1.757-1.394,4.443,0.364,6c0.809,0.716,1.814,1.068,2.816,1.068c1.174,0,2.343-0.484,3.183-1.432 c13.106-14.798,23.608-27.821,32.229-39.548c27.358,9.402,35.802,32.988,37.275,37.863c-11.64,8.574-24.554,18.999-39.209,31.98 c-1.757,1.557-1.92,4.242-0.363,5.999c0.84,0.948,2.009,1.433,3.183,1.433c1.002,0,2.008-0.353,2.816-1.068 c54.167-47.977,84.198-60.61,113.242-72.828c4.536-1.908,9.902-4.18,14.597-6.252c49.33-21.776,96.602-42.642,137.241-75.945 c45.114-36.972,78.352-85.822,104.602-153.736c21.52-55.68,38.239-95.378,73.17-138.174c1.484-1.818,1.214-4.496-0.604-5.98 c-1.819-1.484-4.496-1.214-5.98,0.605c-10.308,12.628-19.048,24.967-26.8,37.485c-25.962-9.067-34.761-30.935-36.751-37.047 c12.455-7.724,24.734-16.43,37.301-26.687c1.818-1.484,2.09-4.162,0.605-5.98c-1.484-1.818-4.162-2.089-5.98-0.605 c-42.797,34.931-82.494,51.65-138.174,73.17c-67.914,26.249-116.765,59.487-153.736,104.602 C122.79,219.369,101.924,266.64,80.147,315.971z"/>
            <path d="M298.64,104.485c-59.109,27.002-102.147,60.839-135.44,106.488c-1.383,1.896-0.967,4.555,0.93,5.938 c0.756,0.551,1.632,0.817,2.501,0.817c1.312,0,2.605-0.605,3.437-1.746c32.398-44.423,74.376-77.395,132.105-103.766 c2.135-0.975,3.075-3.497,2.1-5.632C303.297,104.45,300.775,103.51,298.64,104.485z"/>
            <path d="M322.067,259.048c-1.898-1.384-4.556-0.967-5.939,0.929c-32.398,44.423-74.375,77.395-132.104,103.766 c-2.135,0.975-3.075,3.496-2.1,5.632c0.714,1.563,2.256,2.485,3.868,2.485c0.591,0,1.19-0.124,1.764-0.385 c59.109-27.001,102.146-60.839,135.439-106.488C324.38,263.089,323.964,260.43,322.067,259.048z"/>
          </svg>
          <span>Muscle Analysis</span>
        </h3>

        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto w-full sm:w-auto sm:overflow-visible">
          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setMuscleGrouping('groups')}
              title="Groups"
              aria-label="Groups"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleGrouping==='groups'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 187.064 187.064" fill="currentColor">
                <path d="M107.911,47.483c0,0.792-0.676,1.425-1.51,1.425c-0.841,0-1.514-0.64-1.514-1.425c0-0.8,0.673-1.443,1.514-1.443 C107.229,46.04,107.911,46.683,107.911,47.483z M80.666,46.04c-0.85,0-1.51,0.648-1.51,1.443c0,0.792,0.661,1.425,1.51,1.425 c0.828,0,1.51-0.64,1.51-1.425C82.176,46.683,81.487,46.04,80.666,46.04z M83.677,63.476v11.359c0,0.554,0.444,1.004,1.004,1.004 c0.548,0,0.999-0.45,0.999-1.004V63.476c0-4.323,3.504-7.839,7.837-7.839s7.843,3.516,7.843,7.839v11.789 c0,0.558,0.45,1.005,1.005,1.005c0.554,0,1.005-0.447,1.005-1.005V63.476c0-5.431-4.421-9.846-9.853-9.846 C88.091,53.63,83.677,58.045,83.677,63.476z"/>
                <path d="M150.444,41.51c0.036,0.304-0.079,0.608-0.299,0.828c-0.311,0.298-7.685,7.331-18.389,8.263c-2.74,0.234-5.262,0.354-7.532,0.354 c-3.587,0-6.583-0.311-9.073-0.911c-0.036,0.088-0.073,0.167-0.128,0.25c0.384,1.215,0.591,2.476,0.591,3.767 c0,3.479-1.431,6.759-3.994,9.109c0.742,1.985,1.139,4.177,1.139,6.394c0,3.888-1.194,7.605-3.289,10.312 c1.656,2.536,16.039,25.955,3.502,47.396c1.899,2.344,5.419,10.625-1.79,37.436l1.534,1.383c0.194,0.188,0.329,0.444,0.335,0.725 l0.098,4.664l9.755,8.981c0.207,0.194,0.328,0.463,0.328,0.743v4.859c0,0.56-0.438,1.004-0.998,1.004h-13.104 c-0.219,0-0.414-0.066-0.603-0.201l-7.995-6.021c-0.243-0.177-0.387-0.457-0.393-0.762l-0.582-12.744 c-0.018-0.408,0.213-0.792,0.593-0.956l1.048-0.476c0-0.023-0.013-0.061-0.013-0.097c0.454-4.908-1.267-11.174-2.094-12.769 c-6.835-13.11-2.122-23.986-1.373-25.539c-0.012-0.018-0.037-0.029-0.042-0.055c-0.144-0.56-2.762-10.278-4.092-17.572 c-1.328,7.288-3.946,17.013-4.089,17.572c-0.024,0.08-0.076,0.129-0.113,0.207c0.911,1.967,5.225,12.611-1.428,25.38 c-0.84,1.596-2.558,7.861-2.095,12.763c0,0.049-0.012,0.073-0.012,0.109l1.035,0.463c0.387,0.165,0.618,0.549,0.597,0.957 l-0.573,12.744c-0.012,0.299-0.155,0.584-0.393,0.761l-8.001,6.022c-0.18,0.146-0.387,0.213-0.603,0.213H64.803 c-0.548,0-0.999-0.45-0.999-1.004v-4.859c0-0.28,0.125-0.549,0.332-0.743l9.764-8.976l0.113-4.67 c0.006-0.274,0.131-0.536,0.334-0.725l1.535-1.383c-7.307-27.176-3.583-35.316-1.708-37.539 c-11.822-20.344,0.536-42.43,3.224-46.768c-2.369-2.731-3.735-6.64-3.735-10.835c0-2.217,0.387-4.415,1.142-6.394 c-2.539-2.345-3.992-5.63-3.992-9.109c0-1.297,0.195-2.558,0.594-3.767c-0.024-0.03-0.045-0.067-0.058-0.101 c-2.375,0.512-5.188,0.768-8.503,0.768c-2.277,0-4.795-0.119-7.539-0.354c-10.702-0.925-18.076-7.964-18.389-8.263 c-0.216-0.219-0.335-0.518-0.298-0.828c1.078-10.022,12.458-22.685,12.93-23.215c1.729-1.355,5.782-0.697,6.978-0.463 c0.162,0.033,0.338,0.113,0.463,0.226c2.643,2.289,2.305,5.145,2.292,5.264c-0.03,0.229-0.137,0.448-0.311,0.603l-2.262,2.113 c-0.183,0.177-0.427,0.268-0.682,0.268h-3.791c-2.025,3.538-2.856,6.168-3.154,8.007c1.857-1.428,4.271-2.231,6.802-2.231 c3.306,0,6.323,1.346,8.238,3.559c1.27-3.495,4.631-5.979,8.516-5.979c2.208,0,4.336,0.813,5.992,2.208 c0.018-0.006,0.018-0.024,0.033-0.037c1.09-1.142,2.332-2.131,3.696-2.938c0.947-0.554,1.945-1.02,3.005-1.388v-3.124 c-2.095-2.408-3.422-6.89-3.422-11.594C81.944,5.736,87.007,0,93.218,0c6.214,0,11.277,5.736,11.277,12.793 c0,4.628-1.363,9.21-3.422,11.594v3.124c1.047,0.365,2.059,0.828,2.999,1.388c1.354,0.792,2.597,1.784,3.711,2.938 c0.122,0.125,0.177,0.274,0.226,0.429c1.699-1.644,4.025-2.6,6.418-2.6c3.897,0,7.258,2.484,8.531,5.979 c1.93-2.213,4.926-3.559,8.227-3.559c2.539,0,4.944,0.804,6.808,2.231c-0.299-1.839-1.133-4.476-3.154-8.007h-3.8 c-0.244,0-0.499-0.091-0.676-0.268l-2.266-2.113c-0.158-0.162-0.28-0.375-0.311-0.609c-0.012-0.122-0.341-2.975,2.29-5.264 c0.128-0.113,0.286-0.186,0.45-0.225c1.413-0.311,6.126-1.221,7.733,0.024c0.061,0.045,0.122,0.101,0.164,0.158 C138.868,18.562,149.372,31.511,150.444,41.51z"/>
              </svg>
              <span className="sr-only">Groups</span>
            </button>
            <button
              onClick={() => setMuscleGrouping('muscles')}
              title="Muscles"
              aria-label="Muscles"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleGrouping==='muscles'?'bg-blue-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 487.172 487.172" fill="currentColor">
                <path d="M80.147,315.971c-2.072,4.694-4.343,10.061-6.252,14.598c-12.218,29.043-24.851,59.074-72.827,113.241 c-1.556,1.757-1.394,4.443,0.364,6c0.809,0.716,1.814,1.068,2.816,1.068c1.174,0,2.343-0.484,3.183-1.432 c13.106-14.798,23.608-27.821,32.229-39.548c27.358,9.402,35.802,32.988,37.275,37.863c-11.64,8.574-24.554,18.999-39.209,31.98 c-1.757,1.557-1.92,4.242-0.363,5.999c0.84,0.948,2.009,1.433,3.183,1.433c1.002,0,2.008-0.353,2.816-1.068 c54.167-47.977,84.198-60.61,113.242-72.828c4.536-1.908,9.902-4.18,14.597-6.252c49.33-21.776,96.602-42.642,137.241-75.945 c45.114-36.972,78.352-85.822,104.602-153.736c21.52-55.68,38.239-95.378,73.17-138.174c1.484-1.818,1.214-4.496-0.604-5.98 c-1.819-1.484-4.496-1.214-5.98,0.605c-10.308,12.628-19.048,24.967-26.8,37.485c-25.962-9.067-34.761-30.935-36.751-37.047 c12.455-7.724,24.734-16.43,37.301-26.687c1.818-1.484,2.09-4.162,0.605-5.98c-1.484-1.818-4.162-2.089-5.98-0.605 c-42.797,34.931-82.494,51.65-138.174,73.17c-67.914,26.249-116.765,59.487-153.736,104.602 C122.79,219.369,101.924,266.64,80.147,315.971z"/>
                <path d="M298.64,104.485c-59.109,27.002-102.147,60.839-135.44,106.488c-1.383,1.896-0.967,4.555,0.93,5.938 c0.756,0.551,1.632,0.817,2.501,0.817c1.312,0,2.605-0.605,3.437-1.746c32.398-44.423,74.376-77.395,132.105-103.766 c2.135-0.975,3.075-3.497,2.1-5.632C303.297,104.45,300.775,103.51,298.64,104.485z"/>
                <path d="M322.067,259.048c-1.898-1.384-4.556-0.967-5.939,0.929c-32.398,44.423-74.375,77.395-132.104,103.766 c-2.135,0.975-3.075,3.496-2.1,5.632c0.714,1.563,2.256,2.485,3.868,2.485c0.591,0,1.19-0.124,1.764-0.385 c59.109-27.001,102.146-60.839,135.439-106.488C324.38,263.089,323.964,260.43,322.067,259.048z"/>
              </svg>
              <span className="sr-only">Muscles</span>
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setMusclePeriod('weekly')}
              title="Weekly"
              aria-label="Weekly"
              className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='weekly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              wk
            </button>
            <button
              onClick={() => setMusclePeriod('monthly')}
              title="Monthly"
              aria-label="Monthly"
              className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='monthly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              mo
            </button>
            <button
              onClick={() => setMusclePeriod('yearly')}
              title="Yearly"
              aria-label="Yearly"
              className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none ${musclePeriod==='yearly'?'bg-purple-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              yr
            </button>
          </div>

          <div className="bg-black/70 p-0.5 rounded-lg inline-flex gap-0.5 border border-slate-800 shrink-0">
            <button
              onClick={() => setMuscleTrendView('stackedBar')}
              title="Stacked"
              aria-label="Stacked"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleTrendView==='stackedBar'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <ChartColumnStacked className="w-3.5 h-3.5" />
              <span className="sr-only">Stacked</span>
            </button>
            <button
              onClick={() => setMuscleTrendView('area')}
              title="Area"
              aria-label="Area"
              className={`w-5 h-5 flex items-center justify-center rounded ${muscleTrendView==='area'?'bg-emerald-600 text-white':'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              <AreaChartIcon className="w-3.5 h-3.5" />
              <span className="sr-only">Area</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 w-full min-h-[250px] sm:min-h-[320px] transition-all duration-700 delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} min-w-0`}>
        {trendData.length === 0 || trendKeys.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
            Not enough data to render Muscle Analysis trend.
          </div>
        ) : (
          <LazyRender className="w-full" placeholder={<ChartSkeleton style={{ height: 280 }} />}>
            <ResponsiveContainer width="100%" height={280}>
              {muscleTrendView === 'area' ? (
                <AreaChart
                  key={`area-${musclePeriod}-${muscleGrouping}`}
                  data={trendData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle as any} />
                  <Legend wrapperStyle={{ fontSize: '11px', left: '52%', transform: 'translateX(-50%)', position: 'absolute' }} />
                  {trendKeys.map((k) => {
                    let color;
                    if (muscleGrouping === 'groups') {
                      // Use group colors
                      color = (MUSCLE_COLORS as any)[k] || '#94a3b8';
                    } else {
                      // Use individual muscle colors first, fallback to group colors
                      const muscleKey = k.toLowerCase();
                      color = INDIVIDUAL_MUSCLE_COLORS[muscleKey] || 
                              (MUSCLE_COLORS as any)[normalizeMuscleGroup(k)] || 
                              '#94a3b8';
                    }
                    return (
                      <Area
                        key={k}
                        type="monotone"
                        dataKey={k}
                        name={k}
                        stackId="1"
                        stroke={color}
                        fill={color}
                        fillOpacity={0.25}
                        animationDuration={1200}
                      />
                    );
                  })}
                </AreaChart>
              ) : (
                <BarChart
                  key={`bar-${musclePeriod}-${muscleGrouping}`}
                  data={trendData}
                  margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dateFormatted" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle as any} cursor={{ fill: 'rgb(var(--overlay-rgb) / 0.12)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', left: '52%', transform: 'translateX(-50%)', position: 'absolute' }} />
                  {trendKeys.map((k, idx) => {
                    let color;
                    if (muscleGrouping === 'groups') {
                      // Use group colors
                      color = (MUSCLE_COLORS as any)[k] || '#94a3b8';
                    } else {
                      // Use individual muscle colors first, fallback to group colors
                      const muscleKey = k.toLowerCase();
                      color = INDIVIDUAL_MUSCLE_COLORS[muscleKey] || 
                              (MUSCLE_COLORS as any)[normalizeMuscleGroup(k)] || 
                              '#94a3b8';
                    }
                    return (
                      <Bar
                        key={k}
                        dataKey={k}
                        name={k}
                        stackId="1"
                        fill={color}
                        radius={idx === trendKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        animationDuration={1200}
                      />
                    );
                  })}
                </BarChart>
              )}
            </ResponsiveContainer>
          </LazyRender>
        )}
      </div>

      <ChartDescription isMounted={isMounted}>
        <InsightLine>
          {muscleTrendInsight ? (
            <>
              <TrendBadge
                label={
                  <BadgeLabel
                    main={
                      <span className="inline-flex items-center gap-1">
                        <TrendIcon direction={muscleTrendInsight.totalDelta.direction} />
                        <span>{formatSignedPctWithNoun(muscleTrendInsight.totalDelta.deltaPercent, 'sets')}</span>
                      </span>
                    }
                    meta={muscleVsLabel}
                  />
                }
                tone={getTrendBadgeTone(muscleTrendInsight.totalDelta.deltaPercent, { goodWhen: 'up' })}
              />
              {muscleTrendInsight.biggestMover && (
                <TrendBadge
                  label={
                    <BadgeLabel
                      main={
                        <span className="inline-flex items-center gap-1">
                          <TrendIcon
                            direction={
                              muscleTrendInsight.biggestMover.d > 0
                                ? 'up'
                                : muscleTrendInsight.biggestMover.d < 0
                                  ? 'down'
                                  : 'same'
                            }
                          />
                          <span>{muscleTrendInsight.biggestMover.k}</span>
                        </span>
                      }
                      meta={
                        <ShiftedMeta>
                          <span>{`biggest mover: ${formatSigned(muscleTrendInsight.biggestMover.d)} sets`}</span>
                        </ShiftedMeta>
                      }
                    />
                  }
                  tone={
                    muscleTrendInsight.biggestMover.d === 0
                      ? 'neutral'
                      : muscleTrendInsight.biggestMover.d > 0
                        ? 'good'
                        : 'bad'
                  }
                />
              )}
            </>
          ) : (
            <TrendBadge label="Building baseline" tone="neutral" />
          )}
        </InsightLine>
        <p>
          <span className="font-semibold text-slate-300">Weighting:</span>{' '}
          <span className="text-emerald-400 font-semibold">Primary</span>: 1 set,{' '}
          <span className="text-cyan-400 font-semibold">Secondary</span>: 0.5 set. Cardio is ignored. Full Body adds 1 set to every group.
        </p>
        <InsightText text="Use this to spot volume drift. If one area rises while others fade, you are gradually specializing. This can be intentional, or accidental." />
      </ChartDescription>
    </div>
  );
};
