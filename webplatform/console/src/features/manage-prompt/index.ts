/** Public API — feature `manage-prompt` (FS10; Stage 3 §3's slot, realized as
 *  the ONE write the contract carries: a new version). */
export { VersionComposer } from './ui/VersionComposer';
export {
  useCreatePromptVersion,
  type CreateVersionInput,
  type UseCreatePromptVersionApi,
} from './model/useCreatePromptVersion';
export {
  readPromptDraft,
  writePromptDraft,
  clearPromptDraft,
  type PromptDraft,
} from './model/promptDraft';
export { versionSchema, type VersionFormValues } from './model/schema';
