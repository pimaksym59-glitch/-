/**
 * demoteMarkdownHeadings (FS7 §6 defect fix): an embedded document's own
 * headings must never out-rank the page structure (axe heading-order). h1→h4,
 * capped at h6; fenced code untouched; non-heading `#` uses untouched.
 */
import { describe, expect, it } from 'vitest';
import { demoteMarkdownHeadings } from '@/widgets/knowledge';

describe('demoteMarkdownHeadings (FS7)', () => {
  it('demotes by 3 levels and caps at h6', () => {
    const input = '# Title\n## Section\n### Sub\n#### Deep\nBody';
    expect(demoteMarkdownHeadings(input)).toBe(
      '#### Title\n##### Section\n###### Sub\n###### Deep\nBody',
    );
  });

  it('leaves fenced code blocks intact', () => {
    const input = ['# Real heading', '```', '# not a heading', '```', '## After'].join('\n');
    expect(demoteMarkdownHeadings(input)).toBe(
      ['#### Real heading', '```', '# not a heading', '```', '##### After'].join('\n'),
    );
  });

  it('ignores hashes that are not headings', () => {
    const input = 'Issue #42 and #hashtag\n#nospace';
    expect(demoteMarkdownHeadings(input)).toBe(input);
  });
});
