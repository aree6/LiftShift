import { WorkoutSet, SessionAnalysis, AnalysisResult, SetWisdom, AnalysisStatus, StructuredTooltip, TooltipLine } from '../../types';
import { roundTo } from '../format/formatters';
import { isWarmupSet } from './setClassification';

export { isWarmupSet } from './setClassification';

// === CONSTANTS ===
const EPLEY_FACTOR = 30;
const DROP_THRESHOLD_MILD = 15.0;    // 0-15% drop is normal fatigue
const DROP_THRESHOLD_MODERATE = 25.0; // 15-25% is significant but acceptable
const DROP_THRESHOLD_SEVERE = 40.0;   // >40% is concerning
const FATIGUE_BUFFER = 1.5;           // Allow 1.5 reps below expected due to cumulative fatigue
const MAX_REPS_FOR_1RM = 12;          // Epley becomes unreliable above ~12 reps
const MAX_EXPECTED_REPS_DISPLAY = 25; // Prevents extreme expected-rep values on backoff/high-rep work

// === TOOLTIP HELPERS ===
const line = (text: string, color?: TooltipLine['color'], bold?: boolean): TooltipLine => ({ text, color, bold });

const buildStructured = (
  trendValue: string,
  direction: 'up' | 'down' | 'same',
  why: TooltipLine[],
  improve?: TooltipLine[]
): StructuredTooltip => ({ trend: { value: trendValue, direction }, why, improve });

// === 1RM CALCULATIONS ===
// Epley formula: 1RM = weight × (1 + reps/30)
// More accurate for 1-10 reps, less reliable for high rep ranges
const calculateEpley1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  // Cap reps for 1RM calculation - high rep sets don't predict 1RM well
  const effectiveReps = Math.min(reps, MAX_REPS_FOR_1RM);
  return Number((weight * (1 + effectiveReps / EPLEY_FACTOR)).toFixed(2));
};

// Predict how many reps you should get at a given weight based on your 1RM
const predictReps = (oneRM: number, newWeight: number): number => {
  if (newWeight <= 0 || oneRM <= 0) return 0;
  if (newWeight >= oneRM) return 1; // At or above 1RM, expect 1 rep max
  const predicted = EPLEY_FACTOR * ((oneRM / newWeight) - 1);
  return Math.max(1, roundTo(predicted, 1));
};

// Calculate percentage change FROM old TO new
// Positive = increase, Negative = decrease
const calculatePercentChange = (oldVal: number, newVal: number): number => {
  if (oldVal <= 0) return newVal > 0 ? 100 : 0;
  return Number((((newVal - oldVal) / oldVal) * 100).toFixed(1));
};

const clamp = (val: number, min: number, max: number): number => Math.min(max, Math.max(min, val));

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(p, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
};

const adjustOneRMForRPE = (oneRM: number, rpe: number | null): number => {
  if (!oneRM || !Number.isFinite(oneRM)) return 0;
  if (rpe == null || !Number.isFinite(rpe)) return oneRM;
  if (rpe < 6 || rpe > 10) return oneRM;
  const boost = clamp((9 - rpe) * 0.02, 0, 0.1);
  return oneRM * (1 + boost);
};

interface ExpectedRepsRange {
  min: number;
  max: number;
  center: number;
  label: string;
}

// Expected reps uses a rolling, robust 1RM estimate from prior working sets only.
// This avoids “future set leakage” and reduces sensitivity to a single outlier set.
const buildExpectedRepsRange = (
  priorSets: SetMetrics[],
  targetWeight: number,
  targetSetNumber: number
): ExpectedRepsRange => {
  const candidates = priorSets
    .map(s => adjustOneRMForRPE(s.oneRM, s.rpe))
    .filter(v => v > 0);

  if (candidates.length === 0 || targetWeight <= 0) {
    return { min: 1, max: 1, center: 1, label: '~1' };
  }

  const recent = candidates.slice(-4);
  const estimateOneRM = percentile(recent, 0.75) || median(recent) || median(candidates);
  const basePredicted = predictReps(estimateOneRM, targetWeight);

  const fatiguePenalty = clamp(0.4 * Math.max(0, targetSetNumber - 1), 0, 3);
  const rawCenter = Math.max(1, basePredicted - fatiguePenalty);
  const center = Math.min(rawCenter, MAX_EXPECTED_REPS_DISPLAY);

  const q25 = percentile(recent, 0.25);
  const q75 = percentile(recent, 0.75);
  const med = median(recent);
  const spreadPct = med > 0 ? (q75 - q25) / med : 0;
  const halfWidth = clamp(1 + Math.round(spreadPct * 3), 1, 3);

  let min = Math.max(1, Math.floor(center - halfWidth));
  let max = Math.max(min, Math.ceil(center + halfWidth));
  min = Math.min(min, MAX_EXPECTED_REPS_DISPLAY);
  max = Math.min(max, MAX_EXPECTED_REPS_DISPLAY);
  if (max < min) max = min;

  const label = min === max ? `~${min}` : `${min}-${max}`;
  return { min, max, center, label };
};

