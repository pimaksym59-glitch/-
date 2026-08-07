'use client';

/**
 * AccessibilityProvider (Stage 3 §7 #4). Mounts the live-region announcer and
 * a reduced-motion context (Stage 2 §10). Streaming output/toasts announce
 * politely; danger announces assertively (D2 §17).
 */
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useReducedMotion } from '@/shared/hooks/useMediaQuery';

export type Politeness = 'polite' | 'assertive';

interface AccessibilityContextValue {
  readonly announce: (message: string, politeness?: Politeness) => void;
  readonly prefersReducedMotion: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    const region = (politeness === 'assertive' ? assertiveRef : politeRef).current;
    if (!region) return;
    // Clear then set so identical consecutive messages are re-announced.
    region.textContent = '';
    window.requestAnimationFrame(() => {
      region.textContent = message;
    });
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({ announce, prefersReducedMotion }),
    [announce, prefersReducedMotion],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <div ref={politeRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <div ref={assertiveRef} aria-live="assertive" aria-atomic="true" className="sr-only" />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within <AccessibilityProvider>.');
  return ctx;
}

export function useAnnouncer(): (message: string, politeness?: Politeness) => void {
  return useAccessibility().announce;
}
