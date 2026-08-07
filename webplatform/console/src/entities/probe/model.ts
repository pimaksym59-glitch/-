/**
 * Entity `probe` — model (FS12, D3 §16). Liveness and readiness are separate
 * endpoints by requirement (§R12.10), and the console never conflates them.
 *
 * **The screen renders ONLY what the readiness payload actually names.** The
 * contract documents no response schema, so the mapper is shape-tolerant in
 * three ways and honest in all of them:
 *   - a dependency map (`{postgres: 'ok'}`), a nested map (`{postgres: {status}}`)
 *     and a list of `{name, status}` objects are all understood;
 *   - an unrecognised state is **`unknown` (grey)** and its RAW value is kept
 *     for display — never coerced to green;
 *   - if the payload names nothing, the probe list is EMPTY and the screen says
 *     the readiness endpoint reported no per-dependency detail. Nothing is
 *     derived from unrelated endpoints (the FS11 rule), and nothing is invented.
 *
 * D2 §12's calm dot system supplies the four states (green/amber/red/grey); no
 * new D2 §11 status is registered, because a probe state is a data-viz health
 * indicator, not an entry in the cross-screen status vocabulary.
 */
import type { HealthProbeWireDTO } from '@/shared/types';

export type { HealthProbeWireDTO };

export type ProbeState = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface ProbeVM {
  /** The dependency name exactly as the wire spells it. */
  readonly name: string;
  readonly state: ProbeState;
  /** The raw wire value, shown when the state is `unknown`. */
  readonly rawState: string;
  /** Free-form detail when the wire carries one. */
  readonly detail: string | null;
}

export interface ReadinessVM {
  /** The endpoint's own top-level verdict, mapped the same way. */
  readonly overall: ProbeState;
  readonly rawOverall: string;
  readonly probes: readonly ProbeVM[];
  /** True when the payload carried no per-dependency detail at all. */
  readonly hasProbeDetail: boolean;
}

const HEALTHY = new Set(['ok', 'up', 'healthy', 'pass', 'ready', 'true', 'available']);
const DEGRADED = new Set(['degraded', 'warn', 'warning', 'partial', 'slow']);
const DOWN = new Set(['down', 'fail', 'failed', 'error', 'unavailable', 'false', 'unhealthy']);

/** Unknown wins over a guess: anything the sets do not carry stays grey. */
export function parseProbeState(value: unknown): ProbeState {
  if (value === true) return 'healthy';
  if (value === false) return 'down';
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  if (HEALTHY.has(normalized)) return 'healthy';
  if (DEGRADED.has(normalized)) return 'degraded';
  if (DOWN.has(normalized)) return 'down';
  return 'unknown';
}

function rawOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);
  return 'unknown';
}

function readEntry(name: string, value: unknown): ProbeVM {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const state = record['status'] ?? record['state'] ?? record['healthy'];
    const detail = record['detail'] ?? record['message'] ?? record['error'];
    return {
      name,
      state: parseProbeState(state),
      rawState: rawOf(state),
      detail: typeof detail === 'string' ? detail : null,
    };
  }
  return { name, state: parseProbeState(value), rawState: rawOf(value), detail: null };
}

/**
 * `checks` and `dependencies` are both accepted because the contract documents
 * neither; whichever the wire uses is read, and a list form is read too.
 */
export function mapReadiness(wire: HealthProbeWireDTO): ReadinessVM {
  const source = wire.checks ?? wire.dependencies ?? null;
  const probes: ProbeVM[] = [];

  if (Array.isArray(source)) {
    for (const item of source as readonly unknown[]) {
      if (item !== null && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const name = record['name'] ?? record['service'] ?? record['component'];
        if (typeof name === 'string') probes.push(readEntry(name, record));
      }
    }
  } else if (source !== null && typeof source === 'object') {
    for (const [name, value] of Object.entries(source)) probes.push(readEntry(name, value));
  }

  probes.sort((a, b) => a.name.localeCompare(b.name));
  return {
    overall: parseProbeState(wire.status),
    rawOverall: rawOf(wire.status),
    probes,
    hasProbeDetail: probes.length > 0,
  };
}

export const PROBE_STATE_LABELS: Record<ProbeState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'Unknown',
};

/** Attention first: down, then degraded, then unknown, then healthy. */
export function sortProbes(probes: readonly ProbeVM[]): readonly ProbeVM[] {
  const order: readonly ProbeState[] = ['down', 'degraded', 'unknown', 'healthy'];
  return probes
    .slice()
    .sort(
      (a, b) => order.indexOf(a.state) - order.indexOf(b.state) || a.name.localeCompare(b.name),
    );
}
