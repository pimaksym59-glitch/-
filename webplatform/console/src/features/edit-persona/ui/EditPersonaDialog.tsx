'use client';

/**
 * EditPersonaDialog (FS8 T-FS8.6). LAZY: mounted on intent only. Edits the
 * persona's own VOICE fields; `style_features` are derived by the backend and
 * are explicitly read-only here (§R9.12). Archive is a separate, confirmed
 * action. The dialog states the audit truth (§R10.8) without pretending to
 * show an audit trail it cannot read, and surfaces a 409 as an honest
 * "changed elsewhere" state (§R4.2).
 */
import { useEffect, useState } from 'react';
import type { PersonaVM } from '@/entities/persona';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import type { PersonaUpdateRequestWireDTO } from '@/shared/types';
import { useEditPersona } from '../model/useEditPersona';

export interface EditPersonaDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly persona: PersonaVM;
  readonly channelId: string;
  readonly onDone?: () => void;
}

export function EditPersonaDialog({
  open,
  onOpenChange,
  persona,
  channelId,
  onDone,
}: EditPersonaDialogProps): React.ReactElement {
  const { save, isSaving, conflict, archive, isArchiving } = useEditPersona({
    onSaved: () => {
      onOpenChange(false);
      onDone?.();
    },
  });

  const [name, setName] = useState(persona.name);
  const [manner, setManner] = useState(persona.mannerOfSpeech ?? '');
  const [greeting, setGreeting] = useState(persona.greetingStyle ?? '');
  const [farewell, setFarewell] = useState(persona.farewellStyle ?? '');
  const [storytelling, setStorytelling] = useState(persona.storytellingStyle ?? '');
  const [confirmArchive, setConfirmArchive] = useState(false);

  // Re-seed whenever the dialog opens for a (new) persona.
  useEffect(() => {
    if (!open) return;
    setName(persona.name);
    setManner(persona.mannerOfSpeech ?? '');
    setGreeting(persona.greetingStyle ?? '');
    setFarewell(persona.farewellStyle ?? '');
    setStorytelling(persona.storytellingStyle ?? '');
    setConfirmArchive(false);
  }, [open, persona]);

  function submit(): void {
    const patch: PersonaUpdateRequestWireDTO = {
      name: name.trim(),
      manner_of_speech: manner.trim(),
      greeting_style: greeting.trim(),
      farewell_style: farewell.trim(),
      storytelling_style: storytelling.trim(),
      // Optimistic lock echoed only when the wire carried one (§R4.2).
      ...(persona.version !== null ? { version: persona.version } : {}),
    };
    save({ personaId: persona.id, channelId, patch });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${persona.name}`}
      description="Changes the voice used for future generations. Recorded in the audit log."
      width="form"
      primaryAction={
        <Button loading={isSaving} disabled={name.trim() === ''} onClick={submit}>
          Save voice
        </Button>
      }
      secondaryAction={
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {conflict ? (
          <p
            role="alert"
            className="rounded-lg border border-border-default bg-inset p-3 text-sm text-danger"
          >
            This persona changed in another session. Close and reopen it to load the current voice
            before applying your edit — nothing was overwritten.
          </p>
        ) : null}

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea
          label="Manner of speech"
          value={manner}
          onChange={(e) => setManner(e.target.value)}
          rows={2}
        />
        <Textarea
          label="Storytelling"
          value={storytelling}
          onChange={(e) => setStorytelling(e.target.value)}
          rows={2}
        />
        <Input label="Greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} />
        <Input label="Farewell" value={farewell} onChange={(e) => setFarewell(e.target.value)} />

        <p className="text-[13px] text-secondary">
          Style features ({persona.styleFeatures.length}) are derived by the backend from published
          posts (§R9.12) and are not edited here.
        </p>

        <div className="border-t border-border-subtle pt-3">
          {confirmArchive ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 text-[13px] text-secondary">
                Archive “{persona.name}”? It stays visible as history and stops shaping new posts.
              </p>
              <Button
                variant="danger"
                size="sm"
                loading={isArchiving}
                onClick={() => archive(persona.id, channelId)}
              >
                Archive persona
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(false)}>
                Keep
              </Button>
            </div>
          ) : persona.archived ? (
            <p className="text-[13px] text-secondary">This persona is already archived.</p>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(true)}>
              Archive this persona…
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
