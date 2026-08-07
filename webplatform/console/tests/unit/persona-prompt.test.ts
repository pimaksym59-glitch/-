/**
 * buildPersonaPrompt PROOF (FS8 T-FS8.9 — plan §5.2 D3): the prompt is
 * byte-for-byte a template over ONLY the selected persona's own record and the
 * user's question. This is what makes "no influence claims" checkable rather
 * than aspirational: nothing about other personas, actors, posts, knowledge or
 * metrics can enter the prompt, because the builder never receives them.
 */
import { describe, expect, it } from 'vitest';
import { mapPersona } from '@/entities/persona';
import { buildPersonaPrompt, EXPLAIN_QUESTION } from '@/features/explain-style';
import type { PersonaWireDTO } from '@/shared/types';

const WIRE: PersonaWireDTO = {
  id: 'p1',
  channel_id: 'ch_tech',
  name: 'The calm senior engineer',
  character: 'Measured, precise.',
  manner_of_speech: 'Short declarative sentences.',
  storytelling_style: 'Problem → measurement.',
  greeting_style: 'Straight in.',
  farewell_style: 'One takeaway.',
  audience_relationship: 'A peer.',
  goals: 'Make a busy engineer smarter.',
  favorite_words: ['concretely'],
  forbidden_expressions: ['game-changer'],
  style_features: { sentence_length_avg: 14.2 },
  status: 'active',
  version: 3,
};

const PERSONA = mapPersona(WIRE);

function expectedPrompt(voice: string[], features: string[], question: string): string {
  return [
    `Answer a question about ONE writing persona using ONLY the record below.`,
    'Do not use outside knowledge, do not guess which posts it wrote, and do not claim influence',
    'on any specific output. If the record does not answer the question, say so plainly.',
    '',
    'Persona record:',
    ...voice,
    '',
    'Derived style features (parameters, not texts):',
    ...features,
    '',
    `Question: ${question}`,
  ].join('\n');
}

describe('buildPersonaPrompt (FS8 T-FS8.9)', () => {
  it('is EXACTLY the template over the persona record + question', () => {
    const built = buildPersonaPrompt(PERSONA, 'How formal is this voice?');
    expect(built.prompt).toBe(
      expectedPrompt(
        [
          '- Name: The calm senior engineer',
          '- Character: Measured, precise.',
          '- Manner of speech: Short declarative sentences.',
          '- Storytelling: Problem → measurement.',
          '- Greeting: Straight in.',
          '- Farewell: One takeaway.',
          '- Audience relationship: A peer.',
          '- Goals: Make a busy engineer smarter.',
          '- Favours: concretely',
          '- Avoids: game-changer',
        ],
        ['- Average sentence length: 14.20'],
        'How formal is this voice?',
      ),
    );
  });

  it('instructs the model NOT to claim influence (the D3 §8 replacement)', () => {
    const built = buildPersonaPrompt(PERSONA, '');
    expect(built.prompt).toContain('do not claim influence');
    expect(built.prompt).toContain('do not guess which posts it wrote');
    expect(built.prompt).toContain(`Question: ${EXPLAIN_QUESTION}`);
  });

  it('carries NOTHING beyond the persona: no ids, no channel, no other entity', () => {
    const built = buildPersonaPrompt(PERSONA, 'x');
    expect(built.prompt).not.toContain('p1');
    expect(built.prompt).not.toContain('ch_tech');
    // Scope the entity check to the DATA section: the instruction header
    // legitimately says "do not guess which posts it wrote".
    const dataSection = built.prompt.slice(built.prompt.indexOf('Persona record:'));
    expect(dataSection).not.toMatch(/document|knowledge|actor|metric|cost|\$/i);
  });

  it('degrades honestly when the record is nearly empty', () => {
    const bare = mapPersona({ id: 'p2', channel_id: 'ch', name: 'Bare' });
    const built = buildPersonaPrompt(bare, '');
    expect(built.prompt).toContain('- Name: Bare');
    expect(built.prompt).toContain('- (none derived yet)');
    expect(built.dataUsed).toContain('0 style features');
  });

  it('explainability states provenance and the attribution limit', () => {
    const built = buildPersonaPrompt(PERSONA, 'x');
    expect(built.dataUsed).toContain('The calm senior engineer');
    expect(built.dataUsed).toContain('Nothing else entered the prompt');
    expect(built.limitations).toContain('cannot tell you which memory shaped a specific post');
    expect(Object.keys(built).sort()).toEqual(['dataUsed', 'limitations', 'prompt']);
  });
});
