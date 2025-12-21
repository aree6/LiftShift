export type ExerciseNameResolveMethod =
  | 'exact'
  | 'case_insensitive'
  | 'alias'
  | 'normalized_exact'
  | 'normalized_case_insensitive'
  | 'fuzzy'
  | 'representative'
  | 'none';

export interface ExerciseNameResolution {
  name: string;
  method: ExerciseNameResolveMethod;
}

export interface ExerciseNameResolver {
  resolve: (rawName: string) => ExerciseNameResolution;
}

export type ExerciseNameResolverMode = 'strict' | 'relaxed';

export interface ExerciseNameResolverOptions {
  mode?: ExerciseNameResolverMode;
}

const STOP_TOKENS = new Set([
  'a',
  'an',
  'and',
  'or',
  'the',
  'to',
  'with',
  'on',
  'in',
  'of',
  'for',
  'at',
  'from',
  'version',
  'v',
  'ii',
  'iii',
  'iv',
  'smith',
  'band',
  'plate',
  'kettlebell',
  'bodyweight',
  'assisted',
  'straight',
  'bar',
  'grip',
  'wide',
  'close',
  'underhand',
  'overhand',
  'single',
  'arm',
  'one',
  'two',
  'left',
  'right',
  'neutral',
  'horizontal',
  'vertical',
]);

const RELAXED_STOP_TOKENS = new Set([
  'a',
  'an',
  'and',
  'or',
  'the',
  'to',
  'with',
  'on',
  'in',
  'of',
  'for',
  'at',
  'from',
  'version',
  'v',
  'ii',
  'iii',
  'iv',
  'straight',
  'bar',
  'grip',
  'wide',
  'close',
  'underhand',
  'overhand',
  'one',
  'two',
  'left',
  'right',
  'neutral',
]);

