/**
 * Demote an embedded DOCUMENT's own headings so `# Title` inside the content
 * can never out-rank the page structure (h1 Knowledge → … → h3 reader title):
 * a document h1 renders as h4, capped at h6; fenced code blocks are left
 * intact. Widget-level embedding concern — the ONYX Markdown contract is
 * untouched (found by the axe gate: content h1 → chrome h4 = heading-order
 * violation). Kept in its own module so the widget index can export it
 * without statically pulling the LAZY Reader chunk.
 */
export function demoteMarkdownHeadings(markdown: string, offset = 3): string {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const match = /^(#{1,6})(\s)/.exec(line);
      if (!match?.[1] || !match[2]) return line;
      const level = Math.min(6, match[1].length + offset);
      return `${'#'.repeat(level)}${match[2]}${line.slice(match[0].length)}`;
    })
    .join('\n');
}
