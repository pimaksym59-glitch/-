/**
 * Persona prompt builder (FS8 T-FS8.9) — a PURE function so the plan's §5.2 D3
 * condition is unit-provable: the prompt contains the SELECTED persona's own
 * record (voice fields + derived style features) and the user's question, and
 * **NOTHING else** — no other persona, no actor, no post, no knowledge
 * document, no metrics.
 *
 * This is the honest replacement for D3 §8's "explain influence": the console
 * never asks the model which entries influenced an output, because the
 * contract carries no attribution data and a model's guess would be
 * fabrication (the binding FS6/FS7 owner conditions). Provenance is client
 * truth — the card cites the record the USER selected.
 */
import type { PersonaVM } from '@/entities/persona';

export interface PersonaPrompt {
  readonly prompt: string;
  /** Explainability "data used" — exactly what went into the prompt. */
  readonly dataUsed: string;
  /** Explainability "limits" — scope and verification honesty. */
  readonly limitations: string;
}

export const EXPLAIN_QUESTION =
  'Describe this voice in 3 short bullet points, then one sentence on what it avoids.';

function line(label: string, value: string | null): string | null {
  return value && value.trim() !== '' ? `- ${label}: ${value.trim()}` : null;
}

export function buildPersonaPrompt(persona: PersonaVM, question: string): PersonaPrompt {
  const asked = question.trim() === '' ? EXPLAIN_QUESTION : question.trim();

  const voice: string[] = [
    line('Name', persona.name),
    line('Character', persona.character),
    line('Manner of speech', persona.mannerOfSpeech),
    line('Storytelling', persona.storytellingStyle),
    line('Greeting', persona.greetingStyle),
    line('Farewell', persona.farewellStyle),
    line('Audience relationship', persona.audienceRelationship),
    line('Goals', persona.goals),
    persona.favoriteWords.length > 0 ? `- Favours: ${persona.favoriteWords.join(', ')}` : null,
    persona.forbiddenExpressions.length > 0
      ? `- Avoids: ${persona.forbiddenExpressions.join(', ')}`
      : null,
  ].filter((entry): entry is string => entry !== null);

  const features = persona.styleFeatures.map((f) => `- ${f.label}: ${f.value}`);

  const prompt = [
    `Answer a question about ONE writing persona using ONLY the record below.`,
    'Do not use outside knowledge, do not guess which posts it wrote, and do not claim influence',
    'on any specific output. If the record does not answer the question, say so plainly.',
    '',
    'Persona record:',
    ...(voice.length > 0 ? voice : ['- (no voice fields recorded)']),
    '',
    'Derived style features (parameters, not texts):',
    ...(features.length > 0 ? features : ['- (none derived yet)']),
    '',
    `Question: ${asked}`,
  ].join('\n');

  return {
    prompt,
    dataUsed: `The stored record of “${persona.name}” — its voice fields and the ${persona.styleFeatures.length} style features the backend derived. Nothing else entered the prompt: no other persona, no actor, no post text, no knowledge document.`,
    limitations:
      'The answer is generated and unverified, grounded only in this one persona record. It cannot tell you which memory shaped a specific post — the contract exposes no attribution, and this console does not guess.',
  };
}
