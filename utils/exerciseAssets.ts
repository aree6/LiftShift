import Papa from 'papaparse';

const exerciseCSVUrl = `${import.meta.env.BASE_URL}exercises_muscles_and_thumbnail_data.csv`;

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

interface ExerciseAssetRow {
  name?: string;
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

const parseRow = (row: ExerciseAssetRow): ExerciseAsset | null => {
  if (!row?.name) return null;
  const name = String(row.name);

  const normalize = (v?: string): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    if (s.toLowerCase() === 'none') return undefined;
    return s;
  };

  const video = normalize(row.video);
  const thumbnail = normalize(row.thumbnail);
  const source = normalize(row.source);
  const sourceType = normalize(row.sourceType);

  const effectiveSourceType = sourceType ?? (video ? 'video' : undefined);
  const effectiveSource = video ?? source;

  return {
    name,
    equipment: normalize(row.equipment),
    primary_muscle: normalize(row.primary_muscle),
    secondary_muscle: normalize(row.secondary_muscle),
    video,
    source: effectiveSource,
    sourceType: effectiveSourceType,
    thumbnail,
  };
};

const loadAssets = async (): Promise<Map<string, ExerciseAsset>> => {
  const res = await fetch(exerciseCSVUrl);
  const text = await res.text();
  const parsed = Papa.parse<ExerciseAssetRow>(text, { 
    header: true, 
    skipEmptyLines: true 
  });
  
  const map = new Map<string, ExerciseAsset>();
  for (const row of parsed.data) {
    const asset = parseRow(row);
    if (asset) {
      map.set(asset.name, asset);
    }
  }
  
  return map;
};

export const getExerciseAssets = async (): Promise<Map<string, ExerciseAsset>> => {
  if (cache) return cache;
  
  if (!loadPromise) {
    loadPromise = loadAssets().then(map => {
      cache = map;
      return map;
    });
  }
  
  return loadPromise;
};
