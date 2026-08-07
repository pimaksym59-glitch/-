'use client';

/**
 * Account · Security · Notifications · Experience · Advanced — **five panels in
 * ONE lazy module, on purpose**.
 *
 * Five `dynamic()` boundaries would add five entries to the global webpack
 * runtime chunk-id map, which lives in commons. FS12 measured that exact effect
 * (six separate Inspector rows rounded two protected routes up) and the lesson
 * is now a rule: N lazy rows of one screen family become ONE chunk. With
 * `/chat` at 180/180 there is no headroom to spend re-learning it.
 *
 * Most of what follows is absence. That is the contract's doing, not the
 * screen's: `/api/v1` carries no preferences resource, no self-service account
 * write, no password change, no MFA call, no session inventory and no
 * notification delivery. Each is stated as fact · reason · what would change
 * it — never approximated, never left as an unexplained void.
 */
import Link from 'next/link';
import { useSession } from '@/shared/providers';
import { Button } from '@/shared/ui/button';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Switch } from '@/shared/ui/switch';
import {
  EXPERIENCE_LEVELS,
  MUTABLE_TOAST_KINDS,
  type AccountPreferencesApi,
  type ExperienceLevel,
  type MutableToastKind,
} from '@/features/change-settings';
import { AbsenceRow, LocalNote, Panel, PanelRow } from './Panel';
import type { SettingsSection } from './sections';

const EXPERIENCE_ITEMS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'power', label: 'Power' },
];

const EXPERIENCE_BLURB: Record<ExperienceLevel, string> = {
  beginner: 'Advanced detail stays hidden until you ask for it.',
  advanced: 'Storage keys, cookie names and the raw preference payload are shown.',
  power: 'Everything Advanced shows, plus the keyboard path for each control.',
};

const TOAST_KIND_LABEL: Record<MutableToastKind, string> = {
  success: 'Success',
  info: 'Information',
  warning: 'Warning',
  ai: 'AI',
};

/* -------------------------------------------------------------------------- */

