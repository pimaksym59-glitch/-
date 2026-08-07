import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS11 Analytics journeys (D3 §12 / STAGE_FS11_PLAN §4 T-FS11.13) on the
 * deterministic fixtures: the reliable panels with real served numbers, the
 * **gated engagement card with no value** (the screen's reason to exist), the
 * contract-native range and `group_by` facets as reversible URL state, the
 * period report, the datapoint Inspector that fetches nothing, the honest
 * absences (anomaly/forecast/recommendation/system/liveness), export by link
 * and CSV, channel re-scoping, read-only roles — plus axe.
 *
 * Determinism note: assertions about DATA always navigate with an explicit
 * `?from=&to=` window that covers the fixture dates, never the clock-derived
 * default. The default-range journey asserts the URL contract only.
 *
 * Sharp edges honoured (PART3 §3.3): role **+ level** for headings · `{ exact:
 * true }` for substring-prone labels · scope `.first()` to a visible region on
 * mobile.
 */
async function signIn(page: Page, role = 'owner'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${role}@console.local`);
  await page.getByLabel('Password').fill('console-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function axeMessage(violations: { id: string; nodes: { target: unknown }[] }[]): string {
  return JSON.stringify(
    violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    null,
    2,
  );
}

const MOBILE_PROJECT = 'mobile';

/** A window that covers every fixture cost day (2026-07-24 … 2026-07-30). */
const RANGE = 'from=2026-07-01&to=2026-07-31';

test('the reliable panels render real served numbers', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
  // Snapshot metrics from the contract, with neutral labels (the endpoint takes
  // a range, so "today" would be wrong).
  await expect(page.getByText('$4.82')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost by day' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quality' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trends' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Period report' })).toBeVisible();

  // Real quality values, and an unrecognised key kept by its RAW name.
  // `quality_score` is served by BOTH the quality panel and the period report,
  // so assertions are scoped to the region rather than the page.
  const quality = page.getByRole('region', { name: 'Quality', exact: true });
  await expect(quality.getByText('82.4')).toBeVisible();
  await expect(quality.getByText('style_drift_index')).toBeVisible();
  await expect(quality.getByText('(raw key)')).toBeVisible();
});

test('engagement is GATED — named, explained, and carrying no value', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);

  const gated = page.getByTestId('gated-panel').first();
  await expect(gated).toBeVisible();
  await expect(gated).toContainText('Engagement metrics need a stats adapter');
  await expect(gated).toContainText('Views');
  await expect(gated).toContainText('unavailable');

  // The fixture DOES carry a number for the gated rate; it must never surface.
  await expect(page.getByText('0.071')).toHaveCount(0);
  // A gated series is named as not plotted rather than drawn flat.
  await expect(page.getByTestId('trends-gated-note')).toContainText('Views');
});

test('every panel states its provenance, including an absent algorithm version', async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);

  const whispers = page.getByTestId('panel-provenance');
  await expect(whispers.first()).toBeVisible();
  await expect(page.getByText(/algorithm quality-v3/).first()).toBeVisible();
  await expect(page.getByText(/no algorithm version reported/).first()).toBeVisible();
});

test('the range is contract-native URL state and Back reverses it', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);
  await expect(page.getByText('$4.82')).toBeVisible();

  await page.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
  await expect(page).not.toHaveURL(/from=2026-07-01/);

  await page.goBack();
  await expect(page).toHaveURL(/from=2026-07-01&to=2026-07-31/);
});

test('the group_by facet is a real server call and a real history entry', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);
  await expect(page.getByRole('heading', { name: 'Cost by day' })).toBeVisible();

  await page
    .getByRole('group', { name: 'Group cost by' })
    .getByRole('button', { name: 'model' })
    .click();
  await expect(page).toHaveURL(/group_by=model/);
  await expect(page.getByRole('heading', { name: 'Cost by model' })).toBeVisible();
  await expect(page.getByText('claude-opus-4-8')).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Cost by day' })).toBeVisible();
});

test('the period report switches between the three documented periods', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);

  const group = page.getByRole('group', { name: 'Report period' });
  await expect(group.getByRole('button', { name: 'daily' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await group.getByRole('button', { name: 'weekly' }).click();
  await expect(page).toHaveURL(/period=weekly/);
  await expect(page.getByText('42.63')).toBeVisible();
  // The report takes no range — the provenance says so instead of implying one.
  await expect(page.getByText(/range not sent/).first()).toBeVisible();
});

test('a datapoint opens in the Inspector and nothing is fetched to show it', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop drawer variant; mobile is a sheet.');
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);

  // Record only AFTER the panels have settled: the assertion is that OPENING
  // the inspector costs no request, not that the page never loaded anything.
  const quality = page.getByRole('region', { name: 'Quality', exact: true });
  await expect(quality.getByText('82.4')).toBeVisible();
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request.url());
  });

  await page
    .getByRole('region', { name: 'Quality', exact: true })
    .getByRole('button', { name: /Quality score/ })
    .click();
  await expect(page).toHaveURL(/inspect=datapoint/);
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByText('82.4')).toBeVisible();
  await expect(inspector.getByText('quality-v3')).toBeVisible();
  await expect(inspector.getByText(/no request was made/i)).toBeVisible();
  expect(requests).toHaveLength(0);

  await page.goBack();
  await expect(inspector.getByText(/no request was made/i)).toHaveCount(0);
});

test('a range with no data is an honest empty, never zeros', async ({ page }) => {
  await signIn(page);
  await page.goto('/analytics?from=2020-01-01&to=2020-01-31');

  await expect(page.getByText(/No data for this range yet/).first()).toBeVisible();
  await expect(page.getByText('$0.00')).toHaveCount(0);
});

test('export offers a link and a CSV of loaded data — and no server export', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);

  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^analytics-ch_tech-2026-07-01-2026-07-31\.csv$/);
  // Gated series are excluded and named, never exported as blanks.
  await expect(page.getByText(/Gated series were left out/).first()).toBeVisible();
});

test('the honest absences are stated on the screen', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);

  await expect(
    page.getByRole('heading', { name: 'Nothing here is flagged as an anomaly' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Cost history is real; a forecast is not offered' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No recommendations, and no A/B experiments' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'System health lives elsewhere' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'These numbers are fetched, not streamed' }),
  ).toBeVisible();
});

test('switching the channel re-scopes the numbers and keeps the range', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);
  await expect(page.getByText('$4.82')).toBeVisible();

  await page.getByRole('button', { name: 'Switch channel' }).click();
  await page.getByRole('menuitem', { name: /Daily Brief/ }).click();

  await expect(page.getByText('$2.11')).toBeVisible();
  // The range survives the switch — D1 §6.6 "stay on the screen, swap channel".
  await expect(page).toHaveURL(/from=2026-07-01&to=2026-07-31/);
});

test('analyst and viewer read the whole screen (the RBAC matrix grants it)', async ({ page }) => {
  for (const role of ['analyst', 'viewer']) {
    await signIn(page, role);
    await page.goto(`/analytics?${RANGE}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
    await expect(page.getByText('$4.82')).toBeVisible();
    await expect(page.getByTestId('gated-panel').first()).toBeVisible();
    // The AI panel spends model budget — it stays an editor affordance.
    await expect(page.getByRole('button', { name: /Explain these numbers/ })).toHaveCount(0);
  }
});

