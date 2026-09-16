import React from 'react';
import type { WorkoutSet } from '../../../types';
import type { WeightUnit } from '../../../utils/storage/localStorage';
import { FlexCard, FlexCardFooter } from './FlexCard';
import { PaperAgeDefs, StampGrungeDefs, stampAnim, useStamped } from '../../ui/stamp';
import { ReceiptPaper, DEFAULT_COFFEE_URL } from '../../dashboard/receipt/ReceiptPaper';
import { useTrainingReceiptData } from '../../dashboard/receipt/useTrainingReceiptData';

const STAMP_RED = '#a93226';
const PAPER = '#F0E5C5';
const INK = '#332B1C';

// ============================================================================
// Receipt flex card — full-bleed hand-filled ledger, always all-time scope,
// with a rubber-stamp slam when it scrolls into view.
// ============================================================================
export const ReceiptCard: React.FC<{
  data: WorkoutSet[];
  weightUnit: WeightUnit;
  effectiveNow: Date;
  streakWeeks?: number;
  onExerciseClick?: (exerciseName: string) => void;
  coffeeUrl?: string;
}> = ({ data, weightUnit, effectiveNow, streakWeeks = 0, onExerciseClick, coffeeUrl = DEFAULT_COFFEE_URL }) => {
  const { receipt } = useTrainingReceiptData(data, undefined, effectiveNow, 'all');
  const { ref: stampRef, hit: stamped, settled: inkSettled } = useStamped(0.3);

  // Double-hit rubber stamp face — the ghost copy is the misregistered bounce.
  const stampFace = (
    <div
      className="flex h-[125px] w-[125px] items-center justify-center rounded-full border-[3.5px] p-1 text-center"
      style={{ borderColor: STAMP_RED, color: STAMP_RED }}
    >
      <div
        className="flex h-full w-full flex-col items-center justify-center rounded-full border-2 px-1"
        style={{ borderColor: STAMP_RED, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
      >
        <div className="text-[13px] font-bold leading-none" style={{ letterSpacing: '0.08em' }}>VERIFIED</div>
                <div className="mt-1 text-[11px] font-bold leading-none">
                  {receipt.sessions} {receipt.sessions === 1 ? 'SESSION' : 'SESSIONS'}
                </div>
        <div className="mt-1 text-[8px] leading-tight opacity-80">ALL TIME · LIFTSHIFT</div>
      </div>
    </div>
  );

  return (
    <FlexCard theme="light" className="min-h-[500px] h-full flex flex-col" >
      {/* opaque paper sheet covers the card bg — no halo in any mode */}
      <div
        ref={stampRef}
        className="relative z-[1] flex-1 px-4 sm:px-5 pt-3 pb-8 flex flex-col"
        style={{ backgroundColor: PAPER, color: INK, filter: 'url(#rcPaperAge)' }}
      >
        <StampGrungeDefs id="rcInk" seed={4} />
        <PaperAgeDefs id="rcPaperAge" />
        <div className="flex items-baseline justify-between mb-1 gap-2 -rotate-[0.6deg] shrink-0">
          <div className="text-[12px] font-bold tracking-[0.22em]">TRAINING RECEIPT</div>
          <div className="text-[9px] font-bold tracking-[0.18em] opacity-60">
            ALL TIME · {receipt.sessions} {receipt.sessions === 1 ? 'SESSION' : 'SESSIONS'}
          </div>
        </div>

        <div className="relative rotate-[0.5deg] flex-1 flex flex-col justify-center">
          <ReceiptPaper
            receipt={receipt}
            weightUnit={weightUnit}
            streakWeeks={streakWeeks}
            maxLines={3}
            edges="straight"
            onExerciseClick={onExerciseClick}
            coffeeUrl={coffeeUrl}
          />
          {/* VERIFIED stamp — double-hit misregistration, slammed on scroll */}
          <div
            className="absolute -right-2 top-14 z-10"
            style={{ mixBlendMode: 'multiply', filter: inkSettled ? 'url(#rcInk)' : 'none', ...stampAnim(stamped, { rotate: 10, opacity: 0.9 }, 120) }}
          >
            <div className="relative">
              {stampFace}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ transform: 'translate(1px, -1px)', opacity: 0.25 }}>
                {stampFace}
              </div>
            </div>
          </div>
        </div>
      </div>
      <FlexCardFooter theme="light" />
    </FlexCard>
  );
};

export default ReceiptCard;