interface SetMetrics {
  weight: number;
  reps: number;
  volume: number;
  oneRM: number;
  rpe: number | null;
}

const extractSetMetrics = (set: WorkoutSet): SetMetrics => ({
  weight: set.weight_kg,
  reps: set.reps,
  volume: set.weight_kg * set.reps,
  oneRM: calculateEpley1RM(set.weight_kg, set.reps),
  rpe: set.rpe ?? null,
});

const createAnalysisResult = (
  transition: string,
  status: AnalysisStatus,
  weightChangePct: number,
  volDropPct: number,
  actualReps: number,
  expectedReps: string,
  shortMessage: string,
  tooltip: string,
  structured?: StructuredTooltip
): AnalysisResult => ({
  transition,
  status,
  metrics: {
    weight_change_pct: weightChangePct === 0 ? '0%' : `${weightChangePct > 0 ? '+' : ''}${roundTo(weightChangePct, 1)}%`,
    vol_drop_pct: `${roundTo(volDropPct, 1)}%`,
    actual_reps: actualReps,
    expected_reps: expectedReps,
  },
  shortMessage,
  tooltip,
  structured,
});

// Analyze sets at the same weight - focus on rep changes due to fatigue
const analyzeSameWeight = (
  transition: string,
  repDropPct: number,
  prevReps: number,
  currReps: number,
  setNumber: number
): AnalysisResult => {
  const repDiff = currReps - prevReps;
  // `setNumber` is the current working set number in the transition (e.g. Set 1 → 2 passes 2).
  // We treat the first transition (after the first working set) specially in messaging.
  const isAfterFirstWorkingSet = setNumber === 2;
  
  // REPS INCREASED
  if (repDiff > 0) {
    return createAnalysisResult(
      transition, 'success', 0, repDropPct, currReps, `${prevReps}`,
      'Second Wind',
      `+${repDiff} reps vs lst`,
      buildStructured(`+${repDiff} reps`, 'up', [
        line('Had reserves in lst set', 'gray'),
        line('Or took longer rest this time', 'gray'),
      ])
    );
  }
  
  // REPS SAME
  if (repDiff === 0) {
    return createAnalysisResult(
      transition, 'success', 0, 0, currReps, `${prevReps}`,
      'Consistent',
      `Maintained ${currReps} reps`,
      buildStructured('= reps', 'same', [
        line('Good pacing and recovery', 'green'),
        line('Rest time is working well', 'gray'),
      ])
    );
  }
  
  const dropAbs = Math.abs(repDiff);
  const dropPctAbs = Math.abs(repDropPct);
  
  // MILD DROP (0-15%)
  if (dropPctAbs <= DROP_THRESHOLD_MILD) {
    return createAnalysisResult(
      transition, 'info', 0, repDropPct, currReps, `${prevReps}`,
      'Normal Fatigue',
      `-${dropAbs} reps (${roundTo(dropPctAbs, 0)}%)`,
      buildStructured(`-${dropAbs} reps`, 'down', [
        line('Normal fatigue between sets', 'blue'),
        line('Muscles recovering as expected', 'gray'),
      ])
    );
  }
  
  // MODERATE DROP (15-25%)
  if (dropPctAbs <= DROP_THRESHOLD_MODERATE) {
    const why: TooltipLine[] = isAfterFirstWorkingSet 
      ? [line('First set pushed close to failure', 'yellow')]
      : [line('Lst set was near failure', 'yellow'), line('Or rest was shorter than usual', 'gray')];
    
    return createAnalysisResult(
      transition, 'warning', 0, repDropPct, currReps, `${prevReps}`,
      'High Fatigue',
      `-${dropAbs} reps (${roundTo(dropPctAbs, 0)}%)`,
      buildStructured(`-${dropAbs} reps`, 'down', why, [
        line('Normal if training to failure', 'gray'),
        line('For more volume: rest 2-3 min', 'blue'),
      ])
    );
  }
  
  // SEVERE DROP (>25%)
  const why: TooltipLine[] = isAfterFirstWorkingSet
    ? [line('First set was to failure', 'red'), line('Limits performance on remaining sets', 'gray')]
    : [line('Accumulated fatigue from lst sets', 'red'), line('Or rest time too short', 'gray')];
  
  return createAnalysisResult(
    transition, 'danger', 0, repDropPct, currReps, `${prevReps}`,
    'Significant Drop',
    `-${dropAbs} reps (${roundTo(dropPctAbs, 0)}%)`,
    buildStructured(`-${dropAbs} reps`, 'down', why, [
      line('If intentional: good intensity', 'green'),
      line('For more volume: leave 1-2 RIR', 'blue'),
    ])
  );
};

