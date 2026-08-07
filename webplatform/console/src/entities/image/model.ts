/**
 * Entity `image` — model (Stage 3 §4, FS9 Image Studio §R6). The wire is
 * *(assumed)* pending FE-RV-12; THESE mappers are the single adjustment point.
 *
 * Four disciplines are load-bearing here:
 *  1. **No preview is invented.** `storage_path` is an object-storage KEY
 *     (§R6.8) and the contract serves no binary, so `ImageVM` carries
 *     `previewUrl: null` unless a live wire proves a URL exists — the one line
 *     to change (plan §5.2 D2). A key is never passed to an `<img src>`.
 *  2. **No safety verdict is invented.** §R6.7's validator is backend-side and
 *     the contract exposes no field, so there is no `safetyOk` in the VM and
 *     no safety chip in the UI (plan §5.2 D5).
 *  3. **Verification is wire-derived.** `verified`/`needsReview` come from the
 *     record's own status through the 12-status registry; unknown wire values
 *     stay raw (`status: null`), and an unknown status starts NO polling.
 *  4. **Unknown similarity keys survive.** The §R6.4 report is backend-defined
 *     jsonb; the mapper renders unknown keys by their raw name (the §R9.12
 *     `style_features` discipline), never dropping or renaming data.
 */
import { parseStatus, STATUS, type Status } from '@/shared/types/status';
import type {
  ImageHistoryEntryWireDTO,
  ImageSimilarityWireDTO,
  ImageWireDTO,
} from '@/shared/types';

export type { ImageWireDTO, ImageHistoryEntryWireDTO, ImageSimilarityWireDTO };

export interface ImageVM {
  readonly id: string;
  readonly channelId: string;
  readonly actorId: string | null;
  readonly locationId: string | null;
  readonly prompt: string | null;
  readonly negativePrompt: string | null;
  readonly provider: string | null;
  readonly seed: number | null;
  readonly resolution: string | null;
  readonly style: string | null;
  readonly camera: string | null;
  readonly lighting: string | null;
  readonly composition: string | null;
  /** True when the record names an object-storage key (§R6.8) — NOT a URL. */
  readonly hasStoredFile: boolean;
  /** Non-null only if the wire ever carries a real media URL (FE-RV-12). */
  readonly previewUrl: string | null;
  readonly phash: string | null;
  readonly qualityScore: number | null;
  readonly rawStatus: string | null;
  readonly status: Status | null;
  readonly verified: boolean;
  readonly needsReview: boolean;
  readonly failed: boolean;
  /** Drives honest polling — true ONLY for a recognised in-flight status. */
  readonly working: boolean;
  readonly publishedAt: string | null;
  readonly createdAt: string | null;
}

export interface ImageAttemptVM {
  readonly id: string;
  readonly attempt: number;
  readonly prompt: string | null;
  readonly seed: number | null;
  readonly provider: string | null;
  readonly result: string | null;
  readonly rawResult: string | null;
  readonly status: Status | null;
  readonly createdAt: string;
}

export interface SimilarityMetricVM {
  /** Raw backend key — kept so an unknown metric stays traceable. */
  readonly key: string;
  /** Humanised label when the key is known; the raw key otherwise. */
  readonly label: string;
  readonly value: string;
  readonly unknown: boolean;
  /** Which of the three §R6.4 mechanisms the metric belongs to, if known. */
  readonly mechanism: 'phash' | 'scene' | 'clip' | null;
}

export interface SimilarityReportVM {
  readonly metrics: readonly SimilarityMetricVM[];
  /** True when the wire carried nothing renderable (honest empty state). */
  readonly empty: boolean;
}

/** Statuses that mean "the backend is working on it" (§R4.11 vocabulary). */
const WORKING: readonly Status[] = [STATUS.queued, STATUS.running, STATUS.streaming];

