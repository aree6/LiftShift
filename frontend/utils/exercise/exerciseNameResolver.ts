import {
  getExerciseMuscleGroups,
  matchExerciseAnatomyTokens,
  type ExerciseAnatomyMatch,
} from '../muscle/mapping/exerciseAnatomy';
import { EXERCISE_ALIASES } from './exerciseNameAliases';
import { RELAXED_STOP_TOKENS, STOP_TOKENS } from './exerciseNameTokens';

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

export interface ExerciseNameMuscleInfo {
  primary_muscle?: string;
  secondary_muscle?: string;
}

export interface ExerciseNameResolverOptions {
  mode?: ExerciseNameResolverMode;
  /**
   * Optional muscle metadata keyed by canonical candidate name. Supplying it
   * enables anatomy-aware resolution: names that state a muscle
   * ("Tibialis Raise", "Biceps Femoris Curl") only match candidates whose
   * primary or secondary muscles include that group.
   */
  candidateMuscles?: ReadonlyMap<string, ExerciseNameMuscleInfo>;
}

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
    // Version suffixes from imported/custom exercises ("Tibialis Raise V1").
    .filter(t => !/^v\d+$/.test(t))
    .filter(t => !stop.has(t));
  return new Set(tokens);
};

const toNameTokens = (name: string): string[] =>
  normalizeAliasKey(removeBracketChars(name)).split(' ').filter((token) => token.length > 0);

const intersects = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
  if (a.size === 0 || b.size === 0) return false;
  for (const value of a) if (b.has(value)) return true;
  return false;
};

interface ExerciseNameCandidate {
  name: string;
  index: number;
  tokens: Set<string>;
  movementTokens: Set<string>;
  anatomy: ExerciseAnatomyMatch;
  primaryGroups: ReadonlySet<string>;
  secondaryGroups: ReadonlySet<string>;
}

const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
};

