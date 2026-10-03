import type { DailySummary, ExerciseStats, WorkoutSet } from '../../../types';
import type { WeightUnit } from '../../storage/localStorage';
import type { DashboardInsights, ExercisePlateauInfo } from '../insights';
import type { ExerciseTrendCoreResult } from '../exerciseTrend/exerciseTrendCore';
import { pickDeterministicIndex } from '../common';
import { analyzeExerciseTrendCore } from '../exerciseTrend';
import { isWarmupSet } from '../classification';
import { getSessionKey } from '../../date/dateUtils';
import { differenceInCalendarDays } from 'date-fns';
import { formatDisplayVolume, getDisplayVolume } from '../../format/volumeDisplay';
import { formatLargeNumber } from '../../data/comparisonData';
import { convertWeight } from '../../format/units';
import { stripExerciseSourceLabel } from '../../exercise/exerciseSourceLabel';

export interface DashboardSummaryInput {
  dashboardInsights: DashboardInsights;
  filteredData: WorkoutSet[];
  dailyData: DailySummary[];
  exerciseStats: ExerciseStats[];
  activePlateauExercises: ExercisePlateauInfo[];
  totalWorkouts: number;
  totalSets: number;
  totalPRs: number;
  effectiveNow: Date;
  weightUnit: WeightUnit;
  filterCacheKey: string;
  exerciseTrendResults?: Map<string, ExerciseTrendCoreResult>;
  /** Optional strength balance warning lines, rendered as its own block at the end of the overview. */
  strengthBalanceItems?: StrengthBalanceItem[] | null;
  /** Optional one-line TL;DR synthesizing the strength balance findings. */
  strengthBalanceTldr?: string | null;
}

export interface SummarySegment {
  text: string;
  type: 'text' | 'exercise' | 'date';
  exerciseName?: string;
  date?: Date;
}

export interface StrengthBalanceItem {
  segments: SummarySegment[];
  confidence: 'high' | 'medium';
}

export interface DashboardSummaryResult {
  text: string;
  sentences: string[];
  seedKey: string;
  segments: SummarySegment[];
  /** Strength balance warning lines, rendered separately as its own block. */
  strengthBalanceItems: StrengthBalanceItem[];
  /** One-line TL;DR synthesizing the strength balance findings. */
  strengthBalanceTldr: string | null;
}

type CandidateCategory = 'recent' | 'momentum' | 'weekly' | 'streak' | 'pr' | 'plateau' | 'variety' | 'exercise' | 'recovery' | 'fallback';

