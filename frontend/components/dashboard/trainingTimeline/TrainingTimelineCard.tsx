import React, { useRef, useEffect, useMemo } from 'react';
import {
  Sprout, Leaf, TreePine,
  Hammer, Pickaxe, Gem,
  Target, Crown, Zap,
  TrendingUp,
} from 'lucide-react';
import type { TimelineProgress, TimelineCheckpointDef } from '../../../utils/training/trainingTimeline';
import {
  CHECKPOINTS,
  getPhaseCheckpoints,
  formatEta,
  formatMonths,
} from '../../../utils/training/trainingTimeline';
import { Reveal } from '../../ui/Reveal';
import { useTooltip, Tooltip } from '../../ui/Tooltip';
import type { TrainingLevel } from '../../../utils/muscle/hypertrophy/muscleParams';
import { useIsMobile } from '../../insights/useIsMobile';

// ---------------------------------------------------------------------------
// Icon mapping – distinct icon per checkpoint key
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  newcomer:              Sprout,
  beginner:              Leaf,
  committed:             TreePine,
  'early-intermediate':  Hammer,
  intermediate:          Pickaxe,
  'advanced-intermediate': Gem,
  elite:                 Target,
  master:                Crown,
  legend:                Zap,
};

const CheckpointIcon: React.FC<{ checkpointKey: string; className?: string }> = ({
  checkpointKey,
  className = 'w-4 h-4',
}) => {
  const Icon = ICON_MAP[checkpointKey] ?? Sprout;
  return <Icon className={className} />;
};

// ---------------------------------------------------------------------------
// Phase visual config
// ---------------------------------------------------------------------------