export function mapImage(wire: ImageWireDTO): ImageVM {
  const rawStatus = wire.status ?? null;
  const status = rawStatus !== null ? parseStatus(rawStatus) : null;
  return {
    id: wire.id,
    channelId: wire.channel_id,
    actorId: wire.actor_id ?? null,
    locationId: wire.location_id ?? null,
    prompt: wire.prompt ?? null,
    negativePrompt: wire.negative_prompt ?? null,
    provider: wire.provider ?? null,
    seed: wire.seed ?? null,
    resolution: wire.resolution ?? null,
    style: wire.style ?? null,
    camera: wire.camera ?? null,
    lighting: wire.lighting ?? null,
    composition: wire.composition ?? null,
    hasStoredFile: typeof wire.storage_path === 'string' && wire.storage_path.trim() !== '',
    // FE-RV-12: the contract exposes no media endpoint; a storage key is NOT a
    // URL, so nothing is rendered as an image source until a wire proves one.
    previewUrl: null,
    phash: wire.phash ?? null,
    qualityScore: wire.quality_score ?? null,
    rawStatus,
    status,
    verified: status === STATUS.verified || status === STATUS.completed,
    needsReview: status === STATUS.needsReview,
    failed: status === STATUS.failed,
    working: status !== null && WORKING.includes(status),
    publishedAt: wire.published_at ?? null,
    createdAt: wire.created_at ?? null,
  };
}

export function mapImageAttempt(wire: ImageHistoryEntryWireDTO): ImageAttemptVM {
  const rawResult = wire.result ?? null;
  return {
    id: wire.id,
    attempt: wire.attempt,
    prompt: wire.prompt ?? null,
    seed: wire.seed ?? null,
    provider: wire.provider ?? null,
    result: rawResult,
    rawResult,
    status: rawResult !== null ? parseStatus(rawResult) : null,
    createdAt: wire.created_at,
  };
}

/** Known §R6.4 report keys. Anything outside this map renders by raw key. */
const SIMILARITY_LABELS: Readonly<
  Record<string, { readonly label: string; readonly mechanism: 'phash' | 'scene' | 'clip' }>
> = {
  phash: { label: 'Perceptual hash', mechanism: 'phash' },
  phash_distance: { label: 'Closest phash distance', mechanism: 'phash' },
  nearest_image_id: { label: 'Closest image', mechanism: 'phash' },
  clip_similarity: { label: 'CLIP similarity', mechanism: 'clip' },
  clip_nearest_image_id: { label: 'Closest image (CLIP)', mechanism: 'clip' },
  scene_repeats: { label: 'Scene repeats in window', mechanism: 'scene' },
  composition: { label: 'Composition', mechanism: 'scene' },
  camera: { label: 'Camera', mechanism: 'scene' },
  wardrobe: { label: 'Wardrobe', mechanism: 'scene' },
  palette: { label: 'Palette', mechanism: 'scene' },
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  return JSON.stringify(value);
}

/**
 * Flatten the backend report into renderable rows — never inventing a verdict.
 * The console reports the numbers the backend computed; it does not conclude
 * "unique" or "safe" on their behalf (plan §5.2 D5).
 */
export function mapSimilarityReport(
  wire: ImageSimilarityWireDTO | null | undefined,
): SimilarityReportVM {
  if (!wire || typeof wire !== 'object') return { metrics: [], empty: true };
  const metrics = Object.entries(wire)
    .filter(([key]) => key !== 'image_id')
    .map(([key, value]) => {
      const known = SIMILARITY_LABELS[key];
      return {
        key,
        label: known?.label ?? key,
        value: displayValue(value),
        unknown: known === undefined,
        mechanism: known?.mechanism ?? null,
      };
    });
  return { metrics, empty: metrics.length === 0 };
}

/** Newest first; records without a timestamp keep their wire order at the end. */
export function sortImages(images: readonly ImageVM[]): readonly ImageVM[] {
  return [...images].sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    if (a.createdAt === null) return 1;
    if (b.createdAt === null) return -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/** Client-side LIST filtering (prompt/provider/style contains) — presentation
 * only, honestly distinct from any backend search (plan §5.2 D1). */
export function filterImages(images: readonly ImageVM[], query: string): readonly ImageVM[] {
  const q = query.trim().toLowerCase();
  if (q === '') return images;
  return images.filter(
    (image) =>
      (image.prompt ?? '').toLowerCase().includes(q) ||
      (image.provider ?? '').toLowerCase().includes(q) ||
      (image.style ?? '').toLowerCase().includes(q) ||
      (image.rawStatus ?? '').toLowerCase().includes(q),
  );
}

/** Attempts are the §R6.5 truth about how often generation ran for a record. */
export function regenCount(attempts: readonly ImageAttemptVM[]): number {
  return Math.max(0, attempts.length - 1);
}
