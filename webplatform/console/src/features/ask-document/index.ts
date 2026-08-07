/** Public API — feature `ask-document` (FS7 provenance-fed citations). */
export { AskDocumentPanel, snippetOf } from './ui/AskDocumentPanel';
export {
  buildDocumentPrompt,
  SUMMARIZE_QUESTION,
  type DocumentPrompt,
  type DocumentPromptInput,
} from './model/buildDocumentPrompt';
