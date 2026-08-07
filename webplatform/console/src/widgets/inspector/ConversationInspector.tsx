'use client';

/**
 * Conversation inspector view (FS6 T-FS6.7). Metadata for one local-first
 * thread: model, message count, aggregated wire cost, created/updated —
 * plus pin/rename/delete (mutations gated on `content.edit`). The
 * browser-local truth is stated (approved deviation D1).
 */
import { useState } from 'react';
import { useConversation, useConversationActions } from '@/entities/conversation';
import { useInspector } from '@/shared/hooks';
import { formatCost, formatDate } from '@/shared/lib/format';
import { useCan } from '@/shared/providers';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0">
      <dt className="text-[13px] text-secondary">{label}</dt>
      <dd className="text-right text-sm text-primary">{children}</dd>
    </div>
  );
}

export function ConversationInspector({ id }: { readonly id: string }): React.ReactElement {
  const conversation = useConversation(id);
  const { renameConversation, setPinned, removeConversation } = useConversationActions();
  const can = useCan();
  const { close } = useInspector();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!conversation) {
    return (
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          Conversation
        </p>
        <p className="mt-2 text-sm text-secondary">
          This conversation isn’t in this browser — local threads don’t follow you across devices
          yet.
        </p>
      </div>
    );
  }

  const canEdit = can('content.edit');

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
          Conversation
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-primary">
            {conversation.title}
          </h2>
          {conversation.pinned ? <Badge tone="neutral">Pinned</Badge> : null}
        </div>
      </header>

      <dl>
        <Row label="Model">{conversation.model}</Row>
        <Row label="Messages">{conversation.messageCount}</Row>
        <Row label="Cost (reported)">{formatCost(conversation.costUsd)}</Row>
        <Row label="Created">
          <time dateTime={conversation.createdAt}>{formatDate(conversation.createdAt)}</time>
        </Row>
        <Row label="Updated">
          <time dateTime={conversation.updatedAt}>{formatDate(conversation.updatedAt)}</time>
        </Row>
        <Row label="Storage">This browser only</Row>
      </dl>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setRenameValue(conversation.title);
              setRenaming(true);
            }}
          >
            Rename
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPinned(conversation.id, !conversation.pinned)}
          >
            {conversation.pinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        </div>
      ) : null}

      <Dialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename conversation"
        primaryAction={
          <Button
            disabled={renameValue.trim() === ''}
            onClick={() => {
              renameConversation(conversation.id, renameValue.trim());
              setRenaming(false);
            }}
          >
            Rename
          </Button>
        }
        secondaryAction={
          <Button variant="ghost" onClick={() => setRenaming(false)}>
            Cancel
          </Button>
        }
      >
        <Input
          label="Title"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          maxLength={64}
        />
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete conversation?"
        description="The thread and its messages are removed from this browser. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          removeConversation(conversation.id);
          setDeleting(false);
          close();
        }}
      />
    </div>
  );
}
