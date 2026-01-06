export const DEFAULT_CSV_DATA = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"

`;

export const CSV_LOADING_ANIMATION_SRC = 'Weightlifting competition.json';

// Helper to get asset path that respects Vite base configuration
export const assetPath = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${import.meta.env.BASE_URL}${normalized.slice(1)}`;
};