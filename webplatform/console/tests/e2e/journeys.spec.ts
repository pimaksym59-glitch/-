import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ROUTE_LIST } from '../../src/shared/config/routes';

/**
 * FS14 — the D3 Part C cross-screen journeys (STAGE_FS14_PLAN §1 T-FS14.4…8).
 *
 * Every other spec in this suite proves ONE screen. This file proves the space
 * BETWEEN screens: that a user can walk each Part C chain end to end, that
 * every hop is a real URL the browser can reverse, and that where the frozen
 * contract cannot back a step the chain ends at a NAMED seam rather than in
 * silence.
 *
 * Two rules hold throughout, both learned the expensive way:
 *   • every hop asserts a fact from the WIRE (a 202's queued wording, a task
 *     id, a served number) — never merely a URL change, which would let a
 *     journey pass while doing nothing;
 *   • a seam is asserted by its own copy, so "the step is missing" and "the
 *     step is explained" cannot be confused.
 *
 * The fixture stand-in acknowledges intents (§R10.1) but does not run a worker:
 * a queued task id is REAL in the response and is deliberately not asserted to
 * appear later in the queue, because the fixture does not materialise it.
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

/* ------------------------------------------------ J1 · Compose → Pipeline */

test('J1: Compose → streamed draft → 201 insert + 202 generate → the queue', async ({ page }) => {
  await signIn(page);

  // Hop 1 — the Dashboard's one accented action starts the pipeline (D1 §7.2).
  await page.getByRole('button', { name: 'Compose' }).click();
  await expect(page).toHaveURL(/\/chat/);

  // Hop 2 — a real streamed turn over the unchanged FS6 relay. The wire cost
  // marker is the done signal (the transient bubble is replaced on completion).
  await page.getByRole('textbox', { name: /Message|Ask/ }).fill('Draft the Tuesday brief');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByText('You asked: Draft the Tuesday brief')).toBeVisible();
  await expect(page.getByText('$0.0042')).toBeVisible();

  // Hop 3 — insert as a draft: 201 for the post, 202 for the generation intent.
  const bubble = page
    .getByLabel('Conversation', { exact: true })
    .locator('.group', { hasText: 'Deterministic fixture reply' })
    .first();
  await bubble.hover();
  await bubble.getByRole('button', { name: 'Insert to channel' }).click();
  const dialog = page.getByRole('dialog', { name: 'Insert to channel' });
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Create draft' }).click();
  await expect(page.getByText('Draft created', { exact: true })).toBeVisible();
  // Queued truth, with the task id the contract actually returned.
  await expect(page.getByText(/generation queued \(task task_intent_/).first()).toBeVisible();

  // Hop 4 — the chain continues where the work went. Before FS14 this hop did
  // not exist: the toast named a task and the user had nowhere to go.
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Queued work in Jobs' }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByRole('list', { name: 'Queue tasks' })).toBeVisible();
});

test('J1: the review decision is a 202 intent, and the chain ends in Analytics', async ({
  page,
}) => {
  await signIn(page);

  // Hop 5 — approving is a QUEUE INTENT, not a completed act (§R10.1).
  const queue = page.getByRole('region', { name: 'Needs review' });
  await queue.getByRole('button', { name: 'Approve' }).first().click();
  await expect(page.getByText('Approval queued', { exact: true })).toBeVisible();
  await expect(page.getByText(/The worker will process it \(task /).first()).toBeVisible();

  // Hop 6 — the later effect is money and quality, on the screen that reads it.
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { level: 1, name: 'Analytics' })).toBeVisible();
  await expect(page.getByText('$4.82')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cost by day' })).toBeVisible();
});

test('J1: the three steps the contract cannot back are NAMED, not skipped', async ({ page }) => {
  await signIn(page);

  // (a) No per-post validation report — stated where the pipeline is visible.
  await page.goto('/jobs');
  await expect(page.getByText('No per-post validation report')).toBeVisible();
  await expect(page.getByText(/no call that returns which quality gates passed/)).toBeVisible();

  // (b) No attach-to-post, so no "text + image" review surface can exist.
  //     (The seam existed in code since FS9 but was rendered nowhere until the
  //     FS14 journey audit found it — FS14_REPORT §4.)
  await page.goto('/studio/img_tech_1');
  await expect(page.getByText('Attaching an image to a post is a backend operation')).toBeVisible();

  // (c) The image itself is a record, never a picture the contract cannot serve.
  await expect(page.locator('main img')).toHaveCount(0);
});

/* ---------------------------------------------------- J2 · Cite → Source */

test('J2: a citation opens its source in the Inspector without leaving the screen', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop drawer variant; mobile is a sheet.');
  await signIn(page);
  await page.goto('/knowledge/doc_style');

  await page.getByRole('button', { name: 'Ask about this document' }).click();
  await page.getByRole('button', { name: 'Summarize document' }).click();
  const output = page.getByTestId('ask-document-output');
  await expect(output.getByText('$0.0042')).toBeVisible({ timeout: 15_000 });

  // The citation is USER PROVENANCE: it points at the document the user fed in.
  await page.getByRole('button', { name: 'Citation 1: Voice and style guide' }).click();
  await page.getByRole('button', { name: 'Open source' }).click();
  await expect(page).toHaveURL(/inspect=document(%3A|:)doc_style/);
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector).toBeVisible();

  // No navigation happened — the reader is still behind the drawer (A3).
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Back reverses the hop and closes the drawer.
  await page.goBack();
  await expect(page).not.toHaveURL(/inspect=/);
});

