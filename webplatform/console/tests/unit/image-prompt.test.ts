/**
 * `buildImagePrompt` — the FS9 provenance proof (plan §5.2 D6, T-FS9.9). The
 * prompt must contain the SELECTED image's own record and its similarity
 * report, plus the question, and NOTHING else; and it must forbid the three
 * fabrications this surface could drift into (a safety verdict, an identity
 * match, a uniqueness claim beyond the numbers).
 */
import { describe, expect, it } from 'vitest';
import { mapImage, mapSimilarityReport } from '@/entities/image';
import { buildImagePrompt, EXPLAIN_IMAGE_QUESTION } from '@/features/explain-verification';
import { IMAGES, IMAGE_SIMILARITY } from '@/shared/lib/fixtures/dataset';

function wireFor(id: string) {
  const wire = IMAGES.find((image) => image.id === id);
  if (!wire) throw new Error(`fixture must model ${id}`);
  return wire;
}

const IMAGE = mapImage(wireFor('img_tech_1'));
const OTHER = mapImage(wireFor('img_tech_2'));
const REPORT = mapSimilarityReport(IMAGE_SIMILARITY.img_tech_1);

describe('buildImagePrompt (single-record scope)', () => {
  it('contains this image’s own parameters and its report metrics', () => {
    const { prompt } = buildImagePrompt(IMAGE, REPORT, 'Why is this flagged?');
    expect(prompt).toContain(IMAGE.prompt as string);
    expect(prompt).toContain('fake-image');
    expect(prompt).toContain('812004');
    expect(prompt).toContain('Closest phash distance: 18');
    expect(prompt).toContain('CLIP similarity: 0.412');
    expect(prompt).toContain('Question: Why is this flagged?');
  });

  it('contains NOTHING from another image record', () => {
    const { prompt } = buildImagePrompt(IMAGE, REPORT, '');
    expect(prompt).not.toContain(OTHER.prompt as string);
    expect(prompt).not.toContain(String(OTHER.seed));
    expect(prompt).not.toContain('Rooftop');
  });

  it('forbids safety, identity-match and uniqueness claims in the instruction', () => {
    const { prompt } = buildImagePrompt(IMAGE, REPORT, '');
    expect(prompt).toMatch(/Do not judge whether the image is safe/);
    expect(prompt).toMatch(/Do not claim the face matches any/);
    expect(prompt).toMatch(/do not declare the image unique or duplicated beyond what the numbers/);
    expect(prompt).toMatch(/using ONLY the record and report below/);
  });

  it('falls back to the canonical question and states its own limits', () => {
    const built = buildImagePrompt(IMAGE, REPORT, '   ');
    expect(built.prompt).toContain(`Question: ${EXPLAIN_IMAGE_QUESTION}`);
    expect(built.dataUsed).toContain('similarity metric');
    expect(built.dataUsed).toContain('no other image');
    expect(built.limitations).toMatch(/generated and unverified/);
    expect(built.limitations).toMatch(/whether the image passed safety checks/);
  });

  it('degrades honestly when the backend reported no metrics', () => {
    const built = buildImagePrompt(IMAGE, null, '');
    expect(built.prompt).toContain('(no similarity metrics reported)');
    expect(built.dataUsed).toContain('0 similarity metrics');
  });

  it('never mentions a preview, a URL or a stored file path', () => {
    const { prompt } = buildImagePrompt(IMAGE, REPORT, '');
    expect(prompt).not.toMatch(/https?:\/\//);
    expect(prompt).not.toContain('storage_path');
    expect(prompt).not.toContain('channels/ch_tech/images');
  });
});
