export const stableStringHash = (input: string): number => {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const pickDeterministic = <T>(seedKey: string, options: readonly T[]): T => {
  if (options.length <= 0) {
    throw new Error('pickDeterministic requires at least one option');
  }
  const idx = stableStringHash(seedKey) % options.length;
  return options[idx];
};

export const pickDeterministicIndex = (seedKey: string, optionsCount: number): number => {
  if (optionsCount <= 0) return 0;
  return stableStringHash(seedKey) % optionsCount;
};
