/**
 * Prompt-run builder (FS10 T-FS10.8) — a PURE function so the plan's §5.2 D8
 * condition is unit-provable: what reaches the model is the SELECTED version's
 * own text, plus the user's optional sample input, and **NOTHING else** — no
 * other version, no persona, no channel data, no knowledge document, no image,
 * no metrics.
 *
 * This is the honest AI affordance for this screen, and the only one the owner
 * approved: D3 §10 asks for "AI drafts/refines prompts", but a prompt is a
 * **governed artifact** — §R11.4 says only an administrator changes prompts,
 * never an automatic process — and there is no variables mechanism to suggest
 * (§5.2 D5). What the contract *does* offer is exactly this: `POST
 * /studio/dry-run` exists to TEST prompts (§R10.9), isolated from publication
 * and from channel memory.
 *
 * The instruction preamble is deliberately minimal: the point of a test run is
 * to see what THIS prompt does, so the version's own text leads and the console
 * adds no persona, no style rules and no few-shot examples of its own. The
 * runtime pipeline assembles those separately (§R5.3) — stated in `limitations`
 * so nobody reads a dry-run as a production preview.
 */
import type { PromptVersionVM } from '@/entities/prompt';

export interface PromptRun {
  readonly prompt: string;
  /** Explainability "data used" — exactly what went into the run. */
  readonly dataUsed: string;
  /** Explainability "limits" — isolation and scope honesty. */
  readonly limitations: string;
}

export const DEFAULT_SAMPLE_INPUT = '';

export function buildPromptRun(version: PromptVersionVM, sampleInput: string): PromptRun {
  const sample = sampleInput.trim();

  const prompt =
    sample === ''
      ? version.text
      : [version.text, '', '---', 'Sample input for this test run:', sample].join('\n');

  return {
    prompt,
    dataUsed:
      `Version v${version.version} of the ${version.typeLabel} prompt (row ${version.id}) — its stored text, exactly as saved` +
      (sample === '' ? '' : ', plus the sample input you typed') +
      '. Nothing else entered the run: no persona, no channel memory, no knowledge document, no other version.',
    limitations:
      'This is an isolated dry-run (§R10.9): it publishes nothing and writes nothing to channel memory. It is not a preview of a real post either — at generation time the backend assembles the runtime prompt from this text plus the channel’s persona, style rules, topic and examples (§R5.3), so a live result will differ.',
  };
}
