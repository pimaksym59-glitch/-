'use client';

import { clsx } from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { createHighlighter } from 'shiki';
import { ONYX_DARK, ONYX_LIGHT } from './onyx-shiki-theme';

/**
 * CodeBlock (D2 §13.18 — HEAVY via Shiki, consume lazily). JetBrains Mono
 * 13/20, background.sunken, header (language + copy), optional line numbers,
 * diff mode (per-line +/- tints), horizontal scroll in its own container.
 * Highlighting loads asynchronously; a plain <pre> renders immediately so the
 * content is never blocked on the highlighter (and tests don't need WASM).
 */
const LANGS = [
  'typescript',
  'tsx',
  'javascript',
  'json',
  'bash',
  'python',
  'yaml',
  'markdown',
  'html',
  'css',
] as const;
type OnyxHighlighter = Awaited<ReturnType<typeof createHighlighter>>;
let highlighterPromise: Promise<OnyxHighlighter> | null = null;

function getOnyxHighlighter(): Promise<OnyxHighlighter> {
  highlighterPromise ??= import('shiki').then((shiki) =>
    shiki.createHighlighter({ themes: [ONYX_DARK, ONYX_LIGHT], langs: [...LANGS] }),
  );
  return highlighterPromise;
}

export interface CodeBlockProps {
  readonly code: string;
  readonly language?: string;
  readonly title?: string;
  readonly showLineNumbers?: boolean;
  /** Diff mode: lines starting with `+`/`-` get success/danger washes. */
  readonly diff?: boolean;
  readonly onCopied?: () => void;
  readonly className?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  title,
  showLineNumbers = false,
  diff = false,
  onCopied,
  className,
}: CodeBlockProps): React.ReactElement {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (diff || !(LANGS as readonly string[]).includes(language)) {
      setHtml(null);
      return;
    }
    getOnyxHighlighter()
      .then((hl) => {
        if (cancelled) return;
        setHtml(
          hl.codeToHtml(code, {
            lang: language,
            themes: { dark: 'onyx-dark', light: 'onyx-light' },
            defaultColor: false,
          }),
        );
      })
      .catch(() => {
        // Highlighting is progressive enhancement — plain code remains.
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, language, diff]);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the button simply doesn't confirm.
    }
  }

  const lines = code.replace(/\n$/, '').split('\n');

  return (
    <figure
      className={clsx(
        'overflow-hidden rounded-lg border border-border-subtle bg-sunken',
        className,
      )}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-secondary">
          {title ?? language}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
        >
          {copied ? (
            <Check aria-hidden className="size-3 text-success" />
          ) : (
            <Copy aria-hidden className="size-3" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <div className="overflow-x-auto">
        {html && !diff ? (
          <div
            data-line-numbers={showLineNumbers || undefined}
            className={clsx(
              'onyx-shiki p-4 font-mono text-[13px] leading-5',
              '[&_pre]:bg-transparent [&_code]:bg-transparent',
            )}
            // Shiki output over sanitize-free trusted input: `code` is a plain
            // string prop escaped by Shiki itself (SEC-4 compliant — no user
            // HTML enters this path).
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="p-4 font-mono text-[13px] leading-5 text-primary">
            <code>
              {lines.map((line, i) => {
                const kind =
                  diff && line.startsWith('+')
                    ? 'add'
                    : diff && line.startsWith('-')
                      ? 'del'
                      : null;
                return (
                  <span
                    key={i}
                    data-diff={kind ?? undefined}
                    className={clsx(
                      'block px-1',
                      kind === 'add' && 'bg-success-bg text-success',
                      kind === 'del' && 'bg-danger-bg text-danger',
                    )}
                  >
                    {showLineNumbers ? (
                      <span
                        aria-hidden
                        className="mr-4 inline-block w-6 select-none text-right text-secondary"
                      >
                        {i + 1}
                      </span>
                    ) : null}
                    {line || ' '}
                  </span>
                );
              })}
            </code>
          </pre>
        )}
      </div>
    </figure>
  );
}
