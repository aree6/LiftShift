import type { ExerciseAsset } from '../data/exerciseAssets';
import {
  createExerciseNameResolver,
  ExerciseNameResolution,
  ExerciseNameResolver,
} from './exerciseNameResolver';

export interface ExerciseAssetLookup {
  resolveName: (rawName: string) => ExerciseNameResolution;
  getAsset: (rawName: string) => ExerciseAsset | undefined;
}

let resolverCache: ExerciseNameResolver | null = null;
let resolverRef: Map<string, ExerciseAsset> | null = null;

let lowerCache: Map<string, ExerciseAsset> | null = null;
let lowerRef: Map<string, ExerciseAsset> | null = null;

const getLowerMap = (assetsMap: Map<string, ExerciseAsset>): Map<string, ExerciseAsset> => {
  if (lowerRef === assetsMap && lowerCache) return lowerCache;
  const m = new Map<string, ExerciseAsset>();
  assetsMap.forEach((v, k) => m.set(k.toLowerCase(), v));
  lowerCache = m;
  lowerRef = assetsMap;
  return m;
};

const getResolver = (assetsMap: Map<string, ExerciseAsset>): ExerciseNameResolver => {
  if (resolverRef === assetsMap && resolverCache) return resolverCache;
  resolverCache = createExerciseNameResolver(assetsMap.keys());
  resolverRef = assetsMap;
  return resolverCache;
};

export const createExerciseAssetLookup = (assetsMap: Map<string, ExerciseAsset>): ExerciseAssetLookup => {
  const lower = getLowerMap(assetsMap);
  const resolver = getResolver(assetsMap);

  const resolveName = (rawName: string) => resolver.resolve(rawName);

  const getAsset = (rawName: string): ExerciseAsset | undefined => {
    const resolved = resolver.resolve(rawName);
    return assetsMap.get(resolved.name) ?? lower.get(resolved.name.toLowerCase());
  };

  return { resolveName, getAsset };
};
