/** Public API — the toast-muting read side (FS13 D5-B). See muted-toasts.ts. */
export {
  MUTED_TOASTS_COOKIE,
  UNMUTABLE_TOAST_KIND,
  isToastKindMuted,
  readMutedToastKinds,
} from './muted-toasts';
