'use client';

/**
 * SessionsPanel (FS12) — the honest shape of D3 §14's Sessions tab.
 *
 * The contract carries `POST /auth/sessions/revoke {user_id}` and **nothing
 * else**: there is no session-inventory endpoint and no `sessions` table among
 * the frozen 25 (plan §5.2 D6). So there is no device list, no last-seen, no
 * IP and no "current session" marker — those would all be invented — and what
 * remains is real and useful: ending every session a given user holds.
 *
 * The action is guarded and confirmed. It is not destructive to data, but it is
 * disruptive to a person, which D2 §13.10 treats the same way.
 */
import { useState } from 'react';
import type { PlatformUserVM } from '@/entities/platform-user';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/dialog';
import { Select } from '@/shared/ui/select';

export function SessionsPanel({
  users,
  canManage,
  revokePending,
  onRevoke,
}: {
  readonly users: readonly PlatformUserVM[];
  readonly canManage: boolean;
  readonly revokePending: string | null;
  readonly onRevoke: (userId: string) => void;
}): React.ReactElement {
  const [target, setTarget] = useState<string>(users[0]?.id ?? '');
  const [confirming, setConfirming] = useState(false);
  const selected = users.find((user) => user.id === target) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <section className="onyx-raised rounded-xl border border-border-subtle p-5">
        <h2 className="text-sm font-semibold text-primary">End a user’s sessions</h2>
        <p className="mt-1 max-w-[70ch] text-[13px] text-secondary">
          Forced session termination is part of the platform’s auth requirements (§R10.4). The
          backend ends every session the account holds; the user signs in again next time.
        </p>

        {canManage ? (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="w-[18rem]">
              <Select
                label="User"
                items={users.map((user) => ({ value: user.id, label: user.email }))}
                value={target}
                onValueChange={setTarget}
              />
            </div>
            <Button
              variant="secondary"
              disabled={selected === null || revokePending === target}
              onClick={() => setConfirming(true)}
            >
              Revoke sessions
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-secondary">
            Your role cannot revoke sessions — the contract reserves this for the owner.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-primary">Why there is no session list</h2>
        <p className="mt-2 max-w-[72ch] text-[13px] leading-6 text-secondary">
          The API exposes a revoke call and no way to enumerate sessions — there is no sessions
          resource and no sessions table. A device list, a last-seen time or an “active now” marker
          would be invented, so none is shown. Revocation still works, because it does not need the
          list.
        </p>
      </section>

      {confirming && selected ? (
        <ConfirmDialog
          open
          onOpenChange={setConfirming}
          title={`Revoke every session for ${selected.email}?`}
          description="They are signed out everywhere and will need to sign in again. The action is recorded in the audit log."
          confirmLabel="Revoke sessions"
          destructive
          onConfirm={() => {
            onRevoke(selected.id);
            setConfirming(false);
          }}
        />
      ) : null}
    </div>
  );
}
