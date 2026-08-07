'use client';

/**
 * Chat History rail (FS6 T-FS6.6 — D3 §5 rail + §6 basics). Local-first
 * conversations: searchable (title/snippet), pinned-first, `j/k` row
 * navigation + `↵` open (the FS5 queue convention), per-row menu with
 * rename / pin / delete (delete is guarded — D3 §6). The browser-local truth
 * is stated honestly at the foot of the rail.
 */
import { Pin, Plus, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  searchConversations,
  useConversationActions,
  useConversations,
  type ConversationVM,
} from '@/entities/conversation';
import { formatRelativeTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Menu, MenuItem } from '@/shared/ui/menu';
import { SearchInput } from '@/shared/ui/search-input';

export interface HistoryRailProps {
  readonly activeId: string | null;
  /** Close the containing sheet (mobile) after navigating. */
  readonly onNavigated?: () => void;
}

export function HistoryRail({ activeId, onNavigated }: HistoryRailProps): React.ReactElement {
  const router = useRouter();
  const conversations = useConversations();
  const { renameConversation, setPinned, removeConversation } = useConversationActions();
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<ConversationVM | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<ConversationVM | null>(null);

  const visible = searchConversations(conversations, query);

  function open(conversation: ConversationVM): void {
    router.push(`/chat/${conversation.id}`);
    onNavigated?.();
  }

  function onRowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.key !== 'j' && event.key !== 'k') return;
    event.preventDefault();
    const next = event.key === 'j' ? index + 1 : index - 1;
    event.currentTarget
      .closest('ul')
      ?.querySelector<HTMLButtonElement>(`button[data-row-index="${next}"]`)
      ?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          router.push('/chat');
          onNavigated?.();
        }}
      >
        <Plus aria-hidden className="size-3.5" />
        New chat
      </Button>
      <SearchInput
        label="Search conversations"
        hideLabel
        size="sm"
        placeholder="Search conversations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {visible.length === 0 ? (
        <p className="px-1 py-4 text-[13px] text-secondary">
          {conversations.length === 0
            ? 'No conversations yet.'
            : 'No conversations match the search.'}
        </p>
      ) : (
        <ul aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto">
          {visible.map((conversation, index) => (
            <li key={conversation.id} className="group flex items-center gap-1">
              <button
                type="button"
                data-row-index={index}
                aria-current={conversation.id === activeId ? 'true' : undefined}
                onClick={() => open(conversation)}
                onKeyDown={(event) => onRowKeyDown(event, index)}
                className="min-w-0 flex-1 rounded-md px-2 py-2 text-left transition-colors hover:bg-interactive-subtle focus-visible:bg-interactive-subtle aria-[current=true]:bg-interactive-subtle"
              >
                <span className="flex items-center gap-1.5">
                  {conversation.pinned ? (
                    <Pin aria-label="Pinned" className="size-3 shrink-0 text-secondary" />
                  ) : null}
                  <span className="truncate text-sm font-medium text-primary">
                    {conversation.title}
                  </span>
                  <time
                    dateTime={conversation.updatedAt}
                    className="ml-auto shrink-0 text-[11px] text-secondary"
                  >
                    {formatRelativeTime(conversation.updatedAt)}
                  </time>
                </span>
                {conversation.snippet ? (
                  <span className="block truncate text-[13px] text-secondary">
                    {conversation.snippet}
                  </span>
                ) : null}
              </button>
              <Menu
                label={`Conversation actions: ${conversation.title}`}
                trigger={
                  <button
                    type="button"
                    aria-label={`Conversation actions: ${conversation.title}`}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-secondary opacity-0 transition-opacity hover:bg-interactive-subtle focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <MoreHorizontal aria-hidden className="size-4" />
                  </button>
                }
              >
                <MenuItem
                  onSelect={() => {
                    setRenaming(conversation);
                    setRenameValue(conversation.title);
                  }}
                >
                  Rename
                </MenuItem>
                <MenuItem onSelect={() => setPinned(conversation.id, !conversation.pinned)}>
                  {conversation.pinned ? 'Unpin' : 'Pin'}
                </MenuItem>
                <MenuItem destructive onSelect={() => setDeleting(conversation)}>
                  Delete
                </MenuItem>
              </Menu>
            </li>
          ))}
        </ul>
      )}

      <p className="px-1 text-[11px] leading-4 text-secondary">
        Conversations live in this browser only — the platform stores none of them yet.
      </p>

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
        title="Rename conversation"
        primaryAction={
          <Button
            disabled={renameValue.trim() === ''}
            onClick={() => {
              if (renaming) renameConversation(renaming.id, renameValue.trim());
              setRenaming(null);
            }}
          >
            Rename
          </Button>
        }
        secondaryAction={
          <Button variant="ghost" onClick={() => setRenaming(null)}>
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
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete conversation?"
        description={`“${deleting?.title ?? ''}” and its messages are removed from this browser. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleting) {
            removeConversation(deleting.id);
            if (deleting.id === activeId) router.push('/chat');
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
