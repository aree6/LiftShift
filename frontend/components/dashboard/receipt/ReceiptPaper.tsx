import React from 'react';
import { Coffee } from 'lucide-react';
import { assetPath } from '../../../constants';
import { LogoPressDefs } from '../../ui/stamp';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import { formatDisplayVolume } from '../../../utils/format/volumeDisplay';
import { convertWeight } from '../../../utils/format/units';
import { stripExerciseSourceLabel } from '../../../utils/exercise/exerciseSourceLabel';
import { PERIOD_LABEL, fmtDay, fmtMinutes, type TrainingReceipt } from './useTrainingReceiptData';

interface ReceiptPaperProps {
  receipt: TrainingReceipt;
  weightUnit: WeightUnit;
  streakWeeks?: number;
  maxLines?: number;
  /** 'torn' = narrow receipt with zigzag edges; 'straight' = full-bleed ledger sheet. */
  edges?: 'torn' | 'straight';
  /** 'receipt' = full sheet with line table; 'ledger' = slim lifetime panel (no line table, no source, plus per-session ratios). */
  variant?: 'receipt' | 'ledger';
  /** Ledger-only flourishes (flag history, flagship lift, longest voyage, home port, remark). */
  ledgerExtras?: LedgerExtras | null;
  onExerciseClick?: (exerciseName: string) => void;
  coffeeUrl?: string;
}

export const DEFAULT_COFFEE_URL = 'https://www.buymeacoffee.com/aree6';
const PAPER = '#F0E5C5';
const INK = '#332B1C';

/** Zero-plumbing ledger flourishes, computed by the host panel from fullData/dailyData. */
export interface LedgerExtras {
  daysAtSea: number;
  distinctExercises: number;
  flagship: { name: string; sessions: number } | null;
  longest: { minutes: number; title: string } | null;
  homePort: { day: string; count: number } | null;
  remark?: string;
}

const MONO: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

/** Per-line wonk: rotation, indent, ink strength. */
const LINE_TILT = [-1.3, 0.9, -0.6, 1.2, -1.0];
const LINE_INDENT = [0, 10, 4, 14, 6];
const LINE_INK = [1, 0.9, 0.96, 0.88, 0.93];

/** Sawtooth clip-path so the paper reads as a torn thermal receipt. */
function zigzagClip(teeth = 56, depth = 1.4): string {
  const top: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    top.push(`${((i / teeth) * 100).toFixed(2)}% ${(i % 2 === 0 ? 0 : depth).toFixed(2)}%`);
  }
  const bottom: string[] = [];
  for (let i = teeth; i >= 0; i--) {
    bottom.push(`${((i / teeth) * 100).toFixed(2)}% ${(i % 2 === 0 ? 100 : 100 - depth).toFixed(2)}%`);
  }
  return `polygon(${[...top, ...bottom].join(', ')})`;
}