// Comprehensive manual aliases mapping common user exercise names to canonical CSV names
// Format: 'normalized user input': ['primary match', 'fallback matches...']
const EXERCISE_ALIASES: Record<string, string[]> = {
  // Face pulls
  'face pull': ['Face Pull', 'Cable Face Pull'],
  'face pull cable': ['Face Pull', 'Cable Face Pull'],

  // Triceps
  'triceps pushdown': ['Triceps Pushdown', 'Tricep Pushdown (Cable - Straight Bar)', 'Tricep Pushdown'],
  'tricep pushdown': ['Triceps Pushdown', 'Tricep Pushdown'],
  'triceps pushdown cable straight bar': ['Triceps Pushdown', 'Tricep Pushdown (Cable - Straight Bar)'],
  'rope pushdown': ['Tricep Pushdown (Cable - Rope)', 'Rope Pushdown'],
  'tricep rope pushdown': ['Tricep Pushdown (Cable - Rope)', 'Rope Pushdown'],
  'cable tricep pushdown': ['Triceps Pushdown', 'Tricep Pushdown'],
  'overhead triceps extension': ['Overhead Triceps Extension', 'Tricep Extension'],
  'skull crushers': ['Skull Crusher (Barbell)', 'Skullcrusher'],
  'skullcrusher': ['Skull Crusher (Barbell)', 'Skullcrusher'],

  // Dips
  'weighted dips': ['Chest Dip (Weighted)', 'Dip', 'Weighted Dip'],
  'dips': ['Dip', 'Chest Dip'],
  'chest dip': ['Chest Dip', 'Dip'],
  'tricep dips': ['Tricep Dip', 'Dip'],

  // Lat pulldowns
  'lat pulldown': ['Lat Pulldown (Cable)', 'Lat Pulldown', 'Cable Lat Pulldown'],
  'lat pull down': ['Lat Pulldown (Cable)', 'Lat Pulldown'],
  'lat pull in': ['Lat Pulldown (Cable)', 'Lat Pulldown'],
  'wide grip lat pulldown': ['Wide Grip Lat Pulldown', 'Lat Pulldown'],
  'close grip lat pulldown': ['Close Grip Lat Pulldown', 'Lat Pulldown'],

  // Chest flys
  'incline cable chest fly': ['Seated Chest Flys (Cable)', 'Incline Cable Fly', 'Cable Fly'],
  'cable fly': ['Cable Fly', 'Seated Chest Flys (Cable)'],
  'chest fly': ['Chest Fly (Dumbbell)', 'Dumbbell Fly', 'Fly'],
  'pec fly': ['Pec Deck', 'Chest Fly Machine', 'Machine Fly'],
  'pec deck': ['Pec Deck', 'Machine Fly'],

  // Curls - comprehensive coverage
  'ez bar curl': ['EZ Bar Biceps Curl', 'EZ Barbell Curl', 'Curl'],
  'ez bar bicep curl': ['EZ Bar Biceps Curl', 'EZ Barbell Curl'],
  'ez bar biceps curl': ['EZ Bar Biceps Curl', 'EZ Barbell Curl'],
  'ez barbell curl': ['EZ Barbell Curl', 'EZ Bar Biceps Curl'],
  'ez curl': ['EZ Bar Biceps Curl', 'EZ Barbell Curl', 'Curl'],
  'barbell curl': ['Barbell Curl', 'Biceps Curl (Barbell)'],
  'bicep curl': ['Bicep Curl (Dumbbell)', 'Dumbbell Bicep Curl', 'Biceps Curl'],
  'biceps curl': ['Biceps Curl', 'Bicep Curl (Dumbbell)'],
  'dumbbell curl': ['Bicep Curl (Dumbbell)', 'Dumbbell Bicep Curl', 'Dumbbell Curl'],
  'hammer curl': ['Hammer Curl (Dumbbell)', 'Dumbbell Hammer Curl', 'Hammer Curl'],
  'preacher curl': ['Preacher Curl (Dumbbell)', 'EZ Barbell Preacher Curl', 'Preacher Curl'],
  'cable curl': ['Cable Curl', 'Biceps Curl (Cable)'],
  'incline curl': ['Incline Dumbbell Curl', 'Incline Curl'],
  'concentration curl': ['Concentration Curl', 'Dumbbell Concentration Curl'],

  // Planks
  'plank': ['Plank', 'Front Plank'],
  'advanced plank': ['Plank', 'Front Plank'],
  'front plank': ['Front Plank', 'Plank'],
  'side plank': ['Side Plank'],
  'reverse plank': ['Reverse Plank', 'Reverse plank'],
  'weighted plank': ['Weighted Front Plank', 'Plank'],

  // Jump rope
  'jump rope': ['Jump Rope'],
  'jump rope timed': ['Jump Rope'],
  'skipping': ['Jump Rope', 'Bodyweight Skipping (male)'],
  'skipping rope': ['Jump Rope'],
  'rope jumping': ['Jump Rope'],

  // Reverse fly / Rear delt
  'reverse fly': ['Dumbbell Reverse Fly', 'Rear Fly', 'Reverse Fly'],
  'reverse fly dumbbell': ['Rear Delt Reverse Fly (Dumbbell)', 'Dumbbell Reverse Fly', 'Dumbbell Rear Delt Fly'],
  'dumbbell reverse fly': ['Dumbbell Reverse Fly', 'Rear Delt Reverse Fly (Dumbbell)'],
  'rear delt fly': ['Dumbbell Rear Delt Fly', 'Rear Delt Reverse Fly (Dumbbell)', 'Rear Fly'],
  'rear delt reverse fly': ['Rear Delt Reverse Fly (Dumbbell)', 'Dumbbell Rear Delt Fly'],
  'rear delt fly dumbbell': ['Dumbbell Rear Delt Fly', 'Rear Delt Reverse Fly (Dumbbell)'],
  'rear fly': ['Rear Fly', 'Dumbbell Rear Delt Fly'],
  'reverse fly cable': ['Rear Delt Reverse Fly (Cable)', 'Cable Standing Cross-over High Reverse Fly'],
  'rear delt cable fly': ['Rear Delt Reverse Fly (Cable)', 'Cable Seated Rear Delt Fly with Chest Support'],
  'rear lateral raise': ['Rear Lateral Raise', 'Incline Rear Lateral Raise'],

  // Toe touches / Flexibility
  'straight leg toe touch': ['Toe Touch', 'Standing Toe Touch', 'Hamstring Stretch'],
  'toe touch': ['Toe Touch', 'Standing Toe Touch'],

  // Rows
  'cable row': ['Seated Cable Row', 'Cable Row'],
  'seated row': ['Seated Cable Row', 'Seated Row (Machine)'],
  'bent over row': ['Bent Over Row (Barbell)', 'Barbell Row'],
  'barbell row': ['Bent Over Row (Barbell)', 'Barbell Row'],
  'dumbbell row': ['Dumbbell Row', 'Bent Over Row (Dumbbell)'],
  't bar row': ['T-Bar Row', 'T Bar Row'],
  'pendlay row': ['Pendlay Row', 'Bent Over Row (Barbell)'],

  // Bench press variations
  'bench press': ['Bench Press (Barbell)', 'Barbell Bench Press', 'Bench Press'],
  'barbell bench press': ['Bench Press (Barbell)', 'Barbell Bench Press'],
  'incline bench press': ['Incline Bench Press (Barbell)', 'Incline Barbell Bench Press'],
  'decline bench press': ['Decline Bench Press (Barbell)', 'Decline Barbell Bench Press'],
  'dumbbell bench press': ['Dumbbell Bench Press', 'Bench Press (Dumbbell)'],
  'incline dumbbell press': ['Incline Dumbbell Bench Press', 'Incline Bench Press (Dumbbell)'],
  'close grip bench press': ['Close Grip Bench Press', 'Close-Grip Bench Press'],

  // Shoulder press
  'shoulder press': ['Shoulder Press (Dumbbell)', 'Overhead Press'],
  'overhead press': ['Overhead Press (Barbell)', 'Overhead Press'],
  'military press': ['Overhead Press (Barbell)', 'Military Press'],
  'dumbbell shoulder press': ['Shoulder Press (Dumbbell)', 'Dumbbell Shoulder Press'],
  'seated shoulder press': ['Seated Shoulder Press (Dumbbell)', 'Seated Overhead Press'],
  'arnold press': ['Arnold Press', 'Arnold Dumbbell Press'],

  // Lateral raises
  'lateral raise': ['Lateral Raise (Dumbbell)', 'Dumbbell Lateral Raise', 'Side Raise'],
  'side raise': ['Lateral Raise (Dumbbell)', 'Side Raise'],
  'dumbbell lateral raise': ['Lateral Raise (Dumbbell)', 'Dumbbell Lateral Raise'],
  'cable lateral raise': ['Cable Lateral Raise', 'Lateral Raise (Cable)'],
  'front raise': ['Front Raise (Dumbbell)', 'Dumbbell Front Raise'],

  // Squats
  'squat': ['Squat (Barbell)', 'Barbell Squat', 'Squat'],
  'barbell squat': ['Squat (Barbell)', 'Barbell Squat'],
  'back squat': ['Squat (Barbell)', 'Barbell Back Squat'],
  'front squat': ['Front Squat (Barbell)', 'Barbell Front Squat'],
  'goblet squat': ['Goblet Squat', 'Kettlebell Goblet Squat'],
  'leg press': ['Leg Press', 'Leg Press (Machine)'],
  'hack squat': ['Hack Squat', 'Hack Squat (Machine)'],
  'bulgarian split squat': ['Bulgarian Split Squat', 'Split Squat'],

  // Deadlifts
  'deadlift': ['Deadlift (Barbell)', 'Barbell Deadlift', 'Conventional Deadlift'],
  'barbell deadlift': ['Deadlift (Barbell)', 'Barbell Deadlift'],
  'sumo deadlift': ['Sumo Deadlift (Barbell)', 'Sumo Deadlift'],
  'romanian deadlift': ['Romanian Deadlift (Barbell)', 'RDL', 'Romanian Deadlift'],
  'rdl': ['Romanian Deadlift (Barbell)', 'Romanian Deadlift'],
  'stiff leg deadlift': ['Stiff Leg Deadlift (Barbell)', 'Stiff Legged Deadlift'],

  // Lunges
  'lunge': ['Lunge (Dumbbell)', 'Walking Lunge', 'Lunge'],
  'walking lunge': ['Walking Lunge (Dumbbell)', 'Walking Lunge'],
  'reverse lunge': ['Reverse Lunge (Dumbbell)', 'Reverse Lunge'],
  'dumbbell lunge': ['Lunge (Dumbbell)', 'Dumbbell Lunge'],

  // Leg curls / extensions
  'leg curl': ['Leg Curl (Machine)', 'Lying Leg Curl', 'Seated Leg Curl'],
  'lying leg curl': ['Lying Leg Curl (Machine)', 'Lying Leg Curl'],
  'seated leg curl': ['Seated Leg Curl (Machine)', 'Seated Leg Curl'],
  'leg extension': ['Leg Extension (Machine)', 'Leg Extension'],
  'hamstring curl': ['Leg Curl (Machine)', 'Lying Leg Curl'],

  // Pull-ups / Chin-ups
  'pullup': ['Pull Up', 'Pull-Up', 'Pullup'],
  'pull up': ['Pull Up', 'Pull-Up'],
  'chinup': ['Chin Up', 'Chin-Up', 'Chinup'],
  'chin up': ['Chin Up', 'Chin-Up'],
  'weighted pullup': ['Pull Up (Weighted)', 'Weighted Pull Up'],
  'weighted chinup': ['Chin Up (Weighted)', 'Weighted Chin Up'],
  'lat pullup': ['Pull Up', 'Wide Grip Pull Up'],

  // Shrugs
  'shrug': ['Shrug (Dumbbell)', 'Dumbbell Shrug', 'Barbell Shrug'],
  'dumbbell shrug': ['Shrug (Dumbbell)', 'Dumbbell Shrug'],
  'barbell shrug': ['Shrug (Barbell)', 'Barbell Shrug'],

  // Calf raises
  'calf raise': ['Calf Raise (Standing)', 'Standing Calf Raise', 'Calf Raise'],
  'standing calf raise': ['Standing Calf Raise', 'Calf Raise (Standing)'],
  'seated calf raise': ['Seated Calf Raise', 'Seated Calf Raise (Machine)'],

  // Ab exercises
  'crunch': ['Crunch', 'Ab Crunch'],
  'ab crunch': ['Crunch', 'Ab Crunch'],
  'sit up': ['Sit Up', 'Situp'],
  'situp': ['Sit Up', 'Situp'],
  'leg raise': ['Leg Raise', 'Hanging Leg Raise', 'Lying Leg Raise'],
  'hanging leg raise': ['Hanging Leg Raise'],
  'cable crunch': ['Cable Crunch', 'Kneeling Cable Crunch'],
  'ab rollout': ['Ab Wheel Rollout', 'Ab Rollout'],
  'ab wheel': ['Ab Wheel Rollout', 'Ab Wheel'],
  'russian twist': ['Russian Twist', 'Seated Russian Twist'],
  'mountain climber': ['Mountain Climber', 'Mountain Climbers'],

  // Push-ups
  'pushup': ['Push Up', 'Push-Up', 'Pushup'],
  'push up': ['Push Up', 'Push-Up'],
  'diamond pushup': ['Diamond Push Up', 'Close Grip Push Up'],
  'incline pushup': ['Incline Push Up', 'Incline Push-Up'],
  'decline pushup': ['Decline Push Up', 'Decline Push-Up'],
  'wide pushup': ['Wide Grip Push Up', 'Wide Push-Up'],
};

