import Papa from 'papaparse';
const exerciseCSVUrl = new URL('../exercises_muscles_and_thumbnail_data.csv', import.meta.url).href;

export interface ExerciseAsset {
  name: string;
  equipment?: string;
  primary_muscle?: string;
  secondary_muscle?: string;
  source?: string;        // image or video url
  sourceType?: string;    // 'image' | 'video' | others
  thumbnail?: string;     // image thumbnail url
}

let cache: Map<string, ExerciseAsset> | null = null;

export const getExerciseAssets = async (): Promise<Map<string, ExerciseAsset>> => {
  if (cache) return cache;
  const res = await fetch(exerciseCSVUrl);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = (parsed.data as any[]) || [];
  const map = new Map<string, ExerciseAsset>();
  for (const row of rows) {
    if (!row || !row.name) continue;
    const name = String(row.name);
    map.set(name, {
      name,
      equipment: row.equipment || undefined,
      primary_muscle: row.primary_muscle || undefined,
      secondary_muscle: row.secondary_muscle || undefined,
      source: row.source || undefined,
      sourceType: row.sourceType || undefined,
      thumbnail: row.thumbnail || undefined,
    });
  }
  cache = map;
  return map;
};
