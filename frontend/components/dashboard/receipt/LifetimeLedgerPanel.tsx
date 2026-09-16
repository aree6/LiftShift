import React, { useMemo } from 'react';
import { PaperAgeDefs, StampGrungeDefs, stampAnim, useStamped } from '../../ui/stamp';
import type { DailySummary, WorkoutSet } from '../../../types';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import { isWarmupSet } from '../../../utils/analysis/classification';
import { getSessionKey } from '../../../utils/date/dateUtils';
import { ReceiptPaper, DEFAULT_COFFEE_URL, type LedgerExtras } from './ReceiptPaper';
import { useTrainingReceiptData } from './useTrainingReceiptData';

const STAMP_RED = '#a93226';
const PAPER = '#F0E5C5';
const INK = '#332B1C';

interface LifetimeLedgerPanelProps {
  fullData: WorkoutSet[];
  dailyData: DailySummary[];
  weightUnit: WeightUnit;
  effectiveNow: Date;
  streakWeeks?: number;
  onExerciseClick?: (exerciseName: string) => void;
  coffeeUrl?: string;
  /** Harbor master's remark (dashboard summary one-liner), trimmed by the caller. */
  remark?: string;
}

// ============================================================================
// Lifetime ledger — the narrow 1/3 desktop companion to the training manifest.
// Fixed all-time scope (the manifest owns the 7d/30d window), slim variant of
// the receipt paper: lifetime totals, per-session valuation, streak, QR.
// ============================================================================
export const LifetimeLedgerPanel: React.FC<LifetimeLedgerPanelProps> = ({
  fullData,
  dailyData,
  weightUnit,
  effectiveNow,
  streakWeeks = 0,
  onExerciseClick,
  coffeeUrl = DEFAULT_COFFEE_URL,
  remark,
}) => {
  const { receipt } = useTrainingReceiptData(fullData, dailyData, effectiveNow, 'all');
  const { ref: stampRef, hit: stamped } = useStamped(0.3);

  // Zero-plumbing flourishes: flagship lift (most sessions), longest voyage,
  // home port (top weekday), distinct exercises, days at sea.
  const extras = useMemo<LedgerExtras | null>(() => {
    if (fullData.length === 0) return null;
    const byEx = new Map<string, Set<string>>();
    for (const s of fullData) {
      if (!s.parsedDate || isWarmupSet(s)) continue;
      const k = getSessionKey(s);
      if (!k) continue;
      const name = s.exercise_title || 'Unknown';
      let set = byEx.get(name);
      if (!set) {
        set = new Set();
        byEx.set(name, set);
      }
      set.add(k);
    }
    let flagship: { name: string; sessions: number } | null = null;
    for (const [name, set] of byEx) {
      if (!flagship || set.size > flagship.sessions) flagship = { name, sessions: set.size };
    }
    let longest: { minutes: number; title: string } | null = null;
    for (const d of dailyData) {
      if ((d.durationMinutes || 0) > (longest?.minutes || 0)) {
        longest = { minutes: d.durationMinutes, title: d.workoutTitle || '' };
      }
    }
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const d of dailyData) {
      const wd = new Date(d.timestamp).getDay();
      if (Number.isFinite(wd)) counts[wd] += 1;
    }
    const top = counts.indexOf(Math.max(...counts));
    const days = ['SUNDAYS', 'MONDAYS', 'TUESDAYS', 'WEDNESDAYS', 'THURSDAYS', 'FRIDAYS', 'SATURDAYS'];
    const daysAtSea = Math.max(1, Math.ceil((receipt.end.getTime() - receipt.start.getTime()) / 86400000));
    return {
      daysAtSea,
      distinctExercises: byEx.size,
      flagship,
      longest,
      homePort: Math.max(...counts) > 0 ? { day: days[top], count: counts[top] } : null,
      remark,
    };
  }, [fullData, dailyData, receipt.start, receipt.end, remark]);

  const stampFace = (
    <div
      className="flex h-[96px] w-[96px] items-center justify-center rounded-full border-[3px] p-1 text-center"
      style={{ borderColor: STAMP_RED, color: STAMP_RED }}
    >
      <div
        className="flex h-full w-full flex-col items-center justify-center rounded-full border-[1.5px] px-1"
        style={{ borderColor: STAMP_RED, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
      >
        <div className="text-[10px] font-bold leading-none" style={{ letterSpacing: '0.08em' }}>LEDGER</div>
        <div className="mt-1 text-[9px] font-bold leading-none">
          {receipt.sessions} {receipt.sessions === 1 ? 'SESSION' : 'SESSIONS'}
        </div>
        <div className="mt-1 text-[7px] leading-tight opacity-80">ALL TIME · LIFTSHIFT</div>
      </div>
    </div>
  );

  return (
    <div
      className="h-full overflow-hidden rounded-xl border p-1.5"
      style={{ backgroundColor: '#8a7f57', borderColor: '#8a7f57' }}
    >
      <div
        ref={stampRef}
        className="relative flex h-full flex-col rounded-[14px] border px-3 pt-2 pb-2"
        style={{ backgroundColor: PAPER, borderColor: INK, color: INK, filter: 'url(#ldPaperAge)' }}
      >
        <StampGrungeDefs id="ldInk" seed={9} />
        <PaperAgeDefs id="ldPaperAge" />
        <div className="mb-1 flex shrink-0 items-baseline justify-between gap-2 -rotate-[0.6deg]">
          <div className="text-[11px] font-bold tracking-[0.22em]">LIFETIME LEDGER</div>
          <div className="text-[9px] font-bold tracking-[0.18em] opacity-60">ALL TIME</div>
        </div>
        <div className="relative flex flex-1 flex-col rotate-[0.5deg]">
          <ReceiptPaper
            receipt={receipt}
            weightUnit={weightUnit}
            streakWeeks={streakWeeks}
            edges="straight"
            variant="ledger"
            ledgerExtras={extras}
            onExerciseClick={onExerciseClick}
            coffeeUrl={coffeeUrl}
          />
          <div
            className="pointer-events-none absolute -right-2 top-24 z-10"
            style={{ mixBlendMode: 'multiply', filter: 'url(#ldInk)', ...stampAnim(stamped, { rotate: 10, opacity: 0.9 }, 120) }}
          >
            <div className="relative">
              {stampFace}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ transform: 'translate(2px, -1.5px)', opacity: 0.35 }}>
                {stampFace}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LifetimeLedgerPanel;
