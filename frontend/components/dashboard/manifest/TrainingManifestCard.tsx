import React, { useMemo } from 'react';
import { SegmentControl } from '../../ui/SegmentControl';
import { LogoPressDefs, PaperAgeDefs, StampGrungeDefs, stampAnim, useStamped } from '../../ui/stamp';
import { BodyMap, type BodyMapGender } from '../../bodyMap/BodyMap';
import type { DailySummary, WorkoutSet } from '../../../types';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import { MUSCLE_GROUP_TO_SVG_IDS } from '../../../utils/muscle/mapping/muscleGroupMappings';
import type { ExerciseAsset } from '../../../utils/data/exerciseAssets';
import { computeDailySvgMuscleVolumes } from '../../../utils/muscle/volume/rollingVolumeDaily';
import { toMuscleVolumeMap } from '../../../utils/muscle/volume/muscleVolumeUtils';
import { formatDisplayVolume } from '../../../utils/format/volumeDisplay';
import { convertWeight } from '../../../utils/format/units';
import { stripExerciseSourceLabel } from '../../../utils/exercise/exerciseSourceLabel';
import {
  PERIOD_LABEL,
  fmtDay,
  fmtMinutes,
  useTrainingReceiptData,
  type ReceiptPeriod,
} from '../receipt/useTrainingReceiptData';

interface TrainingManifestCardProps {
  fullData: WorkoutSet[];
  dailyData: DailySummary[];
  weightUnit: WeightUnit;
  effectiveNow: Date;
  assetsMap?: Map<string, ExerciseAsset> | null;
  bodyMapGender?: BodyMapGender;
  secondarySetMultiplier?: number;
  onExerciseClick?: (exerciseName: string) => void;
}

const PAPER = '#F0E5C5';
const INK = '#332B1C';
const STAMP = '#2E3D6B';
const ROUTE = '#232c5d';

const CONDENSED: React.CSSProperties = {
  fontFamily: '"Barlow Condensed", "Oswald", "Arial Narrow", "Helvetica Neue Condensed", sans-serif',
  fontStretch: 'condensed',
};

const MONO: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