type SummaryCandidate = {
  category: CandidateCategory;
  priority: number;
  text: string;
  segments: SummarySegment[];
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfRollingWindow = (now: Date, days: number): Date => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

const getRecentWorkingSets = (data: WorkoutSet[], now: Date, days: number): WorkoutSet[] => {
  const start = getStartOfRollingWindow(now, days);
  return data.filter((set) => {
    if (!set.parsedDate) return false;
    if (set.parsedDate < start || set.parsedDate > now) return false;
    return !isWarmupSet(set);
  });
};

const sentenceCaseName = (exerciseName: string): string => ' ' + stripExerciseSourceLabel(exerciseName);

const segText = (str: string): SummarySegment => ({ text: str, type: 'text' });
const segExercise = (name: string): SummarySegment => ({
  text: sentenceCaseName(name),
  type: 'exercise',
  exerciseName: name,
});
const segDate = (d: Date, str: string): SummarySegment => ({
  text: str,
  type: 'date',
  date: d,
});

const compactSuggestion = (suggestion: string): string => {
  const firstSentence = suggestion.split(/[.!?]/)[0]?.trim() ?? suggestion.trim();
  if (firstSentence.length <= 120) return firstSentence;
  return `${firstSentence.slice(0, 117).trim()}...`;
};

const formatSignedPercent = (value: number): string => `${value > 0 ? '+' : ''}${Math.round(value)}%`;

const pushRecentSessionCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const recentSets = getRecentWorkingSets(input.filteredData, input.effectiveNow, 7);
  if (recentSets.length === 0) return;

  const sessionMap = new Map<string, { date: Date; exercises: Map<string, number> }>();

  for (const set of recentSets) {
    const key = getSessionKey(set);
    if (!key) continue;
    const existing = sessionMap.get(key);
    const date = set.parsedDate ?? input.effectiveNow;
    if (!existing) {
      sessionMap.set(key, { date, exercises: new Map([[set.exercise_title, 1]]) });
    } else {
      if (date > existing.date) existing.date = date;
      existing.exercises.set(set.exercise_title, (existing.exercises.get(set.exercise_title) ?? 0) + 1);
    }
  }

  const sortedSessions = Array.from(sessionMap.entries()).sort(
    (a, b) => b[1].date.getTime() - a[1].date.getTime()
  );

  const lastSession = sortedSessions[0];
  if (lastSession) {
    const exercises = Array.from(lastSession[1].exercises.entries()).sort((a, b) => b[1] - a[1]);
    const topExercise = exercises[0];
    const uniqueCount = exercises.length;
    const totalSets = exercises.reduce((sum, [, count]) => sum + count, 0);

    candidates.push({
      category: 'recent',
      priority: 99,
      text: `Your last session had ${totalSets} working set${totalSets === 1 ? '' : 's'} across ${uniqueCount} exercise${uniqueCount === 1 ? '' : 's'}${topExercise ? `, led by ${sentenceCaseName(topExercise[0])}` : ''}.`,
      segments: [
        segText('Your last session had '),
        segText(`${totalSets}`),
        segText(` working set${totalSets === 1 ? '' : 's'} across `),
        segText(`${uniqueCount}`),
        segText(` exercise${uniqueCount === 1 ? '' : 's'}`),
        ...(topExercise ? [segText(', led by '), segExercise(topExercise[0])] : []),
        segText('.'),
      ],
    });
  }

  if (sortedSessions.length >= 2) {
    const prevSession = sortedSessions[1];
    const prevExercises = Array.from(prevSession[1].exercises.entries()).sort((a, b) => b[1] - a[1]);
    const prevTop = prevExercises[0];
    const prevUnique = prevExercises.length;
    const prevTotalSets = prevExercises.reduce((sum, [, count]) => sum + count, 0);

    candidates.push({
      category: 'recent',
      priority: 96,
      text: `Your previous session had ${prevTotalSets} working set${prevTotalSets === 1 ? '' : 's'} across ${prevUnique} exercise${prevUnique === 1 ? '' : 's'}${prevTop ? `, led by ${sentenceCaseName(prevTop[0])}` : ''}.`,
      segments: [
        segText('Your previous session had '),
        segText(`${prevTotalSets}`),
        segText(` working set${prevTotalSets === 1 ? '' : 's'} across `),
        segText(`${prevUnique}`),
        segText(` exercise${prevUnique === 1 ? '' : 's'}`),
        ...(prevTop ? [segText(', led by '), segExercise(prevTop[0])] : []),
        segText('.'),
      ],
    });
  }
};

const pushMomentumCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const { rolling7d, rolling30d, prInsights, streakInfo } = input.dashboardInsights;
  const current = rolling7d.current;

  if (current.totalWorkouts === 0 && !streakInfo.isOnStreak) return;

  // Build momentum assessment from multiple signals
  let signals: string[] = [];
  let momentumScore = 0; // positive = heating up, negative = cooling

  // Volume signal
  if (rolling7d.eligible && rolling7d.volume) {
    if (rolling7d.volume.direction === 'up' && Math.abs(rolling7d.volume.deltaPercent) >= 5) {
      signals.push(`volume up ${Math.abs(rolling7d.volume.deltaPercent)}%`);
      momentumScore += 2;
    } else if (rolling7d.volume.direction === 'down' && Math.abs(rolling7d.volume.deltaPercent) >= 5) {
      signals.push(`volume down ${Math.abs(rolling7d.volume.deltaPercent)}%`);
      momentumScore -= 2;
    }
  }

  // Sets signal
  if (rolling7d.eligible && rolling7d.sets) {
    if (rolling7d.sets.direction === 'up' && Math.abs(rolling7d.sets.deltaPercent) >= 5) {
      signals.push(`${Math.abs(rolling7d.sets.deltaPercent)}% more sets`);
      momentumScore += 1;
    } else if (rolling7d.sets.direction === 'down' && Math.abs(rolling7d.sets.deltaPercent) >= 5) {
      signals.push(`${Math.abs(rolling7d.sets.deltaPercent)}% fewer sets`);
      momentumScore -= 1;
    }
  }

  // Frequency signal
  if (rolling7d.eligible && rolling7d.workouts) {
    if (rolling7d.workouts.direction === 'up' && rolling7d.workouts.delta > 0) {
      signals.push(`${rolling7d.workouts.delta} extra session${rolling7d.workouts.delta > 1 ? 's' : ''}`);
      momentumScore += 2;
    } else if (rolling7d.workouts.direction === 'down' && rolling7d.workouts.delta < 0) {
      signals.push(`${Math.abs(rolling7d.workouts.delta)} fewer session${Math.abs(rolling7d.workouts.delta) > 1 ? 's' : ''}`);
      momentumScore -= 2;
    }
  }

  // PR signal
  if (rolling7d.current.totalPRs > 0) {
    signals.push(`${rolling7d.current.totalPRs} PR${rolling7d.current.totalPRs > 1 ? 's' : ''}`);
    momentumScore += 2;
  } else if (prInsights.prDrought) {
    signals.push(`no PRs in ${prInsights.daysSinceLastPR} days`);
    momentumScore -= 1;
  }

  // Streak signal
  if (streakInfo.currentStreak >= 3) {
    signals.push(`${streakInfo.currentStreak}-week streak`);
    momentumScore += 1;
  } else if (streakInfo.streakType === 'cold' && current.totalWorkouts === 0) {
    momentumScore -= 1;
  }

  if (signals.length === 0) return;

  // Pick the top 2 most important signals
  const topSignals = signals.slice(0, 2).join(', ');

  let momentumLabel: string;
  if (momentumScore >= 3) momentumLabel = 'heating up';
  else if (momentumScore >= 1) momentumLabel = 'building';
  else if (momentumScore <= -2) momentumLabel = 'cooling';
  else if (momentumScore <= -1) momentumLabel = 'soft';
  else momentumLabel = 'steady';

  candidates.push({
    category: 'momentum',
    priority: 97,
    text: `Overall momentum is ${momentumLabel}: ${topSignals} over the last 7 days.`,
    segments: [segText(` Overall momentum is ${momentumLabel}: ${topSignals} over the last 7 days.`)],
  });
};

const pushRecoveryCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const recentSets = getRecentWorkingSets(input.filteredData, input.effectiveNow, 30);
  if (recentSets.length === 0) return;

  // Find the most recent workout date
  let mostRecentDate: Date | null = null;
  for (const set of recentSets) {
    if (set.parsedDate && (!mostRecentDate || set.parsedDate > mostRecentDate)) {
      mostRecentDate = set.parsedDate;
    }
  }

  if (!mostRecentDate) return;

  const daysSince = differenceInCalendarDays(input.effectiveNow, mostRecentDate);

  if (daysSince >= 7) {
    candidates.push({
      category: 'recovery',
      priority: 75,
      text: `It's been ${daysSince} days since your last session. Time to get back in.`,
      segments: [segText(`It's been ${daysSince} days since your last session. Time to get back in.`)],
    });
  } else if (daysSince >= 5) {
    candidates.push({
      category: 'recovery',
      priority: 55,
      text: `It's been ${daysSince} days since your last workout. You're due for the next one.`,
      segments: [segText(`It's been ${daysSince} days since your last workout. You're due for the next one.`)],
    });
  }

  // Check for potential overtraining: 4+ sessions in last 7 days
  const sessionsInLast7d = new Set<string>();
  const last7Sets = getRecentWorkingSets(input.filteredData, input.effectiveNow, 7);
  for (const set of last7Sets) {
    const key = getSessionKey(set);
    if (key) sessionsInLast7d.add(key);
  }

  if (sessionsInLast7d.size >= 4) {
    candidates.push({
      category: 'recovery',
      priority: 54,
      text: `${sessionsInLast7d.size} sessions in the last 7 days. Watch your recovery and sleep.`,
      segments: [segText(`${sessionsInLast7d.size} sessions in the last 7 days. Watch your recovery and sleep.`)],
    });
  }
};

const pushWeeklyCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const { rolling7d } = input.dashboardInsights;
  const current = rolling7d.current;

  if (current.totalWorkouts <= 0) return;

  if (rolling7d.eligible) {
    if (rolling7d.sets && Math.abs(rolling7d.sets.deltaPercent) >= 8) {
      const isUp = rolling7d.sets.direction === 'up';
      const absPct = Math.abs(Math.round(rolling7d.sets.deltaPercent));
      const text = isUp
        ? `Strong last 7 days: ${formatLargeNumber(current.totalSets)} sets, up ${absPct}% from last week.`
        : ` Last week was lighter by ${absPct}% vs the previous week, so this is a good moment to rebuild momentum.`;
      candidates.push({
        category: 'weekly',
        priority: isUp ? 95 : 72,
        text,
        segments: [segText(text)],
      });
    }

    if (rolling7d.volume && Math.abs(rolling7d.volume.deltaPercent) >= 8) {
      const displayVolume = formatLargeNumber(getDisplayVolume(current.totalVolume, input.weightUnit, { round: 'int' }));
      const isUp = rolling7d.volume.direction === 'up';
      const absPct = Math.abs(Math.round(rolling7d.volume.deltaPercent));
      const text = isUp
        ? ` Volume is up ${absPct}% from last week, climbing to ${displayVolume}${input.weightUnit}.`
        : `Volume dipped by ${absPct}% vs last week to ${displayVolume}${input.weightUnit}. Time for a steady session next.`;
      candidates.push({
        category: 'weekly',
        priority: isUp ? 92 : 70,
        text,
        segments: [segText(text)],
      });
    }

    if (rolling7d.workouts && rolling7d.workouts.direction === 'up') {
      candidates.push({
        category: 'weekly',
        priority: 86,
        text: `You trained ${current.totalWorkouts} times in the last 7 days, up from ${rolling7d.previous.totalWorkouts}. That consistency is a real progress signal.`,
        segments: [segText(`You trained ${current.totalWorkouts} times in the last 7 days, up from ${rolling7d.previous.totalWorkouts}. That consistency is a real progress signal.`)],
      });
    }
  }

  // Baseline weekly sentence — always include delta context if available
  let baselineText = `Over the last 7 days: ${current.totalWorkouts} workout${current.totalWorkouts === 1 ? '' : 's'} and ${formatLargeNumber(current.totalSets)} working sets`;

  if (rolling7d.eligible && rolling7d.sets && Math.abs(rolling7d.sets.deltaPercent) >= 3) {
    baselineText += ` (${formatSignedPercent(rolling7d.sets.deltaPercent)} vs previous week)`;
  } else if (rolling7d.eligible && rolling7d.workouts && rolling7d.workouts.delta !== 0) {
    const deltaLabel = rolling7d.workouts.delta > 0 ? 'up' : 'down';
    baselineText += ` (${Math.abs(rolling7d.workouts.delta)} ${deltaLabel} from last week)`;
  }
  baselineText += '.';

  candidates.push({
    category: 'weekly',
    priority: 55,
    text: baselineText,
    segments: [segText(baselineText)],
  });
};

const pushStreakCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const { streakInfo } = input.dashboardInsights;

  if (streakInfo.currentStreak >= 2) {
    const tone = streakInfo.currentStreak >= 6 ? 'incredible' : streakInfo.currentStreak >= 4 ? 'solid' : 'strong';
    const article = tone === 'incredible' ? 'an' : 'a';
    candidates.push({
      category: 'streak',
      priority: streakInfo.currentStreak >= 4 ? 90 : 76,
      text: `You're on ${article} ${tone} ${streakInfo.currentStreak}-week training streak with ${streakInfo.consistencyScore}% consistency. Keep this chain alive.`,
      segments: [segText(`You're on ${article} ${tone} ${streakInfo.currentStreak}-week training streak with ${streakInfo.consistencyScore}% consistency. Keep this chain alive.`)],
    });
  } else if (streakInfo.workoutsThisWeek > 0) {
    candidates.push({
      category: 'streak',
      priority: 60,
      text: `You've already got ${streakInfo.workoutsThisWeek} workout${streakInfo.workoutsThisWeek === 1 ? '' : 's'} on the board this week. Now stack the next clean session.`,
      segments: [segText(`You've already got ${streakInfo.workoutsThisWeek} workout${streakInfo.workoutsThisWeek === 1 ? '' : 's'} on the board this week. Now stack the next clean session.`)],
    });
  }
};

const pushPrCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const { prInsights, rolling7d } = input.dashboardInsights;
  const recentPr = prInsights.recentPRs[0];

  if (rolling7d.current.totalPRs > 0) {
    const frequencyText = prInsights.prFrequency > 0
      ? ` (${prInsights.prFrequency}/week average)`
      : '';
    candidates.push({
      category: 'pr',
      priority: 94,
      text: ` PR momentum is live: ${rolling7d.current.totalPRs} PR set${rolling7d.current.totalPRs === 1 ? '' : 's'} in the last 7 days${frequencyText}${recentPr ? `, led by ${sentenceCaseName(recentPr.exercise)}` : ''}.`,
      segments: [
        segText(` PR momentum is live: ${rolling7d.current.totalPRs} PR set${rolling7d.current.totalPRs === 1 ? '' : 's'} in the last 7 days${frequencyText}`),
        ...(recentPr ? [segText(', led by '), segExercise(recentPr.exercise)] : []),
        segText('.'),
      ],
    });
  } else if (prInsights.prDrought && prInsights.lastPRExercise) {
    candidates.push({
      category: 'pr',
      priority: 64,
      text: `It’s been ${prInsights.daysSinceLastPR} days since your last PR on ${sentenceCaseName(prInsights.lastPRExercise)}. Consider chasing a small rep or load win instead of grinding for a max.`,
      segments: [
        segText(`It’s been ${prInsights.daysSinceLastPR} days since your last PR on `),
        segExercise(prInsights.lastPRExercise),
        segText('. Consider chasing a small rep or load win instead of grinding for a max.'),
      ],
    });
  } else if (prInsights.daysSinceLastPR > 0 && prInsights.lastPRExercise) {
    candidates.push({
      category: 'pr',
      priority: 58,
      text: `Your latest PR was ${prInsights.daysSinceLastPR} day${prInsights.daysSinceLastPR === 1 ? '' : 's'} ago on ${sentenceCaseName(prInsights.lastPRExercise)}, solid proof you're still progressing.`,
      segments: [
        segText(`Your latest PR was ${prInsights.daysSinceLastPR} day${prInsights.daysSinceLastPR === 1 ? '' : 's'} ago on `),
        segExercise(prInsights.lastPRExercise),
        segText(', solid proof you\'re still progressing.'),
      ],
    });
  }
};

const pushPlateauCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const plateau = input.activePlateauExercises[0];
  if (!plateau) return;

  const stat = input.exerciseStats.find((s) => s.name === plateau.exerciseName);
  const lastHistory = stat?.history[0];
  const lastDate = lastHistory?.date;

  const loadText = plateau.isBodyweightLike
    ? `${plateau.lastReps} reps`
    : `${convertWeight(plateau.lastWeight, input.weightUnit)}${input.weightUnit}${plateau.loadProgressionDirection === 'lower' ? ' support' : ''} × ${plateau.lastReps}`;

  const stuckText = plateau.sessionsSinceProgress > 2
    ? `it has been stuck for ${plateau.sessionsSinceProgress} sessions at `
    : `it was last logged around `;

  const suggestionText = compactSuggestion(plateau.suggestion);

  candidates.push({
    category: 'plateau',
    priority: 88,
    text: `${sentenceCaseName(plateau.exerciseName)} needs attention, ${stuckText}${loadText}. ${suggestionText}.`,
    segments: [
      segExercise(plateau.exerciseName),
      segText(` needs attention, ${stuckText}`),
      ...(lastDate ? [segDate(lastDate, loadText)] : [segText(loadText)]),
      segText('. '),
      segText(suggestionText),
      segText('.'),
    ],
  });
};

const pushVarietyCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const recentSets = getRecentWorkingSets(input.filteredData, input.effectiveNow, 7);
  if (recentSets.length === 0) return;

  const exerciseCounts = new Map<string, number>();
  const sessions = new Set<string>();

  for (const set of recentSets) {
    const name = set.exercise_title;
    exerciseCounts.set(name, (exerciseCounts.get(name) ?? 0) + 1);
    const sessionKey = getSessionKey(set);
    if (sessionKey) sessions.add(sessionKey);
  }

  const uniqueExercises = exerciseCounts.size;
  const topExercise = Array.from(exerciseCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  if (uniqueExercises >= 5) {
    candidates.push({
      category: 'variety',
      priority: 78,
      text: `Nice variety: ${uniqueExercises} exercises across ${sessions.size} session${sessions.size === 1 ? '' : 's'}, with ${topExercise ? sentenceCaseName(topExercise[0]) : 'your main lifts'} getting the most attention.`,
      segments: [
        segText(`Nice variety: ${uniqueExercises} exercises across ${sessions.size} session${sessions.size === 1 ? '' : 's'}, with `),
        ...(topExercise ? [segExercise(topExercise[0])] : [segText('your main lifts')]),
        segText(' getting the most attention.'),
      ],
    });
  } else if (topExercise && topExercise[1] >= Math.max(6, recentSets.length * 0.35)) {
    candidates.push({
      category: 'variety',
      priority: 62,
      text: `${sentenceCaseName(topExercise[0])} dominated with ${topExercise[1]} sets. Great focus, just make sure the rest of your training stays balanced.`,
      segments: [
        segExercise(topExercise[0]),
        segText(` dominated with ${topExercise[1]} sets. Great focus, just make sure the rest of your training stays balanced.`),
      ],
    });
  }
};

const pushExerciseTrendCandidates = (input: DashboardSummaryInput, candidates: SummaryCandidate[]) => {
  const recentSets = getRecentWorkingSets(input.filteredData, input.effectiveNow, 7);
  const recentExerciseNames = new Set(recentSets.map((s) => s.exercise_title));

  const trendCandidates = input.exerciseStats
    .filter((stats) => recentExerciseNames.has(stats.name))
    .map((stats) => ({ stats, trend: input.exerciseTrendResults?.get(stats.name) ?? analyzeExerciseTrendCore(stats, { trendMode: 'reactive' }) }))
    .filter(({ trend }) => trend.confidence !== 'low' && typeof trend.diffPct === 'number')
    .sort((a, b) => Math.abs(b.trend.diffPct ?? 0) - Math.abs(a.trend.diffPct ?? 0));

  const improving = trendCandidates.find(({ trend }) => trend.status === 'overload' && (trend.diffPct ?? 0) > 2);
  if (improving) {
    const diffPct = Math.abs(Math.round(improving.trend.diffPct ?? 0));
    const tone = diffPct >= 25 ? 'crushing it' : diffPct >= 15 ? 'trending strong' : 'trending up';
    candidates.push({
      category: 'exercise',
      priority: 82,
      text: `${sentenceCaseName(improving.stats.name)} is ${tone}, recent strength moving ${diffPct}% up.`,
      segments: [
        segExercise(improving.stats.name),
        segText(` is ${tone}, recent strength moving ${diffPct}% up.`),
      ],
    });
  }

  const regressing = trendCandidates.find(({ trend }) => trend.status === 'regression' && (trend.diffPct ?? 0) < -3);
  if (regressing) {
    const diffPct = Math.abs(Math.round(regressing.trend.diffPct ?? 0));
    const tone = diffPct >= 20 ? 'down significantly' : 'down';
    candidates.push({
      category: 'exercise',
      priority: 66,
      text: `${sentenceCaseName(regressing.stats.name)} is ${tone} ${diffPct}% recently. Keep your next session controlled and rebuild clean reps.`,
      segments: [
        segExercise(regressing.stats.name),
        segText(` is ${tone} ${diffPct}% recently. Keep your next session controlled and rebuild clean reps.`),
      ],
    });
  }
};

