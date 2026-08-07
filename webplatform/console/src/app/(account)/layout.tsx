import { AppShell } from '@/widgets/app-shell';
import { requireSession } from '../_auth/session';

/**
 * Account route-group layout (settings / profile / docs).
 * FS4: server-side session re-check (SEC-2).
 */
export default async function AccountLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireSession();
  return <AppShell>{children}</AppShell>;
}
