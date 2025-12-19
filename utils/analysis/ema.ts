export const DEFAULT_EMA_HALF_LIFE_DAYS = 21;

export type EmaComputeOptions = {
  /**
   * Half-life in days.
   *
   * Rationale (training context): the "signal" we care about (adaptation / performance state)
   * tends to drift over ~2-4 weeks, while individual sessions can be noisy.
   * A ~3 week half-life is a good compromise: sensitive to recent change without overreacting.
   */
  halfLifeDays?: number;

  /**
   * Timestamp key for time-aware smoothing.
   * If missing on a point, EMA falls back to a 1-day step for that transition.
   */
  timestampKey?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

const clampMin = (n: number, min: number) => (n < min ? min : n);

const alphaFromHalfLife = (dtDays: number, halfLifeDays: number): number => {
  // decay = exp(-ln(2) * dt/H)
  // alpha = 1 - decay
  const dt = clampMin(dtDays, 0);
  const h = clampMin(halfLifeDays, 1e-6);
  const decay = Math.exp(-Math.LN2 * (dt / h));
  return 1 - decay;
};

export const addEmaSeries = <T extends Record<string, unknown>>(
  data: T[],
  valueKey: string,
  emaKey: string,
  opts: EmaComputeOptions = {}
): T[] => {
  const timestampKey = opts.timestampKey ?? 'timestamp';
  const halfLifeDays = opts.halfLifeDays ?? DEFAULT_EMA_HALF_LIFE_DAYS;

  if (!Array.isArray(data) || data.length === 0) return data;

  let prevEma: number | null = null;
  let prevTs: number | null = null;

  return data.map((row) => {
    const raw = row[valueKey];
    const tsRaw = row[timestampKey];
    const x = isFiniteNumber(raw) ? raw : null;
    const ts = isFiniteNumber(tsRaw) ? tsRaw : null;

    if (x === null) {
      // Preserve shape, but don't update EMA on missing data.
      return {
        ...row,
        [emaKey]: prevEma ?? null,
      } as T;
    }

    if (prevEma === null) {
      prevEma = x;
      prevTs = ts;
      return {
        ...row,
        [emaKey]: prevEma,
      } as T;
    }

    const dtDays =
      ts !== null && prevTs !== null ? clampMin((ts - prevTs) / MS_PER_DAY, 0) : 1;
    const alpha = alphaFromHalfLife(dtDays, halfLifeDays);

    prevEma = prevEma + alpha * (x - prevEma);
    prevTs = ts ?? prevTs;

    return {
      ...row,
      [emaKey]: Number.isFinite(prevEma) ? prevEma : null,
    } as T;
  });
};
