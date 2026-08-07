/** Public API — feature `add-source` (FS7 Knowledge uploads + intents). */
export { AddSourceDialog, type AddSourceDialogProps } from './ui/AddSourceDialog';
export {
  useAddSource,
  useUploadVersion,
  type AddSourceItem,
  type AddSourcePhase,
  type UseAddSourceApi,
} from './model/useAddSource';
export { useDocumentIntents, type UseDocumentIntentsApi } from './model/useDocumentIntents';
