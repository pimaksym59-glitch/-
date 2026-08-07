'use client';

import { clsx } from 'clsx';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/providers';

/** ThemeToggle — flips Dark/Light (D2 intro, §F4.4). SSR-safe via ThemeProvider. */
export function ThemeToggle({ className }: { className?: string }): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={clsx(
        'inline-flex size-9 items-center justify-center rounded-md text-secondary',
        'transition-colors duration-[120ms] hover:bg-interactive-subtle hover:text-primary',
        className,
      )}
    >
      {isDark ? <Moon aria-hidden className="size-5" /> : <Sun aria-hidden className="size-5" />}
    </button>
  );
}
