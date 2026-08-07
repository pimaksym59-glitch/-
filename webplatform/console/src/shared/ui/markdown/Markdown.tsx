'use client';

import { clsx } from 'clsx';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

/**
 * Markdown renderer (D2 §13.17 — HEAVY, consume lazily). Reading-grade:
 * body.lg, 72ch measure, GFM (tables, task lists, footnotes), callouts mapped
 * to status tokens, safe/sanitized (SEC-4 — rehype-sanitize; no raw HTML
 * survives). Footnote references render as citation chips; `onCitation` lets
 * AI surfaces open the source drawer (FS6+ wires it).
 */
const SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // GFM task-list checkboxes (rendered disabled).
    input: [['type', 'checkbox'], ['checked'], ['disabled']],
    code: [...(defaultSchema.attributes?.['code'] ?? []), ['className', /^language-/]],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), 'input', 'section', 'sup'],
};

export type CalloutKind = 'info' | 'warning' | 'success' | 'ai';

const CALLOUT_CLASS: Record<CalloutKind, string> = {
  info: 'border-[color:var(--status-info-fg)] bg-info-bg',
  warning: 'border-[color:var(--status-warning-fg)] bg-warning-bg',
  success: 'border-[color:var(--status-success-fg)] bg-success-bg',
  ai: 'border-[color:var(--ai-accent)] onyx-ai-wash',
};

const CALLOUT_MARK = /^\[!(INFO|WARNING|SUCCESS|AI)\]\s*/;

export interface MarkdownProps {
  readonly children: string;
  /** Invoked when a footnote-style citation chip `[n]` is activated. */
  readonly onCitation?: (index: number) => void;
  readonly className?: string;
}

export function Markdown({ children, onCitation, className }: MarkdownProps): React.ReactElement {
  const components: Components = {
    blockquote: ({ children: quote, node: _node, ...rest }) => {
      // Callout convention: a blockquote starting with [!KIND]. The marker is
      // read from the rendered React children (robust across react-markdown
      // internals; the hast `node` is not relied upon).
      const text = extractReactText(quote);
      const match = CALLOUT_MARK.exec(text.trimStart());
      if (match) {
        const kind = match[1]?.toLowerCase() as CalloutKind;
        return (
          <div
            role="note"
            data-callout={kind}
            className={clsx('my-3 rounded-lg border-l-2 px-4 py-3', CALLOUT_CLASS[kind])}
          >
            {quote}
          </div>
        );
      }
      return (
        <blockquote className="my-3 border-l-2 border-border-strong pl-4 text-secondary" {...rest}>
          {quote}
        </blockquote>
      );
    },
    p: ({ children: content }) => {
      // Strip the callout marker text from the first paragraph inside a callout.
      if (typeof content === 'string') {
        const stripped = content.replace(CALLOUT_MARK, '');
        return <p>{stripped}</p>;
      }
      if (Array.isArray(content) && typeof content[0] === 'string') {
        const [first, ...restChildren] = content;
        return <p>{[String(first).replace(CALLOUT_MARK, ''), ...restChildren]}</p>;
      }
      return <p>{content}</p>;
    },
    a: ({ href, children: linkChildren, ...rest }) => {
      // Footnote references (GFM) → citation chips.
      if (href?.startsWith('#') && href.includes('fn-')) {
        const index = Number(/\d+$/.exec(href)?.[0] ?? '0');
        return (
          <button
            type="button"
            data-citation={index}
            aria-label={`Citation ${index}`}
            onClick={onCitation ? () => onCitation(index) : undefined}
            className="mx-0.5 inline-flex size-4 items-center justify-center rounded-sm bg-interactive-subtle align-super font-mono text-[10px] font-semibold text-[color:var(--ai-accent)] hover:bg-[color:var(--ai-wash)]"
          >
            {index}
          </button>
        );
      }
      return (
        <a
          href={href}
          className="font-medium text-[color:var(--interactive-default)] underline underline-offset-2 hover:opacity-90"
          {...(href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          {...rest}
        >
          {linkChildren}
        </a>
      );
    },
    code: ({ className: codeClass, children: code, ...rest }) => {
      const isBlock = /language-/.test(codeClass ?? '');
      if (isBlock) {
        return (
          <code className={clsx('block font-mono text-[13px] leading-5', codeClass)} {...rest}>
            {code}
          </code>
        );
      }
      return (
        <code
          className="rounded-sm bg-inset px-1 py-0.5 font-mono text-[0.85em] text-primary"
          {...rest}
        >
          {code}
        </code>
      );
    },
    pre: ({ children: content }) => (
      <pre className="my-3 overflow-x-auto rounded-lg bg-sunken p-4">{content}</pre>
    ),
    table: ({ children: content }) => (
      <div className="my-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{content}</table>
      </div>
    ),
    th: ({ children: content }) => (
      <th className="border-b border-border-default px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary">
        {content}
      </th>
    ),
    td: ({ children: content }) => (
      <td className="border-b border-border-subtle px-3 py-2">{content}</td>
    ),
    img: ({ src, alt }) => (
      // eslint-disable-next-line @next/next/no-img-element -- markdown images are user content with unknown dimensions; next/image needs width/height.
      <img src={src} alt={alt ?? ''} className="my-3 max-w-full rounded-lg" />
    ),
  };

  return (
    <div
      className={clsx(
        'max-w-[72ch] text-[15px] leading-7 text-primary',
        '[&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold',
        '[&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold',
        '[&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
        '[&_li]:my-0.5 [&_p]:my-2',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, SCHEMA]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function extractReactText(children: React.ReactNode): string {
  if (children === null || children === undefined || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractReactText).join('');
  if (typeof children === 'object' && 'props' in children) {
    return extractReactText((children.props as { children?: React.ReactNode }).children);
  }
  return '';
}
