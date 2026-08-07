/**
 * Per-component axe harness (FS3 T-FS3.1). Runs axe-core against a rendered
 * container in jsdom.
 *
 * Honesty note: jsdom performs no real layout/painting, so `color-contrast`
 * (and other rendering-dependent rules) cannot be evaluated here and are
 * disabled explicitly. Rendered-contrast coverage remains the job of the
 * Playwright + @axe-core/playwright E2E gate (three viewports), exactly as in
 * FS1/FS2. This harness covers structure/ARIA/labels per component.
 */
import axe from 'axe-core';
import { expect } from 'vitest';

const JSDOM_DISABLED_RULES: Record<string, { enabled: boolean }> = {
  'color-contrast': { enabled: false },
};

export async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: JSDOM_DISABLED_RULES,
    // Components render without a page shell; page-level rules do not apply.
    resultTypes: ['violations'],
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`,
  );
  expect(summary, 'axe violations').toEqual([]);
}
