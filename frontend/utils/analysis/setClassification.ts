import type { WorkoutSet } from '../../types';

export const isWarmupSet = (set: Pick<WorkoutSet, 'set_type'>): boolean => {
  const t = String(set.set_type ?? '').trim().toLowerCase();
  if (!t) return false;
  if (t === 'w') return true;
  return t.includes('warmup');
};
