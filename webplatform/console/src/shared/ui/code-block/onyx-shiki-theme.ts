import type { ThemeRegistrationAny } from 'shiki';

/**
 * ONYX code themes for Shiki (D2 §13.18) — a soft, low-saturation syntax
 * palette derived from the ONYX data-viz ramp. The hex values below are
 * transcriptions of the frozen `--viz-*` / text tokens in `styles/tokens.css`
 * (Shiki requires literal colors in TextMate themes); if tokens ever change
 * via D4 §12, this file follows in the same PATCH.
 */
const VIZ = {
  iris: '#6e5bff', // --viz-1
  cyan: '#4fd1e0', // --viz-2
  green: '#34c77b', // --viz-3
  amber: '#e5a94e', // --viz-4
  rose: '#f2779a', // --viz-5
  violet: '#9a6bff', // --viz-6
  blue: '#5b9df9', // --viz-7
  slate: '#7c8698', // --viz-8
} as const;

function onyxTheme(
  name: string,
  type: 'dark' | 'light',
  fg: string,
  comment: string,
): ThemeRegistrationAny {
  return {
    name,
    type,
    // Backgrounds are transparent — the CodeBlock owns bg (background.sunken token).
    colors: { 'editor.background': '#00000000', 'editor.foreground': fg },
    settings: [
      { settings: { foreground: fg } },
      {
        scope: ['comment', 'punctuation.definition.comment'],
        settings: { foreground: comment, fontStyle: 'italic' },
      },
      {
        scope: ['keyword', 'storage.type', 'storage.modifier'],
        settings: { foreground: VIZ.violet },
      },
      { scope: ['string', 'punctuation.definition.string'], settings: { foreground: VIZ.green } },
      {
        scope: ['constant.numeric', 'constant.language', 'constant.character'],
        settings: { foreground: VIZ.amber },
      },
      { scope: ['entity.name.function', 'support.function'], settings: { foreground: VIZ.blue } },
      {
        scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
        settings: { foreground: VIZ.cyan },
      },
      { scope: ['variable', 'variable.parameter'], settings: { foreground: fg } },
      { scope: ['entity.name.tag'], settings: { foreground: VIZ.rose } },
      { scope: ['entity.other.attribute-name'], settings: { foreground: VIZ.amber } },
      { scope: ['keyword.operator'], settings: { foreground: VIZ.slate } },
      { scope: ['markup.inserted'], settings: { foreground: VIZ.green } },
      { scope: ['markup.deleted'], settings: { foreground: VIZ.rose } },
    ],
  };
}

/** Foreground/comment approximate the theme text tokens (AA on bg.sunken). */
export const ONYX_DARK = onyxTheme('onyx-dark', 'dark', '#e6e9ee', '#7c8698');
export const ONYX_LIGHT = onyxTheme('onyx-light', 'light', '#1f2430', '#5d6675');
