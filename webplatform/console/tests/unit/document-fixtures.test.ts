/**
 * /documents fixture contract (FS7 T-FS7.2): the deterministic stand-in obeys
 * the frozen §R9.3 surface — channel-scoped list, upload 201 → poll-based
 * ingest completion (NO clock), reindex 202 queue intent, soft delete, assign,
 * versions — and the `empty` scenario. Stand-in semantics only; the live wire
 * is FE-RV-10.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DOCUMENTS,
  INGEST_POLLS_TO_READY,
  resetFixtureDocumentState,
  resolveFixture,
} from '@/shared/lib/fixtures/dataset';
import type { DocumentDetailWireDTO, DocumentWireDTO } from '@/shared/types';

function listDocs(channelId?: string, scenario: 'default' | 'empty' = 'default') {
  const path = channelId ? `/api/v1/documents?channel_id=${channelId}` : '/api/v1/documents';
  const hit = resolveFixture('GET', path, scenario);
  expect(hit?.status).toBe(200);
  return hit?.body as readonly DocumentWireDTO[];
}

beforeEach(() => {
  resetFixtureDocumentState();
});

describe('documents fixture group (FS7 T-FS7.2)', () => {
  it('lists channel-scoped documents; empty scenario honours the switch', () => {
    const tech = listDocs('ch_tech');
    expect(tech.map((d) => d.id)).toEqual(['doc_style', 'doc_glossary', 'doc_failed']);
    expect(listDocs('ch_daily').map((d) => d.id)).toEqual(['doc_daily_tone']);
    expect(listDocs('ch_tech', 'empty')).toEqual([]);
  });

  it('serves detail with content for completed docs, null for failed', () => {
    const style = resolveFixture('GET', '/api/v1/documents/doc_style', 'default')
      ?.body as DocumentDetailWireDTO;
    expect(style.content).toContain('# Voice and style guide');
    expect(style.content_type).toBe('text/markdown');
    const failed = resolveFixture('GET', '/api/v1/documents/doc_failed', 'default')
      ?.body as DocumentDetailWireDTO;
    expect(failed.content).toBeNull();
    expect(resolveFixture('GET', '/api/v1/documents/doc_missing', 'default')?.status).toBe(404);
  });

  it('upload: 201 running → assign → ready after exactly N list polls', () => {
    const created = resolveFixture('POST', '/api/v1/documents', 'default', {
      filename: 'notes.md',
      sizeBytes: 512,
    });
    expect(created?.status).toBe(201);
    const doc = created?.body as DocumentWireDTO;
    expect(doc).toMatchObject({ title: 'notes', source: 'notes.md', status: 'running' });

    const assigned = resolveFixture('POST', `/api/v1/documents/${doc.id}/assign`, 'default', {
      channelId: 'ch_tech',
    });
    expect(assigned?.status).toBe(200);

    // Deterministic poll countdown — never clock-based.
    for (let poll = 1; poll <= INGEST_POLLS_TO_READY; poll += 1) {
      const seen = listDocs('ch_tech').find((d) => d.id === doc.id);
      expect(seen).toBeDefined();
      if (poll < INGEST_POLLS_TO_READY) expect(seen?.status).toBe('running');
    }
    expect(listDocs('ch_tech').find((d) => d.id === doc.id)?.status).toBe('completed');
  });

  it('reindex: 202 {task_id}, queued, then completed after the polls', () => {
    const intent = resolveFixture('POST', '/api/v1/documents/doc_style/reindex', 'default');
    expect(intent?.status).toBe(202);
    expect((intent?.body as { task_id: string }).task_id).toBe('task_reindex_doc_style');
    expect(listDocs('ch_tech').find((d) => d.id === 'doc_style')?.status).not.toBe('completed');
    for (let i = 0; i < INGEST_POLLS_TO_READY; i += 1) listDocs('ch_tech');
    expect(listDocs('ch_tech').find((d) => d.id === 'doc_style')?.status).toBe('completed');
  });

  it('PUT uploads a new version (version bump + re-ingest); DELETE soft-removes', () => {
    const updated = resolveFixture('PUT', '/api/v1/documents/doc_glossary', 'default', {
      sizeBytes: 11_000,
    });
    expect(updated?.status).toBe(200);
    expect((updated?.body as DocumentWireDTO).version).toBe(2);
    expect((updated?.body as DocumentWireDTO).status).toBe('running');

    const versions = resolveFixture('GET', '/api/v1/documents/doc_glossary/versions', 'default');
    expect((versions?.body as readonly unknown[]).length).toBe(2);

    expect(resolveFixture('DELETE', '/api/v1/documents/doc_glossary', 'default')?.status).toBe(204);
    expect(listDocs('ch_tech').some((d) => d.id === 'doc_glossary')).toBe(false);
    expect(resolveFixture('GET', '/api/v1/documents/doc_glossary', 'default')?.status).toBe(404);
  });

  it('assign moves a document between channels', () => {
    const moved = resolveFixture('POST', '/api/v1/documents/doc_daily_tone/assign', 'default', {
      channelId: 'ch_tech',
    });
    expect(moved?.status).toBe(200);
    expect(listDocs('ch_daily')).toEqual([]);
    expect(listDocs('ch_tech').some((d) => d.id === 'doc_daily_tone')).toBe(true);
  });

  it('base DOCUMENTS stay pristine across mutations (state is an overlay)', () => {
    resolveFixture('DELETE', '/api/v1/documents/doc_style', 'default');
    resetFixtureDocumentState();
    expect(listDocs('ch_tech').some((d) => d.id === 'doc_style')).toBe(true);
    expect(DOCUMENTS.find((d) => d.id === 'doc_style')?.status).toBe('completed');
  });
});