const selectSentences = (candidates: SummaryCandidate[], seedKey: string): { texts: string[]; segmentArrays: SummarySegment[][] } => {
  const selected: SummaryCandidate[] = [];
  const usedCategories = new Set<CandidateCategory>();
  const targetCount = candidates.length >= 4 ? 4 : Math.min(3, candidates.length);

  while (selected.length < targetCount) {
    const eligible = candidates
      .filter((candidate) => !usedCategories.has(candidate.category) && !selected.includes(candidate))
      .sort((a, b) => b.priority - a.priority || a.category.localeCompare(b.category));

    if (eligible.length === 0) break;

    const topPool = eligible.slice(0, Math.min(6, eligible.length));
    const picked = topPool[pickDeterministicIndex(`${seedKey}|slot-${selected.length}`, topPool.length)];
    selected.push(picked);
    usedCategories.add(picked.category);
  }

  return {
    texts: selected.map((candidate) => candidate.text),
    segmentArrays: selected.map((candidate) => candidate.segments),
  };
};

export const buildDashboardSummary = (input: DashboardSummaryInput): DashboardSummaryResult => {
  const dateKey = formatDateKey(input.effectiveNow);
  const rolling = input.dashboardInsights.rolling7d.current;
  const plateauKey = input.activePlateauExercises.map((p) => p.exerciseName).join('|');
  const seedKey = [
    'dashboard-summary',
    dateKey,
    input.filterCacheKey,
    rolling.totalWorkouts,
    rolling.totalSets,
    rolling.totalVolume,
    rolling.totalPRs,
    input.dashboardInsights.streakInfo.currentStreak,
    input.dashboardInsights.prInsights.daysSinceLastPR,
    plateauKey,
  ].join('|');

  const candidates: SummaryCandidate[] = [];
  pushRecentSessionCandidates(input, candidates);
  pushMomentumCandidates(input, candidates);
  pushWeeklyCandidates(input, candidates);
  pushStreakCandidates(input, candidates);
  pushPrCandidates(input, candidates);
  pushPlateauCandidates(input, candidates);
  pushVarietyCandidates(input, candidates);
  pushExerciseTrendCandidates(input, candidates);
  pushRecoveryCandidates(input, candidates);

  if (candidates.length === 0) {
    const fallbackText = input.totalWorkouts > 0
      ? `You've logged ${input.totalWorkouts} workout${input.totalWorkouts === 1 ? '' : 's'}, ${input.totalSets} working sets, and ${input.totalPRs} PR${input.totalPRs === 1 ? '' : 's'} in this view, keep building from the data you have.`
      : 'Import or widen your workout data to unlock a personalized training overview here.';
    candidates.push({
      category: 'fallback',
      priority: 1,
      text: fallbackText,
      segments: [segText(fallbackText)],
    });
  }

  const { texts, segmentArrays } = selectSentences(candidates, seedKey);
  const flatSegments = segmentArrays.reduce<SummarySegment[]>((acc, arr) => {
    if (acc.length > 0 && arr.length > 0) {
      acc.push(segText(' '));
    }
    acc.push(...arr);
    return acc;
  }, []);

  const anomalyItems = input.strengthBalanceItems ?? [];

  return {
    text: texts.join(' '),
    sentences: texts,
    seedKey,
    segments: flatSegments,
    strengthBalanceItems: anomalyItems,
    strengthBalanceTldr: input.strengthBalanceTldr ?? null,
  };
};