// Analyze when weight increased between sets
const analyzeWeightIncrease = (
  transition: string,
  weightChangePct: number,
  prevWeight: number,
  currWeight: number,
  prevReps: number,
  currReps: number,
  expected: ExpectedRepsRange
): AnalysisResult => {
  const expectedLabel = expected.label;
  const expectedTarget = Math.round(expected.center);
  
  const prevVol = prevWeight * prevReps;
  const currVol = currWeight * currReps;
  const volChangePct = calculatePercentChange(prevVol, currVol);
  const pct = roundTo(weightChangePct, 0);

  // EXCEEDED EXPECTATIONS
  if (currReps > expected.max) {
    return createAnalysisResult(
      transition, 'success', weightChangePct, volChangePct, currReps, expectedLabel,
      'Strong Progress',
      `+${pct}% weight, ${currReps} reps`,
      buildStructured(`+${pct}% weight`, 'up', [
        line(`Got ${currReps} reps (expected ${expectedLabel})`, 'green'),
        line('Strength gains showing', 'gray'),
      ])
    );
  }
  
  // MET EXPECTATIONS (within fatigue buffer)
  if (currReps >= (expected.center - FATIGUE_BUFFER) || (currReps >= expected.min && currReps <= expected.max)) {
    return createAnalysisResult(
      transition, 'success', weightChangePct, volChangePct, currReps, expectedLabel,
      'Good Progress',
      `+${pct}% weight, ${currReps} reps`,
      buildStructured(`+${pct}% weight`, 'up', [
        line(`Hit ${currReps} reps as expected`, 'green'),
        line('Progress achieved', 'gray'),
      ])
    );
  }
  
  // SLIGHTLY BELOW (1-3 reps under)
  if (currReps >= expectedTarget - 3) {
    return createAnalysisResult(
      transition, 'warning', weightChangePct, volChangePct, currReps, expectedLabel,
      'Slightly Ambitious',
      `+${pct}% weight, ${currReps} reps`,
      buildStructured(`+${pct}% weight`, 'up', [
        line(`Got ${currReps} reps (expected ${expectedLabel})`, 'yellow'),
        line('Weight jump may be slightly aggressive', 'gray'),
      ], [
        line('Keep trying this weight', 'blue'),
        line('Strength adapts over time', 'gray'),
      ])
    );
  }
  
  // SIGNIFICANTLY BELOW
  return createAnalysisResult(
    transition, 'danger', weightChangePct, volChangePct, currReps, expectedLabel,
    'Premature Jump',
    `+${pct}% weight, ${currReps} reps`,
    buildStructured(`+${pct}% weight`, 'up', [
      line(`Only ${currReps} reps (expected ${expectedLabel})`, 'red'),
      line('Weight increase too aggressive', 'gray'),
    ], [
      line('Build more reps at lst weight first', 'blue'),
      line('Try smaller 2.5-5% jumps', 'gray'),
    ])
  );
};

