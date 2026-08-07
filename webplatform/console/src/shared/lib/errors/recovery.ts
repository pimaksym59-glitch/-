/**
 * Error → recovery mapping (D4 §8). Maps an AppError kind to a user-facing
 * recovery affordance so surfaces render specific, honest guidance — never a
 * bare "Something went wrong" (D2 §16).
 */
import type { AppError, AppErrorKind } from './AppError';

export type RecoveryAction = 'retry' | 'signin' | 'contact' | 'wait' | 'learn' | 'none';

export interface Recovery {
  readonly title: string;
  readonly action: RecoveryAction;
}

const RECOVERY: Record<AppErrorKind, Recovery> = {
  validation: { title: 'Check the highlighted fields and try again.', action: 'none' },
  permission: {
    title: "You don't have access to this. Sign in with the right role.",
    action: 'signin',
  },
  notFound: { title: "We couldn't find that resource.", action: 'none' },
  conflict: { title: 'This changed since you loaded it. Refresh and retry.', action: 'retry' },
  rateLimit: { title: 'Too many requests. Give it a moment.', action: 'wait' },
  network: { title: "You appear to be offline. We'll retry automatically.", action: 'retry' },
  server: { title: 'The service had a problem. Retry, or check Health.', action: 'retry' },
  gated: { title: 'This data requires an adapter that is not configured.', action: 'learn' },
  unknown: { title: 'Something unexpected happened.', action: 'contact' },
};

export function recoveryFor(error: AppError): Recovery {
  return RECOVERY[error.kind];
}
