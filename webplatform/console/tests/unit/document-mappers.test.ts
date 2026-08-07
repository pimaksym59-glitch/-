/**
 * Entity `document` mapper semantics (FS7 T-FS7.1): wire → VM through the
 * 12-status registry (unknown statuses surface honestly), ingest flags drive
 * the polling truth, list filtering is presentation-only, and the knowledge
 * shortcut registry rows exist (cheat-sheet honesty).
 */
import { describe, expect, it } from 'vitest';
import {
  filterDocuments,
  mapDocument,
  mapDocumentDetail,
  selectSources,
} from '@/entities/document';
import { SHORTCUTS, SHORTCUT_SCOPE_LABEL } from '@/shared/config/shortcuts-catalog';
import type { DocumentWireDTO } from '@/shared/types';

const WIRE: DocumentWireDTO = {
  id: 'doc_1',
  title: 'Style guide',
  source: 'style.md',
  size_bytes: 2048,
  status: 'completed',
  channel_id: 'ch_tech',
  version: 2,
  created_at: '2026-07-20T10:00:00Z',
  updated_at: '2026-07-28T09:15:00Z',
};

describe('document mappers (FS7)', () => {
  it('maps the wire shape and derives honest ingest flags', () => {
    const vm = mapDocument(WIRE);
    expect(vm).toMatchObject({
      id: 'doc_1',
      title: 'Style guide',
      source: 'style.md',
      sizeBytes: 2048,
      status: 'completed',
      rawStatus: 'completed',
      ready: true,
      ingesting: false,
      channelId: 'ch_tech',
      version: 2,
    });
  });

  it('flags queued/running as ingesting (drives polling), not ready', () => {
    for (const status of ['queued', 'running']) {
      const vm = mapDocument({ ...WIRE, status });
      expect(vm.ingesting).toBe(true);
      expect(vm.ready).toBe(false);
    }
    expect(mapDocument({ ...WIRE, status: 'failed' })).toMatchObject({
      ingesting: false,
      ready: false,
      status: 'failed',
    });
  });

  it('surfaces unknown wire statuses honestly (null status, raw preserved)', () => {
    const vm = mapDocument({ ...WIRE, status: 'chunk_optimizing' });
    expect(vm.status).toBeNull();
    expect(vm.rawStatus).toBe('chunk_optimizing');
    expect(vm.ingesting).toBe(false);
    expect(vm.ready).toBe(false);
  });

  it('treats a missing channel assignment as null (unassigned)', () => {
    const { channel_id: _dropped, ...rest } = WIRE;
    expect(mapDocument(rest).channelId).toBeNull();
  });

  it('detail: absent content stays null (the honest reader fallback)', () => {
    expect(mapDocumentDetail({ ...WIRE }).content).toBeNull();
    expect(
      mapDocumentDetail({ ...WIRE, content: '# Hi', content_type: 'text/markdown' }),
    ).toMatchObject({
      content: '# Hi',
      contentType: 'text/markdown',
    });
  });
});

describe('document list filtering (presentation-only search)', () => {
  const docs = [
    mapDocument(WIRE),
    mapDocument({ ...WIRE, id: 'doc_2', title: 'Glossary', source: 'terms.md' }),
    mapDocument({ ...WIRE, id: 'doc_3', title: 'Vendors', source: 'style.md' }),
  ];

  it('selectSources dedupes in first-seen order', () => {
    expect(selectSources(docs)).toEqual(['style.md', 'terms.md']);
  });

  it('filters by title OR source, case-insensitively, and by source facet', () => {
    expect(filterDocuments(docs, 'glos', null).map((d) => d.id)).toEqual(['doc_2']);
    expect(filterDocuments(docs, 'STYLE', null).map((d) => d.id)).toEqual(['doc_1', 'doc_3']);
    expect(filterDocuments(docs, '', 'style.md').map((d) => d.id)).toEqual(['doc_1', 'doc_3']);
    expect(filterDocuments(docs, 'vend', 'style.md').map((d) => d.id)).toEqual(['doc_3']);
    expect(filterDocuments(docs, '', null)).toHaveLength(3);
  });
});

describe('knowledge shortcut registry rows (FS7 T-FS7.9)', () => {
  it('registers `n` and `/` in an active knowledge scope with a label', () => {
    const knowledge = SHORTCUTS.filter((s) => s.scope === 'knowledge');
    expect(knowledge.map((s) => s.id).sort()).toEqual(['knowledge-add', 'knowledge-search']);
    expect(knowledge.every((s) => s.active)).toBe(true);
    expect(SHORTCUT_SCOPE_LABEL.knowledge).toBe('Knowledge');
  });
});
