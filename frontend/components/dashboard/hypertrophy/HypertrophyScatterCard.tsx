import React, { useMemo } from 'react';
import {
  ScatterChart as ReScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from 'recharts';
import { Reveal } from '../../ui/Reveal';
import { SegmentControl } from '../../ui/SegmentControl';
import { SEMI_FANCY_FONT } from '../../../utils/ui/uiConstants';
import {
  FACTOR_WEIGHTS,
  type MuscleHypertrophyData,
} from '../../../utils/muscle/hypertrophy/hypertrophyScore';

const PROGRESS_MID = 20;
const VOLUME_MID = 25;

const SCORE_COLORS = ['#ef4444', '#f59e0b', '#22c55e'] as const;

const getDotColor = (total: number) => {
  if (total <= 30) return SCORE_COLORS[0];
  if (total <= 60) return SCORE_COLORS[1];
  return SCORE_COLORS[2];
};

const volColor = (v: number) => (v <= 15 ? '#ef4444' : v <= 35 ? '#f59e0b' : '#22c55e');
const progColor = (v: number) => (v <= 11 ? '#ef4444' : v <= 22 ? '#f59e0b' : '#22c55e');

interface ChartPoint {
  name: string;
  muscleId: string;
  progress: number;
  volume: number;
  total: number;
  quadrant: string;
  weeklySets: number;
  oneRMTrend: number;
  daysPerWeek: number;
}

interface HypertrophyScatterCardProps {
  hypertrophyData: MuscleHypertrophyData[];
  hypertrophyPeriod: '7d' | '30d';
  setHypertrophyPeriod: (v: '7d' | '30d') => void;
}

function getQuadrant(progress: number, volume: number): string {
  if (volume >= VOLUME_MID && progress < PROGRESS_MID) return 'Volume Focus';
  if (volume >= VOLUME_MID && progress >= PROGRESS_MID) return 'Optimal Growth';
  if (volume < VOLUME_MID && progress < PROGRESS_MID) return 'Neglected';
  return 'Efficiency Zone';
}

const LABEL_OFFSET_PX = 12;
const TEXT_ANCHOR_THRESHOLD = 0.4;
const AXIS_RATIO = 1.2;

// Physics simulation tunables
const PHYS_ANCHOR_K = 0.2      // attraction strength to own dot
const PHYS_MIN_OFFSET = 0.4    // minimum distance from own dot
const PHYS_REPEL_K = 1.2        // label-label repulsion strength
const PHYS_REPEL_RADIUS = 10    // repulsion range (data units)
const PHYS_DOT_K = 0.7         // dot repulsion strength
const PHYS_EDGE_K = 0.4        // edge push strength
const PHYS_EDGE_MARGIN = 2     // edge margin (data units)
const PHYS_QUAD_K = 0.3        // quadrant label push strength
const PHYS_QUAD_RADIUS = 10    // quadrant repulsion range (data units)
const PHYS_DAMPING = 0.5       // velocity damping
const PHYS_ITERS = 5          // simulation iterations
const PHYS_SCALE = 2.5         // data units per offset unit
const PHYS_MAX_OFFSET = 3      // max offset multiplier (clamp)
const PHYS_FORCE_CLAMP = 5     // max force per axis (prevents explosion)

const CustomScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d: ChartPoint | undefined = payload[0]?.payload;
  if (!d) return null;

  const sets = (d.weeklySets ?? 0).toFixed(1);
  const trend = `${(d.oneRMTrend ?? 0) > 0 ? '+' : ''}${(d.oneRMTrend ?? 0).toFixed(1)}%`;
  const vc = volColor(d.volume);
  const pc = progColor(d.progress);

  const quadrantAdvice: Record<string, { desc: React.ReactNode; advice: string }> = {
    'Volume Focus': {
      desc: (
        <>
          High volume (<span style={{ color: vc }}>{sets} sets/wk</span>) but lagging strength progress (<span style={{ color: pc }}>{trend}</span>)
        </>
      ),
      advice: 'Focus on progressive overload, add weight or reps slowly',
    },
    'Optimal Growth': {
      desc: (
        <>
          High volume (<span style={{ color: vc }}>{sets} sets/wk</span>) + strong progress (<span style={{ color: pc }}>{trend}</span>)
        </>
      ),
      advice: 'Keep it up! this balance is ideal for hypertrophy',
    },
    'Neglected': {
      desc: (
        <>
          Low volume (<span style={{ color: vc }}>{sets} sets/wk</span>) + low progress (<span style={{ color: pc }}>{trend}</span>)
        </>
      ),
      advice: 'If prioritizing this muscle, add sets and train 2-3x/week',
    },
    'Efficiency Zone': {
      desc: (
        <>
          Strong progress (<span style={{ color: pc }}>{trend}</span>) despite low volume (<span style={{ color: vc }}>{sets} sets/wk</span>)
        </>
      ),
      advice: 'Consider increasing volume for more size gains',
    },
  };

  const q = quadrantAdvice[d.quadrant];
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-2xl border text-xs"
      style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.95)', borderColor: 'rgb(var(--border-rgb) / 0.5)', color: 'var(--text-primary)' }}
    >
      <p className="font-semibold mb-1.5" style={SEMI_FANCY_FONT}>
        {d.name} <span className="opacity-60 font-normal">({d.total}/100)</span>
      </p>
      <div className="flex items-center gap-3 mb-1.5">
        <span>
          Progress <b style={{ color: progColor(d.progress) }}>{d.progress}/40</b>
        </span>
        <span>
          Volume <b style={{ color: volColor(d.volume) }}>{d.volume}/50</b>
        </span>
      </div>
      <div className="border-t pt-1.5 text-slate-400" style={{ borderColor: 'rgb(var(--border-rgb) / 0.3)' }}>
        <p className="font-semibold text-[10px] sm:text-xs">{d.quadrant}</p>
        <p className="text-[9px] sm:text-[10px] leading-tight mt-0.5">{q.desc}</p>
        <p className="text-[8px] sm:text-[10px] mt-1">{q.advice}</p>
      </div>
    </div>
  );
};

