import { CSV_TO_SVG_MUSCLE_MAP, getSvgIdsForCsvMuscleName } from './muscleCsvMappings';
import { SVG_MUSCLE_GROUPS, SVG_MUSCLE_NAMES } from './muscleSvgLabels';

/**
 * Anatomy terms that can appear in an exercise name, mapped to the display
 * muscle groups they describe.
 *
 * The lexicon is derived from the same CSV -> SVG map the body map uses, so
 * adding a muscle there also teaches name resolution about it. Generic names
 * ("Hamstrings", "Quadriceps") and anatomical names ("biceps_femoris",
 * "tibialis_anterior") share one representation.
 */
export interface ExerciseAnatomyMatch {
  /** Display muscle groups named by the matched terms. */
  groups: ReadonlySet<string>;
  /** Normalized tokens consumed by the matched terms. */
  tokens: ReadonlySet<string>;
}

export interface ExerciseMuscleGroups {
  primary: ReadonlySet<string>;
  secondary: ReadonlySet<string>;
}

const EMPTY_GROUPS: ReadonlySet<string> = new Set();

const getMuscleGroupForSvgId = (svgId: string): string | undefined =>
  SVG_MUSCLE_NAMES[svgId] ?? SVG_MUSCLE_GROUPS[svgId];

const normalizePhrase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Enough English inflection for muscle names: hamstrings -> hamstring,
 * quadriceps -> quadricep, calves -> calf. The lexicon stores both forms, so
 * the stemmer only needs to be predictable, not linguistically complete.
 */
const singularizeToken = (token: string): string => {
  if (token === 'calves') return 'calf';
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) return token.slice(0, -1);
  return token;
};

const singularizePhrase = (phrase: string): string => {
  const tokens = phrase.split(' ');
  const last = tokens.length - 1;
  tokens[last] = singularizeToken(tokens[last]);
  return tokens.join(' ');
};

const phraseGroups = new Map<string, Set<string>>();

const addPhrase = (phrase: string, groups: ReadonlySet<string>): void => {
  if (!phrase || groups.size === 0) return;
  // Short single words collide with equipment names ("trap" bar) and add
  // little over the plural form, so only keep them inside longer phrases.
  if (!phrase.includes(' ') && phrase.length < 5) return;

  const existing = phraseGroups.get(phrase);
  if (existing) {
    for (const group of groups) existing.add(group);
    return;
  }
  phraseGroups.set(phrase, new Set(groups));
};

const groupsForCsvMuscleKey = (key: string): Set<string> => {
  const groups = new Set<string>();
  for (const svgId of CSV_TO_SVG_MUSCLE_MAP[key] ?? []) {
    const group = getMuscleGroupForSvgId(svgId);
    if (group) groups.add(group);
  }
  return groups;
};

const csvMuscleKeys = Object.keys(CSV_TO_SVG_MUSCLE_MAP);

for (const key of csvMuscleKeys) {
  const phrase = normalizePhrase(key);
  const groups = groupsForCsvMuscleKey(key);
  addPhrase(phrase, groups);
  addPhrase(singularizePhrase(phrase), groups);
}

/**
 * Single words that describe position rather than a muscle. They are useful
 * inside a phrase ("biceps femoris") but not on their own.
 */
const NON_ANATOMY_FAMILY_TOKENS = new Set([
  'anterior',
  'posterior',
  'lateral',
  'medial',
  'internal',
  'external',
  'upper',
  'lower',
  'deep',
  'superficial',
  'transverse',
  'transversus',
  'hip',
]);

/**
 * Add the family word from anatomical names ("pectoralis" from
 * "pectoralis_major", "vastus" from "vastus_lateralis"). This is what lets a
 * plain "Pectoralis Fly" or "Tibialis Raise" be recognized without listing
 * every exercise. Skip words that are already generic keys (Biceps stays a
 * biceps term, not a biceps/hamstrings blend) and families that span groups.
 */
const familyGroups = new Map<string, Set<string>>();

for (const key of csvMuscleKeys) {
  if (!key.includes('_')) continue;

  const family = normalizePhrase(key).split(' ')[0];
  if (!family || family.length < 5 || NON_ANATOMY_FAMILY_TOKENS.has(family)) continue;

  const groups = groupsForCsvMuscleKey(key);
  const existing = familyGroups.get(family);
  if (!existing) {
    familyGroups.set(family, new Set(groups));
    continue;
  }
  for (const group of groups) existing.add(group);
}

for (const [family, groups] of familyGroups) {
  // A family that spans muscle groups is ambiguous (rectus femoris vs rectus
  // abdominis); leave the full phrases to disambiguate it.
  if (groups.size !== 1) continue;
  // An exact generic key already owns this word.
  if (phraseGroups.has(family)) continue;
  addPhrase(family, groups);
}

interface AnatomyPhrase {
  tokens: readonly string[];
  groups: ReadonlySet<string>;
}

const ANATOMY_PHRASES: readonly AnatomyPhrase[] = Array.from(phraseGroups, ([phrase, groups]) => ({
  tokens: phrase.split(' '),
  groups,
})).sort((a, b) => {
  if (a.tokens.length !== b.tokens.length) return b.tokens.length - a.tokens.length;
  return b.tokens.join(' ').length - a.tokens.join(' ').length;
});

/**
 * Finds the longest anatomy phrases in a normalized token list. Matching a
 * phrase consumes its tokens, so "biceps femoris" resolves to Hamstrings
 * before the shorter "biceps" term can claim it.
 */
export const matchExerciseAnatomyTokens = (tokens: readonly string[]): ExerciseAnatomyMatch => {
  const groups = new Set<string>();
  const matchedTokens = new Set<string>();
  const consumed = new Set<number>();

  for (const phrase of ANATOMY_PHRASES) {
    const size = phrase.tokens.length;
    if (size === 0 || size > tokens.length) continue;

    for (let start = 0; start + size <= tokens.length; start += 1) {
      let matches = true;
      for (let offset = 0; offset < size; offset += 1) {
        const index = start + offset;
        if (consumed.has(index) || tokens[index] !== phrase.tokens[offset]) {
          matches = false;
          break;
        }
      }
      if (!matches) continue;

      for (let offset = 0; offset < size; offset += 1) {
        const index = start + offset;
        consumed.add(index);
        matchedTokens.add(tokens[index]);
      }
      for (const group of phrase.groups) groups.add(group);
      start += size - 1;
    }
  }

  return { groups, tokens: matchedTokens };
};

const groupsForMuscleValue = (value: string | undefined): ReadonlySet<string> => {
  const raw = String(value ?? '').trim();
  if (!raw || /^(none|other)$/i.test(raw)) return EMPTY_GROUPS;

  const groups = new Set<string>();
  for (const part of raw.split(',')) {
    const name = part.trim();
    if (!name || /^(none|other)$/i.test(name)) continue;
    for (const svgId of getSvgIdsForCsvMuscleName(name)) {
      const group = getMuscleGroupForSvgId(svgId);
      if (group) groups.add(group);
    }
  }
  return groups;
};

/** Projects a catalog row's raw muscle fields onto display muscle groups. */
export const getExerciseMuscleGroups = (
  primaryMuscle: string | undefined,
  secondaryMuscle: string | undefined
): ExerciseMuscleGroups => ({
  primary: groupsForMuscleValue(primaryMuscle),
  secondary: groupsForMuscleValue(secondaryMuscle),
});