export function AccountPanel({ advanced }: { readonly advanced: boolean }): React.ReactElement {
  const session = useSession();

  return (
    <Panel
      title="Account"
      lead="Your identity as the platform reports it. Everything here is read-only, because the API exposes no self-service write."
    >
      <PanelRow
        label="Email"
        control={<span className="text-[13px] text-primary">{session?.email ?? '—'}</span>}
      />
      <PanelRow
        label="Role"
        description="Set by an owner. Roles are enforced by the backend; this console only reflects them."
        control={<span className="text-[13px] text-primary">{session?.role ?? '—'}</span>}
      />
      {advanced ? (
        <PanelRow
          label="User id"
          description="Used to scope your activity record."
          control={
            <span className="font-mono text-[13px] text-secondary">{session?.userId ?? '—'}</span>
          }
        />
      ) : null}

      <AbsenceRow
        title="You cannot edit your profile here"
        fact="The contract has one account write — an owner changing another user's role — and no call for changing your own email, display name or avatar. The user record has no name column at all, which is why your initials are drawn from your email address."
        remedy="A self-service account endpoint would turn this panel into a form. Until then it shows what /auth/me returns and nothing else."
      />
      <AbsenceRow
        title="There is no password change"
        fact="Passwords are stored as hashes on the backend, and the API documents no endpoint to change or reset one."
        remedy="A password-change call would live here, guarded and confirmed. Rendering a form that posts nowhere would be worse than saying this."
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

export function SecurityPanel({ isOwner }: { readonly isOwner: boolean }): React.ReactElement {
  return (
    <Panel
      title="Security"
      lead="The platform has more security machinery than it exposes. This panel shows what the API actually offers and names the rest."
    >
      {isOwner ? (
        <PanelRow
          label="Sign out other sessions"
          description="Session revocation exists in the contract but is scoped to owners and takes a user id, so it lives with the other governance actions in Admin."
          control={
            <Link
              href="/admin?tab=sessions"
              className="inline-flex items-center rounded-md border border-border-default px-3 py-1.5 text-[13px] text-primary hover:bg-interactive-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            >
              Open Admin → Sessions
            </Link>
          }
        />
      ) : (
        <AbsenceRow
          title="Sign out other sessions is owner-only"
          fact="The frozen permission matrix gives Users, Roles, API keys and Security to the owner alone, and the revoke call takes a user id rather than acting on the caller."
          remedy="Ask an owner to revoke your sessions from Admin → Sessions."
        />
      )}

      <AbsenceRow
        title="Your active sessions cannot be listed"
        fact="Sessions can be revoked but not enumerated: there is no session-inventory endpoint and no sessions table in the schema, so there is no device, location or last-seen list to show."
        remedy="A session-inventory call would fill this space with the list D3 describes. Inventing rows for it would misrepresent what the platform knows."
      />
      <AbsenceRow
        title="Multi-factor authentication is not configurable here"
        fact="The user record reserves a slot for an MFA secret and the platform requirements name MFA as optional, but the API exposes no enrolment, verification or disable call. This console also cannot tell 'MFA is off' apart from 'the response did not mention MFA', so it reports neither."
        remedy="MFA enrolment endpoints would make this a real, guarded flow with a confirm step."
      />
      <AbsenceRow
        title="There is no sign-in history"
        fact="A login journal is part of the platform's stated security requirements, but no endpoint returns one."
        remedy="Until such a call exists, the closest real record is the audit log, which shows the actions taken on the platform rather than the sessions that took them."
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

export function NotificationsPanel({
  api,
  advanced,
}: {
  readonly api: AccountPreferencesApi;
  readonly advanced: boolean;
}): React.ReactElement {
  const { preferences, setToastKindMuted } = api;

  return (
    <Panel
      title="Notifications"
      lead="These control the toasts this console shows you in this browser. They are not a delivery setting, because the platform delivers no notifications."
    >
      {MUTABLE_TOAST_KINDS.map((kind) => (
        <PanelRow
          key={kind}
          label={TOAST_KIND_LABEL[kind]}
          control={
            <Switch
              label={`Show ${TOAST_KIND_LABEL[kind].toLowerCase()} toasts`}
              hideLabel
              checked={!preferences.mutedToastKinds.includes(kind)}
              onCheckedChange={(checked) => setToastKindMuted(kind, !checked)}
            />
          }
        />
      ))}

      <PanelRow
        label="Errors"
        description="Error toasts cannot be silenced. A critical outcome must never depend on a channel you can switch off, so this one has no control."
        control={<span className="text-[13px] text-secondary">Always shown</span>}
      />

      <LocalNote>
        Stored in this browser only.
        {advanced
          ? ` Key: onyx:account-prefs. Muted kinds: ${
              preferences.mutedToastKinds.length > 0
                ? preferences.mutedToastKinds.join(', ')
                : 'none'
            }.`
          : ''}
      </LocalNote>

      <AbsenceRow
        title="There is no notification centre and no per-kind delivery"
        fact="The API carries no notifications endpoint and the schema has no notifications table, so nothing is stored, nothing is delivered and there is no unread state. D3 describes preferences for pipeline, jobs, health and billing notifications; none of those channels exists to configure."
        remedy="A notifications resource would turn these switches into real per-kind delivery preferences and give the bell a record to open."
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

export function ExperiencePanel({
  api,
}: {
  readonly api: AccountPreferencesApi;
}): React.ReactElement {
  const { preferences, setExperience } = api;

  return (
    <Panel
      title="Experience"
      lead="Progressive disclosure: the layout never changes, only how much detail is revealed."
    >
      <PanelRow
        label="Level"
        description={EXPERIENCE_BLURB[preferences.experience]}
        control={
          <SegmentedControl
            label="Experience level"
            items={EXPERIENCE_ITEMS}
            value={preferences.experience}
            onValueChange={(value) =>
              setExperience(
                (EXPERIENCE_LEVELS.includes(value as ExperienceLevel)
                  ? value
                  : 'beginner') as ExperienceLevel,
              )
            }
          />
        }
      />

      <LocalNote>
        Settings and Profile respond to this level today. The other screens keep their own fixed
        level of detail until progressive disclosure is extended to them — this note will be wrong
        the moment that changes, so it names the screens rather than promising all of them.
      </LocalNote>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

export function AdvancedPanel({
  api,
  advanced,
  power,
}: {
  readonly api: AccountPreferencesApi;
  readonly advanced: boolean;
  readonly power: boolean;
}): React.ReactElement {
  const { preferences, reset } = api;

  return (
    <Panel
      title="Advanced"
      lead="Housekeeping for the values this browser keeps, and pointers to the settings that live elsewhere."
    >
      <PanelRow
        label="Reset preferences"
        description="Clears the experience level and notification choices stored in this browser. Theme and density keep their cookies."
        control={
          <Button variant="secondary" size="sm" onClick={() => reset()}>
            Reset to defaults
          </Button>
        }
      />

      {advanced ? (
        <div>
          <p className="text-[13px] font-medium text-primary">Stored payload</p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border-subtle bg-inset p-3 font-mono text-[12px] leading-5 text-secondary">
            {JSON.stringify(preferences, null, 2)}
          </pre>
        </div>
      ) : null}

      {power ? (
        <LocalNote>
          Keyboard: ⌘, opens Settings · ⌘⇧L toggles theme · ⌘⇧D toggles density · ⌘\ toggles the
          sidebar rail · ⌘/ opens the full shortcut sheet.
        </LocalNote>
      ) : null}

      <AbsenceRow
        title="Channel and pipeline parameters are not here"
        fact="Generation settings — lead time, similarity threshold, rewrite limits, posts per day and the rest — are per-channel values on the channel settings resource, not account preferences."
        remedy="They belong to the Channels screen, which is where the API scopes them. This panel deliberately shows no copy of them, because two places to change one value is how they drift apart."
      />
      <AbsenceRow
        title="There is no data export and no SSO connection"
        fact="The API exposes no account-export call and no SSO enrolment; single sign-on exists in the platform's design as a seam, not as an endpoint."
        remedy="Both would be additive backend work. Neither is simulated here."
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The single entry point the lazy boundary loads. Keeping the switch INSIDE the
 * lazy module (rather than five `dynamic()` calls at the call site) is what
 * makes these five panels one chunk and one runtime-map entry.
 */
export function SecondaryPanelSwitch({
  section,
  api,
  advanced,
  power,
  isOwner,
}: {
  readonly section: Exclude<SettingsSection, 'appearance'>;
  readonly api: AccountPreferencesApi;
  readonly advanced: boolean;
  readonly power: boolean;
  readonly isOwner: boolean;
}): React.ReactElement {
  switch (section) {
    case 'account':
      return <AccountPanel advanced={advanced} />;
    case 'security':
      return <SecurityPanel isOwner={isOwner} />;
    case 'notifications':
      return <NotificationsPanel api={api} advanced={advanced} />;
    case 'experience':
      return <ExperiencePanel api={api} />;
    case 'advanced':
      return <AdvancedPanel api={api} advanced={advanced} power={power} />;
  }
}
