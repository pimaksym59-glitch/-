/** Public API — entity `probe` (FS12 Health §R12.10). */
export {
  mapReadiness,
  parseProbeState,
  sortProbes,
  PROBE_STATE_LABELS,
  type ProbeVM,
  type ProbeState,
  type ReadinessVM,
  type HealthProbeWireDTO,
} from './model';
export { fetchReadiness, fetchLiveness, useReadiness, useLiveness, PROBE_STALE_MS } from './hooks';
export { probePaths } from './paths';
export { probeKeys } from './keys';
