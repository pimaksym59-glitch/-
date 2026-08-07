/**
 * PageStub — the ONYX placeholder every FS1 route renders (D2 §15 EmptyState).
 * Scaffold only: it declares the screen exists, is themed, RBAC-guarded and
 * routable. Functional screens replace these stubs in FS5+. No business logic.
 */
import { ROUTES, type RouteKey } from '@/shared/config/routes';
import { EmptyState } from '@/shared/ui/empty-state';
import { getIcon } from '@/shared/ui/icon';

export interface PageStubProps {
  readonly routeKey: RouteKey;
  readonly note?: string;
}

export function PageStub({ routeKey, note }: PageStubProps): React.ReactElement {
  const route = ROUTES[routeKey];
  const Icon = getIcon(route.icon);
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.015em] text-primary">
          {route.label}
        </h1>
      </header>
      <div className="onyx-raised rounded-xl">
        <EmptyState
          icon={Icon}
          title={`${route.label} — coming soon`}
          description={
            note ?? 'This screen is scaffolded in FS1. Its functional UI arrives in a later stage.'
          }
        />
      </div>
    </section>
  );
}
