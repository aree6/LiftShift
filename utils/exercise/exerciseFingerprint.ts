/**
 * Fingerprint-based Exercise Matching Engine
 * 
 * This implements a robust matching system using:
 * 1. Fingerprint normalization (sorted words for order-agnostic matching)
 * 2. Waterfall matching (exact → subset → fuzzy)
 * 3. Hash-map lookups for O(1) performance
 */

// Filler words to remove during fingerprinting
const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'with', 'and', 'or', 'to', 'on', 'in', 'of', 'for', 'at', 'from',
  'using', 'version', 'v', 'var', 'variation', 'style', 'type',
]);

// Equipment words - tracked separately for equipment-agnostic matching
const EQUIPMENT_WORDS = new Set([
  'dumbbell', 'dumbbells', 'db',
  'barbell', 'bb', 'bar',
  'kettlebell', 'kb',
  'cable', 'cables',
  'machine', 'lever', 'selectorized',
  'band', 'bands', 'resistance',
  'bodyweight', 'bw', 'body', 'weight',
  'smith', 'smiths',
  'ez', 'ezbar', 'curlbar',
  'suspension', 'trx',
  'plate', 'plates', 'weighted',
  'assisted',
  'none', 'other',
]);

// Word synonyms - map variations to canonical forms
const WORD_SYNONYMS: Record<string, string> = {
  // Body parts
  'bicep': 'biceps',
  'tricep': 'triceps',
  'lat': 'lats',
  'pec': 'chest',
  'pecs': 'chest',
  'pectoral': 'chest',
  'quad': 'quadriceps',
  'quads': 'quadriceps',
  'ham': 'hamstrings',
  'hams': 'hamstrings',
  'hamstring': 'hamstrings',
  'glute': 'glutes',
  'calf': 'calves',
  'ab': 'abdominals',
  'abs': 'abdominals',
  'abdominal': 'abdominals',
  'delt': 'deltoid',
  'delts': 'deltoids',
  'trap': 'traps',
  'trapezius': 'traps',
  
  // Exercise variations
  'pulldown': 'pulldown',
  'pull-down': 'pulldown',
  'pushdown': 'pushdown',
  'push-down': 'pushdown',
  'pushup': 'pushup',
  'push-up': 'pushup',
  'pullup': 'pullup',
  'pull-up': 'pullup',
  'chinup': 'chinup',
  'chin-up': 'chinup',
  'deadlift': 'deadlift',
  'dead-lift': 'deadlift',
  'benchpress': 'benchpress',
  'bench-press': 'benchpress',
  
  // Equipment
  'db': 'dumbbell',
  'dumbbells': 'dumbbell',
  'bb': 'barbell',
  'kb': 'kettlebell',
  'ez-bar': 'ezbar',
  'ez': 'ezbar',
  'curlbar': 'ezbar',
  'curl-bar': 'ezbar',
  
  // Descriptors
  'inclined': 'incline',
  'declined': 'decline',
  'seated': 'seated',
  'sitting': 'seated',
  'standing': 'standing',
  'lying': 'lying',
  'prone': 'lying',
  'supine': 'lying',
  'single': 'single',
  'one': 'single',
  'unilateral': 'single',
  'double': 'double',
  'two': 'double',
  'bilateral': 'double',
  'alternate': 'alternating',
  'alternated': 'alternating',
  'reverse': 'reverse',
  'reversed': 'reverse',
  
  // Actions
  'curl': 'curl',
  'curls': 'curl',
  'press': 'press',
  'presses': 'press',
  'row': 'row',
  'rows': 'row',
  'raise': 'raise',
  'raises': 'raise',
  'fly': 'fly',
  'flys': 'fly',
  'flies': 'fly',
  'flyes': 'fly',
  'extension': 'extension',
  'extensions': 'extension',
  'extend': 'extension',
  'flexion': 'flexion',
  'squat': 'squat',
  'squats': 'squat',
  'lunge': 'lunge',
  'lunges': 'lunge',
  'crunch': 'crunch',
  'crunches': 'crunch',
  'kickback': 'kickback',
  'kickbacks': 'kickback',
  'shrug': 'shrug',
  'shrugs': 'shrug',
  'twist': 'twist',
  'twists': 'twist',
  'rotation': 'rotation',
  'rotations': 'rotation',
  'pullover': 'pullover',
  'pullovers': 'pullover',
  
  // Positions
  'front': 'front',
  'rear': 'rear',
  'back': 'rear',
  'posterior': 'rear',
  'anterior': 'front',
  'lateral': 'lateral',
  'side': 'lateral',
  'medial': 'medial',
  'inner': 'inner',
  'outer': 'outer',
  'wide': 'wide',
  'close': 'close',
  'narrow': 'close',
  'grip': 'grip',
  'overhand': 'overhand',
  'underhand': 'underhand',
  'supinated': 'underhand',
  'pronated': 'overhand',
  'neutral': 'neutral',
  'hammer': 'hammer',
  
  // Common variations
  'romanian': 'romanian',
  'rdl': 'romanian deadlift',
  'sldl': 'stiffleg deadlift',
  'stiff': 'stiffleg',
  'stiffleg': 'stiffleg',
  'stiff-leg': 'stiffleg',
  'sumo': 'sumo',
  'goblet': 'goblet',
  'bulgarian': 'bulgarian',
  'split': 'split',
  'hip': 'hip',
  'hips': 'hip',
  'leg': 'leg',
  'legs': 'leg',
  'arm': 'arm',
  'arms': 'arm',
  'skull': 'skull',
  'skulls': 'skull',
  'skullcrusher': 'skullcrusher',
  'skull-crusher': 'skullcrusher',
  'skullcrushers': 'skullcrusher',
  
  // Jump rope variations
  'jumprope': 'jumprope',
  'jump-rope': 'jumprope',
  'skipping': 'jumprope',
  'rope': 'jumprope',
  'jump': 'jump',
  'jumping': 'jump',
  
  // Plank variations
  'plank': 'plank',
  'planks': 'plank',
  'planking': 'plank',
};

