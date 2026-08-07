/**
 * Document prompt builder (FS7 T-FS7.6) — a PURE function so the plan's §5.2
 * D2 condition is unit-provable: the prompt contains the SELECTED document's
 * text and the user's question, and NOTHING else — no metrics, no other
 * documents, no smuggled fields. The model is told to use only the provided
 * text. Citation provenance is client truth: the source is the document the
 * USER fed in, never something the model claims (FS6 owner conditions).
 */

export interface DocumentPromptInput {
  readonly docTitle: string;
  readonly docSource: string;
  readonly docVersion: number;
  /** The ingested text as served by GET /documents/{id}. */
  readonly content: string;
  /** The user's question; empty string = the canned summary ask. */
  readonly question: string;
}

export interface DocumentPrompt {
  readonly prompt: string;
  /** Explainability “data used” — exactly what went into the prompt. */
  readonly dataUsed: string;
  /** Explainability “limits” — honesty about scope and verification. */
  readonly limitations: string;
}

export const SUMMARIZE_QUESTION =
  'Summarize this document in 3 short bullet points and one closing sentence.';

export function buildDocumentPrompt(input: DocumentPromptInput): DocumentPrompt {
  const question = input.question.trim() === '' ? SUMMARIZE_QUESTION : input.question.trim();

  const prompt = [
    `Answer a question about the document "${input.docTitle}" using ONLY the document text below.`,
    'Do not use outside knowledge; if the text does not answer the question, say so plainly.',
    '',
    'Document text:',
    '"""',
    input.content,
    '"""',
    '',
    `Question: ${question}`,
  ].join('\n');

  return {
    prompt,
    dataUsed: `The full ingested text of “${input.docTitle}” (v${input.docVersion}, ${input.docSource}) — the same text shown in this reader. Nothing else entered the prompt.`,
    limitations:
      'The answer is generated and unverified, grounded only in this one document — retrieval across the whole knowledge base happens in the backend pipeline, not here. The citation points at the document you provided, not at model-claimed sources.',
  };
}