const PHASE_CONFIG: Record<TrainingLevel, { label: string; color: string; bgColor: string }> = {
  beginner:     { label: 'Beginner',     color: 'text-blue-400',    bgColor: 'bg-blue-500/15' },
  intermediate: { label: 'Intermediate', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  advanced:     { label: 'Advanced',     color: 'text-amber-400',   bgColor: 'bg-amber-500/15' },
};

const PHASES: TrainingLevel[] = ['beginner', 'intermediate', 'advanced'];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Calculate segment fill based on unified score and checkpoint positions.
 * Returns 0-100% based on how far the user has progressed through this segment.
 */
const getSegmentFill = (
  unifiedScore: number,
  fromPercent: number,
  toPercent: number,
): number => {
  if (unifiedScore >= toPercent) return 100;
  if (unifiedScore <= fromPercent) return 0;
  
  const range = toPercent - fromPercent;
  const progress = unifiedScore - fromPercent;
  return Math.round((progress / range) * 100);
};

/**
 * Dynamic fill segment between two consecutive checkpoints.
 * Uses unified score for progress calculation.
 */
const SegmentLine: React.FC<{ 
  fillPercent: number;
}> = ({ fillPercent }) => {
  const isMobile = useIsMobile(768);
  const TOTAL_PILLS = isMobile ? 3 : 5;
  const emeraldColor = '#34d399';
  
  const pillData = useMemo(() => 
    Array.from({ length: TOTAL_PILLS }).map(() => {
      const flexGrow = Math.floor(Math.random() * 3) + 1;
      return {
        flexGrow,
        marginLeft: flexGrow > 1 ? '1px' : '2px',
      };
    }),
    [TOTAL_PILLS]
  );
  
  const totalFlex = pillData.reduce((sum, p) => sum + p.flexGrow, 0);
  const filledFlex = (fillPercent / 100) * totalFlex;
  
  let accumulatedFlex = 0;
  
  return (
    <div className="flex items-center flex-1 h-1.5 mx-1 opacity-70">
      {pillData.map((pill, idx) => {
        const pillStart = accumulatedFlex;
        const pillEnd = accumulatedFlex + pill.flexGrow;
        const fillPct = Math.max(0, Math.min(100, ((filledFlex - pillStart) / pill.flexGrow) * 100));
        accumulatedFlex += pill.flexGrow;
        
        return (
          <div
            key={idx}
            className="h-full rounded-sm relative overflow-hidden"
            style={{
              flexGrow: pill.flexGrow,
              marginLeft: idx === 0 ? 0 : pill.marginLeft,
              backgroundColor: 'rgba(100, 100, 100, 0.15)',
            }}
          >
            {fillPct > 0 && (
              <div
                className="absolute top-0 left-0 h-full rounded-sm"
                style={{
                  width: `${fillPct}%`,
                  backgroundColor: emeraldColor,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * A single icon checkpoint node - icon only (no label).
 */
const CheckpointIconNode: React.FC<{
  checkpoint: TimelineCheckpointDef;
  isReached: boolean;
  isCurrent: boolean;
  isNext: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}> = ({ checkpoint, isReached, isCurrent, isNext, onMouseEnter, onMouseLeave }) => {
  const ringSize = 'w-7 h-7 sm:w-8 sm:h-8';
  const iconSize = 'w-3.5 h-3.5 sm:w-4 sm:h-4';
  const interactive = isReached || isCurrent || isNext;

  return (
    <div
      className={`flex flex-col items-center flex-shrink-0 ${interactive ? 'cursor-pointer' : ''} group`}
      data-current={isCurrent}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Icon circle */}
      <div
        className={`
          ${ringSize} rounded-full flex items-center justify-center
          border-2 transition-[border-color,opacity,transform] duration-200 relative
          ${isCurrent
            ? 'border-amber-300 shadow-lg shadow-amber-300/30 scale-110'
            : isReached
              ? 'border-emerald-400/70 opacity-70'
              : 'border-slate-700/50 opacity-40'
          }
        `}
        style={{
          backgroundColor: 'rgba(100, 100, 100, 0.15)',
          animation: isCurrent ? 'pulse 4s var(--ease-in-out) infinite' : undefined,
        }}
      >
        <CheckpointIcon
          checkpointKey={checkpoint.key}
          className={`${iconSize} ${isCurrent ? 'text-amber-300' : isReached ? 'text-emerald-400' : 'text-slate-600'}`}
        />
      </div>
    </div>
  );
};

/**
 * Label node - separate from icon to allow independent row.
 */
const CheckpointLabelNode: React.FC<{
  checkpoint: TimelineCheckpointDef;
  isReached: boolean;
  isCurrent: boolean;
}> = ({ checkpoint, isReached, isCurrent }) => (
  <span
    className={`
      text-[8px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors duration-200
      ${isCurrent
        ? 'text-amber-300 font-bold'
        : isReached
          ? 'text-emerald-400 opacity-70'
          : 'text-slate-600 opacity-40'
      }
    `}
  >
    {checkpoint.label}
  </span>
);

/**
 * A single phase section containing its 3 checkpoints connected by fill segments.
 */
const PhaseSection: React.FC<{
  phase: TrainingLevel;
  checkpoints: TimelineCheckpointDef[];
  nextPhaseFirstCheckpoint?: TimelineCheckpointDef | null;
  unifiedScore: number;
  currentIndex: number;
  allCheckpoints: readonly TimelineCheckpointDef[];
  onCheckpointHover: (e: React.MouseEvent, checkpoint: TimelineCheckpointDef) => void;
  onCheckpointLeave: () => void;
}> = ({ phase, checkpoints, nextPhaseFirstCheckpoint, unifiedScore, currentIndex, allCheckpoints, onCheckpointHover, onCheckpointLeave }) => {
  const cfg = PHASE_CONFIG[phase];

  return (
    <div className="flex-shrink-0 w-64 sm:flex-1 sm:w-auto">
      {/* Phase label on top */}
      <div className="mb-2 pr-1">
        <span
          className={`
            block w-full px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold text-center
            ${checkpoints.some((_, i) => {
              const globalIdx = allCheckpoints.indexOf(checkpoints[i]);
              return globalIdx === currentIndex;
            })
              ? `${cfg.bgColor} ${cfg.color}`
              : 'bg-[rgba(100,100,100,0.15)] opacity-70 text-slate-500'
            }
          `}
        >
          {cfg.label}
        </span>
      </div>

      {/* Row 1: Icons with connecting segments */}
      <div className="flex items-center">
        {checkpoints.map((cp, i) => {
          const globalIdx = allCheckpoints.indexOf(cp);
          const isReached = globalIdx <= currentIndex;
          const isCurrent = globalIdx === currentIndex;
          const isNext = globalIdx === currentIndex + 1;

          const segment = i > 0 ? (
            <SegmentLine
              key={`seg-${cp.key}`}
              fillPercent={getSegmentFill(unifiedScore, checkpoints[i-1].positionPercent, cp.positionPercent)}
            />
          ) : null;

          return (
            <React.Fragment key={cp.key}>
              {segment}
              <CheckpointIconNode
                checkpoint={cp}
                isReached={isReached}
                isCurrent={isCurrent}
                isNext={isNext}
                onMouseEnter={(e) => onCheckpointHover(e, cp)}
                onMouseLeave={onCheckpointLeave}
              />
            </React.Fragment>
          );
        })}

        {/* Transition segment to next phase */}
        {nextPhaseFirstCheckpoint && (
          <SegmentLine
            key={`seg-to-${nextPhaseFirstCheckpoint.key}`}
            fillPercent={getSegmentFill(unifiedScore, checkpoints[checkpoints.length - 1].positionPercent, nextPhaseFirstCheckpoint.positionPercent)}
          />
        )}
      </div>

      {/* Row 2: Labels below icons */}
      <div className="flex items-center mt-1">
        {checkpoints.map((cp, i) => {
          const globalIdx = allCheckpoints.indexOf(cp);
          const isReached = globalIdx <= currentIndex;
          const isCurrent = globalIdx === currentIndex;

          const spacer = i > 0 ? <div className="flex-1" key={`spacer-${cp.key}`} /> : null;

          return (
            <React.Fragment key={`label-${cp.key}`}>
              {spacer}
              <div className="flex items-center justify-center w-7 sm:w-8">
                <CheckpointLabelNode
                  checkpoint={cp}
                  isReached={isReached}
                  isCurrent={isCurrent}
                />
              </div>
            </React.Fragment>
          );
        })}

        {nextPhaseFirstCheckpoint && (
          <div className="flex-1" key="spacer-to-next" />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TrainingTimelineCardProps {
  progress: TimelineProgress;
}

export const TrainingTimelineCard: React.FC<TrainingTimelineCardProps> = ({ progress }) => {
  const { tooltip, showTooltip, hideTooltip } = useTooltip();

  const {
    unifiedScore,
    currentCheckpoint,
    currentIndex,
    monthsTraining,
    weeklyProgressRate,
    isLegend,
    checkpointAchievedAtMonths,
  } = progress;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current && typeof window !== 'undefined' && window.innerWidth < 640) {
      const container = scrollContainerRef.current;
      const currentElement = container.querySelector('[data-current="true"]') as HTMLElement;
      if (currentElement) {
        const containerWidth = container.offsetWidth;
        const elementLeft = currentElement.offsetLeft;
        const elementWidth = currentElement.offsetWidth;
        const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }, [currentIndex]);

  // Group checkpoints by phase
  const phaseGroups = PHASES.map((phase) => ({
    phase,
    checkpoints: getPhaseCheckpoints(phase),
  }));

  // Tooltip handler — only for past, current, and immediate next
  const handleCheckpointHover = (e: React.MouseEvent, checkpoint: TimelineCheckpointDef) => {
    const cpIndex = CHECKPOINTS.indexOf(checkpoint);
    const isReached = cpIndex <= currentIndex;
    const isCurrent = cpIndex === currentIndex;
    const isNext = cpIndex === currentIndex + 1;

    if (!isReached && !isNext) {
      hideTooltip();
      return;
    }

    const achievedAt = checkpointAchievedAtMonths.get(checkpoint.key);

    let body = '';
    let status: 'success' | 'default' | 'info' = isReached ? 'success' : 'default';

    if (isCurrent && isLegend) {
      body = `${checkpoint.description}\n\nYou made it.`;
    } else if (isCurrent || isReached) {
      // Past/current: description + when reached
      const monthsAgo = achievedAt != null ? Math.round(monthsTraining - achievedAt) : 0;
      const prefix = monthsAgo <= 0 ? 'Reached recently' : `Reached ${formatMonths(monthsAgo)} ago`;
      body = `${checkpoint.description}\n\n${prefix}`;
    } else {
      // Next: description + ETA at current rate
      const remainingPoints = checkpoint.positionPercent - unifiedScore;
      const weeks = remainingPoints > 0 && weeklyProgressRate > 0
        ? Math.ceil(remainingPoints / weeklyProgressRate)
        : null;
      const eta = weeks !== null && weeks > 0
        ? `${formatEta(weeks)} to reach at current rate`
        : 'Insufficient data to estimate timeline';
      body = `${checkpoint.description}\n\n${eta}`;
    }

    showTooltip(e, {
      title: checkpoint.label,
      body,
      status,
    });
  };

  return (
    <Reveal className="bg-black/20 border border-slate-700/50 rounded-xl p-4 transition-colors duration-300" style={{ backgroundColor: 'rgb(var(--panel-rgb) / 0.5)' }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-white">Training Journey</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`
              inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold
              ${PHASE_CONFIG[currentCheckpoint.phase].bgColor}
              ${PHASE_CONFIG[currentCheckpoint.phase].color}
            `}
          >
            <CheckpointIcon checkpointKey={currentCheckpoint.key} className="w-2.5 h-2.5" />
            {currentCheckpoint.label}
          </span>
        </div>
      </div>

      {/* ── Timeline: 3 phase sections with transition lines ────────────── */}
      <div ref={scrollContainerRef} className="overflow-x-auto -mx-2 px-2">
        <div className="flex items-start min-w-max">
        {phaseGroups.map((group, gi) => {
          const nextPhaseFirstCp = gi < phaseGroups.length - 1
            ? phaseGroups[gi + 1].checkpoints[0]
            : null;

          return (
            <PhaseSection
              key={group.phase}
              phase={group.phase}
              checkpoints={group.checkpoints}
              nextPhaseFirstCheckpoint={nextPhaseFirstCp}
              unifiedScore={unifiedScore}
              currentIndex={currentIndex}
              allCheckpoints={CHECKPOINTS}
              onCheckpointHover={handleCheckpointHover}
              onCheckpointLeave={hideTooltip}
            />
          );
        })}
        </div>
      </div>

      {tooltip && <Tooltip data={tooltip} />}
    </Reveal>
  );
};