/** The torn-paper receipt itself — no card chrome, so flex + dashboard can both host it. */
export const ReceiptPaper: React.FC<ReceiptPaperProps> = ({
  receipt,
  weightUnit,
  streakWeeks = 0,
  maxLines = 5,
  edges = 'torn',
  variant = 'receipt',
  ledgerExtras = null,
  onExerciseClick,
  coffeeUrl = DEFAULT_COFFEE_URL,
}) => {
  const unitLabel = weightUnit.toUpperCase();
  const totalVol = formatDisplayVolume(receipt.volumeKg, weightUnit, { round: 'int' });
  const period = receipt.period;
  const straight = edges === 'straight';
  const ledger = variant === 'ledger';
  const lines = ledger ? [] : receipt.lines.slice(0, maxLines);
  const pressId = ledger ? 'ldLogoPress' : 'rcLogoPress';
  const perSessionVol = receipt.sessions > 0 ? receipt.volumeKg / receipt.sessions : 0;
  const setsPerSession = receipt.sessions > 0 ? receipt.sets / receipt.sessions : 0;

  return (
    <div className={`flex justify-center ${ledger ? 'w-full flex-1' : ''}`} style={straight ? undefined : { filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.35))' }}>
      <div
        className={`w-full px-5 py-3 ${straight ? '' : 'max-w-[340px]'} ${ledger ? 'flex flex-1 flex-col' : ''}`}
        style={{ backgroundColor: PAPER, color: INK, ...(straight ? MONO : { clipPath: zigzagClip(), ...MONO }) }}
      >
        {/* Store header — printed form, slightly crooked; brand is letterpress-inked */}
        <div className="text-center -rotate-1">
          <LogoPressDefs id={pressId} />
          <div className="text-lg font-bold tracking-tight" style={{ filter: `url(#${pressId})` }}>LIFTSHIFT.APP</div>
          {ledger ? (
            <>
              <div className="mt-0.5 text-[9px] tracking-[0.14em] opacity-60">
                {PERIOD_LABEL[period]} · {fmtDay(receipt.start).slice(0, 6)}–{fmtDay(receipt.end)}
              </div>
              <div className="mt-0.5 text-[9px] tracking-[0.14em] opacity-60">NO {receipt.no}</div>
            </>
          ) : (
            <div className="mt-0.5 text-[9px] tracking-[0.14em] opacity-60">
              {PERIOD_LABEL[period]} · {fmtDay(receipt.start).slice(0, 6)}–{fmtDay(receipt.end)} · NO {receipt.no}
            </div>
          )}
        </div>

        <div className="my-1.5 border-t border-dashed rotate-[0.3deg]" style={{ borderColor: `${INK}55` }} />

        {/* Line items — hand-filled, nothing parallel (receipt only; ledger skips the table the manifest owns) */}
        {!ledger && (lines.length === 0 ? (
          <div className="py-4 text-center text-[11px] tracking-[0.2em] opacity-60">NO SETS LOGGED — REST DAY</div>
        ) : (
          <>
            <div className="flex justify-between text-[9px] tracking-[0.2em] opacity-50 -rotate-[0.4deg]">
              <span>EXERCISE</span>
              <span>VOLUME</span>
            </div>
            <div className="mt-1 flex flex-col gap-1.5">
              {lines.map((l, i) => (
                <div
                  key={l.name}
                  style={{
                    transform: `rotate(${LINE_TILT[i % LINE_TILT.length]}deg)`,
                    marginLeft: `${LINE_INDENT[i % LINE_INDENT.length]}px`,
                    opacity: LINE_INK[i % LINE_INK.length],
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <button
                      onClick={() => onExerciseClick?.(l.name)}
                      title={l.name}
                      className="min-w-0 truncate text-left text-[12px] font-bold uppercase tracking-wide hover:underline cursor-pointer"
                    >
                      {stripExerciseSourceLabel(l.name)}
                    </button>
                    <span className="shrink-0 text-[13px] font-bold" style={MONO}>
                      {formatDisplayVolume(l.volumeKg, weightUnit, { round: 'int' })}
                    </span>
                  </div>
                  <div className="text-[9px] opacity-60" style={{ ...MONO, marginLeft: '10px' }}>
                    {l.sets} {l.sets === 1 ? 'SET' : 'SETS'} · {l.reps.toLocaleString()} REPS @ {convertWeight(l.avgKg, weightUnit)} {unitLabel}
                  </div>
                </div>
              ))}
            </div>
          </>
        ))}

        {!ledger && (
        <div className="my-1.5 border-t border-dashed -rotate-[0.3deg]" style={{ borderColor: `${INK}55` }} />
        )}

        {/* Totals — printed, lightly crooked, two columns to budget height */}
        <div className="text-[11px] leading-relaxed rotate-[0.4deg] grid grid-cols-2 gap-x-4">
          <div className="flex justify-between"><span className="opacity-60">SESSIONS</span><span className="font-bold">{receipt.sessions}</span></div>
          <div className="flex justify-between"><span className="opacity-60">SETS</span><span className="font-bold">{receipt.sets.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="opacity-60">REPS</span><span className="font-bold">{receipt.reps.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="opacity-60">TIME</span><span className="font-bold">{fmtMinutes(receipt.timeMin)}</span></div>
          {!ledger && <div className="col-span-2 flex justify-between"><span className="opacity-60">SOURCE</span><span className="font-bold">{receipt.sourceLabel}</span></div>}
        </div>

        {ledger && (
          <>
            <div className="my-1.5 border-t border-dashed rotate-[0.3deg]" style={{ borderColor: `${INK}55` }} />
            <div className="rotate-[-0.4deg]">
              <div className="text-[9px] tracking-[0.2em] opacity-50">CUSTOMS VALUATION · PER SESSION</div>
              <div className="mt-1 text-[11px] leading-relaxed">
                <div className="flex justify-between"><span className="opacity-60">VOLUME</span><span className="font-bold">{formatDisplayVolume(perSessionVol, weightUnit, { round: 'int' })} {unitLabel}</span></div>
                <div className="flex justify-between"><span className="opacity-60">SETS</span><span className="font-bold">{setsPerSession.toFixed(1)}</span></div>
              </div>
            </div>
          </>
        )}

        {ledger && ledgerExtras && (
          <>
            <div className="my-1.5 border-t border-dashed -rotate-[0.3deg]" style={{ borderColor: `${INK}55` }} />
            <div className="flex flex-col gap-2 rotate-[0.3deg] text-[11px] leading-snug">
              <div>
                <div className="text-[9px] tracking-[0.2em] opacity-50">FLAG HISTORY</div>
                <div className="font-bold">SAILING SINCE {fmtDay(receipt.start).toUpperCase()}</div>
                <div className="text-[10px] opacity-60">{ledgerExtras.daysAtSea.toLocaleString()} DAYS AT SEA</div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.2em] opacity-50">HONORS & DECORATIONS</div>
                <div className="font-bold">{receipt.prCount.toLocaleString()} PR{receipt.prCount === 1 ? '' : 'S'} ENTERED</div>
              </div>
              {receipt.bestLift && (
                <div className="min-w-0">
                  <div className="text-[9px] tracking-[0.2em] opacity-50">HEAVIEST CARGO</div>
                    <div className="font-bold truncate">
                      {convertWeight(receipt.bestLift.weightKg, weightUnit)} {unitLabel}, {stripExerciseSourceLabel(receipt.bestLift.name).toUpperCase()} × {receipt.bestLift.reps}
                    </div>
                </div>
              )}
              <div>
                <div className="text-[9px] tracking-[0.2em] opacity-50">CARGO MANIFEST</div>
                <div className="font-bold">{ledgerExtras.distinctExercises.toLocaleString()} EXERCISES LOGGED</div>
              </div>
              {ledgerExtras.flagship && (
                <div className="min-w-0">
                  <div className="text-[9px] tracking-[0.2em] opacity-50">FLAGSHIP LIFT</div>
                  <div className="font-bold truncate">
                    {stripExerciseSourceLabel(ledgerExtras.flagship.name).toUpperCase()} · {ledgerExtras.flagship.sessions} VOYAGES
                  </div>
                </div>
              )}
              {ledgerExtras.longest && (
                <div className="min-w-0">
                  <div className="text-[9px] tracking-[0.2em] opacity-50">LONGEST VOYAGE</div>
                  <div className="font-bold truncate">
                    ~{fmtMinutes(ledgerExtras.longest.minutes)}{ledgerExtras.longest.title ? ` · ${ledgerExtras.longest.title.toUpperCase()}` : ''}
                  </div>
                </div>
              )}
              {ledgerExtras.homePort && (
                <div>
                  <div className="text-[9px] tracking-[0.2em] opacity-50">HOME PORT</div>
                  <div className="font-bold">{ledgerExtras.homePort.day} · {ledgerExtras.homePort.count} LANDINGS</div>
                </div>
              )}
              {ledgerExtras.remark && (
                <div className="-rotate-[0.5deg]">
                  <div className="text-[9px] tracking-[0.2em] opacity-50">HARBOR MASTER'S REMARK</div>
                  <div className="italic opacity-80">"{ledgerExtras.remark}"</div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="my-1.5 border-t-2 border-dashed" style={{ borderColor: INK }} />
        <div className="flex items-baseline justify-between -rotate-[0.5deg]">
          <span className="text-[13px] font-bold tracking-[0.12em]">TOTAL</span>
          <span className="text-[22px] font-bold tracking-tight">
            {totalVol} <span className="text-[12px]">{unitLabel}</span>
          </span>
        </div>
        <div className="my-1.5 border-t border-dashed rotate-[0.3deg]" style={{ borderColor: `${INK}55` }} />

        {/* Sign-off + QR tip-jar side by side to budget height (pinned to the sheet bottom in ledger mode) */}
        <div className={`flex items-center justify-center gap-3 ${ledger ? 'mt-auto pt-2' : 'mt-2'}`}>
          <a href={coffeeUrl} target="_blank" rel="noopener noreferrer" title="Fuel the dev" className="shrink-0 -rotate-2">
            <img
              src={assetPath('/receipt/tip-qr.svg')}
              alt="Tip the dev — Buy Me a Coffee QR code"
              width={88}
              height={88}
              loading="lazy"
            />
          </a>
          <div className="flex flex-col gap-1 rotate-[0.6deg]">
            <div className="text-[10px] font-bold tracking-[0.12em] leading-snug">
              {streakWeeks > 0 ? `★ ${streakWeeks}-WK STREAK — SEE YOU NEXT SESSION` : 'THANK YOU — SEE YOU NEXT SESSION'}
            </div>
            <div className="flex items-center gap-1 text-[9px] tracking-[0.18em] opacity-60">
              <Coffee className="w-3 h-3" />
              <span>FUEL THE DEV — SCAN TO TIP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPaper;
