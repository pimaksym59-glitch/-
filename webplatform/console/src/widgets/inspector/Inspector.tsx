'use client';

/**
 * Universal Inspector (D4 / Stage 3 §5). Driven entirely by the URL contract
 * `?inspect=type:id`, so any inspected view is shareable and restorable and
 * opening it never navigates away.
 *
 * **Slot decision (T-FS2.7):** the `@inspector` *parallel route* stays
 * workspace-only — that is where server-rendered entity inspectors will live
 * (FS5+). The **URL contract works in every route group** through this
 * shell-level panel, which renders as a right drawer on desktop and a bottom
 * sheet on mobile. Extending the parallel slot to `(platform)`/`(account)` is
 * therefore additive later, not a retrofit.
 */
import { PanelRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useInspector, useMediaQuery } from '@/shared/hooks';
import { EmptyState } from '@/shared/ui/empty-state';
import { Sheet } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConversationInspector } from './ConversationInspector';
import { JobInspector } from './JobInspector';
import { PostInspector } from './PostInspector';

/** FS7: the document view is LAZY — InspectorPanel sits in the shell commons,
 * so a static import would tax EVERY route's First Load (plan §3.1/§3.3; the
 * /chat 178 kB reference must not move). Mounted on first `document:` target. */
const inspectorLoading = (): React.ReactElement => (
  <div className="flex flex-col gap-3 p-4">
    <Skeleton height={20} width="70%" />
    <Skeleton height={120} />
  </div>
);

const DocumentInspector = dynamic(
  () => import('./DocumentInspector').then((m) => m.DocumentInspector),
  { loading: inspectorLoading },
);

/** FS8: memory views are LAZY for the same reason (this panel is shell
 * commons — a static import would tax every route's First Load). */
const PersonaInspector = dynamic(
  () => import('./PersonaInspector').then((m) => m.PersonaInspector),
  {
    loading: inspectorLoading,
  },
);
const ActorInspector = dynamic(() => import('./ActorInspector').then((m) => m.ActorInspector), {
  loading: inspectorLoading,
});

/** FS9: the image view is LAZY for the same reason (shell commons). */
const ImageInspector = dynamic(() => import('./ImageInspector').then((m) => m.ImageInspector), {
  loading: inspectorLoading,
});

/** FS10: the prompt-version view is LAZY for the same reason (shell commons). */
const PromptInspector = dynamic(() => import('./PromptInspector').then((m) => m.PromptInspector), {
  loading: inspectorLoading,
});

/**
 * FS11: the analytics datapoint view is LAZY for the same reason. It reads the
 * Query cache the analytics panels filled and performs NO fetch of its own —
 * the contract has no per-datapoint endpoint (plan §5.2 D8).
 */
const DatapointInspector = dynamic(
  () => import('./DatapointInspector').then((m) => m.DatapointInspector),
  { loading: inspectorLoading },
);

/**
 * FS12: the six Platform & Admin views share ONE lazy chunk.
 *
 * Registering them as six separate `dynamic()` rows measurably grew the webpack
 * runtime's chunk-id map — which lives in "First Load JS shared by all" — from
 * 2761 to 2909 B gz, rounding `/chat` 179 to 180 and `/memory` 149 to 150. One
 * reference costs one entry (see `PlatformInspectors.tsx` for the full note).
 *
 * `task` coexists with FS5's `job` deliberately: the same `/tasks` resource,
 * two projections. `JobInspector` is a STATIC import above (FS5-era) and is
 * therefore already in every route's First Load, so adding this stage's RBAC
 * branch, three mutations and AI panel to it would have taxed all 31 routes.
 * Keeping the FS5 view byte-identical is the `analytics`/`analytics-report`
 * reasoning applied to the registry (plan §3.5/§3.6).
 */
const PlatformInspector = dynamic(
  () => import('./PlatformInspectors').then((m) => m.PlatformInspector),
  { loading: inspectorLoading },
);

export function InspectorEmpty(): React.ReactElement {
  return (
    <EmptyState
      icon={PanelRight}
      title="Nothing selected"
      description="Select an item to inspect it here without leaving the page."
    />
  );
}

/**
 * View registry keyed by target type (T-FS5.9). A type gains its real view
 * with its workspace stage; unregistered types keep the honest FS2 fallback.
 */
const INSPECTOR_VIEWS: Record<string, React.ComponentType<{ readonly id: string }>> = {
  post: PostInspector,
  job: JobInspector,
  conversation: ConversationInspector,
  document: DocumentInspector,
  persona: PersonaInspector,
  actor: ActorInspector,
  image: ImageInspector,
  prompt: PromptInspector,
  datapoint: DatapointInspector,
};

/** FS12 — one lazy chunk serves all six platform types (see above). */
const PLATFORM_TYPES = ['task', 'user', 'config', 'audit', 'probe', 'key'] as const;

/** Content for an inspected target — real entity views since FS5 (post, job). */
function InspectorTarget({ type, id }: { type: string; id: string }): React.ReactElement {
  const View = INSPECTOR_VIEWS[type];
  if (View) return <View id={id} />;
  if ((PLATFORM_TYPES as readonly string[]).includes(type)) {
    return <PlatformInspector type={type as (typeof PLATFORM_TYPES)[number]} id={id} />;
  }
  return (
    <div className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{type}</p>
      <p className="mt-1 break-all text-sm text-primary">{id}</p>
      <p className="mt-4 text-[13px] text-secondary">
        The inspector is wired to the URL. Entity detail for this type arrives with its workspace.
      </p>
    </div>
  );
}

/**
 * Desktop drawer. Rendered inside the shell; on mobile the same state is shown
 * as a bottom sheet (below), never both at once.
 */
export function InspectorPanel({ children }: { children?: React.ReactNode }): React.ReactElement {
  const { target, isOpen, close } = useInspector();
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return (
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        side="bottom"
        title="Inspector"
        description="Details for the selected item."
      >
        {target ? <InspectorTarget type={target.type} id={target.id} /> : <InspectorEmpty />}
      </Sheet>
    );
  }

  return (
    <aside
      aria-label="Inspector"
      className="hidden h-full w-[var(--shell-inspector-width)] shrink-0 overflow-y-auto border-l border-border-subtle bg-surface xl:block"
    >
      {target ? (
        <InspectorTarget type={target.type} id={target.id} />
      ) : (
        (children ?? <InspectorEmpty />)
      )}
    </aside>
  );
}
