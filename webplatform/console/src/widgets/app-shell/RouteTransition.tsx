'use client';

/**
 * Page transition (D2 §9): cross-fade + 8px slide, 240ms `standard`, keyed by
 * pathname. Never a white flash — the canvas token is behind everything.
 * Fully disabled under `prefers-reduced-motion` (the CSS animation is gated in
 * themes.css, and the class is dropped here as well).
 */
import { usePathname } from 'next/navigation';
import { useReducedMotion } from '@/shared/hooks';

export function RouteTransition({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <div key={reduced ? 'static' : pathname} className={reduced ? undefined : 'onyx-route-enter'}>
      {children}
    </div>
  );
}
