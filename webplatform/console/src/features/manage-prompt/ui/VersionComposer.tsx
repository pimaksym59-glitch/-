'use client';

/**
 * Version composer (FS10 T-FS10.6 — D3 §10 "version editor"). LAZY: mounted on
 * the "New version" intent only (plan §3.1/§3.6).
 *
 * What it is: a plain-text editor whose Save creates a NEW VERSION
 * (`POST /prompts`, §R10.6). What it deliberately is not:
 *  - **no variable helpers, no placeholder highlighting** — the contract has no
 *    variables field and documents no templating syntax (plan §5.2 D5);
 *  - **no promote-on-save** — no such call exists (§5.2 D2);
 *  - **no overwrite** — the previous version is untouched by construction.
 *
 * Unsaved work survives a reload through the feature-owned draft module (D4 §7);
 * this component never touches storage itself, and the draft is cleared only by
 * a successful save or an explicit discard.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PROMPT_TYPE_LABELS, type PromptGroupVM, type PromptVersionVM } from '@/entities/prompt';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Select } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { clearPromptDraft, readPromptDraft, writePromptDraft } from '../model/promptDraft';
import { versionSchema } from '../model/schema';
import { useCreatePromptVersion } from '../model/useCreatePromptVersion';

export function VersionComposer({
  open,
  onOpenChange,
  groups,
  presetType,
  presetFrom,
  onCreated,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly groups: readonly PromptGroupVM[];
  /** The type whose chain the user came from, if any. */
  readonly presetType: string | null;
  /** The version the editor starts from (an edit IS a new version). */
  readonly presetFrom: PromptVersionVM | null;
  readonly onCreated: (created: PromptVersionVM) => void;
}): React.ReactElement {
  const { create, isPending } = useCreatePromptVersion();

  // Known enum values (DATABASE_SPEC §prompt_type) plus every type the wire
  // actually returned — so an unrecognised type can still gain a version.
  const items = useMemo(() => {
    const seen = new Map<string, string>();
    for (const [value, label] of Object.entries(PROMPT_TYPE_LABELS)) seen.set(value, label);
    for (const group of groups) if (!seen.has(group.type)) seen.set(group.type, group.type);
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [groups]);

  const [type, setType] = useState(presetType ?? items[0]?.value ?? 'other');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // On open: prefill from the version being viewed, then let a saved draft win
  // (it is the user's own unsaved work — D4 §7).
  useEffect(() => {
    if (!open) return;
    const nextType = presetType ?? items[0]?.value ?? 'other';
    setType(nextType);
    const draft = readPromptDraft(nextType);
    setRestored(draft !== null);
    setText(draft?.text ?? presetFrom?.text ?? '');
    setError(null);
  }, [open, presetType, presetFrom, items]);

  function updateText(next: string): void {
    setText(next);
    writePromptDraft({ type, text: next });
  }

  // `⌘S` saves while the composer is open (D3 §10 `⌘s save version`). Scoped to
  // this dialog — the generic `detail-save` row stays inactive because other
  // detail screens have no save (the catalogue says so).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      submitRef.current?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // A ref so the ⌘S listener always calls the CURRENT submit (state closure).
  const submitRef = useRef<(() => void) | null>(null);

  function submit(): void {
    const parsed = versionSchema.safeParse({ type, text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'This version cannot be saved.');
      return;
    }
    setError(null);
    create(
      {
        type: parsed.data.type,
        text: parsed.data.text,
        chainRowId: presetFrom?.id ?? null,
      },
      (created) => {
        onOpenChange(false);
        onCreated(created);
      },
    );
  }

  submitRef.current = submit;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New prompt version"
      description="Saving creates a new version. The previous one stays in the history — the contract has no update and no delete."
      width="form"
      primaryAction={
        <Button onClick={submit} loading={isPending}>
          Save as new version
        </Button>
      }
      secondaryAction={
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Prompt type"
          items={items}
          value={type}
          onValueChange={(next) => {
            setType(next);
            const draft = readPromptDraft(next);
            setRestored(draft !== null);
            if (draft) setText(draft.text);
          }}
          helper="A prompt's identity is its type — the contract carries no separate name."
          disabled={isPending}
        />
        <Textarea
          label="Version text"
          value={text}
          onChange={(event) => updateText(event.target.value)}
          rows={12}
          disabled={isPending}
          {...(error !== null ? { error } : {})}
          helper={
            restored
              ? 'Restored from your unsaved draft on this device.'
              : 'Stored as written. The backend assembles the runtime prompt from this plus persona, style rules and examples (§R5.3).'
          }
        />
        {text.trim() !== '' ? (
          <button
            type="button"
            className="self-start text-[13px] font-medium text-secondary hover:text-primary hover:underline"
            onClick={() => {
              clearPromptDraft(type);
              setText(presetFrom?.text ?? '');
              setRestored(false);
            }}
          >
            Discard draft
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}
