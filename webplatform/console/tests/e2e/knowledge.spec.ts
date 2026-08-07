import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * FS7 Knowledge journeys (D3 §7 / STAGE_FS7_PLAN §2 T-FS7.11) on the
 * deterministic fixtures: channel-scoped list with ingest truth, `j/k/↵` into
 * the Inspector, reader deep-link with versions, upload→ingesting→ready
 * (poll-based, no invented progress), re-ingest 202 queued-truth, palette `#`
 * real knowledge search, ask-document with a provenance citation (wire-cost
 * done anchor), read-only roles, the canonical empty state — plus axe.
 *
 * Sharp edges honoured: `getByLabel` matches by substring → `{ exact: true }`
 * near generic labels; post-stream asserts anchor on the wire-cost done
 * marker; toast copy appears twice (toast + announcer) → `.first()`.
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
/** Two fixture polls × 2s + margin — ingest completion is poll-based. */
const INGEST_TIMEOUT = 15_000;

test('the knowledge list renders channel-scoped documents with honest ingest badges', async ({
  page,
}, testInfo) => {
  await signIn(page);
  await page.goto('/knowledge');

  await expect(page.getByRole('heading', { level: 1, name: 'Knowledge' })).toBeVisible();
  await expect(page.getByText('Voice and style guide')).toBeVisible();
  await expect(page.getByText('Product glossary')).toBeVisible();
  // The failed ingest is visible and honestly badged — never hidden.
  await expect(page.getByText('Q3 vendor sheet')).toBeVisible();
  await expect(page.getByText('Failed', { exact: true })).toBeVisible();
  // The retrieval region states the truth instead of simulating scores. On
  // mobile the list is single-pane (D3) — the surface lives in the READER
  // there and is covered by the reader journey.
  if (testInfo.project.name !== MOBILE_PROJECT) {
    await expect(page.getByRole('heading', { name: 'Retrieval preview' }).first()).toBeVisible();
    await expect(page.getByText(/never simulates it/).first()).toBeVisible();
  }
});

test('j/k moves through documents and ↵ opens the document Inspector', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === MOBILE_PROJECT, 'Desktop drawer variant; mobile is a sheet.');
  await signIn(page);
  await page.goto('/knowledge');

  const row0 = page.locator('button[data-row-index="0"]');
  const row1 = page.locator('button[data-row-index="1"]');
  await row0.focus();
  await page.keyboard.press('j');
  await expect(row1).toBeFocused();
  await page.keyboard.press('k');
  await expect(row0).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/inspect=document(%3A|:)doc_style/);
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText('Voice and style guide')).toBeVisible();
  await expect(inspector.getByRole('heading', { name: 'Versions' })).toBeVisible();
  await expect(inspector.getByText('v3 · current')).toBeVisible();
});

test('the reader deep-link renders the ingested text and the version history', async ({ page }) => {
  await signIn(page);
  await page.goto('/knowledge/doc_style');

  // Role + LEVEL (the FS2 selector convention): the document's own demoted
  // `# Voice and style guide` renders as an h4 with the same accessible name.
  await expect(
    page.getByRole('heading', { level: 3, name: 'Voice and style guide' }),
  ).toBeVisible();
  await expect(page.getByText(/calm senior engineer/)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Version history' })).toBeVisible();
  await expect(page.getByText('v3 · current')).toBeVisible();
  await expect(page.getByText(/scoped to Tech Digest/)).toBeVisible();
});

test('upload: accepted honestly, then ingesting → ready by polling (no fake progress)', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/knowledge');

  await page.getByRole('button', { name: 'Add source' }).click();
  await page.setInputFiles('input[type="file"]', {
    name: 'notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Notes\n\nDeterministic E2E body.'),
  });

  // Upload truth: Verified chip = the upload was ACCEPTED; no percentage
  // anywhere (the transport exposes none).
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
  await expect(page.getByText(/ingestion continues server-side/)).toBeVisible();
  await expect(page.locator('[role="progressbar"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Done' }).click();

  // The list shows the server truth and polls it to completion.
  await expect(page.getByText('notes', { exact: true })).toBeVisible();
  await expect(
    page
      .locator('li', { hasText: 'notes.md' })
      .getByText(/Running|Queued/)
      .first(),
  ).toBeVisible();
  await expect(
    page.locator('li', { hasText: 'notes.md' }).getByText('Completed', { exact: true }),
  ).toBeVisible({ timeout: INGEST_TIMEOUT });
});

