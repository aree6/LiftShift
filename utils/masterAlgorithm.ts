import { WorkoutSet, SessionAnalysis, AnalysisResult, SetWisdom, AnalysisStatus, StructuredTooltip, TooltipLine } from '../types';
import { roundTo } from './formatters';

// === CONSTANTS ===
const EPLEY_FACTOR = 30;
const DROP_THRESHOLD_MILD = 15.0;    // 0-15% drop is normal fatigue
const DROP_THRESHOLD_MODERATE = 25.0; // 15-25% is significant but acceptable
const DROP_THRESHOLD_SEVERE = 40.0;   // >40% is concerning
const FATIGUE_BUFFER = 1.5;           // Allow 1.5 reps below expected due to cumulative fatigue
const MAX_REPS_FOR_1RM = 12;          // Epley becomes unreliable above ~12 reps

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

interface SetMetrics {
  weight: number;
  reps: number;
  volume: number;
  oneRM: number;
}

const extractSetMetrics = (set: WorkoutSet): SetMetrics => ({
  weight: set.weight_kg,
  reps: set.reps,
  volume: set.weight_kg * set.reps,
  oneRM: calculateEpley1RM(set.weight_kg, set.reps),
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
  const isFirstWorkingSet = setNumber === 1;
  
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
    const why: TooltipLine[] = isFirstWorkingSet 
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
  const why: TooltipLine[] = isFirstWorkingSet
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
  bestOneRM: number
): AnalysisResult => {
  const expectedRepsRaw = predictReps(bestOneRM, currWeight);
  const expectedRepsInt = Math.round(expectedRepsRaw);
  const repDiff = currReps - expectedRepsInt;
  
  const prevVol = prevWeight * prevReps;
  const currVol = currWeight * currReps;
  const volChangePct = calculatePercentChange(prevVol, currVol);
  const pct = roundTo(weightChangePct, 0);

  // EXCEEDED EXPECTATIONS
  if (currReps > expectedRepsInt) {
    return createAnalysisResult(
      transition, 'success', weightChangePct, volChangePct, currReps, `~${expectedRepsInt}`,
      'Strong Overload',
      `+${pct}% weight, ${currReps} reps`,
      buildStructured(`+${pct}% weight`, 'up', [
        line(`Got ${currReps} reps (expected ~${expectedRepsInt})`, 'green'),
        line('Strength gains showing', 'gray'),
      ])
    );
  }
  
  // MET EXPECTATIONS (within fatigue buffer)
  if (currReps >= (expectedRepsRaw - FATIGUE_BUFFER)) {
    return createAnalysisResult(
      transition, 'success', weightChangePct, volChangePct, currReps, `~${expectedRepsInt}`,
      'Good Overload',
      `+${pct}% weight, ${currReps} reps`,
      buildStructured(`+${pct}% weight`, 'up', [
        line(`Hit ${currReps} reps as expected`, 'green'),
        line('Progressive overload achieved', 'gray'),
      ])
    );
  }
  
  // SLIGHTLY BELOW (1-3 reps under)
  if (currReps >= expectedRepsInt - 3) {
    return createAnalysisResult(
      transition, 'warning', weightChangePct, volChangePct, currReps, `~${expectedRepsInt}`,
      'Slightly Ambitious',
      `+${pct}% weight, ${currReps} reps`,
      buildStructured(`+${pct}% weight`, 'up', [
        line(`Got ${currReps} reps (expected ~${expectedRepsInt})`, 'yellow'),
        line('Weight jump may be slightly aggressive', 'gray'),
      ], [
        line('Keep trying this weight', 'blue'),
        line('Strength adapts over time', 'gray'),
      ])
    );
  }
  
  // SIGNIFICANTLY BELOW
  return createAnalysisResult(
    transition, 'danger', weightChangePct, volChangePct, currReps, `~${expectedRepsInt}`,
    'Premature Jump',
    `+${pct}% weight, ${currReps} reps`,
    buildStructured(`+${pct}% weight`, 'up', [
      line(`Only ${currReps} reps (expected ~${expectedRepsInt})`, 'red'),
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
  bestOneRM: number
): AnalysisResult => {
  const expectedRepsRaw = predictReps(bestOneRM, currWeight);
  const expectedRepsInt = Math.round(expectedRepsRaw);
  
  const prevVol = prevWeight * prevReps;
  const currVol = currWeight * currReps;
  const volChangePct = calculatePercentChange(prevVol, currVol);
  const pct = roundTo(weightChangePct, 0);
  
  // MET OR EXCEEDED EXPECTATIONS
  if (currReps >= expectedRepsInt) {
    return createAnalysisResult(
      transition, 'success', weightChangePct, volChangePct, currReps, `~${expectedRepsInt}`,
      'Effective Backoff',
      `${pct}% weight, ${currReps} reps`,
      buildStructured(`${pct}% weight`, 'down', [
        line('Smart backoff for volume', 'green'),
        line('Reduced neural fatigue while maintaining work', 'gray'),
      ])
    );
  }
  
  // SLIGHTLY BELOW
  if (currReps >= expectedRepsInt - 3) {
    return createAnalysisResult(
      transition, 'info', weightChangePct, volChangePct, currReps, `~${expectedRepsInt}`,
      'Fatigued Backoff',
      `${pct}% weight, ${currReps} reps`,
      buildStructured(`${pct}% weight`, 'down', [
        line(`Got ${currReps} reps (expected ~${expectedRepsInt})`, 'yellow'),
        line('Accumulated fatigue from earlier sets', 'gray'),
      ])
    );
  }
  
  // SIGNIFICANTLY BELOW
  return createAnalysisResult(
    transition, 'warning', weightChangePct, volChangePct, currReps, `~${expectedRepsInt}`,
    'Heavy Fatigue',
    `${pct}% weight, ${currReps} reps`,
    buildStructured(`${pct}% weight`, 'down', [
      line(`Only ${currReps} reps (expected ~${expectedRepsInt})`, 'red'),
      line('High accumulated fatigue', 'gray'),
    ], [
      line('Good if training to failure intentionally', 'green'),
      line('Otherwise: end exercise or rest longer', 'gray'),
    ])
  );
};

// Helper to check if a set is a warmup (based on set_type field from CSV only)
export const isWarmupSet = (set: WorkoutSet): boolean => {
  return set.set_type?.toLowerCase().includes('warmup') || set.set_type?.toLowerCase() === 'w';
};

export const analyzeSetProgression = (sets: WorkoutSet[]): AnalysisResult[] => {
  // Filter out warmup sets (based on set_type field)
  const workingSets = sets.filter(s => !isWarmupSet(s));
  
  if (workingSets.length < 2) return [];

  const results: AnalysisResult[] = [];
  
  // Track best 1RM from working sets only
  let bestSession1RM = 0;
  for (const set of workingSets) {
    const metrics = extractSetMetrics(set);
    bestSession1RM = Math.max(bestSession1RM, metrics.oneRM);
  }

  for (let i = 1; i < workingSets.length; i++) {
    const prev = extractSetMetrics(workingSets[i - 1]);
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
      result = analyzeWeightIncrease(
        transition, weightChangePct, 
        prev.weight, curr.weight, 
        prev.reps, curr.reps, 
        bestSession1RM
      );
    } 
    // Weight decreased (backoff/drop set)
    else {
      result = analyzeWeightDecrease(
        transition, weightChangePct,
        prev.weight, curr.weight,
        prev.reps, curr.reps,
        bestSession1RM
      );
    }

    results.push(result);
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