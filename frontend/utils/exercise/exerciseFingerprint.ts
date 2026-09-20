import { EQUIPMENT_WORDS, FILLER_WORDS, WORD_SYNONYMS } from './exerciseFingerprintConstants';

/**
 * Fingerprint-based Exercise Matching Engine
 * 
 * This implements a robust matching system using:
 * 1. Fingerprint normalization (sorted words for order-agnostic matching)
 * 2. Waterfall matching (exact → subset → fuzzy)
 * 3. Hash-map lookups for O(1) performance
 */

/**
 * Generate a fingerprint for an exercise name.
 * The fingerprint is a sorted, normalized list of meaningful words.
 * Results are memoized (merge + asset paths call this per set).
 */
const fingerprintCache = new Map<string, string>();
const equipmentCache = new Map<string, string | null>();
const APOSTROPHE_RE = /['']/g;
const NON_WORD_RE = /[^\w\s]/g;
const WHITESPACE_RE = /\s+/g;
const PAREN_RE = /\(([^)]+)\)/;
const IMPORTANT_WORDS = new Set(['curl', 'press', 'row', 'squat', 'deadlift', 'raise', 'fly',
  'extension', 'pulldown', 'pushdown', 'pullup', 'chinup', 'lunge', 'crunch', 'plank']);

export const getFingerprint = (text: string): string => {
  if (!text) return '';
  const cached = fingerprintCache.get(text);
  if (cached !== undefined) return cached;

  // 1. Lowercase and remove special characters
  const normalized = text
    .toLowerCase()
    .replace(APOSTROPHE_RE, '')  // Remove apostrophes
    .replace(NON_WORD_RE, ' ')  // Replace special chars with space
    .replace(WHITESPACE_RE, ' ')  // Normalize whitespace
    .trim();
  
  // 2. Split into words
  const words = normalized.split(' ').filter(Boolean);
  
  // 3. Apply synonyms and remove fillers
  const processedWords: string[] = [];
  for (const word of words) {
    if (FILLER_WORDS.has(word)) continue;
    
    // Apply synonym if exists
    const synonym = WORD_SYNONYMS[word] || word;
    
    // Handle multi-word synonyms (e.g., 'rdl' -> 'romanian deadlift')
    if (synonym.includes(' ')) {
      processedWords.push(...synonym.split(' '));
    } else {
      processedWords.push(synonym);
    }
  }
  
  // 4. Sort alphabetically (this is the key insight!)
  processedWords.sort();

  // 5. Join back
  const result = processedWords.join(' ');
  if (fingerprintCache.size < 5000) fingerprintCache.set(text, result);
  return result;
};

/**
 * Generate an equipment-agnostic fingerprint (strips equipment words)
 */
export const getFingerprintWithoutEquipment = (text: string): string => {
  if (!text) return '';
  
  // Get base fingerprint first
  const fingerprint = getFingerprint(text);
  
  // Remove equipment words
  const words = fingerprint.split(' ').filter(w => !EQUIPMENT_WORDS.has(w));
  
  return words.join(' ');
};

/**
 * Extract equipment from exercise name
 */
export const extractEquipment = (text: string): string | null => {
  if (!text) return null;
  const cached = equipmentCache.get(text);
  if (cached !== undefined) return cached;

  const lower = text.toLowerCase();
  const words = lower.replace(NON_WORD_RE, ' ').split(WHITESPACE_RE);

  for (const word of words) {
    if (EQUIPMENT_WORDS.has(word) && word !== 'none' && word !== 'other') {
      // Normalize equipment name
      let out = word;
      if (word === 'db' || word === 'dumbbells') out = 'dumbbell';
      else if (word === 'bb') out = 'barbell';
      else if (word === 'kb') out = 'kettlebell';
      else if (word === 'ez' || word === 'ezbar' || word === 'curlbar') out = 'ezbar';
      else if (word === 'bw' || word === 'bodyweight') out = 'bodyweight';
      if (equipmentCache.size < 5000) equipmentCache.set(text, out);
      return out;
    }
  }

  // Check for equipment in parentheses like "Bench Press (Dumbbell)"
  const parenMatch = text.match(PAREN_RE);
  if (parenMatch) {
    const parenContent = parenMatch[1].toLowerCase();
    for (const eq of EQUIPMENT_WORDS) {
      if (parenContent.includes(eq)) {
        if (equipmentCache.size < 5000) equipmentCache.set(text, eq);
        return eq;
      }
    }
  }

  if (equipmentCache.size < 5000) equipmentCache.set(text, null);
  return null;
};

export interface FingerprintIndex {
  // Exact fingerprint -> exercise name
  exactMap: Map<string, string>;
  // Equipment-agnostic fingerprint -> list of exercise names
  agnosticMap: Map<string, string[]>;
  // All exercise names for fuzzy fallback
  allNames: string[];
  // Original name -> fingerprint (for debugging)
  nameToFingerprint: Map<string, string>;
}

/**
 * Build a fingerprint index from a list of exercise names
 */
