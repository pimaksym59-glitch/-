/**
 * Image prompt builder (FS9 T-FS9.9) — a PURE function so the plan's §5.2 D6
 * condition is unit-provable: the prompt contains the SELECTED image's own
 * record and its similarity report (§R6.4), plus the user's question, and
 * **NOTHING else** — no other image, no actor reference, no knowledge
 * document, no persona, no metrics.
 *
 * This is the honest replacement for D3 §9's "AI improves prompts / suggests
 * presets": with no image-create endpoint (§5.2 D1) a rewritten prompt would be
 * a dead end, and a preset suggestion would imply a control that cannot submit.
 * What the console CAN do honestly is explain the verification data the
 * backend produced — grounded only in the record the user selected.
 *
 * The instruction block forbids the three fabrications this surface could
 * otherwise drift into: a safety verdict (no wire field, §5.2 D5), an
 * identity-match verdict (§R6.7 is backend-side), and any claim about
 * uniqueness beyond the reported numbers.
 */
import type { ImageVM, SimilarityReportVM } from '@/entities/image';

export interface ImagePrompt {
  readonly prompt: string;
  /** Explainability "data used" — exactly what went into the prompt. */
  readonly dataUsed: string;
  /** Explainability "limits" — scope and verification honesty. */
  readonly limitations: string;
}

export const EXPLAIN_IMAGE_QUESTION =
  'Explain what these verification numbers say about this image in 3 short bullet points.';

function line(label: string, value: string | number | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : `- ${label}: ${text}`;
}

export function buildImagePrompt(
  image: ImageVM,
  report: SimilarityReportVM | null,
  question: string,
): ImagePrompt {
  const asked = question.trim() === '' ? EXPLAIN_IMAGE_QUESTION : question.trim();

  const record: string[] = [
    line('Prompt', image.prompt),
    line('Negative prompt', image.negativePrompt),
    line('Provider', image.provider),
    line('Seed', image.seed),
    line('Resolution', image.resolution),
    line('Style', image.style),
    line('Camera', image.camera),
    line('Lighting', image.lighting),
    line('Composition', image.composition),
    line('Quality score', image.qualityScore),
    line('Perceptual hash', image.phash),
    line('Status reported by the backend', image.rawStatus),
  ].filter((entry): entry is string => entry !== null);

  const metrics = (report?.metrics ?? []).map((metric) => `- ${metric.label}: ${metric.value}`);

  const prompt = [
    'Answer a question about ONE generated image using ONLY the record and report below.',
    'Do not use outside knowledge. Do not judge whether the image is safe or appropriate —',
    'that check runs in the backend and is not in this data. Do not claim the face matches any',
    'actor, and do not declare the image unique or duplicated beyond what the numbers state.',
    'If the data does not answer the question, say so plainly.',
    '',
    'Image record:',
    ...(record.length > 0 ? record : ['- (no generation parameters recorded)']),
    '',
    'Similarity report (§R6.4 — perceptual hash, scene metadata, CLIP):',
    ...(metrics.length > 0 ? metrics : ['- (no similarity metrics reported)']),
    '',
    `Question: ${asked}`,
  ].join('\n');

  return {
    prompt,
    dataUsed: `The stored record of image ${image.id} — its generation parameters — and the ${metrics.length} similarity metric${metrics.length === 1 ? '' : 's'} the backend reported for it. Nothing else entered the prompt: no other image, no actor reference, no knowledge document, no persona.`,
    limitations:
      'The answer is generated and unverified, grounded only in this one image record and its similarity report. It cannot tell you whether the image passed safety checks or matches an actor’s likeness — those run in the backend and the contract exposes neither.',
  };
}
