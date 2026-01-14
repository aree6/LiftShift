import { format } from 'date-fns';
import { ExerciseHistoryEntry, ExerciseStats } from '../../types';

export type ExerciseTrendStatus = 'overload' | 'stagnant' | 'regression' | 'neutral' | 'new' | 'fake_pr';

export const MIN_SESSIONS_FOR_TREND = 4;

export interface ExerciseSessionEntry {
  date: Date;
  weight: number;
  reps: number;
  oneRepMax: number;
  volume: number;
  sets: number;
  totalReps: number;
  maxReps: number;
}

export interface ExerciseTrendCoreResult {
  status: ExerciseTrendStatus;
  isBodyweightLike: boolean;
  diffPct?: number;
  confidence?: 'low' | 'medium' | 'high';
  evidence?: string[];
  plateau?: {
    weight: number;
    minReps: number;
    maxReps: number;
  };
}

export const WEIGHT_STATIC_EPSILON_KG = 0.5;
const MIN_SIGNAL_REPS = 2;
const REP_STATIC_EPSILON = 1;
const TREND_PCT_THRESHOLD = 1.0; // Reduced from 2.5% to 1.0% for more granular detection
const TREND_MIN_ABS_1RM_KG = 0.25;
const TREND_MIN_ABS_REPS = 1;

// Fake PR detection constants
const FAKE_PR_SPIKE_THRESHOLD = 5.0; // Reduced from 8% to 5% - more lenient spike detection
const FAKE_PR_FOLLOWUP_REGRESSION = -2.0; // Reduced from 3% to 2% - easier to trigger follow-up regression
const FAKE_PR_POST_PR_DROP_THRESHOLD = -2.5; // Reduced from 4% to 2.5% - more lenient post-PR drop detection

const avg = (xs: number[]): number => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const clampEvidence = (xs: string[], max: number = 3): string[] | undefined => {
  const cleaned = xs.filter(Boolean).slice(0, max);
  return cleaned.length > 0 ? cleaned : undefined;
};

const keepDynamicEvidence = (xs: string[] | undefined): string[] | undefined => {
  if (!xs || xs.length === 0) return undefined;
  // Keep only lines that contain at least one digit so we don't repeat generic prose.
  const filtered = xs.filter(t => /\d/.test(t));
  return filtered.length > 0 ? filtered : undefined;
};

const fmtSignedPct = (pct: number): string => {
  if (!Number.isFinite(pct)) return '0.0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
};

const getConfidence = (historyLen: number, windowSize: number): 'low' | 'medium' | 'high' => {
  if (historyLen < MIN_SESSIONS_FOR_TREND) return 'low';
  if (historyLen >= 10 && windowSize >= 6) return 'high';
  if (historyLen >= 6) return 'medium';
  return 'low';
};

