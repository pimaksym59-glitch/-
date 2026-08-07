'use client';

/**
 * InsertDialog (FS6 T-FS6.5). Turns an assistant answer into a channel draft:
 * channel (active preselected) + editable title + honest content preview +
 * optional "queue generation". Form-width ONYX Dialog; the mutation is
 * confirmed, never optimistic.
 */
import { useEffect, useState } from 'react';
import { useChannels } from '@/entities/channel';
import { useUiStore, selectActiveChannel } from '@/shared/lib/store';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { useInsertToChannel } from '../model/useInsert';

const TITLE_MAX = 80;

/** Feature-local title suggestion (first content line, trimmed). */
export function suggestTitle(content: string): string {
  const firstLine =
    content
      .split('\n', 1)[0]
      ?.replace(/^[#>\-*\s]+/, '')
      .trim() ?? '';
  const base = firstLine || 'Draft from chat';
  return base.length > TITLE_MAX ? `${base.slice(0, TITLE_MAX - 1)}…` : base;
}

export interface InsertDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The assistant message content being inserted. */
  readonly content: string;
}

export function InsertDialog({
  open,
  onOpenChange,
  content,
}: InsertDialogProps): React.ReactElement {
  const channels = useChannels();
  const activeChannelId = useUiStore(selectActiveChannel);
  const [channelId, setChannelId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [generate, setGenerate] = useState(false);
  const { insert, isPending } = useInsertToChannel({ onCreated: () => onOpenChange(false) });

  // Re-seed the form whenever the dialog opens for a (new) message.
  useEffect(() => {
    if (!open) return;
    setTitle(suggestTitle(content));
    setChannelId(activeChannelId ?? channels.data?.[0]?.id ?? '');
    setGenerate(false);
  }, [open, content, activeChannelId, channels.data]);

  const canSubmit = channelId !== '' && title.trim() !== '' && !isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Insert to channel"
      description="Creates a real draft in the channel’s content queue."
      width="form"
      primaryAction={
        <Button
          loading={isPending}
          disabled={!canSubmit}
          onClick={() => {
            void insert({ channelId, title: title.trim(), body: content, generate });
          }}
        >
          Create draft
        </Button>
      }
      secondaryAction={
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Channel"
          items={(channels.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          value={channelId}
          onValueChange={setChannelId}
          loading={channels.isPending}
        />
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
        />
        <div>
          <p className="text-[13px] font-medium text-secondary">Content</p>
          <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border-subtle bg-inset p-3 text-[13px] text-primary">
            {content}
          </p>
        </div>
        <Checkbox
          label="Queue text generation after creating (runs the pipeline)"
          checked={generate}
          onCheckedChange={(checked) => setGenerate(checked === true)}
        />
      </div>
    </Dialog>
  );
}
