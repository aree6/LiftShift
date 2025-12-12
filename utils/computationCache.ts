/**
 * Computation Cache - Persists expensive calculation results across component lifecycles
 * 
 * This cache prevents recalculation of heavy analytics when:
 * - Switching between tabs (component unmount/remount)
 * - Re-rendering with the same data
 * - Applying the same filters multiple times
 */

type CacheEntry<T> = {
  value: T;
  timestamp: number;
  dataHash: string;
};

class ComputationCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxAge = 5 * 60 * 1000; // 5 minutes default TTL
  private maxSize = 50; // Maximum cache entries

  /**
   * Generate a simple hash from data for cache invalidation
   */
  private hashData(data: unknown): string {
    if (data === null || data === undefined) return 'null';
    
    if (Array.isArray(data)) {
      // For arrays, use length + first/last item timestamps as a quick hash
      const len = data.length;
      if (len === 0) return 'empty';
      
      const first = data[0];
      const last = data[len - 1];
      const firstTs = first?.parsedDate?.getTime?.() ?? first?.timestamp ?? 0;
      const lastTs = last?.parsedDate?.getTime?.() ?? last?.timestamp ?? 0;
      
      return `arr:${len}:${firstTs}:${lastTs}`;
    }
    
    if (typeof data === 'object') {
      // For objects, stringify keys and sample values
      const keys = Object.keys(data as object);
      return `obj:${keys.length}:${keys.slice(0, 3).join(',')}`;
    }
    
    return String(data);
  }

  /**
   * Get or compute a cached value
   */
  getOrCompute<T>(
    key: string,
    data: unknown,
    computeFn: () => T,
    options?: { ttl?: number; forceRecompute?: boolean }
  ): T {
    const dataHash = this.hashData(data);
    const cacheKey = `${key}:${dataHash}`;
    const now = Date.now();
    const ttl = options?.ttl ?? this.maxAge;

    // Check if we have a valid cached entry
    if (!options?.forceRecompute) {
      const entry = this.cache.get(cacheKey);
      if (entry && (now - entry.timestamp) < ttl) {
        return entry.value as T;
      }
    }

    // Compute new value
    const value = computeFn();

    // Store in cache
    this.cache.set(cacheKey, {
      value,
      timestamp: now,
      dataHash,
    });

    // Evict old entries if cache is too large
    this.evictIfNeeded();

    return value;
  }

  /**
   * Get a cached value without computing (returns undefined if not cached)
   */
  get<T>(key: string, data: unknown): T | undefined {
    const dataHash = this.hashData(data);
    const cacheKey = `${key}:${dataHash}`;
    const entry = this.cache.get(cacheKey);
    
    if (entry && (Date.now() - entry.timestamp) < this.maxAge) {
      return entry.value as T;
    }
    
    return undefined;
  }

  /**
   * Manually set a cache entry
   */
  set<T>(key: string, data: unknown, value: T): void {
    const dataHash = this.hashData(data);
    const cacheKey = `${key}:${dataHash}`;
    
    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      dataHash,
    });
    
    this.evictIfNeeded();
  }

  /**
   * Clear specific cache entries by key prefix
   */
  invalidate(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Evict oldest entries if cache exceeds max size
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxSize) return;

    // Convert to array and sort by timestamp
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, this.cache.size - this.maxSize);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const computationCache = new ComputationCache();

/**
 * React hook helper for cached computations
 * Use this in place of useMemo for expensive calculations that should persist across unmounts
 */
export function getCachedValue<T>(
  key: string,
  deps: unknown[],
  computeFn: () => T,
  ttl?: number
): T {
  // Create a composite hash from all dependencies
  const depsHash = deps.map(d => {
    if (Array.isArray(d)) return `arr:${d.length}`;
    if (d && typeof d === 'object') return `obj:${Object.keys(d).length}`;
    return String(d);
  }).join('|');
  
  return computationCache.getOrCompute(
    `${key}:${depsHash}`,
    deps,
    computeFn,
    { ttl }
  );
}

/**
 * Specialized cache for filter-dependent computations
 * Creates a cache key based on filter state
 */
export function getFilteredCacheKey(
  baseKey: string,
  filterState: {
    month?: string;
    day?: Date | null;
    range?: { start: Date; end: Date } | null;
    weeks?: Array<{ start: Date; end: Date }>;
  }
): string {
  const parts = [baseKey];
  
  if (filterState.month && filterState.month !== 'all') {
    parts.push(`m:${filterState.month}`);
  }
  if (filterState.day) {
    parts.push(`d:${filterState.day.getTime()}`);
  }
  if (filterState.range) {
    parts.push(`r:${filterState.range.start.getTime()}-${filterState.range.end.getTime()}`);
  }
  if (filterState.weeks && filterState.weeks.length > 0) {
    parts.push(`w:${filterState.weeks.length}`);
  }
  
  return parts.join(':');
}
