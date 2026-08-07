/**
 * The three contract-less Platform screens (FS12 T-FS12.13). Each states fact,
 * reason and remedy — see `SeamScreen` for why the shape is fixed.
 */
import { SeamScreen } from './SeamScreen';

export { SeamScreen, type SeamSection } from './SeamScreen';

export function LogsSeam(): React.ReactElement {
  return (
    <SeamScreen
      title="Logs"
      icon="scroll-text"
      lead="The platform writes structured logs. This console cannot read them, and it will not pretend to."
      sections={[
        {
          heading: 'What the backend has',
          body: 'Structured JSON logging is a requirement (§R12.9): every entry carries time, level, service, request/task id, channel id and an event payload, and secrets are masked before anything is written. Two tables back it — `logs` and `errors` — and both are in the frozen 25-table schema.',
        },
        {
          heading: 'Why this screen is empty',
          body: 'The frozen API contract exposes no endpoint that returns log entries. There is no list call, no filter call and no stream, so there is nothing for a viewer, a tail or a filter bar to read. Rendering a simulated stream — or shipping fixture log lines — would make an absence look like data, which this project does not do.',
        },
        {
          heading: 'What would change it',
          body: 'A read call over the `logs` table (level, service, time window, request/task id) would turn this screen on: the filter bar, the virtualized stream and the structured-entry Inspector are all designed against D3 §18 and are waiting on the wire, not on the UI. That is optional future backend work, recorded as Runtime Verification — never a prerequisite for the frontend.',
        },
      ]}
      related="Until then, Jobs shows a task’s own recorded error, and Health shows dependency state. Both read endpoints that do exist."
      links={[
        { href: '/jobs', label: 'Open Jobs' },
        { href: '/health', label: 'Open Health' },
      ]}
    />
  );
}

export function FlagsSeam(): React.ReactElement {
  return (
    <SeamScreen
      title="Feature Flags"
      icon="toggle-right"
      lead="No flag exists to toggle. The design anticipated this screen; the platform has not defined the surface yet."
      sections={[
        {
          heading: 'What the backend has',
          body: 'Nothing, deliberately. There is no feature-flag endpoint in the contract and no `feature_flags` table among the frozen 25 — flags are named in the design system as an extensibility seam (D2 §18) and in D3 §20 the rollout mechanism is described as “declared, not implemented”.',
        },
        {
          heading: 'Why there is no toggle here',
          body: 'A switch that writes nowhere is worse than no switch: it reads as platform state while changing nothing, and the next operator would trust it. A browser-local flag store would be the same lie with extra steps, so neither exists.',
        },
        {
          heading: 'What would change it',
          body: 'A flags resource (list, state, rollout scope) plus its audit trail would make this a real screen — the list, the guarded toggle and the change history are specified in D3 §20 and would follow the same confirm-and-report pattern the rest of the Platform group uses. Optional future backend work, recorded as RV.',
        },
      ]}
      related="Configuration that CAN be changed today lives in Admin → Config Versions, which reads and rolls back real snapshots."
      links={[{ href: '/admin?tab=config', label: 'Open Config Versions' }]}
    />
  );
}

export function NotificationsSeam(): React.ReactElement {
  return (
    <SeamScreen
      title="Notifications"
      icon="bell"
      lead="Toasts tell you what just happened. There is no stored record to browse, because the contract carries none."
      sections={[
        {
          heading: 'What exists today',
          body: 'The console already announces events as they happen — queued intents, failures and confirmations arrive as toasts and are read out to assistive technology. That is the “immediate” half of the design’s notification model (D1 §6.7).',
        },
        {
          heading: 'Why there is no centre',
          body: 'The “record” half needs storage, and the frozen contract has neither a notifications endpoint nor a notifications table. An unread count, a grouped history or a mark-all-read action would all be invented state, so none is rendered — including on the topbar bell, which stays exactly as it was.',
        },
        {
          heading: 'What would change it',
          body: 'A notifications resource (list, kind, read state) would fill this screen, and per-kind preferences belong with the other account settings rather than here. Both are future work; the preferences half is already assigned to the Settings stage.',
        },
      ]}
      related="Health shows probe state, Jobs shows what failed, and Dashboard shows what needs review — the three things a centre would have pointed at."
      links={[
        { href: '/health', label: 'Open Health' },
        { href: '/jobs', label: 'Open Jobs' },
        { href: '/dashboard', label: 'Open Dashboard' },
      ]}
    />
  );
}
