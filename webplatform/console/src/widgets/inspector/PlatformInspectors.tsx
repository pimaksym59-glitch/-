'use client';

/**
 * The six FS12 Inspector views behind ONE lazy chunk.
 *
 * **Why one chunk and not six.** Registering six separate `dynamic()` rows in
 * `Inspector.tsx` — which is shell commons — added six entries to the webpack
 * runtime's chunk-id map. The map is part of "First Load JS shared by all", so
 * the cost lands on EVERY route: the first FS12 build measured the runtime
 * chunk at 2909 B gz against a 2761 B baseline (+148 B), which rounded `/chat`
 * 179 → 180 and `/memory` 149 → 150.
 *
 * This module is the structural fix (never a threshold one, rule №33): the
 * registry gains a single lazy reference, the six views share one chunk, and
 * the runtime map grows by one entry instead of six. The views themselves are
 * unchanged — each still fetches nothing it does not need, and none is loaded
 * until a `?inspect=` target of its type is opened.
 *
 * The trade is explicit: opening a `user` target also downloads the other five
 * views. They are small, they belong to the same screen family, and an operator
 * who opens one platform inspector routinely opens another — which is exactly
 * the case where sharing a chunk is cheaper than splitting it.
 */
import { AuditInspector } from './AuditInspector';
import { ConfigInspector } from './ConfigInspector';
import { KeyInspector } from './KeyInspector';
import { ProbeInspector } from './ProbeInspector';
import { TaskInspector } from './TaskInspector';
import { UserInspector } from './UserInspector';

export type PlatformInspectorType = 'task' | 'user' | 'config' | 'audit' | 'probe' | 'key';

const VIEWS: Record<PlatformInspectorType, React.ComponentType<{ readonly id: string }>> = {
  task: TaskInspector,
  user: UserInspector,
  config: ConfigInspector,
  audit: AuditInspector,
  probe: ProbeInspector,
  key: KeyInspector,
};

export function PlatformInspector({
  type,
  id,
}: {
  readonly type: PlatformInspectorType;
  readonly id: string;
}): React.ReactElement {
  const View = VIEWS[type];
  return <View id={id} />;
}
