'use client';

/**
 * Channel / Workspace switcher (D1 §6.3, `⌘.`) — REAL since FS5: channels come
 * from `entities/channel`; the selection lives in the UI store (cookie-backed,
 * SSR-applied) and re-scopes every channel-keyed query. The FS2 interaction
 * model (trigger, keyboard access, `⌘.`) is unchanged. Empty state stays
 * honest and links forward to the Channels workspace.
 */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronsUpDown, Radio } from 'lucide-react';
import { useChannels } from '@/entities/channel';
import { useUiStore, selectActiveChannel } from '@/shared/lib/store';
import { useShortcuts } from '@/shared/providers';
import { Badge } from '@/shared/ui/badge';
import { Kbd } from '@/shared/ui/kbd';
import { Spinner } from '@/shared/ui/spinner';

export function ChannelSwitcher(): React.ReactElement {
  const activeChannelId = useUiStore(selectActiveChannel);
  const setActiveChannel = useUiStore((state) => state.setActiveChannel);
  const { switcherOpen, setSwitcherOpen } = useShortcuts();
  const channels = useChannels();

  const active = channels.data?.find((channel) => channel.id === activeChannelId) ?? null;

  return (
    <DropdownMenu.Root open={switcherOpen} onOpenChange={setSwitcherOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Switch channel"
          className="flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-sm text-primary transition-colors hover:bg-interactive-subtle"
        >
          <Radio aria-hidden className="size-4 shrink-0 text-secondary" />
          <span className="truncate">{active?.name ?? 'All channels'}</span>
          <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-tertiary" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="onyx-floating z-[var(--z-overlay)] w-[min(320px,92vw)] rounded-lg p-1.5"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            Channels
          </DropdownMenu.Label>

          {channels.isPending ? (
            <div className="flex items-center gap-2 px-2 py-3 text-[13px] text-secondary">
              <Spinner size={14} label="Loading channels" /> Loading channels…
            </div>
          ) : channels.isError ? (
            <p role="alert" className="px-2 py-3 text-[13px] text-danger">
              Couldn’t load channels.
            </p>
          ) : (channels.data?.length ?? 0) === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-sm text-secondary">No channels yet.</p>
              <p className="mt-1 text-[13px] text-secondary">
                Create your first channel in the Channels workspace.
              </p>
            </div>
          ) : (
            channels.data?.map((channel) => (
              <DropdownMenu.Item
                key={channel.id}
                onSelect={() => setActiveChannel(channel.id)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary outline-none data-[highlighted]:bg-interactive-subtle"
              >
                <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                {channel.paused ? <Badge tone="neutral">Paused</Badge> : null}
                {channel.id === activeChannelId ? (
                  <Check
                    aria-hidden
                    className="size-4 shrink-0 text-[color:var(--interactive-default)]"
                  />
                ) : null}
              </DropdownMenu.Item>
            ))
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--border-subtle)]" />
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-secondary">
            <span>Open switcher</span>
            <Kbd keys={['⌘', '.']} />
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
