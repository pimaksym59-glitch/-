/** Public API — entity `cost-report` (FS12 Billing §R11.8). */
export {
  mapCostReport,
  parseCostGroup,
  COST_GROUPS,
  COST_GROUP_LABELS,
  type CostGroup,
  type CostRowVM,
  type CostReportVM,
  type CostEntryWireDTO,
} from './model';
export { fetchCostReport, useCostReport, COST_REPORT_STALE_MS } from './hooks';
export { costReportPaths } from './paths';
export { costReportKeys } from './keys';
