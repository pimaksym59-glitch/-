import { AppShell } from '@/widgets/app-shell';
import { requireSession } from '../_auth/session';

/**
 * Platform & Admin route-group layout — same shell, no inspector slot in FS1.
 * FS4: server-side session re-check (SEC-2).
 */
export default async function PlatformLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireSession();
  return <AppShell>{children}</AppShell>;
}
