import { AppShell } from '@/widgets/app-shell';
import { requireSession } from '../_auth/session';

/**
 * Workspace route-group layout. Renders the AppShell with the `@inspector`
 * parallel slot (Stage 3 §5). FS4: the session is re-checked SERVER-SIDE
 * (SEC-2) — middleware is UX, this is the render-time guard.
 */
export default async function WorkspaceLayout({
  children,
  inspector,
}: {
  readonly children: React.ReactNode;
  readonly inspector: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireSession();
  return <AppShell inspector={inspector}>{children}</AppShell>;
}
