/**
 * ImageMetaList (FS9) — the generation parameters a record actually carries
 * (§R6.8 storage metadata: prompt-side inputs, provider, seed, resolution and
 * the scene fields §R6.3). **Stateless by contract** (plan §3.4 lock 5): a
 * pure function of its props, with no cache copy and no derived verdicts.
 *
 * A field the wire does not carry is simply not rendered — no "—" filler rows,
 * no invented defaults.
 */
import type { ImageVM } from '../model';

export interface ImageMetaRow {
  readonly label: string;
  readonly value: string;
}

/** Pure projection — exported so the "no invented fields" rule is unit-testable. */
export function imageMetaRows(image: ImageVM): readonly ImageMetaRow[] {
  const rows: (ImageMetaRow | null)[] = [
    image.provider ? { label: 'Provider', value: image.provider } : null,
    image.seed !== null ? { label: 'Seed', value: String(image.seed) } : null,
    image.resolution ? { label: 'Resolution', value: image.resolution } : null,
    image.style ? { label: 'Style', value: image.style } : null,
    image.camera ? { label: 'Camera', value: image.camera } : null,
    image.lighting ? { label: 'Lighting', value: image.lighting } : null,
    image.composition ? { label: 'Composition', value: image.composition } : null,
    image.qualityScore !== null
      ? { label: 'Quality score', value: image.qualityScore.toFixed(2) }
      : null,
    image.phash ? { label: 'Perceptual hash', value: image.phash } : null,
  ];
  return rows.filter((row): row is ImageMetaRow => row !== null);
}

export function ImageMetaList({ image }: { readonly image: ImageVM }): React.ReactElement | null {
  const rows = imageMetaRows(image);
  if (rows.length === 0) return null;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-secondary">{row.label}</dt>
          <dd className="min-w-0 break-words font-medium text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