export const buildFingerprintIndex = (exerciseNames: string[]): FingerprintIndex => {
  const exactMap = new Map<string, string>();
  const agnosticMap = new Map<string, string[]>();
  const nameToFingerprint = new Map<string, string>();
  
  for (const name of exerciseNames) {
    const fingerprint = getFingerprint(name);
    const agnosticFingerprint = getFingerprintWithoutEquipment(name);
    
    nameToFingerprint.set(name, fingerprint);
    
    // Exact fingerprint mapping (first one wins for duplicates)
    if (!exactMap.has(fingerprint)) {
      exactMap.set(fingerprint, name);
    }
    
    // Equipment-agnostic mapping (collect all variants)
    if (agnosticFingerprint) {
      const existing = agnosticMap.get(agnosticFingerprint) || [];
      existing.push(name);
      agnosticMap.set(agnosticFingerprint, existing);
    }
  }
  
  return {
    exactMap,
    agnosticMap,
    allNames: exerciseNames,
    nameToFingerprint,
  };
};

export interface MatchResult {
  name: string;
  method: 'exact' | 'subset' | 'equipment_agnostic' | 'fuzzy' | 'none';
  confidence: number;
}

/**
 * Waterfall matching: exact → subset → equipment-agnostic → fuzzy
 */
export const findBestMatch = (
  userInput: string,
  index: FingerprintIndex
): MatchResult => {
  if (!userInput?.trim()) {
    return { name: '', method: 'none', confidence: 0 };
  }
  
  const userFingerprint = getFingerprint(userInput);
  const userAgnostic = getFingerprintWithoutEquipment(userInput);
  const userEquipment = extractEquipment(userInput);
  
  // Tier 1: Exact fingerprint match (O(1))
  const exactMatch = index.exactMap.get(userFingerprint);
  if (exactMatch) {
    return { name: exactMatch, method: 'exact', confidence: 1.0 };
  }
  
  // Tier 2: Subset match (user fingerprint contained in master OR vice versa)
  const subsetCandidates: Array<{ name: string; score: number }> = [];
  
  for (const [masterFingerprint, masterName] of index.exactMap.entries()) {
    // Check if user's fingerprint is subset of master
    if (masterFingerprint.includes(userFingerprint) || userFingerprint.includes(masterFingerprint)) {
      // Score by how close the lengths are (prefer shorter/more specific matches)
      const lengthDiff = Math.abs(masterFingerprint.length - userFingerprint.length);
      const score = 1 - (lengthDiff / Math.max(masterFingerprint.length, userFingerprint.length));
      subsetCandidates.push({ name: masterName, score });
    }
  }
  
  if (subsetCandidates.length > 0) {
    // Sort by score (highest first), then by name length (shortest first for tie-breaking)
    subsetCandidates.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.1) return b.score - a.score;
      return a.name.length - b.name.length;
    });
    return { name: subsetCandidates[0].name, method: 'subset', confidence: subsetCandidates[0].score };
  }
  
  // Tier 3: Equipment-agnostic match
  const agnosticMatches = index.agnosticMap.get(userAgnostic);
  if (agnosticMatches && agnosticMatches.length > 0) {
    // If user specified equipment, try to match it
    if (userEquipment) {
      const equipmentMatch = agnosticMatches.find(name => {
        const nameEquip = extractEquipment(name);
        return nameEquip === userEquipment;
      });
      if (equipmentMatch) {
        return { name: equipmentMatch, method: 'equipment_agnostic', confidence: 0.95 };
      }
    }
    
    // Return first match (usually the most common variant)
    // Prefer matches with assets (non-None equipment)
    const sortedMatches = [...agnosticMatches].sort((a, b) => {
      const aEquip = extractEquipment(a);
      const bEquip = extractEquipment(b);
      // Prefer dumbbell > barbell > others
      const priority = (eq: string | null) => {
        if (!eq) return 0;
        if (eq === 'dumbbell') return 3;
        if (eq === 'barbell') return 2;
        if (eq === 'machine' || eq === 'cable') return 1;
        return 0;
      };
      return priority(bEquip) - priority(aEquip);
    });
    
    return { name: sortedMatches[0], method: 'equipment_agnostic', confidence: 0.85 };
  }
  
  // Tier 4: Fuzzy word-overlap match (allocation-light Jaccard: no union Set).
  const userWords = new Set(userFingerprint.split(' '));
  const userImportant = [...userWords].filter(w => IMPORTANT_WORDS.has(w));
  let bestFuzzy: { name: string; score: number } | null = null;

  for (const [masterFingerprint, masterName] of index.exactMap.entries()) {
    const masterParts = masterFingerprint.split(' ');
    let intersection = 0;
    for (const w of masterParts) {
      if (userWords.has(w)) intersection++;
    }
    if (intersection === 0) continue;
    const union = userWords.size + masterParts.length - intersection;
    const jaccard = intersection / union;

    // Boost score if important words match
    let importantMatch = false;
    for (const w of masterParts) {
      if (IMPORTANT_WORDS.has(w) && userImportant.includes(w)) {
        importantMatch = true;
        break;
      }
    }
    const score = importantMatch ? jaccard * 1.2 : jaccard;
    
    if (score > 0.4 && (!bestFuzzy || score > bestFuzzy.score)) {
      bestFuzzy = { name: masterName, score };
    }
  }
  
  if (bestFuzzy && bestFuzzy.score > 0.4) {
    return { name: bestFuzzy.name, method: 'fuzzy', confidence: Math.min(bestFuzzy.score, 0.8) };
  }
  
  // No match found
  return { name: '', method: 'none', confidence: 0 };
};

/**
 * Create a matcher function from exercise names
 */
export const createFingerprintMatcher = (exerciseNames: string[]) => {
  const index = buildFingerprintIndex(exerciseNames);
  
  return {
    match: (userInput: string) => findBestMatch(userInput, index),
    index,
  };
};
