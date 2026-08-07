/**
 * The frozen cost call, verbatim:
 *   GET /cost?group_by=channel|model|provider|day   (§R11.8 — «надёжный источник»)
 *
 * That is the ONLY call `/billing` makes. The contract carries no plan,
 * invoice, budget-alert or forecast endpoint (plan §5.2 D9), so none is written
 * down here and none is called.
 *
 * **Platform-wide, deliberately.** This path takes no channel id: Billing is a
 * platform surface, and the channel switcher must provably change nothing on
 * it (the FS10 requirement-A standard). Locked by
 * `tests/unit/platform-commons.test.ts` by function ARITY.
 */
export const costReportPaths = {
  byGroup: (groupBy: string) => `/cost?group_by=${encodeURIComponent(groupBy)}`,
} as const;
