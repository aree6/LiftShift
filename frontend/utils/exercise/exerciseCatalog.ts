import { stripExerciseSourceLabel } from './exerciseSourceLabel';

/**
 * Canonical exercise catalog.
 *
 * `exercises_muscles_and_thumbnail_data.csv` is append-only: the original
 * curated catalog comes first and later datasets (Lyfta/Gymvisual) are
 * appended. A name can therefore appear more than once with different muscle
 * taxonomies and media.
 *
 * This module is the only place that resolves those duplicates. Both
 * `getExerciseAssets()` and `loadExerciseMuscleData()` project this catalog,
 * so they always agree on muscle data and media. The asset map is keyed by
 * observed spellings only: its lookup helper handles case and punctuation via
 * the fingerprint matcher, so it does not need the normalized `key`.
 */

export interface ExerciseCatalogRow {
  /** Canonical display name (the winning row's name). */
  name: string;
  /** Normalized identity: "Push Up", "Push-up" and "Push-Up" share one key. */
  key: string;
  /** Every raw name variant that maps to this entry, including `name`. */
  aliases: string[];
  equipment?: string;
  primary_muscle?: string;
  secondary_muscle?: string;
  video?: string;
  source?: string;
  sourceType?: string;
  thumbnail?: string;
}

export interface ExerciseCatalog {
  rows: ExerciseCatalogRow[];
  byKey: Map<string, ExerciseCatalogRow>;
}

export interface RawCatalogRow {
  name?: string;
  equipment?: string;
  primary_muscle?: string;
  secondary_muscle?: string;
  video?: string;
  source?: string;
  sourceType?: string;
  thumbnail?: string;
}

const CSV_URL = `${import.meta.env.BASE_URL}exercises_muscles_and_thumbnail_data.csv`;

let catalogPromise: Promise<ExerciseCatalog> | null = null;

const collapseSpaces = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * Normalizes a name for catalog identity. Source labels, casing, dashes and
 * punctuation are ignored, so all provider spellings share one entry.
 */
export const normalizeExerciseKey = (name: string): string =>
  collapseSpaces(
    stripExerciseSourceLabel(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
  );

const normalizeField = (value: string | undefined | null): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return undefined;
  return trimmed;
};

const hasUsablePrimary = (value: string | undefined): boolean => {
  if (!value) return false;
  return !/^(none|other)$/i.test(value.trim());
};

const toRow = (raw: RawCatalogRow, name: string, key: string): ExerciseCatalogRow => {
  const video = normalizeField(raw.video);
  const source = normalizeField(raw.source);
  const sourceType = normalizeField(raw.sourceType);

  return {
    name,
    key,
    aliases: [name],
    equipment: normalizeField(raw.equipment),
    primary_muscle: normalizeField(raw.primary_muscle),
    secondary_muscle: normalizeField(raw.secondary_muscle),
    video,
    source: video ?? source,
    sourceType: sourceType ?? (video ? 'video' : undefined),
    thumbnail: normalizeField(raw.thumbnail),
  };
};

/**
 * Media and equipment describe the exercise, not its muscle taxonomy, so a
 * duplicate may safely fill fields the canonical row is missing. Muscle data
 * is never merged: generic and anatomical taxonomies are not interchangeable.
 */
const fillMissingMedia = (target: ExerciseCatalogRow, source: ExerciseCatalogRow): void => {
  target.equipment ??= source.equipment;
  target.video ??= source.video;
  target.thumbnail ??= source.thumbnail;
  target.source ??= source.source;
  target.sourceType ??= source.sourceType;
};

/**
 * Collapses raw CSV rows into one canonical entry per normalized name.
 *
 * The catalog is append-only, so the first row that supplies a usable primary
 * muscle is canonical. Later duplicates may add name variants or fill media
 * fields the canonical row is missing; they never replace muscle data. This
 * keeps file order from silently choosing an entry (e.g. the Gymvisual
 * "Push Up" Pilates row shadowing the curated Hevy row).
 */
export const buildExerciseCatalog = (rows: readonly RawCatalogRow[]): ExerciseCatalog => {
  const byKey = new Map<string, ExerciseCatalogRow>();

  for (const raw of rows) {
    const name = String(raw?.name ?? '').trim();
    if (!name) continue;

    const key = normalizeExerciseKey(name);
    if (!key) continue;

    const candidate = toRow(raw, name, key);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }

    if (!existing.aliases.includes(name)) {
      existing.aliases.push(name);
    }

    if (!hasUsablePrimary(existing.primary_muscle) && hasUsablePrimary(candidate.primary_muscle)) {
      // Promote the row that can supply a primary muscle, carrying over any
      // media from the row it replaces.
      fillMissingMedia(candidate, existing);
      candidate.aliases = existing.aliases;
      byKey.set(key, candidate);
    } else {
      fillMissingMedia(existing, candidate);
    }
  }

  return { rows: Array.from(byKey.values()), byKey };
};

export const loadExerciseCatalog = async (): Promise<ExerciseCatalog> => {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const response = await fetch(CSV_URL);
      if (!response.ok) {
        throw new Error(`Failed to load exercise catalog (HTTP ${response.status})`);
      }
      const text = await response.text();
      // Dynamically imported so papaparse ships in its own chunk, loaded only
      // when the catalog is actually needed.
      const { default: Papa } = await import('papaparse');
      const parsed = Papa.parse<RawCatalogRow>(text, {
        header: true,
        skipEmptyLines: true,
      });
      const catalog = buildExerciseCatalog(parsed.data);
      // A missing/HTML response can still be 200 on some hosts. Refuse to cache
      // an empty catalog: every thumbnail and muscle lookup would silently go
      // blank for the rest of the session.
      if (catalog.rows.length === 0) {
        throw new Error('Exercise catalog is empty or unparseable');
      }
      return catalog;
    })().catch((error) => {
      // Allow a later call to retry instead of caching the failure.
      catalogPromise = null;
      throw error;
    });
  }

  return catalogPromise;
};
