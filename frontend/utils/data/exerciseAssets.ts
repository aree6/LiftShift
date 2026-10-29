import { loadExerciseCatalog } from '../exercise/exerciseCatalog';

export interface ExerciseAsset {
  name: string;
  equipment?: string;
  primary_muscle?: string;
  secondary_muscle?: string;
  video?: string;
  source?: string;
  sourceType?: string;
  thumbnail?: string;
}

let cache: Map<string, ExerciseAsset> | null = null;
let loadPromise: Promise<Map<string, ExerciseAsset>> | null = null;

const loadAssets = async (): Promise<Map<string, ExerciseAsset>> => {
  const catalog = await loadExerciseCatalog();
  const map = new Map<string, ExerciseAsset>();

  for (const row of catalog.rows) {
    const asset: ExerciseAsset = {
      name: row.name,
      equipment: row.equipment,
      primary_muscle: row.primary_muscle,
      secondary_muscle: row.secondary_muscle,
      video: row.video,
      source: row.source,
      sourceType: row.sourceType,
      thumbnail: row.thumbnail,
    };

    // Register every observed name variant so exact, case-insensitive and
    // fuzzy lookups all resolve to the same canonical asset.
    for (const alias of row.aliases) {
      map.set(alias, asset);
    }
  }

  return map;
};

export const getExerciseAssets = async (): Promise<Map<string, ExerciseAsset>> => {
  if (cache) return cache;

  if (!loadPromise) {
    loadPromise = loadAssets()
      .then((map) => {
        cache = map;
        return map;
      })
      .catch((error) => {
        // Clear the rejected promise so a later call can retry.
        loadPromise = null;
        throw error;
      });
  }

  return loadPromise;
};
