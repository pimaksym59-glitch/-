/**
 * Entity `analytics-report` — the FS11 reporting surface.
 *
 * It is a SEPARATE slice from `entities/analytics` for a measured reason, not a
 * taxonomic one. FS5's slice is imported by the dashboard; when the FS11 hooks
 * were re-exported from that barrel, the dashboard's client graph swallowed
 * them (a `'use client'` module reached through a barrel is bundled whole, the
 * FS3 barrel lesson) and `/dashboard` went 167 → 169 kB. Splitting the slice
 * returned it to 167 with no other change (FS11 report §6).
 *
 * It imports NOTHING from `entities/analytics`: the snapshot is mapped through
 * this slice's own `mapMetricEntry`, so the two slices share a wire mirror in
 * `shared/types` and nothing else — no cross-entity import, no duplicated
 * mapping logic.
 */
export * from './keys';
export * from './paths';
export * from './report-model';
export * from './report-hooks';