// Legacy format for backwards compatibility
const STRONG_EXERCISE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(EXERCISE_ALIASES).map(([k, v]) => [k, v[0]])
);

const collapseSpaces = (s: string): string => s.replace(/\s+/g, ' ').trim();

const stripParensContent = (s: string): string =>
  collapseSpaces(String(s ?? '').replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, ' '));

const removeBracketChars = (s: string): string => collapseSpaces(s.replace(/[()\[\]{}]/g, ' '));

const normalizeDashes = (s: string): string => s.replace(/[\u2010-\u2015]/g, '-');

const normalizePunctuationToSpace = (s: string): string =>
  collapseSpaces(
    s
      .replace(/&/g, ' and ')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
  );

const normalizeCompoundTokens = (s: string): string => {
  const lower = s.toLowerCase();
  return collapseSpaces(
    lower
      .replace(/\btricep\b/g, 'triceps')
      .replace(/\bbicep\b/g, 'biceps')
      .replace(/\bdumbbells\b/g, 'dumbbell')
      .replace(/\bbarbells\b/g, 'barbell')
      .replace(/\bkettlebells\b/g, 'kettlebell')
      .replace(/\bplates\b/g, 'plate')
      .replace(/pull\s*down/g, 'pulldown')
      .replace(/push\s*down/g, 'pushdown')
      .replace(/chin\s*up/g, 'chinup')
      .replace(/\bchin\b/g, 'chinup')
      .replace(/pull\s*up/g, 'pullup')
  );
};