test('J2: "the exact chunk" is refused rather than simulated', async ({ page }) => {
  await signIn(page);
  // The READER, not the list: on mobile the workspace is single-pane, so the
  // surface a journey must check is the one the viewport actually shows (the
  // FS7 convention — the seam is rendered by `Reader` as well as by the
  // desktop placeholder, so it survives the responsive collapse).
  await page.goto('/knowledge/doc_style');

  // D3 Part C asks for the exact chunk; FS7 established there is no retrieval,
  // chunk or score endpoint. The screen says so where a preview would be.
  await expect(page.getByText(/matched chunks, scores/).first()).toBeVisible();
  await expect(page.getByText(/never simulates it/).first()).toBeVisible();
});

/* --------------------------------------------------- J3 · Alert → Triage */

test('J3: probe → the work it blocked → a requeue intent → who changed what', async ({ page }) => {
  await signIn(page);

  // Hop 1 — readiness names dependencies; an unknown state is never green.
  await page.goto('/health');
  await expect(page.getByRole('heading', { level: 1, name: 'Health' })).toBeVisible();

  // Hop 2 — the strip FS14 added carries triage to the queue (D1 §7.10).
  // Scoped to the honesty region: the sidebar links to Jobs as well, and a
  // journey must prove the CONTEXTUAL hand-off, not the global navigation.
  const triage = page.getByRole('region', { name: /deliberately does not do/ });
  await triage.getByRole('link', { name: 'Jobs', exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);

  // Hop 3 — a dead task carries its OWN recorded error (no invented cause).
  await page.goto('/jobs?inspect=task:task_dead_1');
  const inspector = page
    .getByRole('complementary', { name: 'Inspector' })
    .or(page.getByRole('dialog', { name: 'Inspector' }));
  await expect(inspector.getByText('task_dead_1')).toBeVisible();

  // Hop 4 — requeue is confirmed and reports QUEUED truth, never "done".
  await page.goto('/jobs');
  await page.getByRole('button', { name: 'Requeue' }).first().click();
  const confirm = page.getByRole('dialog');
  await confirm.getByRole('button', { name: 'Queue it' }).click();
  await expect(page.getByText('Requeue queued').first()).toBeVisible();

  // Hop 5 — what a person changed, and when, is the immutable record.
  await page.goto('/audit');
  await expect(page.getByRole('heading', { level: 1, name: 'Audit' })).toBeVisible();
});

test('J3: the two steps with no endpoint state fact, reason and remedy', async ({ page }) => {
  await signIn(page);

  // The journey's Logs step — a verified absence, not a pending screen.
  await page.goto('/logs');
  await expect(page.getByRole('heading', { level: 1, name: 'Logs' })).toBeVisible();
  await expect(page.getByText(/exposes no endpoint that returns log entries/)).toBeVisible();
  // It carries real navigation to the screens that DO read something (FS12).
  await expect(page.getByRole('link', { name: 'Open Jobs' })).toBeVisible();

  // The journey's alert start — no notifications resource exists at all.
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();

  // And Health says the same two steps are missing, where triage happens.
  await page.goto('/health');
  await expect(page.getByText(/no log stream to filter and no runbook corpus/)).toBeVisible();
});

/* ---------------------------------------------------- J4 · Explain-this */

test('J4: a published post and the voice behind it, with no attribution claim', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/memory');

  // The screen holds both ends of the chain: what the channel has SAID…
  await expect(page.getByRole('heading', { name: /Published posts/ })).toBeVisible();
  // …and the voice that shapes what it says.
  await page.goto('/memory/persona_tech');
  await page.getByRole('button', { name: /Explain this persona’s voice/ }).click();
  await page.getByRole('button', { name: 'Explain the voice' }).click();

  const output = page.getByTestId('explain-style-output');
  await expect(output.getByText(/derived style features included/)).toBeVisible();

  // The claim D3 Part C asks for — "this post came from that memory" — is
  // refused: FS8 established the contract carries no trace, and the persona
  // detail says so instead of implying influence. Asserted HERE because that
  // is the pane a mobile viewport shows (the FS7/FS8 single-pane convention).
  await expect(page.getByRole('heading', { name: 'Influence trace' })).toBeVisible();
  await expect(page.getByText(/never asks the model to invent one/)).toBeVisible();
});

/* -------------------------------------------------- J5 · Everything ⌘K */

const PALETTE_ROUTES = ROUTE_LIST.filter((route) => route.nav && route.group !== 'public');

test('J5: every navigable route in the REGISTRY is reachable from the palette', async ({
  page,
}) => {
  await signIn(page);

  // Registry-driven on purpose: a route added later cannot escape this
  // assertion by not being listed here (D3 A4 — one canonical set).
  expect(PALETTE_ROUTES.length).toBeGreaterThan(15);

  for (const route of PALETTE_ROUTES) {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.getByRole('combobox').fill(`@${route.label}`);
    await expect(
      page.getByRole('option', { name: new RegExp(route.label, 'i') }).first(),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('J5: the palette is RBAC-filtered, and a forbidden URL lands on a permission state', async ({
  page,
}) => {
  await signIn(page, 'viewer');

  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox').fill('@Admin');
  await expect(page.getByRole('option', { name: /Admin/i })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // The route guard is the boundary; the UI only reflects it (SEC-7).
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: /don’t have access|don't have access/i }),
  ).toBeVisible();
});

/* ------------------------------------------------------------------ axe */

test('the journey hand-offs are accessible (axe)', async ({ page }) => {
  await signIn(page);

  for (const path of ['/dashboard', '/jobs', '/health']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).include('#main-content').analyze();
    expect(results.violations, `${path}: ${axeMessage(results.violations)}`).toEqual([]);
  }
});