// Analyze when weight decreased (backoff/drop set)
const analyzeWeightDecrease = (
  transition: string,
  weightChangePct: number,
  prevWeight: number,
  currWeight: number,
  prevReps: number,
  currReps: number,
  expected: ExpectedRepsRange
): AnalysisResult => {
  const expectedLabel = expected.label;
  const expectedTarget = Math.round(expected.center);
  
  const prevVol = prevWeight * prevReps;
  const currVol = currWeight * currReps;
  const volChangePct = calculatePercentChange(prevVol, currVol);
  const pct = roundTo(weightChangePct, 0);
  
  // MET OR EXCEEDED EXPECTATIONS
  if (currReps >= expected.min) {
    return createAnalysisResult(
      transition, 'success', weightChangePct, volChangePct, currReps, expectedLabel,
      'Effective Backoff',
      `${pct}% weight, ${currReps} reps`,
      buildStructured(`${pct}% weight`, 'down', [
        line('Smart backoff for volume', 'green'),
        line('Reduced neural fatigue while maintaining work', 'gray'),
      ])
    );
  }
  
  // SLIGHTLY BELOW
  if (currReps >= expectedTarget - 3) {
    return createAnalysisResult(
      transition, 'info', weightChangePct, volChangePct, currReps, expectedLabel,
      'Fatigued Backoff',
      `${pct}% weight, ${currReps} reps`,
      buildStructured(`${pct}% weight`, 'down', [
        line(`Got ${currReps} reps (expected ${expectedLabel})`, 'yellow'),
        line('Accumulated fatigue from earlier sets', 'gray'),
      ])
    );
  }
  
  // SIGNIFICANTLY BELOW
  return createAnalysisResult(
    transition, 'warning', weightChangePct, volChangePct, currReps, expectedLabel,
    'Heavy Fatigue',
    `${pct}% weight, ${currReps} reps`,
    buildStructured(`${pct}% weight`, 'down', [
      line(`Only ${currReps} reps (expected ${expectedLabel})`, 'red'),
      line('High accumulated fatigue', 'gray'),
    ], [
      line('Good if training to failure intentionally', 'green'),
      line('Otherwise: end exercise or rest longer', 'gray'),
    ])
  );
};

export const analyzeSetProgression = (sets: WorkoutSet[]): AnalysisResult[] => {
  // Filter out warmup sets (based on set_type field)
  const workingSets = sets.filter(s => !isWarmupSet(s));
  
  if (workingSets.length < 2) return [];

  const results: AnalysisResult[] = [];

  // Build expectations from prior working sets only (rolling) to avoid “future set” leakage.
  const priorMetrics: SetMetrics[] = [extractSetMetrics(workingSets[0])];

  for (let i = 1; i < workingSets.length; i++) {
    const prev = priorMetrics[priorMetrics.length - 1];
    const curr = extractSetMetrics(workingSets[i]);
    const transition = `Set ${i} → ${i + 1}`;

    const weightChangePct = calculatePercentChange(prev.weight, curr.weight);
    const repChangePct = calculatePercentChange(prev.reps, curr.reps);

    let result: AnalysisResult;

    // Same weight (within 1% tolerance)
    if (Math.abs(weightChangePct) < 1.0) {
      // Pass set number (i is the current set index, so i+1 is the current set number)
      result = analyzeSameWeight(transition, repChangePct, prev.reps, curr.reps, i + 1);
    } 
    // Weight increased
    else if (weightChangePct > 0) {
      const expected = buildExpectedRepsRange(priorMetrics, curr.weight, i + 1);
      result = analyzeWeightIncrease(
        transition, weightChangePct, 
        prev.weight, curr.weight, 
        prev.reps, curr.reps, 
        expected
      );
    } 
    // Weight decreased (backoff/drop set)
    else {
      const expected = buildExpectedRepsRange(priorMetrics, curr.weight, i + 1);
      result = analyzeWeightDecrease(
        transition, weightChangePct,
        prev.weight, curr.weight,
        prev.reps, curr.reps,
        expected
      );
    }

    results.push(result);

    priorMetrics.push(curr);
  }

  return results;
};

type GoalLabel = 'Strength' | 'Hypertrophy' | 'Endurance' | 'Mixed' | 'N/A';

interface GoalConfig {
  label: GoalLabel;
  tooltip: string;
}

const GOAL_CONFIGS: Record<GoalLabel, string> = {
  'Strength': 'Average reps are low (≤5). This zone prioritizes Neural Adaptation and Max Strength.',
  'Hypertrophy': 'Average reps are moderate (6-15). This is the "Golden Zone" for Muscle Growth (Hypertrophy).',
  'Endurance': 'Average reps are high (>15). This zone prioritizes Metabolic Conditioning and Muscular Endurance.',
  'Mixed': '',
  'N/A': '',
};