export const normalizeExerciseNameBasic = (name: string): string => {
  return collapseSpaces(normalizeDashes(String(name ?? '')).trim());
};

const normalizeAliasKey = (name: string): string => {
  return collapseSpaces(normalizeCompoundTokens(normalizePunctuationToSpace(normalizeExerciseNameBasic(name))));
};

const toTokenSet = (name: string, mode: ExerciseNameResolverMode): Set<string> => {
  const stop = mode === 'relaxed' ? RELAXED_STOP_TOKENS : STOP_TOKENS;
  const base = normalizeAliasKey(removeBracketChars(name));
  const tokens = base
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .filter(t => !/^\d+$/.test(t))
    .filter(t => !stop.has(t));
  return new Set(tokens);
};

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
};

const overlapCoefficient = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const denom = Math.min(a.size, b.size);
  return denom > 0 ? inter / denom : 0;
};

export const createExerciseNameResolver = (
  candidateNames: Iterable<string>,
  options?: ExerciseNameResolverOptions
): ExerciseNameResolver => {
  const mode: ExerciseNameResolverMode = options?.mode ?? 'strict';
  const candidates = Array.from(candidateNames);

  const exactSet = new Set(candidates);
  const lowerMap = new Map<string, string>();
  for (const n of candidates) {
    const lower = n.toLowerCase();
    if (!lowerMap.has(lower)) lowerMap.set(lower, n);
  }

  const normalizedKeyMap = new Map<string, string>();
  for (const n of candidates) {
    const key = normalizeAliasKey(n);
    if (!normalizedKeyMap.has(key)) normalizedKeyMap.set(key, n);
  }

  const tokenIndex = candidates.map((n) => ({ name: n, tokens: toTokenSet(n, mode) }));
  const cache = new Map<string, ExerciseNameResolution>();

  const resolve = (rawName: string): ExerciseNameResolution => {
    const raw = normalizeExerciseNameBasic(rawName);
    if (!raw) return { name: rawName, method: 'none' };

    const cached = cache.get(raw);
    if (cached) return cached;

    if (exactSet.has(raw)) {
      const res = { name: raw, method: 'exact' as const };
      cache.set(raw, res);
      return res;
    }

    const directLower = lowerMap.get(raw.toLowerCase());
    if (directLower) {
      const res = { name: directLower, method: 'case_insensitive' as const };
      cache.set(raw, res);
      return res;
    }

    const aliasKey = normalizeAliasKey(raw);
    
    // Check comprehensive aliases - try all fallbacks
    const aliasOptions = EXERCISE_ALIASES[aliasKey];
    if (aliasOptions) {
      for (const alias of aliasOptions) {
        const aliasExact = exactSet.has(alias) ? alias : undefined;
        const aliasLower = lowerMap.get(alias.toLowerCase());
        const chosen = aliasExact ?? aliasLower;
        if (chosen) {
          const res = { name: chosen, method: 'alias' as const };
          cache.set(raw, res);
          return res;
        }
      }
    }
    
    // Also check stripped paren version for alias
    const aliasKeyNoParens = normalizeAliasKey(stripParensContent(raw));
    if (aliasKeyNoParens !== aliasKey) {
      const aliasOptionsNoParens = EXERCISE_ALIASES[aliasKeyNoParens];
      if (aliasOptionsNoParens) {
        for (const alias of aliasOptionsNoParens) {
          const aliasExact = exactSet.has(alias) ? alias : undefined;
          const aliasLower = lowerMap.get(alias.toLowerCase());
          const chosen = aliasExact ?? aliasLower;
          if (chosen) {
            const res = { name: chosen, method: 'alias' as const };
            cache.set(raw, res);
            return res;
          }
        }
      }
    }

    const normalizedExact = normalizedKeyMap.get(aliasKey);
    if (normalizedExact) {
      const res = { name: normalizedExact, method: 'normalized_exact' as const };
      cache.set(raw, res);
      return res;
    }

    const normalizedNoParensKey = normalizeAliasKey(stripParensContent(raw));
    const normalizedNoParensExact = normalizedKeyMap.get(normalizedNoParensKey);
    if (normalizedNoParensExact) {
      const res = { name: normalizedNoParensExact, method: 'normalized_case_insensitive' as const };
      cache.set(raw, res);
      return res;
    }

    const tokens = toTokenSet(raw, mode);
    const allowSingleToken = mode === 'relaxed';
    if (tokens.size >= 1 || (allowSingleToken && tokens.size === 1)) {
      let best: { name: string; score: number; tokenCount: number } | null = null;
      let secondBestScore = 0;

      for (const c of tokenIndex) {
        // Use overlap coefficient as primary metric - better for subset matching
        // e.g. "Advanced Plank" → tokens: [advanced, plank] matches "Plank" → tokens: [plank]
        const jaccardScore = jaccard(tokens, c.tokens);
        const overlapScore = overlapCoefficient(tokens, c.tokens);
        // Weight overlap higher for subset matching scenarios
        const score = Math.max(jaccardScore, overlapScore * 1.1);
        const tokenCount = c.tokens.size;
        if (!best || score > best.score) {
          if (best) secondBestScore = best.score;
          best = { name: c.name, score, tokenCount };
        } else if (score === best.score) {
          // Prefer the more "general" candidate (fewer tokens), then stable sort by name
          if (tokenCount < best.tokenCount || (tokenCount === best.tokenCount && c.name.localeCompare(best.name) < 0)) {
            best = { name: c.name, score, tokenCount };
          }
        } else if (score > secondBestScore) {
          secondBestScore = score;
        }
      }

      if (best) {
        if (mode === 'strict') {
          const scoreGap = best.score - secondBestScore;
          // Lower threshold to 0.5 and reduce gap requirement to allow more matches
          const acceptable = best.score >= 0.5 && scoreGap >= 0.05;
          if (acceptable) {
            const res = { name: best.name, method: 'fuzzy' as const };
            cache.set(raw, res);
            return res;
          }
        } else {
          const acceptable = best.score >= 0.4;
          if (acceptable) {
            const res = { name: best.name, method: 'representative' as const };
            cache.set(raw, res);
            return res;
          }
        }
      }
    }

    const res = { name: rawName, method: 'none' as const };
    cache.set(raw, res);
    return res;
  };

  return { resolve };
};