/** Round up to a 1/2/5-step so the scale bar always shows a real, human number. */
function niceScale(raw: number): number {
  if (raw <= 0) return 0;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

const GRUNGE = 'url(#mfInk)';

export const TrainingManifestCard: React.FC<TrainingManifestCardProps> = ({
  fullData,
  dailyData,
  weightUnit,
  effectiveNow,
  assetsMap = null,
  bodyMapGender = 'male',
  secondarySetMultiplier = 0.5,
  onExerciseClick,
}) => {
  const { period, setPeriod, receipt } = useTrainingReceiptData(fullData, dailyData, effectiveNow);
  const unitLabel = weightUnit.toUpperCase();
  const { ref: stampRef, hit: stamped } = useStamped();

  const route = useMemo(() => {
    const W = 600;
    const H = 211;
    const padL = 40;
    const padR = 56;
    const padT = 29;
    const base = H - 33;
    const pts = receipt.daySeries;
    const max = receipt.maxDayVolumeKg;
    const coords = pts.map((p, i) => {
      const x = pts.length === 1 ? (W - padR + padL) / 2 : padL + (i * (W - padL - padR)) / (pts.length - 1);
      const y = max > 0 ? base - (p.volumeKg / max) * (base - padT - 6) : base;
      return { ...p, x, y };
    });
    const d = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const active = coords.filter((p) => p.active);
    const peak = active.length > 0 ? active.reduce((a, b) => (b.volumeKg > a.volumeKg ? b : a)) : null;
    const mid = coords[Math.floor(coords.length / 2)];
    const scaleKg = niceScale(max / 4);
    return { W, H, base, coords, d, active, peak, mid, max, scaleKg };
  }, [receipt]);

  const firstActive = route.active[0] ?? null;
  const lastActive = route.active.length > 0 ? route.active[route.active.length - 1] : null;
  const cargo = receipt.lines.slice(0, 3);

  // Bodies follow THIS card's 7d/30d toggle: window-scoped totals via the
  // dashboard's own daily muscle pipeline (proper asset lookup + set-type
  // weighting), keyed by detailed SVG muscle id + headless rollup (the exact
  // key space the weekly card feeds its own map, so group resolution matches).
  const periodVolumes = useMemo(() => {
    const totals = new Map<string, number>();
    if (assetsMap) {
      const startTs = receipt.start.getTime();
      const endTs = receipt.end.getTime();
      for (const day of computeDailySvgMuscleVolumes(fullData, assetsMap, secondarySetMultiplier)) {
        const t = day.date.getTime();
        if (t < startTs || t > endTs) continue;
        for (const [id, v] of day.muscles) totals.set(id, (totals.get(id) ?? 0) + v);
      }
    }
    const headless = toMuscleVolumeMap(totals);
    let max = 0;
    for (const v of headless.values()) max = Math.max(max, v);
    return { totals, headless, max };
  }, [fullData, assetsMap, secondarySetMultiplier, receipt.start, receipt.end]);

  // Manifest duotone as generated CSS: `!important` beats BodyMap's inline
  // fills no matter when *it* repaints, so sibling filters, remounts and
  // async data can never clobber the colors. Untrained groups go transparent
  // (paper shows through); trained groups take darkened-paper umber scaled
  // by share of max.
  const bodyCss = useMemo(() => {
    const { totals, headless, max } = periodVolumes;
    const rules = ['#manifest-bodies svg g[id] path{fill:transparent !important}'];
    const seen = new Set<string>();
    const emit = (id: string, v: number) => {
      if (!id || seen.has(id) || !(v > 0) || !(max > 0)) return;
      seen.add(id);
      const l = Math.round(70 - Math.min(1, v / max) * 48);
      rules.push(`#manifest-bodies #${CSS.escape(id)} path{fill:hsl(36,45%,${l}%) !important}`);
    };
    for (const [id, v] of totals) emit(id, v);
    for (const [id, v] of headless) emit(id, v);
    for (const [group, ids] of Object.entries(MUSCLE_GROUP_TO_SVG_IDS)) {
      let gmax = 0;
      for (const sid of ids) gmax = Math.max(gmax, totals.get(sid) ?? 0);
      emit(group, gmax);
    }
    return rules.join('\n');
  }, [periodVolumes]);

  // Double-hit stamp faces — the ghost copy is the misregistered bounce.
  const loggedFace = (
    <div
      className="flex h-[102px] w-[102px] items-center justify-center rounded-full border-[3px] p-1 text-center sm:h-[205px] sm:w-[205px] sm:border-[6px] sm:p-2"
      style={{ borderColor: STAMP, color: STAMP }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border px-1 sm:border-[3px] sm:px-2" style={{ borderColor: STAMP }}>
        <div className="text-[12px] font-bold leading-none sm:text-[24px]" style={{ letterSpacing: '0.08em' }}>LOGGED</div>
        <div className="mt-1 text-[8px] font-bold leading-none sm:mt-2 sm:text-[16px]">{fmtDay(receipt.lastDate).toUpperCase()}</div>
        <div className="mt-0.5 text-[5px] font-bold leading-none sm:mt-2 sm:text-[10px]">
          {receipt.sessions} {receipt.sessions === 1 ? 'SESSION' : 'SESSIONS'}
        </div>
        <div className="mt-0.5 text-[5px] leading-tight opacity-80 sm:mt-1 sm:text-[10px]">LIFTSHIFT</div>
      </div>
    </div>
  );

  const verifiedFace = (
    <div
      className="rounded-[6px] border-2 px-2.5 py-1 text-center outline outline-1 outline-offset-2 sm:border-[4px] sm:px-5 sm:py-2 sm:outline-2 sm:outline-offset-4"
      style={{ borderColor: STAMP, outlineColor: STAMP, color: STAMP }}
    >
      <div className="text-[13px] font-bold leading-tight whitespace-nowrap sm:text-[30px]" style={{ ...CONDENSED, letterSpacing: '0.06em' }}>
        VOLUME VERIFIED
      </div>
      <div className="mt-0.5 text-[6px] font-medium uppercase leading-tight whitespace-nowrap sm:text-[11px]" style={{ letterSpacing: '0.1em' }}>
        {receipt.sessions} {receipt.sessions === 1 ? 'session' : 'sessions'} · {fmtDay(receipt.lastDate).toUpperCase()} · athlete's log
      </div>
      <div className="mt-0.5 text-[6px] uppercase opacity-80 whitespace-nowrap sm:text-[11px]" style={{ letterSpacing: '0.1em' }}>
        Ref {receipt.no}
      </div>
    </div>
  );

  const statCells: { label: string; value: string; sub?: string }[] = [
    { label: 'Sessions logged', value: String(receipt.sessions) },
    {
      label: `Volume lifted (${unitLabel})`,
      value: formatDisplayVolume(receipt.volumeKg, weightUnit, { round: 'int' }),
    },
    { label: 'Time trained', value: fmtMinutes(receipt.timeMin) },
    { label: 'Record sets', value: String(receipt.prCount) },
  ];

  return (
    <div
      className="h-full overflow-hidden rounded-xl border p-1.5 sm:p-2"
      style={{ backgroundColor: '#8a7f57', borderColor: '#8a7f57' }}
    >
      <div
        ref={stampRef}
        className="relative rounded-[14px] border px-3 pt-2 pb-2 sm:px-4 sm:pt-2.5"
        style={{ backgroundColor: PAPER, borderColor: INK, color: INK, ...MONO, filter: 'url(#mfPaperAge)' }}
      >
        <StampGrungeDefs id="mfInk" seed={7} />
        <PaperAgeDefs id="mfPaperAge" />
        {/* paper grain + age blotches + vignette + hairline frame */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(51,43,28,0.08) 0px, rgba(51,43,28,0.08) 1px, transparent 1px, transparent 4px)',
            mixBlendMode: 'multiply',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(220px 160px at 10% 6%, rgba(51,43,28,0.12), transparent 70%), radial-gradient(280px 210px at 90% 94%, rgba(51,43,28,0.14), transparent 70%), radial-gradient(160px 120px at 78% 30%, rgba(51,43,28,0.07), transparent 70%)',
            mixBlendMode: 'multiply',
          }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 46px rgba(51,43,28,0.22)' }} />
        <div className="pointer-events-none absolute inset-1.5 rounded-[10px] border opacity-60" style={{ borderColor: INK }} />

        <div className="relative">
          {/* ——— Header ——— */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <LogoPressDefs id="mfLogoPress" />
              <div className="text-[22px] sm:text-[26px] font-bold leading-none tracking-tight" style={{ ...CONDENSED, filter: 'url(#mfLogoPress)' }}>
                LIFTSHIFT
              </div>
              <div className="mt-0.5 text-[16px] sm:text-[18px] font-semibold leading-none" style={CONDENSED}>
                TRAINING MANIFEST
              </div>
              <div className="mt-1 text-[9px] sm:text-[10px] uppercase opacity-60" style={{ letterSpacing: '0.16em' }}>
                {PERIOD_LABEL[period]} · {receipt.sessions} {receipt.sessions === 1 ? 'SESSION' : 'SESSIONS'} ·{' '}
                {fmtDay(receipt.start).slice(0, 6)} – {fmtDay(receipt.end)}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <SegmentControl
                tone="paper"
                options={[
                  { value: '7d', label: 'lst wk', title: 'Last 7 days' },
                  { value: '30d', label: 'lst mo', title: 'Last 30 days' },
                ]}
                value={period}
                onChange={(v) => setPeriod(v as ReceiptPeriod)}
              />
            </div>
          </div>

          <div className="relative mt-1 text-[10px] sm:text-[11px]">
            <div className="rotate-[0.3deg]">
              <span className="opacity-55">MANIFEST NO&nbsp;&nbsp;</span>
              <span className="font-bold">{receipt.no}</span>
              <span className="opacity-55">&nbsp;&nbsp;SOURCE&nbsp;&nbsp;</span>
              <span className="font-bold">{receipt.sourceLabel}</span>
            </div>
            {/* date stamp slammed over the manifest line, like the PNG */}
            <div
              className="absolute -top-2 right-0 z-10 whitespace-nowrap px-2 py-[2px] sm:-top-4 sm:px-4"
              style={{
                color: STAMP,
                mixBlendMode: 'multiply',
                filter: GRUNGE,
                ...stampAnim(stamped, { rotate: -6, opacity: 0.92 }, 0),
              }}
            >
              <div className="border-y-2 px-1 py-[2px] sm:border-y-4" style={{ borderColor: STAMP }}>
                <div className="border px-1.5 py-0.5 text-[13px] font-bold leading-none sm:border-y-2 sm:px-2.5 sm:py-1 sm:text-[26px]" style={{ borderColor: STAMP, letterSpacing: '0.1em' }}>
                  {fmtDay(receipt.lastDate).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-1 border-t-2" style={{ borderColor: INK }} />

          {/* ——— Stat grid — real aggregates only ——— */}
          <div className="mt-1 grid rotate-[0.5deg] grid-cols-2 sm:grid-cols-4 border-[1.5px]" style={{ borderColor: INK }}>
            {statCells.map((c, i) => (
              <div
                key={c.label}
                className={`p-1 ${i % 2 === 1 ? 'border-l-[1.5px]' : ''} ${
                  i >= 2 ? 'border-t-[1.5px] sm:border-t-0' : ''
                } ${i > 0 ? 'sm:border-l-[1.5px]' : ''}`}
                style={{ borderColor: INK }}
              >
                <div className="text-[9px] uppercase opacity-55" style={{ letterSpacing: '0.18em' }}>{c.label}</div>
                <div className="mt-0.5 text-[14px] sm:text-[16px] font-bold leading-tight" style={CONDENSED}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>
          {receipt.bestLift && (
            <div className="mt-0.5 text-[10px] sm:text-[11px] uppercase" style={{ letterSpacing: '0.1em' }}>
              <span className="opacity-55">Heaviest lift&nbsp;&nbsp;</span>
              <button
                onClick={() => onExerciseClick?.(receipt.bestLift!.name)}
                className="font-bold hover:underline cursor-pointer"
              >
                {stripExerciseSourceLabel(receipt.bestLift.name).toUpperCase()}
              </button>
              <span className="font-bold">
                {' '}
                · {convertWeight(receipt.bestLift.weightKg, weightUnit)} {unitLabel} × {receipt.bestLift.reps}
              </span>
            </div>
          )}

          {/* ——— Volume voyage — one point per real training day ——— */}
          <div className="mt-1.5 -rotate-[0.4deg] border-[1.5px] p-1.5" style={{ borderColor: INK }}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[14px] sm:text-[16px] font-semibold tracking-tight" style={CONDENSED}>
                VOLUME VOYAGE
              </div>
              <div className="text-[9px] sm:text-[10px] uppercase opacity-60" style={{ letterSpacing: '0.14em' }}>
                {formatDisplayVolume(receipt.volumeKg, weightUnit, { round: 'int' })} {unitLabel} · {receipt.sets} SETS
              </div>
            </div>
            <div className="mt-0.5 border-t-[1.5px]" style={{ borderColor: INK }} />

            <div className="relative">
              <svg viewBox={`0 0 ${route.W} ${route.H}`} className="block h-[130px] w-full sm:h-[144px]">
                {[46, 94, 142].map((y) => (
                  <line key={y} x1={40} x2={544} y1={y} y2={y} stroke={INK} strokeOpacity={0.22} strokeWidth={1} />
                ))}
                {route.coords.map((p) => (
                  <line key={p.key} x1={p.x} x2={p.x} y1={22} y2={route.base} stroke={INK} strokeOpacity={0.14} strokeWidth={1} />
                ))}
                {/* rest baseline */}
                <line x1={40} x2={544} y1={route.base} y2={route.base} stroke={INK} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="6 5" />
                <text x={4} y={route.base + 3} fontSize={9} fill={INK} opacity={0.55} style={MONO}>REST</text>

                {/* volume axis — real scale */}
                <text x={548} y={36} fontSize={9} fill={INK} opacity={0.6} style={MONO}>
                  {formatDisplayVolume(route.max, weightUnit, { round: 'int' })}
                </text>
                <text x={548} y={98} fontSize={9} fill={INK} opacity={0.6} style={MONO}>
                  {formatDisplayVolume(route.max / 2, weightUnit, { round: 'int' })}
                </text>
                <text x={548} y={route.base + 3} fontSize={9} fill={INK} opacity={0.6} style={MONO}>0</text>

                {/* route */}
                <path d={route.d} fill="none" stroke={ROUTE} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />

                {/* training-day stops */}
                {route.coords.map((p) =>
                  p.active ? (
                    <g key={`stop-${p.key}`}>
                      <circle cx={p.x} cy={p.y} r={p.key === route.peak?.key ? 9 : 6.5} fill={PAPER} stroke={ROUTE} strokeWidth={2.4} />
                      <circle cx={p.x} cy={p.y} r={2.2} fill={ROUTE} />
                    </g>
                  ) : null,
                )}
                {/* labels: first / peak / last training day */}
                {[
                  firstActive && { p: firstActive, tag: 'FIRST' },
                  route.peak && route.peak.key !== firstActive?.key && route.peak.key !== lastActive?.key
                    ? { p: route.peak, tag: 'PEAK' }
                    : null,
                  lastActive && lastActive.key !== firstActive?.key ? { p: lastActive, tag: 'LAST' } : null,
                ].map(
                  (entry) =>
                    entry && (
                      <text
                        key={`lbl-${entry.p.key}`}
                        x={entry.p.x}
                        y={entry.p.y - 14}
                        fontSize={10}
                        fontWeight={700}
                        fill={ROUTE}
                        textAnchor="middle"
                        style={MONO}
                      >
                        {entry.p.dayNum} · {entry.tag}
                      </text>
                    ),
                )}
                {/* mid totals label */}
                {receipt.sets > 0 && (
                  <>
                    <text x={route.mid.x - 52} y={Math.max(route.mid.y - 26, 12)} fontSize={11} fontWeight={700} fill={ROUTE} style={MONO}>
                      {formatDisplayVolume(receipt.volumeKg, weightUnit, { round: 'int' })} {unitLabel}
                    </text>
                    <text x={route.mid.x - 52} y={Math.max(route.mid.y - 14, 24)} fontSize={9} fill={ROUTE} opacity={0.75} style={MONO}>
                      {receipt.sets} SETS LOGGED
                    </text>
                  </>
                )}
                {/* dynamic scale bar — real value */}
                {route.scaleKg > 0 && (
                  <>
                    <g stroke={INK} opacity={0.7}>
                      <line x1={452} y1={194} x2={522} y2={194} strokeWidth={1.2} />
                      <line x1={452} y1={190} x2={452} y2={198} strokeWidth={1.2} />
                      <line x1={522} y1={190} x2={522} y2={198} strokeWidth={1.2} />
                    </g>
                    <text x={452} y={185} fontSize={9} fill={INK} opacity={0.7} style={MONO}>
                      {formatDisplayVolume(route.scaleKg, weightUnit, { round: 'int' })} {unitLabel}
                    </text>
                  </>
                )}
              </svg>

              {/* LOGGED stamp — real date + session count, bleeding past the frame */}
              <div
                className="absolute -bottom-8 -left-4 z-10 sm:-bottom-16 sm:-left-8"
                style={{ mixBlendMode: 'multiply', filter: GRUNGE, ...stampAnim(stamped, { rotate: -12, opacity: 0.88 }, 150) }}
              >
                <div className="relative">
                  {loggedFace}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ transform: 'translate(2.5px, -2px)', opacity: 0.32 }}>
                    {loggedFace}
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 right-[3%] z-[5] w-[92px]" id="manifest-bodies">
                <style>{bodyCss}</style>
                <div className="text-[9px] uppercase opacity-60" style={{ letterSpacing: '0.18em' }}>Muscles · /wk</div>
                <div className="flex h-[92px] items-center justify-center overflow-hidden">
                  <BodyMap
                    onPartClick={() => {}}
                    selectedPart={null}
                    muscleVolumes={periodVolumes.headless}
                    maxVolume={Math.max(1, periodVolumes.max)}
                    compact
                    compactFill
                    gender={bodyMapGender}
                    stroke={{ width: 5, color: '#332B1C', opacity: 0.85 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ——— Top lifts — ranked by real volume ——— */}
          <div className="mt-2.5 flex rotate-[0.25deg] items-baseline justify-between gap-2">
            <div className="text-[15px] sm:text-[17px] font-semibold tracking-tight" style={CONDENSED}>TOP LIFTS</div>
            <div className="text-[9px] sm:text-[10px] uppercase opacity-60" style={{ letterSpacing: '0.14em' }}>
              Ranked by volume
            </div>
          </div>
          <div className="border-t-2" style={{ borderColor: INK }} />

          <div className="relative">
            <div
              className="grid grid-cols-[28px_1fr_72px] gap-x-2 border-b-[1.5px] py-0.5 text-[9px] sm:text-[10px] uppercase opacity-60"
              style={{ borderColor: INK, letterSpacing: '0.16em' }}
            >
              <span>No</span>
              <span>Exercise · Sets × Reps</span>
              <span className="text-right">Volume</span>
            </div>
            {cargo.length === 0 ? (
              <div
                className="border-b border-dashed py-3 text-center text-[10px] uppercase opacity-60"
                style={{ borderColor: INK, letterSpacing: '0.16em' }}
              >
                Hold is empty — log a session to fill it
              </div>
            ) : (
              cargo.map((l, i) => (
                <div
                  key={l.name}
                  className={`grid grid-cols-[28px_1fr_72px] gap-x-2 border-b border-dotted py-0.5 text-[10px] sm:text-[11px] ${
                    i % 2 === 0 ? 'rotate-[0.3deg]' : '-rotate-[0.25deg]'
                  }`}
                  style={{ borderColor: INK }}
                >
                  <span className="opacity-55">0{i + 1}</span>
                  <span className="min-w-0">
                    <button
                      onClick={() => onExerciseClick?.(l.name)}
                      className="font-bold uppercase hover:underline cursor-pointer"
                      style={{ letterSpacing: '0.04em' }}
                    >
                      {stripExerciseSourceLabel(l.name)}
                    </button>
                    <span className="opacity-60">
                      {' '}
                      · {l.sets}×{l.reps} @ {convertWeight(l.avgKg, weightUnit)} {unitLabel}
                    </span>
                  </span>
                  <span className="text-right font-bold">
                    {formatDisplayVolume(l.volumeKg, weightUnit, { round: 'int' })}
                  </span>
                </div>
              ))
            )}

            {/* VOLUME VERIFIED stamp — real counts, hanging off the table edge */}
            <div
              className="pointer-events-none absolute right-[-8px] top-1/2 z-10 max-w-[98%]"
              style={{ mixBlendMode: 'multiply', filter: GRUNGE, ...stampAnim(stamped, { rotate: -7, opacity: 0.92, y: 'translateY(-50%)' }, 320) }}
            >
              <div className="relative">
                {verifiedFace}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ transform: 'translate(2.5px, -2px)', opacity: 0.32 }}>
                  {verifiedFace}
                </div>
              </div>
            </div>
          </div>

          {/* ——— Footer — real totals ——— */}
          <div className="mt-1 text-[7.5px] sm:text-[8px] uppercase leading-relaxed opacity-55" style={{ letterSpacing: '0.12em' }}>
            Issued {fmtDay(receipt.lastDate).toUpperCase()} · {receipt.sets.toLocaleString()} sets ·{' '}
            {receipt.reps.toLocaleString()} reps · {formatDisplayVolume(receipt.volumeKg, weightUnit, { round: 'int' })}{' '}
            {unitLabel} lifted
          </div>
          <div className="pb-0.5 text-center text-[10px] font-semibold opacity-50" style={{ letterSpacing: '0.08em' }}>
            LiftShift.app
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingManifestCard;