/**
 * Generate a fingerprint for an exercise name.
 * The fingerprint is a sorted, normalized list of meaningful words.
 */
export const getFingerprint = (text: string): string => {
  if (!text) return '';
  
  // 1. Lowercase and remove special characters
  let normalized = text
    .toLowerCase()
    .replace(/['']/g, '')  // Remove apostrophes
    .replace(/[^\w\s]/g, ' ')  // Replace special chars with space
    .replace(/\s+/g, ' ')  // Normalize whitespace
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
  return processedWords.join(' ');
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
  
  const lower = text.toLowerCase();
  const words = lower.replace(/[^\w\s]/g, ' ').split(/\s+/);
  
  for (const word of words) {
    if (EQUIPMENT_WORDS.has(word) && word !== 'none' && word !== 'other') {
      // Normalize equipment name
      if (word === 'db' || word === 'dumbbells') return 'dumbbell';
      if (word === 'bb') return 'barbell';
      if (word === 'kb') return 'kettlebell';
      if (word === 'ez' || word === 'ezbar' || word === 'curlbar') return 'ezbar';
      if (word === 'bw' || word === 'bodyweight') return 'bodyweight';
      return word;
    }
  }
  
  // Check for equipment in parentheses like "Bench Press (Dumbbell)"
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const parenContent = parenMatch[1].toLowerCase();
    for (const eq of EQUIPMENT_WORDS) {
      if (parenContent.includes(eq)) {
        return eq;
      }
    }
  }
  
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
  
  // Tier 4: Fuzzy word-overlap match
  const userWords = new Set(userFingerprint.split(' '));
  let bestFuzzy: { name: string; score: number } | null = null;
  
  for (const [masterFingerprint, masterName] of index.exactMap.entries()) {
    const masterWords = new Set(masterFingerprint.split(' '));
    
    // Calculate Jaccard similarity
    const intersection = [...userWords].filter(w => masterWords.has(w)).length;
    const union = new Set([...userWords, ...masterWords]).size;
    const jaccard = intersection / union;
    
    // Also check for important word matches (exercise type words)
    const importantWords = ['curl', 'press', 'row', 'squat', 'deadlift', 'raise', 'fly', 
      'extension', 'pulldown', 'pushdown', 'pullup', 'chinup', 'lunge', 'crunch', 'plank'];
    const userImportant = [...userWords].filter(w => importantWords.includes(w));
    const masterImportant = [...masterWords].filter(w => importantWords.includes(w));
    const importantMatch = userImportant.some(w => masterImportant.includes(w));
    
    // Boost score if important words match
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