const overlapCoefficient = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
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

  const candidateMuscles = options?.candidateMuscles;
  const emptyTokens = new Set<string>();
  const emptyAnatomy: ExerciseAnatomyMatch = { groups: emptyTokens, tokens: emptyTokens };

  const tokenIndex: ExerciseNameCandidate[] = candidates.map((name, index) => {
    const tokens = toTokenSet(name, mode);
    const anatomy = candidateMuscles ? matchExerciseAnatomyTokens(toNameTokens(name)) : emptyAnatomy;
    const muscles = candidateMuscles?.get(name);
    const groups = muscles ? getExerciseMuscleGroups(muscles.primary_muscle, muscles.secondary_muscle) : undefined;

    return {
      name,
      index,
      tokens,
      anatomy,
      movementTokens: candidateMuscles
        ? new Set([...tokens].filter((token) => !anatomy.tokens.has(token)))
        : tokens,
      primaryGroups: groups?.primary ?? emptyTokens,
      secondaryGroups: groups?.secondary ?? emptyTokens,
    };
  });

  const tokenFrequency = candidateMuscles ? new Map<string, number>() : null;
  if (tokenFrequency) {
    for (const candidate of tokenIndex) {
      for (const token of candidate.tokens) {
        tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1);
      }
    }
  }
  // A token this common is a movement/equipment word. A rarer token is the
  // specific part of the name and must survive the match.
  const rareTokenLimit = Math.max(5, Math.ceil(candidates.length * 0.005));

  const getSpecificTokens = (tokens: ReadonlySet<string>): ReadonlySet<string> => {
    if (!tokenFrequency) return emptyTokens;
    const specific = new Set<string>();
    for (const token of tokens) {
      if ((tokenFrequency.get(token) ?? 0) <= rareTokenLimit) specific.add(token);
    }
    return specific;
  };

  const coversSpecificTokens = (
    candidate: ExerciseNameCandidate,
    specificTokens: ReadonlySet<string>
  ): boolean => {
    for (const token of specificTokens) {
      if (!candidate.tokens.has(token)) return false;
    }
    return true;
  };

  const findFuzzyBest = (
    tokens: ReadonlySet<string>,
    specificTokens: ReadonlySet<string>
  ): { candidate: ExerciseNameCandidate; score: number; secondBestScore: number } | null => {
    let best: { candidate: ExerciseNameCandidate; score: number; specificMatches: number } | null = null;
    let secondBestScore = 0;

    for (const candidate of tokenIndex) {
      const jaccardScore = jaccard(tokens, candidate.tokens);
      const overlapScore = overlapCoefficient(tokens, candidate.tokens);

      let specificMatches = 0;
      for (const token of specificTokens) {
        if (candidate.tokens.has(token)) specificMatches += 1;
      }

      // The base metric favors subset matches. The small specific-token bonus
      // breaks ties toward the candidate that explains what makes the name
      // distinctive (e.g. "Nordic" over a generic "Curl").
      const score = Math.max(jaccardScore, overlapScore * 1.1) + specificMatches * 0.05;

      if (!best) {
        best = { candidate, score, specificMatches };
        continue;
      }

      if (score > best.score) {
        secondBestScore = Math.max(secondBestScore, best.score);
        best = { candidate, score, specificMatches };
      } else if (score === best.score) {
        // Prefer the candidate that accounts for more distinctive query words,
        // then the more general candidate, then catalog order. Never sort names
        // alphabetically: that silently picked antagonists for anatomy names.
        const better =
          specificMatches > best.specificMatches ||
          (specificMatches === best.specificMatches && candidate.tokens.size < best.candidate.tokens.size) ||
          (specificMatches === best.specificMatches &&
            candidate.tokens.size === best.candidate.tokens.size &&
            candidate.index < best.candidate.index);
        if (better) best = { candidate, score, specificMatches };
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }

    return best ? { candidate: best.candidate, score: best.score, secondBestScore } : null;
  };

  const findAnatomyBest = (
    movementTokens: ReadonlySet<string>,
    anatomyGroups: ReadonlySet<string>
  ): { candidate: ExerciseNameCandidate; score: number } | null => {
    interface AnatomyContender {
      candidate: ExerciseNameCandidate;
      score: number;
      primaryMatch: boolean;
    }

    let best: AnatomyContender | null = null;
    let contenders: AnatomyContender[] = [];

    const compareQuality = (a: AnatomyContender, b: AnatomyContender): number => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.primaryMatch !== b.primaryMatch) return a.primaryMatch ? 1 : -1;
      return b.candidate.movementTokens.size - a.candidate.movementTokens.size;
    };

    for (const candidate of tokenIndex) {
      const primaryMatch = intersects(candidate.primaryGroups, anatomyGroups);
      const secondaryMatch = intersects(candidate.secondaryGroups, anatomyGroups);
      if (!primaryMatch && !secondaryMatch) continue;

      // Movement Jaccard, not overlap, so a candidate cannot win merely by
      // sharing one generic word while carrying many unrelated qualifiers.
      const score = jaccard(movementTokens, candidate.movementTokens);
      if (score < 0.5) continue;

      const match: AnatomyContender = { candidate, score, primaryMatch };
      if (!best) {
        best = match;
        contenders = [match];
        continue;
      }

      const diff = compareQuality(match, best);
      if (diff > 0) {
        best = match;
        contenders = [match];
      } else if (diff === 0) {
        contenders.push(match);
      }
    }

    if (!best) return null;

    if (contenders.length > 1) {
      // Equal-quality variants of the same muscle are interchangeable. If they
      // point at different groups, the anatomy term alone is not enough.
      const signatures = new Set<string>();
      for (const match of contenders) {
        const matched = match.primaryMatch ? match.candidate.primaryGroups : match.candidate.secondaryGroups;
        signatures.add(
          Array.from(matched)
            .filter((group) => anatomyGroups.has(group))
            .sort()
            .join('|')
        );
      }
      if (signatures.size > 1) return null;

      contenders.sort((a, b) => a.candidate.index - b.candidate.index);
      best = contenders[0];
    }

    return { candidate: best.candidate, score: best.score };
  };

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
    if (tokens.size >= 1) {
      const specificTokens = getSpecificTokens(tokens);
      const fuzzy = findFuzzyBest(tokens, specificTokens);
      const normalAccepted = fuzzy
        ? mode === 'strict'
          ? fuzzy.score >= 0.5 &&
            fuzzy.score - fuzzy.secondBestScore >= 0.05 &&
            (!candidateMuscles || coversSpecificTokens(fuzzy.candidate, specificTokens))
          : fuzzy.score >= 0.4
        : false;

      if (mode === 'strict' && candidateMuscles) {
        const anatomy = matchExerciseAnatomyTokens(toNameTokens(raw));
        const movementTokens = new Set([...tokens].filter((token) => !anatomy.tokens.has(token)));

        if (anatomy.groups.size > 0 && movementTokens.size > 0) {
          // If the normal winner already names the same muscle, trust it. This
          // keeps setup names like "Chest Supported Row" working even though
          // "chest" is not the target muscle.
          const normalNamesTargetAnatomy =
            !!fuzzy && intersects(fuzzy.candidate.anatomy.groups, anatomy.groups);

          if (!(normalAccepted && normalNamesTargetAnatomy)) {
            const anatomyBest = findAnatomyBest(movementTokens, anatomy.groups);
            if (anatomyBest) {
              const res = { name: anatomyBest.candidate.name, method: 'fuzzy' as const };
              cache.set(raw, res);
              return res;
            }

            // A stated muscle with no candidate carrying it is safer as "no
            // match" than as an antagonist match.
            const res = { name: rawName, method: 'none' as const };
            cache.set(raw, res);
            return res;
          }
        }
      }

      if (fuzzy && normalAccepted) {
        const res = {
          name: fuzzy.candidate.name,
          method: mode === 'strict' ? ('fuzzy' as const) : ('representative' as const),
        };
        cache.set(raw, res);
        return res;
      }
    }

    const res = { name: rawName, method: 'none' as const };
    cache.set(raw, res);
    return res;
  };

  return { resolve };
};
