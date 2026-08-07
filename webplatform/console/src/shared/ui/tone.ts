/**
 * Text-tone mechanism (FS3 T-FS3.2 — closes FS2 R2).
 *
 * The rule that caused real WCAG defects twice (FS1 §3.2, FS2 §6.2):
 * `text.tertiary` is permitted for **≥16px text or decorative meta only**;
 * small UI text must use `text.secondary` (or stronger).
 *
 * This module encodes the rule in the type system so the misuse is
 * unrepresentable: components that render SMALL text accept `SmallTextTone`
 * (which cannot name `tertiary`); only components rendering large/meta text
 * accept `MetaTextTone`. Token *values* are untouched (Design Freeze).
 */

/** Tones legal on small (<16px) UI text — `tertiary` is not representable. */
export type SmallTextTone = 'primary' | 'secondary';

/** Tones legal on large (≥16px) or decorative meta text only. */
export type MetaTextTone = SmallTextTone | 'tertiary';

export const SMALL_TEXT_TONE_CLASS: Record<SmallTextTone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
};

export const META_TEXT_TONE_CLASS: Record<MetaTextTone, string> = {
  ...SMALL_TEXT_TONE_CLASS,
  tertiary: 'text-tertiary',
};
