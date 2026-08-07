/**
 * Image entity mappers (FS9 T-FS9.2). The rules under test are the honesty
 * rules of the stage: no preview is invented from a storage key, no safety
 * verdict exists, an unknown wire status never starts polling and never gets
 * coerced, and an unknown similarity key survives by its raw name.
 */
import { describe, expect, it } from 'vitest';
import {
  filterImages,
  imageMetaRows,
  mapImage,
  mapImageAttempt,
  mapSimilarityReport,
  regenCount,
  sortImages,
  type ImageWireDTO,
} from '@/entities/image';
import { resolveLocationName, mapLocation } from '@/entities/location';
import { IMAGES, IMAGE_HISTORY, IMAGE_SIMILARITY, LOCATIONS } from '@/shared/lib/fixtures/dataset';

const VERIFIED = IMAGES.find((image) => image.id === 'img_tech_1') as ImageWireDTO;
const UNKNOWN_STATUS = IMAGES.find((image) => image.id === 'img_tech_3') as ImageWireDTO;

describe('mapImage (plan §5.2 D2/D5)', () => {
  it('never turns a storage key into a preview URL', () => {
    const vm = mapImage(VERIFIED);
    expect(VERIFIED.storage_path).toBeTruthy();
    expect(vm.hasStoredFile).toBe(true);
    expect(vm.previewUrl).toBeNull();
    // The key itself must not leak into the ViewModel as a renderable source.
    expect(JSON.stringify(vm)).not.toContain(VERIFIED.storage_path as string);
  });

  it('derives verification from the wire status only — no safety field exists', () => {
    const vm = mapImage(VERIFIED);
    expect(vm.verified).toBe(true);
    expect(vm.needsReview).toBe(false);
    expect(vm.working).toBe(false);
    expect(Object.keys(vm)).not.toContain('safetyOk');
    expect(Object.keys(vm)).not.toContain('safe');
  });

  it('surfaces an unknown wire status raw and starts NO polling', () => {
    const vm = mapImage(UNKNOWN_STATUS);
    expect(vm.rawStatus).toBe('post_processing');
    expect(vm.status).toBeNull();
    expect(vm.working).toBe(false);
    expect(vm.verified).toBe(false);
  });

  it('flags a recognised in-flight status as working (drives honest polling)', () => {
    expect(mapImage({ ...VERIFIED, status: 'queued' }).working).toBe(true);
    expect(mapImage({ ...VERIFIED, status: 'running' }).working).toBe(true);
    expect(mapImage({ ...VERIFIED, status: 'failed' }).working).toBe(false);
  });

  it('keeps missing fields null instead of inventing defaults', () => {
    const vm = mapImage({ id: 'i', channel_id: 'ch' });
    expect(vm.prompt).toBeNull();
    expect(vm.seed).toBeNull();
    expect(vm.qualityScore).toBeNull();
    expect(vm.hasStoredFile).toBe(false);
    expect(imageMetaRows(vm)).toHaveLength(0);
  });
});

describe('imageMetaRows (stateless projection)', () => {
  it('renders only the parameters the wire carries', () => {
    const rows = imageMetaRows(mapImage(VERIFIED));
    const labels = rows.map((row) => row.label);
    expect(labels).toContain('Provider');
    expect(labels).toContain('Seed');
    expect(labels).toContain('Perceptual hash');
    expect(rows.every((row) => row.value !== '—')).toBe(true);
  });
});

describe('mapSimilarityReport (§R6.4)', () => {
  it('groups known metrics by mechanism and keeps unknown keys by raw name', () => {
    const report = mapSimilarityReport(IMAGE_SIMILARITY.img_tech_1);
    expect(report.empty).toBe(false);
    const byKey = Object.fromEntries(report.metrics.map((metric) => [metric.key, metric]));
    expect(byKey.phash_distance?.mechanism).toBe('phash');
    expect(byKey.clip_similarity?.mechanism).toBe('clip');
    expect(byKey.composition?.mechanism).toBe('scene');
    // The deliberately unknown key survives, flagged, never renamed or dropped.
    expect(byKey.face_match_distance?.unknown).toBe(true);
    expect(byKey.face_match_distance?.label).toBe('face_match_distance');
    // `image_id` is plumbing, not a metric.
    expect(byKey.image_id).toBeUndefined();
  });

  it('reports an absent report honestly instead of inventing metrics', () => {
    expect(mapSimilarityReport(null).empty).toBe(true);
    expect(mapSimilarityReport({}).metrics).toHaveLength(0);
  });
});

describe('history, sorting and filtering', () => {
  it('maps attempts and counts regenerations from real attempts (§R6.5)', () => {
    const attempts = (IMAGE_HISTORY.img_tech_1 ?? []).map(mapImageAttempt);
    expect(attempts).toHaveLength(2);
    expect(attempts[0]?.status).toBe('failed');
    expect(attempts[1]?.status).toBe('verified');
    expect(regenCount(attempts)).toBe(1);
    expect(regenCount([])).toBe(0);
  });

  it('keeps an unrecognised attempt result raw', () => {
    const attempt = mapImageAttempt({
      id: 'x',
      image_id: 'i',
      attempt: 1,
      result: 'upscaled',
      created_at: '2026-07-30T00:00:00Z',
    });
    expect(attempt.status).toBeNull();
    expect(attempt.rawResult).toBe('upscaled');
  });

  it('sorts newest first and filters the loaded list only', () => {
    const vms = IMAGES.map(mapImage);
    const sorted = sortImages(vms);
    expect(sorted[0]?.id).toBe('img_tech_3');
    expect(filterImages(vms, 'rooftop').map((image) => image.id)).toEqual(['img_tech_2']);
    expect(filterImages(vms, '')).toHaveLength(vms.length);
  });
});

describe('location resolution (§R6.3)', () => {
  it('resolves a known scene and keeps an unknown id visible', () => {
    const locations = LOCATIONS.map(mapLocation);
    expect(resolveLocationName(locations, 'loc_tech_studio')).toBe('Home studio');
    expect(resolveLocationName(locations, 'loc_unknown_seed')).toBe('loc_unknown_seed');
    expect(resolveLocationName(locations, null)).toBeNull();
  });
});
