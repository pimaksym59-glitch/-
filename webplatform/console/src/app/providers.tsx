'use client';

/**
 * Client provider tree (Stage 3 §7). Mounted ONCE. Nesting order is fixed by
 * the spec: Theme → Query → Auth → Accessibility → Shortcut → Notification →
 * Streaming (outer → inner). Server-fetched theme/density/session/shell state
 * are passed in so the client hydrates without flashes.
 *
 * `NuqsAdapter` wraps the tree as a **technical adapter** for the URL-state
 * library mandated by FE-ADR-5. It is not an eighth architectural provider: it
 * owns no state and changes none of the seven responsibilities or their order.
 */
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { Density, Theme } from '@/shared/config/theme';
import type { SidebarState } from '@/shared/config/shell';
import { FixtureBoot } from '@/shared/lib/fixtures/FixtureBoot';
import { StoreHydrator } from '@/shared/lib/store';
import {
  AccessibilityProvider,
  AuthProvider,
  NotificationProvider,
  QueryProvider,
  ShortcutProvider,
  StreamingProvider,
  ThemeProvider,
} from '@/shared/providers';
import type { SessionDTO } from '@/shared/types';

export interface ProvidersProps {
  readonly initialTheme: Theme;
  readonly initialDensity: Density;
  readonly initialSidebar: SidebarState;
  readonly initialChannelId: string | null;
  readonly session: SessionDTO | null;
  readonly children: React.ReactNode;
}

export function Providers({
  initialTheme,
  initialDensity,
  initialSidebar,
  initialChannelId,
  session,
  children,
}: ProvidersProps): React.ReactElement {
  return (
    // FixtureBoot is a technical adapter like NuqsAdapter (FS5 T-FS5.1): it
    // starts the local/ci fixture worker, owns no state, and leaves the frozen
    // seven-provider tree and its order untouched.
    <FixtureBoot>
      <NuqsAdapter>
        <ThemeProvider initialTheme={initialTheme} initialDensity={initialDensity}>
          <QueryProvider>
            <AuthProvider session={session}>
              <AccessibilityProvider>
                <ShortcutProvider>
                  <NotificationProvider>
                    <StreamingProvider>
                      <StoreHydrator sidebar={initialSidebar} activeChannelId={initialChannelId} />
                      {children}
                    </StreamingProvider>
                  </NotificationProvider>
                </ShortcutProvider>
              </AccessibilityProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </NuqsAdapter>
    </FixtureBoot>
  );
}
