/**
 * AppShell (Stage 2 §6 / D4 Workspace Consistency: Nav / Content / Inspector /
 * Actions). Composes Sidebar + Topbar + content + the `@inspector` slot, and
 * mounts the global overlays (command palette, shortcut cheat-sheet) and the
 * mobile navigation. Static — no data.
 */
import { InspectorPanel } from '@/widgets/inspector';
import { MobileNav } from '@/widgets/mobile-nav';
import { Sidebar } from '@/widgets/sidebar';
import { Topbar } from '@/widgets/topbar';
import { GlobalOverlays } from './GlobalOverlays';
import { RouteTransition } from './RouteTransition';

export interface AppShellProps {
  readonly children: React.ReactNode;
  /** The `@inspector` parallel-route slot (workspace group only, Stage 3 §5). */
  readonly inspector?: React.ReactNode;
}

export function AppShell({ children, inspector }: AppShellProps): React.ReactElement {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas text-primary">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <div className="flex min-h-0 flex-1">
          <main id="main-content" className="min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
            <RouteTransition>{children}</RouteTransition>
          </main>
          <InspectorPanel>{inspector}</InspectorPanel>
        </div>
      </div>

      <MobileNav />
      <GlobalOverlays />
    </div>
  );
}
