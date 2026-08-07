'use client';

/**
 * CreateUserDialog (FS12 T-FS12.6). The contract's `POST /users` is a CREATE,
 * so the wording is "Create user" everywhere — there is no invitation, no email
 * and no pending state, and claiming otherwise would be a fabrication
 * (plan §5.2 D7).
 *
 * The role list is the frozen `user_role` enum (§R4.13). No password field
 * exists here: the contract does not document one on this call, and a password
 * is a secret the console must never carry (SEC-6).
 */
import { useState } from 'react';
import { ROLES } from '@/shared/config/rbac';
import { ROLE_LABELS } from '@/entities/platform-user';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';

export function CreateUserDialog({
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  readonly open: boolean;
  readonly pending: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (email: string, role: string) => void;
}): React.ReactElement {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('viewer');
  const invalid = email.trim() === '' || !email.includes('@');

  function close(next: boolean): void {
    if (!next) {
      setEmail('');
      setRole('viewer');
    }
    onOpenChange(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title="Create user"
      description="The backend creates the account and records the action in the audit log (§R10.8)."
      width="form"
      primaryAction={
        <Button
          variant="primary"
          loading={pending}
          disabled={invalid}
          onClick={() => onSubmit(email.trim(), role)}
        >
          Create user
        </Button>
      }
      secondaryAction={
        <Button variant="ghost" onClick={() => close(false)}>
          Cancel
        </Button>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) onSubmit(email.trim(), role);
        }}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
        <Select
          label="Role"
          items={ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
          value={role}
          onValueChange={setRole}
          disabled={pending}
        />
        <p className="text-[13px] text-secondary">
          No invitation is sent — the contract has no invite flow. Share credentials through your
          own channel, and rotate them there.
        </p>
      </form>
    </Dialog>
  );
}
