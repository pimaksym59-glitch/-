/**
 * Public API — feature `explain-activity` (FS13, D3 §24). The stage's ONLY AI
 * surface: user-invoked, over already-loaded records, through the unchanged FS6
 * relay. No mutation, no cache write, no auto-run.
 */
export { ExplainActivityPanel } from './ui/ExplainActivityPanel';
export {
  ACTIVITY_FORBIDDEN_CLAUSE,
  ACTIVITY_PROMPT_LIMIT,
  buildActivityPrompt,
} from './model/buildActivityPrompt';
