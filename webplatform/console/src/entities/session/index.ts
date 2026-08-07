/**
 * Public API — entity `session` (Stage 3 §4). Read-only session projection;
 * the write side (login/logout) belongs to feature `auth`.
 */
export { useSessionQuery, fetchSession } from './model/useSessionQuery';
