'use client';

/**
 * NotificationProvider (Stage 3 §7 #6). Radix Toaster + a `useToast` API.
 * Depends on the Announcer (a11y) so outcomes are also announced: danger =
 * assertive, everything else = polite (D2 §12 / §17). A notifications-stream
 * subscription is wired in FS13; FS1 provides the toast surface only.
 */
import * as Toast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { isToastKindMuted } from '@/shared/lib/notifications';
import { ToastCard, type ToastKind } from '@/shared/ui/toast';
import { useAnnouncer } from './AccessibilityProvider';

export type { ToastKind };

export interface ToastOptions {
  readonly title: string;
  readonly description?: string;
  readonly kind?: ToastKind;
  readonly durationMs?: number;
}

interface ToastRecord extends ToastOptions {
  readonly id: string;
  readonly kind: ToastKind;
}

interface NotificationContextValue {
  readonly toast: (options: ToastOptions) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([]);
  const announce = useAnnouncer();

  const toast = useCallback(
    (options: ToastOptions) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}`;
      const kind = options.kind ?? 'info';
      // FS13 D5-B: a muted kind is neither shown NOR announced — being told
      // twice is exactly what the user switched off. `danger` is unmutable by
      // construction, so a critical outcome can never take this path.
      if (isToastKindMuted(kind)) return;
      setToasts((prev) => [...prev, { ...options, id, kind }]);
      announce(
        `${options.title}${options.description ? `. ${options.description}` : ''}`,
        kind === 'danger' ? 'assertive' : 'polite',
      );
    },
    [announce],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({ toast }), [toast]);

  return (
    <NotificationContext.Provider value={value}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            duration={t.durationMs ?? 5000}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            className="list-none"
          >
            <ToastCard
              kind={t.kind}
              title={t.title}
              {...(t.description !== undefined ? { description: t.description } : {})}
              onClose={() => dismiss(t.id)}
            />
          </Toast.Root>
        ))}
        <Toast.Viewport
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            width: 'min(420px, 100vw)',
            maxWidth: '100vw',
            margin: 0,
            padding: 'var(--space-6)',
            listStyle: 'none',
            zIndex: 'var(--z-toast)',
          }}
        />
      </Toast.Provider>
    </NotificationContext.Provider>
  );
}

export function useToast(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useToast must be used within <NotificationProvider>.');
  return ctx;
}