export const HypertrophyScatterCard: React.FC<HypertrophyScatterCardProps> = ({
  hypertrophyData,
  hypertrophyPeriod,
  setHypertrophyPeriod,
}) => {
  const chartData: ChartPoint[] = useMemo(
    () =>
      hypertrophyData.map((m) => {
        const progress = Number.isFinite(m.score.progressiveOverload) ? Math.round(m.score.progressiveOverload) : 0;
        const volume = Number.isFinite(m.score.volumeScore) ? Math.round(m.score.volumeScore * FACTOR_WEIGHTS.volumeScore) : 0;
        return {
          name: m.muscleName,
          muscleId: m.muscleId,
          progress,
          volume,
          total: Number.isFinite(m.score.totalScore) ? m.score.totalScore : 0,
          quadrant: getQuadrant(progress, volume),
          weeklySets: Number.isFinite(m.score.raw?.weeklySets) ? m.score.raw.weeklySets : 0,
          oneRMTrend: Number.isFinite(m.score.raw?.oneRMTrend) ? m.score.raw.oneRMTrend : 0,
          daysPerWeek: Number.isFinite(m.score.raw?.daysPerWeek) ? m.score.raw.daysPerWeek : 0,
        };
      }),
    [hypertrophyData]
  );

  const labelDirs = useMemo(() => {
    const dirs = new Map<string, { dx: number; dy: number; dist: number }>();
    const pts = chartData;
    if (pts.length === 0) return dirs;

    // Quadrant label centers (data space) for repulsion
    const quadCenters = [
      { x: VOLUME_MID / 2, y: PROGRESS_MID / 2 },
      { x: VOLUME_MID + (50 - VOLUME_MID) / 2, y: PROGRESS_MID / 2 },
      { x: VOLUME_MID / 2, y: PROGRESS_MID + (40 - PROGRESS_MID) / 2 },
      { x: VOLUME_MID + (50 - VOLUME_MID) / 2, y: PROGRESS_MID + (40 - PROGRESS_MID) / 2 },
    ];

    // Physics state: offset from anchor (1 unit ≈ 2.5 data units ≈ 12px)
    const ox = new Map<string, number>();
    const oy = new Map<string, number>();
    const vx = new Map<string, number>();
    const vy = new Map<string, number>();

    // Initialize directions pointing away from data centroid
    // (prevents labels from crossing over to wrong dots)
    const cx = pts.reduce((s, p) => s + p.volume, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.progress, 0) / pts.length;
    pts.forEach((p, i) => {
      let dx = p.volume - cx;
      let dy = p.progress - cy;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) { dx /= len; dy /= len; }
      else { const a = (2 * Math.PI * i) / pts.length; dx = Math.cos(a); dy = Math.sin(a); }
      ox.set(p.muscleId, dx);
      oy.set(p.muscleId, dy);
      vx.set(p.muscleId, 0);
      vy.set(p.muscleId, 0);
    });

    for (let iter = 0; iter < PHYS_ITERS; iter++) {
      for (const p of pts) {
        const id = p.muscleId;
        let fx = 0, fy = 0;

        // 1. Spring toward anchor (inverse outward + linear inward)
        const pd = Math.hypot(ox.get(id)!, oy.get(id)!);
        if (pd > 0.001) {
          const pnx = ox.get(id)! / pd;
          const pny = oy.get(id)! / pd;
          if (pd < PHYS_MIN_OFFSET) {
            const clamped = Math.max(pd, 0.01);
            const f = Math.min(PHYS_ANCHOR_K * (PHYS_MIN_OFFSET / clamped - 1), PHYS_FORCE_CLAMP);
            fx += pnx * f;
            fy += pny * f;
          } else {
            const deviation = pd - PHYS_MIN_OFFSET;
            fx += -PHYS_ANCHOR_K * deviation * pnx;
            fy += -PHYS_ANCHOR_K * deviation * pny;
          }
        }

        // Label position in data space
        const lx = p.volume + ox.get(id)! * PHYS_SCALE;
        const ly = p.progress + oy.get(id)! * PHYS_SCALE;

        // 2. Label-label repulsion (inverse: →∞ as d→0)
        for (const q of pts) {
          if (q.muscleId === id) continue;
          const qlx = q.volume + ox.get(q.muscleId)! * PHYS_SCALE;
          const qly = q.progress + oy.get(q.muscleId)! * PHYS_SCALE;
          const dx = (lx - qlx) * AXIS_RATIO;
          const dy = ly - qly;
          const d = Math.hypot(dx, dy);
          if (d < PHYS_REPEL_RADIUS && d > 0.001) {
            const clamped = Math.max(d, 0.05);
            const f = Math.min(PHYS_REPEL_K * (PHYS_REPEL_RADIUS / clamped - 1), PHYS_FORCE_CLAMP);
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
        }

        // 3. Dot repulsion (inverse: prevents labels sitting on other dots)
        for (const q of pts) {
          if (q.muscleId === id) continue;
          const dot_dx = (lx - q.volume) * AXIS_RATIO;
          const dot_dy = ly - q.progress;
          const dot_d = Math.hypot(dot_dx, dot_dy);
          if (dot_d < PHYS_REPEL_RADIUS && dot_d > 0.001) {
            const clamped = Math.max(dot_d, 0.05);
            const f = Math.min(PHYS_DOT_K * (PHYS_REPEL_RADIUS / clamped - 1), PHYS_FORCE_CLAMP);
            fx += (dot_dx / dot_d) * f;
            fy += (dot_dy / dot_d) * f;
          }
        }

        // 4. Edge repulsion (inverse within margin, max force when past edge)
        if (lx < 0) {
          fx += PHYS_FORCE_CLAMP;
        } else if (lx < PHYS_EDGE_MARGIN) {
          const clamped = Math.max(PHYS_EDGE_MARGIN - lx, 0.01);
          fx += Math.min(PHYS_EDGE_K * (PHYS_EDGE_MARGIN / clamped - 1), PHYS_FORCE_CLAMP);
        } else if (lx > 50) {
          fx -= PHYS_FORCE_CLAMP;
        } else if (lx > 50 - PHYS_EDGE_MARGIN) {
          const clamped = Math.max(lx - (50 - PHYS_EDGE_MARGIN), 0.01);
          fx -= Math.min(PHYS_EDGE_K * (PHYS_EDGE_MARGIN / clamped - 1), PHYS_FORCE_CLAMP);
        }
        if (ly < 0) {
          fy += PHYS_FORCE_CLAMP;
        } else if (ly < PHYS_EDGE_MARGIN) {
          const clamped = Math.max(PHYS_EDGE_MARGIN - ly, 0.01);
          fy += Math.min(PHYS_EDGE_K * (PHYS_EDGE_MARGIN / clamped - 1), PHYS_FORCE_CLAMP);
        } else if (ly > 40) {
          fy -= PHYS_FORCE_CLAMP;
        } else if (ly > 40 - PHYS_EDGE_MARGIN) {
          const clamped = Math.max(ly - (40 - PHYS_EDGE_MARGIN), 0.01);
          fy -= Math.min(PHYS_EDGE_K * (PHYS_EDGE_MARGIN / clamped - 1), PHYS_FORCE_CLAMP);
        }

        // 5. Quadrant label repulsion (inverse)
        for (const qc of quadCenters) {
          const qdx = (lx - qc.x) * AXIS_RATIO;
          const qdy = ly - qc.y;
          const qd = Math.hypot(qdx, qdy);
          if (qd < PHYS_QUAD_RADIUS && qd > 0.001) {
            const clamped = Math.max(qd, 0.05);
            const f = Math.min(PHYS_QUAD_K * (PHYS_QUAD_RADIUS / clamped - 1), PHYS_FORCE_CLAMP);
            fx += (qdx / qd) * f;
            fy += (qdy / qd) * f;
          }
        }

        vx.set(id, (vx.get(id)! + fx) * PHYS_DAMPING);
        vy.set(id, (vy.get(id)! + fy) * PHYS_DAMPING);
        ox.set(id, ox.get(id)! + vx.get(id)!);
        oy.set(id, oy.get(id)! + vy.get(id)!);

        if (!Number.isFinite(ox.get(id)!)) ox.set(id, 0);
        if (!Number.isFinite(oy.get(id)!)) oy.set(id, 0);
      }
    }

    for (const p of pts) {
      const id = p.muscleId;
      let oox = ox.get(id)!, ooy = oy.get(id)!;

      // Clamp label position to stay within chart data bounds (prevents clipping)
      const labelX = p.volume + oox * PHYS_SCALE;
      const labelY = p.progress + ooy * PHYS_SCALE;
      const BOUNDS_PADDING = 1.5;
      const clampedX = Math.max(BOUNDS_PADDING, Math.min(50 - BOUNDS_PADDING, labelX));
      const clampedY = Math.max(BOUNDS_PADDING, Math.min(40 - BOUNDS_PADDING, labelY));
      oox = (clampedX - p.volume) / PHYS_SCALE;
      ooy = (clampedY - p.progress) / PHYS_SCALE;

      const dist = Math.hypot(oox, ooy);
      if (dist > 0.01) {
        dirs.set(id, { dx: oox / dist, dy: ooy / dist, dist: Math.min(dist, PHYS_MAX_OFFSET) });
      } else {
        dirs.set(id, { dx: 0, dy: -1, dist: 1 });
      }
    }

    return dirs;
  }, [chartData]);



  return (
    <Reveal className="bg-black/20 rounded-xl border border-slate-700/50 overflow-hidden min-h-[450px] sm:min-h-[650px] lg:min-h-0 lg:h-full flex flex-col" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      <div className="p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-lg font-semibold text-white">Hypertrophy Scatter Plot</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Progress vs Volume per muscle</p>
          </div>
          <SegmentControl
            dataTrack="timerange-hypertrophy-scatter"
            options={[
              { value: '7d', label: 'lst wk', title: 'Last 7 days' },
              { value: '30d', label: 'lst mo', title: 'Last 30 days' },
            ]}
            value={hypertrophyPeriod}
            onChange={(v) => setHypertrophyPeriod(v as '7d' | '30d')}
          />
        </div>
      </div>

      <div className="flex-1 w-full relative" style={{ minHeight: 300 }}>
        {hypertrophyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
              <ReScatterChart margin={{ top: 28, right: 8, bottom: 28, left: 0 }}>
              <XAxis
                type="number"
                dataKey="volume"
                domain={[0, 50]}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                label={{ value: 'Volume Score (0–50)', position: 'bottom', offset: 5, fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                type="number"
                dataKey="progress"
                domain={[0, 40]}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                width={28}
                label={{ value: 'Progressive Overload (0–40)', angle: 0, position: 'insideTop', offset: -18, dx: +60, fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />

              <ReferenceArea
                x1={0}
                x2={VOLUME_MID}
                y1={0}
                y2={PROGRESS_MID}
                fill="rgba(239,68,68,0.12)"
                label={{ value: 'Neglected', position: 'center', fill: '#ef4444', fontSize: 11, fontWeight: 600, opacity: 0.3 }}
              />
              <ReferenceArea
                x1={VOLUME_MID}
                x2={50}
                y1={0}
                y2={PROGRESS_MID}
                fill="rgba(245,158,11,0.12)"
                label={{ value: 'Volume Focus', position: 'center', fill: '#f59e0b', fontSize: 11, fontWeight: 600, opacity: 0.3 }}
              />
              <ReferenceArea
                x1={0}
                x2={VOLUME_MID}
                y1={PROGRESS_MID}
                y2={40}
                fill="rgba(59,130,246,0.12)"
                label={{ value: 'Efficiency Zone', position: 'center', fill: '#3b82f6', fontSize: 11, fontWeight: 600, opacity: 0.3 }}
              />
              <ReferenceArea
                x1={VOLUME_MID}
                x2={50}
                y1={PROGRESS_MID}
                y2={40}
                fill="rgba(34,197,94,0.12)"
                label={{ value: 'Optimal Growth', position: 'center', fill: '#22c55e', fontSize: 11, fontWeight: 600, opacity: 0.3 }}
              />

              <RechartsTooltip cursor={false} content={<CustomScatterTooltip />} />

              <Scatter
                data={chartData}
                animationDuration={1000} animationEasing="ease-out"
                shape={({ cx, cy, fill }: any) =>
                  cx != null && cy != null ? (
                    <>
                      <circle cx={cx} cy={cy} r={14} fill="transparent" stroke="none" style={{ cursor: 'crosshair' }} />
                      <circle cx={cx} cy={cy} r={3} fill={fill} fillOpacity={0.3} stroke="none" pointerEvents="none" />
                    </>
                  ) : null
                }
              >
                {chartData.map((entry) => (
                  <Cell key={entry.muscleId} fill={getDotColor(entry.total)} />
                ))}
              </Scatter>

              <Scatter
                data={chartData}
                animationDuration={1000} animationEasing="ease-out"
                legendType="none"
                shape={({ cx, cy, payload }: any) => {
                  if (cx == null || cy == null || !payload) return null;
                  const dir = labelDirs.get(payload.muscleId) ?? { dx: 0, dy: -1, dist: 1 };
                  const lx = cx + dir.dx * LABEL_OFFSET_PX * dir.dist;
                  const ly = cy - dir.dy * LABEL_OFFSET_PX * dir.dist;
                  const anchor = dir.dx > TEXT_ANCHOR_THRESHOLD ? 'start' : dir.dx < -TEXT_ANCHOR_THRESHOLD ? 'end' : 'middle';
                  
                  const dist = Math.hypot(lx - cx, ly - cy);
                  return (
                    <>
                      {dist > 12 && (
                        <line
                          x1={cx}
                          y1={cy}
                          x2={lx}
                          y2={ly}
                          stroke="#7f7b7b"
                          strokeWidth={0.5}
                          strokeOpacity={0.4}
                          strokeDasharray="2 2"
                        />
                      )}
                      <text
                        x={lx}
                        y={ly}
                        dy="0.32em"
                        textAnchor={anchor}
                        fontSize={10}
                        fill="#7f7b7b"
                        fontWeight={600}
                        fontFamily={'"Lora", serif'}
                        fontStyle="italic"
                        style={{ cursor: 'crosshair' }}
                      >
                        {payload.name}
                      </text>
                    </>
                  );
                }}
              />
            </ReScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-[10px] sm:text-xs text-slate-500 py-4 text-center">No muscle data available.</div>
        )}
      </div>
    </Reveal>
  );
};