/** Public API — entity `document` (FS7 Knowledge). */
export {
  mapDocument,
  mapDocumentDetail,
  mapDocumentVersion,
  selectSources,
  filterDocuments,
  type DocumentVM,
  type DocumentDetailVM,
  type DocumentVersionVM,
  type DocumentWireDTO,
  type DocumentDetailWireDTO,
  type DocumentVersionWireDTO,
} from './model';
export {
  fetchDocuments,
  fetchDocument,
  fetchDocumentVersions,
  useDocuments,
  useDocument,
  useDocumentVersions,
  INGEST_POLL_MS,
} from './hooks';
export { VersionsTimeline } from './ui/VersionsTimeline';
export { documentPaths } from './paths';
