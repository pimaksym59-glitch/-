/**
 * features/ — user actions + their data (Stage 3 §3). One slice per action,
 * each exposing only its `index.ts`; features never import sibling features
 * (compose via widgets). FS4 lands the first slice: `auth`. Import slices
 * directly (`@/features/auth`) — this file is documentation, not a barrel.
 */
export {};
