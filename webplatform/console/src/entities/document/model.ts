/**
 * Entity `document` — model (Stage 3 §4, FS7 Knowledge §R9.3). The wire is
 * *(assumed)* pending FE-RV-10; THESE mappers are the single adjustment point.
 * Ingestion statuses map through the 12-status registry — unknown wire values
 * surface honestly (`status: null` + rawStatus), never coerced. No field is
 * invented: chunks/retrieval scores have no wire source and no VM slot.
 */
import { parseStatus, STATUS, type Status } from '@/shared/types/status';
import type {
  DocumentDetailWireDTO,
  DocumentVersionWireDTO,
  DocumentWireDTO,
} from '@/shared/types';

export type { DocumentWireDTO, DocumentDetailWireDTO, DocumentVersionWireDTO };

export interface DocumentVM {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly sizeBytes: number;
  readonly rawStatus: string;
  readonly status: Status | null;
  /** True while ingestion is still working (drives honest polling). */
  readonly ingesting: boolean;
  /** True when ingestion completed and the document serves retrieval. */
  readonly ready: boolean;
  readonly channelId: string | null;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DocumentDetailVM extends DocumentVM {
  /** Ingested text when the wire carries it; null renders the honest fallback. */
  readonly content: string | null;
  readonly contentType: string | null;
}

export interface DocumentVersionVM {
  readonly version: number;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

const INGESTING: readonly string[] = [STATUS.queued, STATUS.running];

export function mapDocument(wire: DocumentWireDTO): DocumentVM {
  return {
    id: wire.id,
    title: wire.title,
    source: wire.source,
    sizeBytes: wire.size_bytes,
    rawStatus: wire.status,
    status: parseStatus(wire.status),
    ingesting: INGESTING.includes(wire.status),
    ready: wire.status === STATUS.completed,
    channelId: wire.channel_id ?? null,
    version: wire.version,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
  };
}

export function mapDocumentDetail(wire: DocumentDetailWireDTO): DocumentDetailVM {
  return {
    ...mapDocument(wire),
    content: wire.content ?? null,
    contentType: wire.content_type ?? null,
  };
}

export function mapDocumentVersion(wire: DocumentVersionWireDTO): DocumentVersionVM {
  return {
    version: wire.version,
    sizeBytes: wire.size_bytes,
    createdAt: wire.created_at,
  };
}

/** Unique source labels for the list filter (order-stable, first-seen). */
export function selectSources(documents: readonly DocumentVM[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const doc of documents) {
    if (!seen.has(doc.source)) {
      seen.add(doc.source);
      out.push(doc.source);
    }
  }
  return out;
}

/** Client-side LIST filtering (title/source contains) — presentation only,
 * honestly distinct from retrieval (plan §5.2 D1). */
export function filterDocuments(
  documents: readonly DocumentVM[],
  query: string,
  source: string | null,
): readonly DocumentVM[] {
  const q = query.trim().toLowerCase();
  return documents.filter(
    (doc) =>
      (source === null || doc.source === source) &&
      (q === '' || doc.title.toLowerCase().includes(q) || doc.source.toLowerCase().includes(q)),
  );
}
