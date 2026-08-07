'use client';

/**
 * RotateKeyDialog (FS12 T-FS12.11) — the write-only secret field.
 *
 * Every property here is a security decision, not styling:
 *  - `type="password"` so the value is not shoulder-readable, and
 *    `autoComplete="off"` so no password manager stores a platform key;
 *  - the field is NEVER pre-filled — there is nothing to pre-fill it with, and
 *    a placeholder that looked like a key would be a lie;
 *  - the value lives in component state ONLY, and is cleared on submit and on
 *    close (plan §3.4 — the one state kind that may not persist anywhere);
 *  - the dialog states plainly that the console cannot read a key back.
 */
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

export function RotateKeyDialog({
  open,
  slotName,
  pending,
  onOpenChange,
  onSubmit,
}: {
  readonly open: boolean;
  readonly slotName: string;
  readonly pending: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (value: string) => void;
}): React.ReactElement {
  const [value, setValue] = useState('');

  function close(next: boolean): void {
    if (!next) setValue('');
    onOpenChange(next);
  }

  function submit(): void {
    if (value.trim() === '') return;
    onSubmit(value);
    // Cleared immediately: the request already owns the only copy.
    setValue('');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={`Rotate the ${slotName} key`}
      description="The key is submitted and never returned. The console cannot display, export or log it (§R10.4, §R12.2)."
      width="form"
      primaryAction={
        <Button variant="primary" loading={pending} disabled={value.trim() === ''} onClick={submit}>
          Store key
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
          submit();
        }}
      >
        <Input
          label="New key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          helper="Paste the key from your provider. It is sent once and stored by the backend’s secret manager."
          disabled={pending}
        />
        <p className="text-[13px] text-secondary">
          After saving, this screen can only tell you that a key is configured — never which one.
          Providers run on deterministic fakes until a key exists (§R2.10).
        </p>
      </form>
    </Dialog>
  );
}