test('re-ingest speaks the 202 queued-truth and the status recovers by polling', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/knowledge/doc_failed');

  await expect(
    page.getByText('Ingestion failed — this source is not retrievable yet.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Re-ingest' }).click();

  await expect(page.getByText('Re-ingest queued', { exact: true })).toBeVisible();
  await expect(page.getByText(/task task_reindex_doc_failed/).first()).toBeVisible();
  // Queued → Completed via polling (deterministic fixture countdown). Scoped
  // to the READER article — on mobile the list pane exists display-none and
  // `.first()` would land on its hidden badge.
  await expect(page.locator('article').getByText('Completed', { exact: true })).toBeVisible({
    timeout: INGEST_TIMEOUT,
  });
});

test('palette # searches real knowledge documents and deep-links the reader', async ({ page }) => {
  await signIn(page);

  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await page.getByRole('combobox').fill('#voice');

  await expect(dialog.getByText('Voice and style guide')).toBeVisible();
  // Honest scope note stays for the not-yet-landed entity types.
  await page.getByRole('option', { name: /Voice and style guide/ }).click();
  await expect(page).toHaveURL(/\/knowledge\/doc_style/);
  await expect(page.getByText(/calm senior engineer/)).toBeVisible();
});

test('ask-document streams with wire cost and cites the REAL source document', async ({ page }) => {
  await signIn(page);
  await page.goto('/knowledge/doc_style');

  await page.getByRole('button', { name: 'Ask about this document' }).click();
  await page.getByRole('button', { name: 'Summarize document' }).click();

  // Anchor on the wire-cost DONE marker (the transient streaming node is
  // replaced on completion — FS6 lesson).
  const output = page.getByTestId('ask-document-output');
  await expect(output.getByText('$0.0042')).toBeVisible({ timeout: 15_000 });
  // The fixture echoes the first prompt line — the document prompt crossed
  // the wire for real.
  await expect(output.getByText(/You asked: Answer a question about the document/)).toBeVisible();

  // Trust + provenance: Generated, and the citation resolves to the source.
  await expect(output.getByText('Generated', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Citation 1: Voice and style guide' }).click();
  await page.getByRole('button', { name: 'Open source' }).click();
  await expect(page).toHaveURL(/inspect=document(%3A|:)doc_style/);

  // No fabricated retrieval score anywhere in the answer block.
  await expect(output.getByRole('img', { name: /Retrieval score/ })).toHaveCount(0);
});

test('analyst reads the workspace without a single write or AI affordance', async ({ page }) => {
  await signIn(page, 'analyst');
  await page.goto('/knowledge');

  await expect(page.getByRole('heading', { level: 1, name: 'Knowledge' })).toBeVisible();
  await expect(page.getByText('Voice and style guide')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add source' })).toHaveCount(0);
  await expect(page.getByText(/uploads and AI actions are editor operations/)).toBeVisible();

  // `n` must be inert for a read role.
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog', { name: 'Add source' })).toHaveCount(0);

  await page.goto('/knowledge/doc_style');
  await expect(page.getByText(/calm senior engineer/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask about this document' })).toHaveCount(0);
});

test('a channel with no documents renders the canonical D2 §15 empty state', async ({ page }) => {
  await signIn(page);
  // Art Curator exists in the fixture with ZERO documents.
  await page.getByRole('button', { name: 'Switch channel' }).click();
  await page.getByRole('menuitem', { name: 'Art Curator' }).click();
  await page.goto('/knowledge');

  await expect(page.getByRole('heading', { name: 'Teach the AI what you know' })).toBeVisible();
  await expect(
    page.getByText('Add documents and it will use them, scoped to this channel.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'See how retrieval works' }).click();
  await expect(page.getByText(/never simulates it/)).toBeVisible();
});

test('the knowledge list and reader are accessible (axe)', async ({ page }) => {
  await signIn(page);
  await page.goto('/knowledge');
  await expect(page.getByText('Voice and style guide')).toBeVisible();
  await page.mouse.move(0, 0);
  const listResults = await new AxeBuilder({ page }).analyze();
  expect(listResults.violations, axeMessage(listResults.violations)).toEqual([]);

  await page.goto('/knowledge/doc_style');
  await expect(page.getByText(/calm senior engineer/)).toBeVisible();
  await page.mouse.move(0, 0);
  const readerResults = await new AxeBuilder({ page }).analyze();
  expect(readerResults.violations, axeMessage(readerResults.violations)).toEqual([]);
});
