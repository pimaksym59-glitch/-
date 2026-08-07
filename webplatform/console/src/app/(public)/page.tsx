import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

// Landing is the only indexable route (Stage 3 §5).
export const metadata: Metadata = {
  title: 'Console — AI-first automation control',
  description: 'Run, observe and steer your AI Telegram automation from one premium console.',
  robots: { index: true, follow: true },
};

export default function LandingPage(): React.ReactElement {
  return (
    <main id="main-content" className="mx-auto max-w-2xl py-24 text-center">
      <span className="onyx-aurora-edge onyx-ai-wash mx-auto mb-6 inline-flex size-12 items-center justify-center rounded-2xl text-ai">
        <Sparkles aria-hidden className="size-6" />
      </span>
      <h1 className="text-[40px] font-semibold leading-[48px] tracking-[-0.02em]">Console</h1>
      <p className="mx-auto mt-4 max-w-lg text-base text-secondary">
        The premium, AI-first control surface for the AI Telegram Automation Platform.
        Streaming-first, keyboard-first, accessible by default.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-md bg-interactive px-5 text-sm font-medium text-on-accent transition-colors hover:bg-interactive-hover"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="inline-flex h-11 items-center rounded-md border border-border-default px-5 text-sm font-medium text-primary transition-colors hover:border-border-strong"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
