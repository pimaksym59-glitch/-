import { describe, expect, it } from 'vitest';
import {
  META_TEXT_TONE_CLASS,
  SMALL_TEXT_TONE_CLASS,
  type MetaTextTone,
  type SmallTextTone,
} from '@/shared/ui/tone';

/**
 * The tone mechanism (T-FS3.2, closes FS2 R2): `text.tertiary` on small text
 * is UNREPRESENTABLE at the type level. The @ts-expect-error lines are the
 * mechanism's proof — `pnpm typecheck` fails if the rule ever loosens.
 */
describe('text-tone mechanism', () => {
  it('small text cannot select tertiary (compile-time)', () => {
    // @ts-expect-error — 'tertiary' is not a legal SmallTextTone (D2 usage rule).
    const illegal: SmallTextTone = 'tertiary';
    expect(illegal).toBe('tertiary'); // runtime reachable only because TS is suppressed above

    const legal: SmallTextTone = 'secondary';
    expect(SMALL_TEXT_TONE_CLASS[legal]).toBe('text-secondary');
  });

  it('meta/large text may select tertiary', () => {
    const meta: MetaTextTone = 'tertiary';
    expect(META_TEXT_TONE_CLASS[meta]).toBe('text-tertiary');
  });

  it('small map never emits the tertiary utility', () => {
    expect(Object.values(SMALL_TEXT_TONE_CLASS)).not.toContain('text-tertiary');
  });
});