const determineGoal = (avgReps: number): GoalConfig => {
  if (avgReps <= 5) return { label: 'Strength', tooltip: GOAL_CONFIGS['Strength'] };
  if (avgReps <= 15) return { label: 'Hypertrophy', tooltip: GOAL_CONFIGS['Hypertrophy'] };
  return { label: 'Endurance', tooltip: GOAL_CONFIGS['Endurance'] };
};

export const analyzeSession = (sets: WorkoutSet[]): SessionAnalysis => {
  // Filter out warmup sets for session analysis
  const workingSets = sets.filter(s => !isWarmupSet(s));
  
  if (workingSets.length === 0) {
    return { goalLabel: 'N/A', avgReps: 0, setCount: 0 };
  }

  let totalReps = 0;
  for (const s of workingSets) {
    totalReps += s.reps || 0;
  }
  const avgReps = Math.round(totalReps / workingSets.length);
  const { label, tooltip } = determineGoal(avgReps);

  return { goalLabel: label, avgReps, setCount: workingSets.length, tooltip };
};

const DEFAULT_TARGET_REPS = 10;
const MIN_HYPERTROPHY_REPS = 5;
const PROMOTE_THRESHOLD = 12; // If all sets hit 12+ reps, definitely time to increase

export const analyzeProgression = (
  allSetsForExercise: WorkoutSet[], 
  targetReps: number = DEFAULT_TARGET_REPS
): SetWisdom | null => {
  // Filter out warmup sets
  const workingSets = allSetsForExercise.filter(s => !isWarmupSet(s));
  
  if (workingSets.length === 0) return null;

  const reps = workingSets.map(s => s.reps);
  const weights = workingSets.map(s => s.weight_kg);
  const minReps = Math.min(...reps);
  const maxReps = Math.max(...reps);
  const avgReps = Math.round(reps.reduce((a, b) => a + b, 0) / reps.length);
  
  // Check if all sets were at the same weight
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const sameWeight = (maxWeight - minWeight) / maxWeight < 0.05; // Within 5%
  
  // Get sets at the top weight only
  const topWeightSets = workingSets.filter(s => s.weight_kg >= maxWeight * 0.95);
  const topWeightReps = topWeightSets.map(s => s.reps);
  const topWeightMinReps = topWeightReps.length > 0 ? Math.min(...topWeightReps) : minReps;
  const topWeightAvgReps = topWeightReps.length > 0 
    ? Math.round(topWeightReps.reduce((a, b) => a + b, 0) / topWeightReps.length)
    : avgReps;
  
  // Strong promotion signal: All working sets hit target reps
  if (topWeightMinReps >= targetReps) {
    const increase = topWeightMinReps >= PROMOTE_THRESHOLD ? '5-10%' : '2.5-5%';
    return { 
      type: 'promote', 
      message: 'Increase Weight',
      tooltip: `All sets hit ${topWeightMinReps}+ reps. Increase by ${increase} next session.`,
    };
  }
  
  // Demotion signal: Working sets too heavy
  if (topWeightReps.length > 0 && Math.max(...topWeightReps) < MIN_HYPERTROPHY_REPS) {
    return { 
      type: 'demote', 
      message: 'Decrease Weight', 
      tooltip: `Max ${Math.max(...topWeightReps)} reps. Reduce by 5-10% to hit 6-12 rep range.`,
    };
  }
  
  // Mixed performance - some sets good, some not
  if (topWeightReps.length >= 2 && topWeightMinReps < targetReps - 3 && Math.max(...topWeightReps) >= targetReps) {
    return {
      type: 'demote',
      message: 'Inconsistent',
      tooltip: `Reps varied ${topWeightMinReps}-${Math.max(...topWeightReps)}. Lower weight or rest longer for consistency.`,
    };
  }

  return null;
};

const STATUS_COLORS: Readonly<Record<AnalysisStatus, string>> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/50',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50',
  danger: 'bg-red-500/10 text-red-400 border-red-500/50',
};

const WISDOM_COLORS: Readonly<Record<string, string>> = {
  promote: 'bg-purple-500/10 text-purple-400 border-purple-500/50',
  demote: 'bg-orange-500/10 text-orange-400 border-orange-500/50',
};

const DEFAULT_COLOR = 'bg-slate-800 text-slate-400 border-slate-700';

export const getStatusColor = (status: AnalysisStatus): string => {
  return STATUS_COLORS[status] ?? DEFAULT_COLOR;
};

export const getWisdomColor = (type: string): string => {
  return WISDOM_COLORS[type] ?? DEFAULT_COLOR;
};