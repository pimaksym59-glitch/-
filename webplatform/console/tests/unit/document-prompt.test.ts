/**
 * buildDocumentPrompt inclusion/exclusion PROOF (FS7 T-FS7.6 — plan §5.2 D2):
 * the prompt is byte-for-byte a template over ONLY {docTitle, content,
 * question} — proving no metrics, no other documents and no smuggled fields
 * can enter it (the FS6 `summary-prompt` discipline).
 */
import { describe, expect, it } from 'vitest';
import {
  buildDocumentPrompt,
  SUMMARIZE_QUESTION,
  type DocumentPromptInput,
} from '@/features/ask-document';

const INPUT: DocumentPromptInput = {
  docTitle: 'Voice and style guide',
  docSource: 'style-guide.md',
  docVersion: 3,
  content: '# Voice\n\nShort sentences. Concrete numbers.',
  question: 'What tone applies to numbers?',
};

/** The exact template — any extra ingredient in the prompt fails this proof. */
function expectedPrompt(title: string, content: string, question: string): string {
  return [
    `Answer a question about the document "${title}" using ONLY the document text below.`,
    'Do not use outside knowledge; if the text does not answer the question, say so plainly.',
    '',
    'Document text:',
    '"""',
    content,
    '"""',
    '',
    `Question: ${question}`,
  ].join('\n');
}

describe('buildDocumentPrompt (FS7 T-FS7.6)', () => {
  it('the prompt is EXACTLY the template over title+content+question — nothing else', () => {
    const built = buildDocumentPrompt(INPUT);
    expect(built.prompt).toBe(
      expectedPrompt(INPUT.docTitle, INPUT.content, 'What tone applies to numbers?'),
    );
    // Negative proof: fields that exist on the input but must NOT leak into
    // the prompt (source/version live in Explainability only).
    expect(built.prompt).not.toContain('style-guide.md');
    expect(built.prompt).not.toContain('v3');
  });

  it('an empty question becomes the canned summarize ask', () => {
    const built = buildDocumentPrompt({ ...INPUT, question: '   ' });
    expect(built.prompt).toBe(expectedPrompt(INPUT.docTitle, INPUT.content, SUMMARIZE_QUESTION));
  });

  it('explainability states the provenance and the honest limits', () => {
    const built = buildDocumentPrompt(INPUT);
    expect(built.dataUsed).toContain('Voice and style guide');
    expect(built.dataUsed).toContain('v3');
    expect(built.dataUsed).toContain('style-guide.md');
    expect(built.dataUsed).toContain('Nothing else entered the prompt');
    expect(built.limitations).toContain('generated and unverified');
    expect(built.limitations).toContain('not at model-claimed sources');
  });

  it('never invents confidence/tool/citation fields (structure check)', () => {
    const built = buildDocumentPrompt(INPUT);
    expect(Object.keys(built).sort()).toEqual(['dataUsed', 'limitations', 'prompt']);
  });
});