test('explain-metrics runs only on request and cites what it read', async ({ page }) => {
  await signIn(page, 'editor');
  await page.goto(`/analytics?${RANGE}`);

  // Nothing auto-runs.
  await expect(page.getByTestId('explain-metrics-output')).toHaveCount(0);

  await page.getByRole('button', { name: /Explain these numbers/ }).click();
  await page.getByRole('button', { name: 'Describe the numbers' }).click();

  const output = page.getByTestId('explain-metrics-output');
  // Anchor on the wire-cost done marker (the FS6 lesson).
  await expect(output.getByText(/\$0\./).first()).toBeVisible({ timeout: 15_000 });
  await expect(output.getByText('Generated')).toBeVisible();
  // Explainability is a disclosure — open it before reading its limits.
  await output.getByRole('button', { name: 'Why this output' }).click();
  await expect(output.getByText(/Gated metrics were withheld entirely/)).toBeVisible();
  // Confidence has no wire source and is never rendered.
  await expect(output.getByText(/confidence/i)).toHaveCount(0);
});

test('axe: the analytics panel grid is clean', async ({ page }) => {
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
  await page.mouse.move(0, 0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, axeMessage(results.violations)).toEqual([]);
});

test('axe: a datapoint Inspector is clean', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop drawer variant; mobile is a sheet.');
  await signIn(page);
  await page.goto(`/analytics?${RANGE}`);
  await page
    .getByRole('region', { name: 'Quality', exact: true })
    .getByRole('button', { name: /Quality score/ })
    .click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeVisible();
  await page.mouse.move(0, 0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, axeMessage(results.violations)).toEqual([]);
});
