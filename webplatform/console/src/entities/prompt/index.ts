/** Public API — entity `prompt` (FS10 Prompt Library §R10.6). */
export {
  mapPrompt,
  sortVersions,
  groupPromptsByType,
  findGroup,
  findVersion,
  previousVersion,
  filterPromptGroups,
  diffVersions,
  promptTypeLabel,
  PROMPT_TYPE_LABELS,
  type PromptVersionVM,
  type PromptGroupVM,
  type PromptDiffVM,
  type PromptWireDTO,
} from './model';
export {
  fetchPrompts,
  fetchPromptVersions,
  usePrompts,
  usePromptsByType,
  usePromptVersions,
  PROMPT_STALE_MS,
} from './hooks';
export { promptPaths } from './paths';
export { promptKeys } from './keys';