export const summarizeExerciseHistory = (history: ExerciseHistoryEntry[]): ExerciseSessionEntry[] => {
  const bySession = new Map<string, ExerciseSessionEntry>();

  for (const h of history) {
    const d = h.date;
    if (!d) continue;

    const ts = d.getTime();
    const key = Number.isFinite(ts) ? String(ts) : format(d, 'yyyy-MM-dd');

    let entry = bySession.get(key);
    if (!entry) {
      entry = {
        date: d,
        weight: 0,
        reps: 0,
        oneRepMax: 0,
        volume: 0,
        sets: 0,
        totalReps: 0,
        maxReps: 0,
      };
      bySession.set(key, entry);
    }

    entry.sets += 1;
    entry.volume += h.volume || 0;
    entry.totalReps += h.reps || 0;
    entry.maxReps = Math.max(entry.maxReps, h.reps || 0);

    if ((h.oneRepMax || 0) >= (entry.oneRepMax || 0)) {
      entry.oneRepMax = h.oneRepMax || 0;
      entry.weight = h.weight || 0;
      entry.reps = h.reps || 0;
    }
  }

  return Array.from(bySession.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const analyzeExerciseTrendCore = (stats: ExerciseStats): ExerciseTrendCoreResult => {
  const history = summarizeExerciseHistory(stats.history);

  // No usable history yet.
  if (history.length === 0) {
    return {
      status: 'new',
      isBodyweightLike: false,
      confidence: 'low',
    };
  }

  const recent = history.slice(0, Math.min(4, history.length));
  const weights = recent.map(h => h.weight);
  const reps = recent.map(h => h.maxReps);
  // Safe max for short windows.
  const maxWeightInRecent = Math.max(0, ...weights);
  const maxRepsInRecent = Math.max(0, ...reps);
  const zeroWeightSessions = weights.filter(w => w <= 0.0001).length;
  const isBodyweightLike = zeroWeightSessions >= Math.ceil(recent.length * 0.75);

  const hasMeaningfulSignal = isBodyweightLike
    ? maxRepsInRecent >= MIN_SIGNAL_REPS
    : maxWeightInRecent > 0.0001;

  if (!hasMeaningfulSignal) {
    return {
      status: 'new',
      isBodyweightLike,
      confidence: 'low',
      evidence: keepDynamicEvidence(clampEvidence([
        // Keep this dynamic: it will show "weight ≈ 0" which contains a digit.
        isBodyweightLike ? 'Most recent sessions look bodyweight-like (weight ≈ 0).' : 'Most recent sessions have near-zero load.',
      ])),
    };
  }

  // Not enough history to compare windows reliably.
  if (history.length < MIN_SESSIONS_FOR_TREND) {
    return {
      status: 'new',
      isBodyweightLike,
      confidence: 'low',
      evidence: keepDynamicEvidence(clampEvidence([
        `Only ${history.length} session${history.length === 1 ? '' : 's'} logged (need ${MIN_SESSIONS_FOR_TREND}+).`,
      ])),
    };
  }

  const repsMetric = isBodyweightLike
    ? recent.map(h => h.maxReps)
    : recent.map(h => h.reps || (h.weight > 0 ? h.volume / h.weight : 0));
  const maxRepsMetric = Math.max(...repsMetric);
  const minRepsMetric = Math.min(...repsMetric);

  const isWeightStatic = weights.every(w => Math.abs(w - (weights[0] ?? 0)) < WEIGHT_STATIC_EPSILON_KG);
  const isRepStatic = (maxRepsMetric - minRepsMetric) <= REP_STATIC_EPSILON;

  if (isWeightStatic && isRepStatic) {
    const confidence = getConfidence(history.length, 4);
    return {
      status: 'stagnant',
      isBodyweightLike,
      confidence,
      evidence: keepDynamicEvidence(clampEvidence([
        isBodyweightLike
          ? `Top reps stayed within ~${Math.max(0, maxRepsMetric - minRepsMetric)} rep(s).`
          : `Top weight stayed within ~${WEIGHT_STATIC_EPSILON_KG}kg and reps within ~${REP_STATIC_EPSILON} rep(s).`,
      ])),
      plateau: {
        weight: weights[0] ?? 0,
        minReps: minRepsMetric,
        maxReps: maxRepsMetric,
      },
    };
  }

  // Trend: compare a recent window vs a previous window (3v3 if possible, else 2v2).
  const windowSize = history.length >= 6 ? 6 : 4;
  const window = history.slice(0, windowSize);

  const metric = isBodyweightLike
    ? window.map(h => h.maxReps)
    : window.map(h => h.oneRepMax);

  const half = windowSize / 2;
  const currentMetric = avg(metric.slice(0, half));
  const previousMetric = avg(metric.slice(half));
  const diffAbs = currentMetric - previousMetric;
  const diffPct = previousMetric > 0 ? (diffAbs / previousMetric) * 100 : 0;

  if (currentMetric <= 0 || previousMetric <= 0) {
    return {
      status: 'new',
      isBodyweightLike,
      confidence: 'low',
      evidence: undefined,
    };
  }

  const meetsOverload = isBodyweightLike
    ? diffAbs >= TREND_MIN_ABS_REPS && diffPct >= TREND_PCT_THRESHOLD
    : diffAbs >= TREND_MIN_ABS_1RM_KG && diffPct >= TREND_PCT_THRESHOLD;
  const meetsRegression = isBodyweightLike
    ? diffAbs <= -TREND_MIN_ABS_REPS && diffPct <= -TREND_PCT_THRESHOLD
    : diffAbs <= -TREND_MIN_ABS_1RM_KG && diffPct <= -TREND_PCT_THRESHOLD;

  if (meetsOverload) {
    const confidence = getConfidence(history.length, windowSize);
    return {
      status: 'overload',
      isBodyweightLike,
      diffPct,
      confidence,
      evidence: keepDynamicEvidence(clampEvidence([
        isBodyweightLike ? `Reps: ${fmtSignedPct(diffPct)}` : `Strength: ${fmtSignedPct(diffPct)}`,
      ])),
    };
  }

  if (meetsRegression) {
    const confidence = getConfidence(history.length, windowSize);
    return {
      status: 'regression',
      isBodyweightLike,
      diffPct,
      confidence,
      evidence: keepDynamicEvidence(clampEvidence([
        isBodyweightLike ? `Reps: ${fmtSignedPct(diffPct)}` : `Strength: ${fmtSignedPct(diffPct)}`,
      ])),
    };
  }

  // Fake PR detection: check for unsustainable spikes followed by regression
  if (history.length >= 3) {
    const latestSession = history[0];
    const previousSession = history[1];
    
    // Check if latest session was a big spike
    const latestMetric = isBodyweightLike ? latestSession.maxReps : latestSession.oneRepMax;
    const previousMetric = isBodyweightLike ? previousSession.maxReps : previousSession.oneRepMax;
    const spikePct = previousMetric > 0 ? ((latestMetric - previousMetric) / previousMetric) * 100 : 0;
    
    // Check if the session after the spike shows regression
    const hasFollowupRegression = diffPct <= FAKE_PR_FOLLOWUP_REGRESSION;
    
    // Check for post-PR drop pattern (PR followed by significant drop)
    let hasPostPRDrop = false;
    let postPRDropPct = 0;
    
    if (history.length >= 4 && spikePct >= 2.0) { // Reduced from 3% to 2% - catch smaller PRs
      const sessionAfterPR = history[1]; // Session right after the PR
      const sessionAfterPRMetric = isBodyweightLike ? sessionAfterPR.maxReps : sessionAfterPR.oneRepMax;
      postPRDropPct = latestMetric > 0 ? ((sessionAfterPRMetric - latestMetric) / latestMetric) * 100 : 0;
      hasPostPRDrop = postPRDropPct <= FAKE_PR_POST_PR_DROP_THRESHOLD;
    }
    
    const isFakePR = (spikePct >= FAKE_PR_SPIKE_THRESHOLD && hasFollowupRegression) ||
                     (spikePct >= 2.0 && hasPostPRDrop); // Focus on unsustainable PRs only
    
    if (isFakePR) {
      const confidence = getConfidence(history.length, windowSize);
      return {
        status: 'fake_pr',
        isBodyweightLike,
        diffPct: spikePct,
        confidence,
        evidence: keepDynamicEvidence(clampEvidence([
          `Spike: +${spikePct.toFixed(1)}%`,
          hasFollowupRegression ? `Follow-up: ${fmtSignedPct(diffPct)}` : undefined,
          hasPostPRDrop ? `Post-PR drop: ${fmtSignedPct(postPRDropPct)}` : undefined,
        ])),
      };
    }
  }

  const confidence = getConfidence(history.length, windowSize);
  return {
    status: 'neutral',
    isBodyweightLike,
    diffPct,
    confidence,
    evidence: undefined,
  };
};
