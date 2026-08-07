/** Public API — entity `audit` (FS12 §R10.8). Read-only by construction. */
export {
  mapAuditRecord,
  sortAuditRecords,
  diffAuditRecord,
  collectFacet,
  renderAuditValue,
  type AuditRecordVM,
  type AuditChangeKind,
  type AuditDiffRow,
  type AuditDiffKind,
  type AuditRecordWireDTO,
} from './model';
export { fetchAuditRecords, useAuditRecords, AUDIT_STALE_MS } from './hooks';
export { auditPaths } from './paths';
export { auditKeys } from './keys';
