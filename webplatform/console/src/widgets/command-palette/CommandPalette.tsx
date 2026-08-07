'use client';

/**
 * Command Palette (D1 §6.4 / D2 §13.14) — the primary navigator.
 * Modes by prefix: `(none)` fuzzy · `>` commands · `@` go-to · `#` search
 * entities · `/` Ask AI. Fully keyboard-driven, RBAC-filtered (never lists an
 * action the role cannot perform), remembers recents.
 *
 * `#` is REAL for KNOWLEDGE since FS7, for MEMORY since FS8 and for IMAGES
 * since FS9 — three DELIBERATELY separate groups (§R9.3 keeps knowledge and
 * memory apart; images are a third domain again). Each searches the active
 * channel's loaded entries (list filtering — honestly distinct from backend
 * retrieval) and deep-links into its workspace; posts/logs/audit keep the
 * honest seam copy until their workspaces land. `/` is REAL since FS6: the
 * query hands off to a new chat conversation and is sent there — offered only
 * to roles with `content.edit` (RBAC-filtered like every action).
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchActors, filterActors } from '@/entities/actor';
import { fetchDocuments, filterDocuments } from '@/entities/document';
import { fetchImages, filterImages, imageKeys } from '@/entities/image';
import { fetchQueueTasks, queueKeys, QUEUE_STALE_MS } from '@/entities/job-queue';
import { fetchPersonas, filterPersonas } from '@/entities/persona';
import { fetchPrompts, filterPromptGroups, promptKeys, PROMPT_STALE_MS } from '@/entities/prompt';
import { queryKeys } from '@/shared/config/query-keys';
import { ROUTE_LIST, type RouteDef } from '@/shared/config/routes';
import { selectActiveChannel, selectRecents, useUiStore } from '@/shared/lib/store';
import { useCan, useCommandPalette, useTheme } from '@/shared/providers';
import { getIcon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';

type PaletteMode = 'all' | 'commands' | 'goto' | 'search' | 'ai';

interface PaletteCommand {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly run: () => void;
}

export function paletteModeOf(value: string): { mode: PaletteMode; query: string } {
  if (value.startsWith('>')) return { mode: 'commands', query: value.slice(1).trim() };
  if (value.startsWith('@')) return { mode: 'goto', query: value.slice(1).trim() };
  if (value.startsWith('#')) return { mode: 'search', query: value.slice(1).trim() };
  if (value.startsWith('/')) return { mode: 'ai', query: value.slice(1).trim() };
  return { mode: 'all', query: value.trim() };
}

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-secondary aria-selected:bg-interactive-subtle aria-selected:text-primary';
const GROUP_CLASS =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-secondary';

export function CommandPalette(): React.ReactElement {
  const { paletteOpen, closePalette, setCheatsheetOpen, paletteInitialValue } = useCommandPalette();
  const { toggleTheme, toggleDensity } = useTheme();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const pushRecent = useUiStore((s) => s.pushRecent);
  const recents = useUiStore(selectRecents);
  const activeChannelId = useUiStore(selectActiveChannel);
  const can = useCan();
  const router = useRouter();
  const [value, setValue] = useState('');

  // FS7: the topbar search entry opens the palette pre-seeded (e.g. `#`).
  useEffect(() => {
    if (paletteOpen && paletteInitialValue !== null) setValue(paletteInitialValue);
  }, [paletteOpen, paletteInitialValue]);

  const { mode, query } = paletteModeOf(value);

  // FS7 `#` — on-demand, channel-scoped document search sharing the entity
  // cache (same key/fetcher as useDocuments; fetch fires only in `#` mode).
  const documents = useQuery({
    queryKey: queryKeys.documents(activeChannelId ?? 'none'),
    queryFn: ({ signal }) => fetchDocuments(activeChannelId ?? '', signal),
    enabled: mode === 'search' && activeChannelId !== null,
    staleTime: 30_000,
  });
  const knowledgeHits = useMemo(
    () => (mode === 'search' ? filterDocuments(documents.data ?? [], query, null) : []),
    [mode, query, documents.data],
  );

  // FS8 `#` — the MEMORY scope, deliberately a SEPARATE group from Knowledge
  // (§R9.3 "не смешивать"): personas and actors of the active channel, fetched
  // on demand through the same entity caches the screens use.
  const personas = useQuery({
    queryKey: queryKeys.personas(activeChannelId ?? 'none'),
    queryFn: ({ signal }) => fetchPersonas(activeChannelId ?? '', signal),
    enabled: mode === 'search' && activeChannelId !== null,
    staleTime: 30_000,
  });
  const actors = useQuery({
    queryKey: queryKeys.actors(activeChannelId ?? 'none'),
    queryFn: ({ signal }) => fetchActors(activeChannelId ?? '', signal),
    enabled: mode === 'search' && activeChannelId !== null,
    staleTime: 60_000,
  });
  const personaHits = useMemo(
    () => (mode === 'search' ? filterPersonas(personas.data ?? [], query) : []),
    [mode, query, personas.data],
  );
  const actorHits = useMemo(
    () => (mode === 'search' ? filterActors(actors.data ?? [], query) : []),
    [mode, query, actors.data],
  );
  const memoryHitCount = personaHits.length + actorHits.length;

  // FS9 `#` — the IMAGES scope, a third separate group (plan §2). Entity-local
  // key, same fetcher the Studio uses; fetch fires only on `#` mode entry.
  const images = useQuery({
    queryKey: imageKeys.list(activeChannelId ?? 'none'),
    queryFn: ({ signal }) => fetchImages(activeChannelId ?? '', signal),
    enabled: mode === 'search' && activeChannelId !== null,
    staleTime: 30_000,
  });
  const imageHits = useMemo(
    () => (mode === 'search' ? filterImages(images.data ?? [], query) : []),
    [mode, query, images.data],
  );

  // FS10 `#` — the PROMPTS scope, a fourth separate group (plan §2). Note the
  // missing `activeChannelId`: prompts are platform-wide, so this query has no
  // channel dimension and never re-runs on a channel switch (requirement A).
  const prompts = useQuery({
    queryKey: promptKeys.list(),
    queryFn: ({ signal }) => fetchPrompts(null, signal),
    enabled: mode === 'search',
    staleTime: PROMPT_STALE_MS,
  });
  const promptHits = useMemo(
    () => (mode === 'search' ? filterPromptGroups(prompts.data ?? [], query) : []),
    [mode, query, prompts.data],
  );

  // FS12 `#` — the PLATFORM scope, a FIFTH separate group. Like prompts it is
  // platform-wide (no channel dimension), and it is gated on `platform.manage`
  // because the tasks group is owner/admin in the contract — the palette never
  // lists what a role cannot reach (D1 §6.4, SEC-7).
  const canPlatform = can('platform.manage');
  const tasks = useQuery({
    queryKey: queueKeys.list(null, null, null),
    queryFn: ({ signal }) => fetchQueueTasks(null, null, null, signal),
    enabled: mode === 'search' && canPlatform,
    staleTime: QUEUE_STALE_MS,
  });
  const taskHits = useMemo(() => {
    if (mode !== 'search' || !canPlatform) return [];
    const needle = query.trim().toLowerCase();
    const rows = tasks.data ?? [];
    const matched =
      needle === ''
        ? rows
        : rows.filter(
            (task) =>
              task.type.toLowerCase().includes(needle) ||
              task.rawStatus.toLowerCase().includes(needle) ||
              task.id.toLowerCase().includes(needle),
          );
    return matched.slice(0, 6);
  }, [mode, query, tasks.data, canPlatform]);

  const close = useCallback(() => {
    closePalette();
    setValue('');
  }, [closePalette]);

  const navigate = useCallback(
    (path: string) => {
      pushRecent(`route:${path}`);
      close();
      router.push(path);
    },
    [router, close, pushRecent],
  );

  const routes = useMemo<readonly RouteDef[]>(
    () => ROUTE_LIST.filter((r) => r.nav && (!r.permission || can(r.permission))),
    [can],
  );

  // Filtering is manual because the raw input carries the mode prefix
  // (`@analytics`), which cmdk's scorer would never match against item values.
  const matches = useCallback(
    (haystack: string) => query === '' || haystack.toLowerCase().includes(query.toLowerCase()),
    [query],
  );

  const commands = useMemo<readonly PaletteCommand[]>(
    () => [
      {
        id: 'cmd:theme',
        label: 'Toggle light/dark theme',
        icon: 'sun',
        run: () => {
          toggleTheme();
          close();
        },
      },
      {
        id: 'cmd:density',
        label: 'Toggle comfortable/compact density',
        icon: 'layout-dashboard',
        run: () => {
          toggleDensity();
          close();
        },
      },
      {
        id: 'cmd:sidebar',
        label: 'Toggle sidebar rail',
        icon: 'layout-dashboard',
        run: () => {
          toggleSidebar();
          close();
        },
      },
      {
        id: 'cmd:shortcuts',
        label: 'Show keyboard shortcuts',
        icon: 'file-text',
        run: () => {
          close();
          setCheatsheetOpen(true);
        },
      },
      ...(can('content.edit')
        ? [
            {
              id: 'cmd:new-chat',
              label: 'New chat',
              icon: 'message-square',
              run: () => {
                pushRecent('route:/chat');
                close();
                router.push('/chat');
              },
            },
          ]
        : []),
    ],
    [toggleTheme, toggleDensity, toggleSidebar, setCheatsheetOpen, close, can, pushRecent, router],
  );

  const recentRoutes = useMemo<readonly RouteDef[]>(() => {
    const paths = recents
      .filter((id) => id.startsWith('route:'))
      .map((id) => id.slice('route:'.length));
    return paths
      .map((path) => routes.find((r) => r.path === path))
      .filter((r): r is RouteDef => r !== undefined);
  }, [recents, routes]);

  const visibleRoutes = useMemo(
    () => routes.filter((r) => matches(`${r.label} ${r.path}`)),
    [routes, matches],
  );
  const visibleCommands = useMemo(
    () => commands.filter((c) => matches(c.label)),
    [commands, matches],
  );

  const showNavigate = mode === 'all' || mode === 'goto';
  const showCommands = mode === 'all' || mode === 'commands';
  const hasResults =
    (showNavigate && visibleRoutes.length > 0) || (showCommands && visibleCommands.length > 0);
  const isListMode = showNavigate || showCommands;

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="onyx-scrim fixed inset-0 z-[var(--z-overlay)]" />
        <Dialog.Content
          className="onyx-glass fixed left-1/2 top-[15%] z-[var(--z-overlay)] w-[min(640px,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl"
          aria-label="Command palette"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Type to search. Use &gt; for commands, @ to go to a screen, # to search entities, / to
            ask AI.
          </Dialog.Description>

          <Command label="Command palette" shouldFilter={false}>
            <div className="flex items-center gap-2 border-b border-border-subtle px-4">
              <Command.Input
                // Focusing on open is expected for a command dialog; Radix owns
                // the focus trap and restore (D2 §13.14).
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                value={value}
                onValueChange={setValue}
                placeholder="Search or jump to…    >  commands    @  go to    #  search    /  ask AI"
                // FS14 T-FS14.13: the placeholder is 14px content on a glass
                // overlay — `tertiary` measures 3.6:1 in dark. Usage fix, sixth
                // application of the D2 §17 tone rule; token values untouched.
                className="h-12 w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary"
              />
            </div>

            <Command.List className="max-h-[340px] overflow-y-auto p-2">
              {isListMode && !hasResults ? (
                <div className="px-3 py-6 text-center text-sm text-secondary">No results.</div>
              ) : null}

              {mode === 'all' && query === '' && recentRoutes.length > 0 ? (
                <Command.Group heading="Recent" className={GROUP_CLASS}>
                  {recentRoutes.map((route) => {
                    const Icon = getIcon(route.icon);
                    return (
                      <Command.Item
                        key={`recent-${route.path}`}
                        value={`recent ${route.label}`}
                        onSelect={() => navigate(route.path)}
                        className={ITEM_CLASS}
                      >
                        <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                        <span>{route.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ) : null}

              {showNavigate && visibleRoutes.length > 0 ? (
                <Command.Group heading="Go to" className={GROUP_CLASS}>
                  {visibleRoutes.map((route) => {
                    const Icon = getIcon(route.icon);
                    return (
                      <Command.Item
                        key={route.path}
                        value={`${route.label} ${route.path}`}
                        onSelect={() => navigate(route.path)}
                        className={ITEM_CLASS}
                      >
                        <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                        <span>{route.label}</span>
                        <span className="ml-auto text-[11px] text-secondary">{route.path}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ) : null}

              {showCommands && visibleCommands.length > 0 ? (
                <Command.Group heading="Commands" className={GROUP_CLASS}>
                  {visibleCommands.map((command) => {
                    const Icon = getIcon(command.icon);
                    return (
                      <Command.Item
                        key={command.id}
                        value={command.label}
                        onSelect={command.run}
                        className={ITEM_CLASS}
                      >
                        <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                        <span>{command.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ) : null}

              {mode === 'search' ? (
                <>
                  {activeChannelId === null ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-sm text-secondary">
                        Open a workspace screen first — search is scoped to the active channel.
                      </p>
                    </div>
                  ) : query === '' ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-sm text-secondary">
                        Type to search this channel’s knowledge, memory and images, plus the
                        platform-wide prompt library.
                      </p>
                      <p className="mt-1 text-[13px] text-secondary">
                        Posts, logs and audit become searchable as their workspaces land.
                      </p>
                    </div>
                  ) : documents.isPending || personas.isPending ? (
                    <div className="px-3 py-6 text-center text-sm text-secondary">Loading…</div>
                  ) : knowledgeHits.length === 0 &&
                    memoryHitCount === 0 &&
                    imageHits.length === 0 &&
                    promptHits.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-sm text-secondary">
                        Nothing in knowledge, memory, images or prompts matches “{query}”.
                      </p>
                      <p className="mt-1 text-[13px] text-secondary">
                        This searches loaded entries; posts, logs and audit land with their
                        workspaces.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Knowledge and Memory are DELIBERATELY separate groups
                          (§R9.3 "Knowledge Base ≠ Content Memory"). */}
                      {knowledgeHits.length > 0 ? (
                        <Command.Group heading="Knowledge" className={GROUP_CLASS}>
                          {knowledgeHits.map((doc) => {
                            const Icon = getIcon('book-open');
                            return (
                              <Command.Item
                                key={doc.id}
                                value={`knowledge ${doc.title} ${doc.source}`}
                                onSelect={() => navigate(`/knowledge/${doc.id}`)}
                                className={ITEM_CLASS}
                              >
                                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                                <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-secondary">
                                  {doc.source}
                                </span>
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      ) : null}

                      {memoryHitCount > 0 ? (
                        <Command.Group heading="Memory" className={GROUP_CLASS}>
                          {personaHits.map((persona) => {
                            const Icon = getIcon('brain');
                            return (
                              <Command.Item
                                key={persona.id}
                                value={`memory persona ${persona.name}`}
                                onSelect={() => navigate(`/memory/${persona.id}`)}
                                className={ITEM_CLASS}
                              >
                                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                                <span className="min-w-0 flex-1 truncate">{persona.name}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-secondary">
                                  Persona
                                </span>
                              </Command.Item>
                            );
                          })}
                          {actorHits.map((actor) => {
                            const Icon = getIcon('user');
                            return (
                              <Command.Item
                                key={actor.id}
                                value={`memory actor ${actor.name}`}
                                onSelect={() => navigate(`/memory?inspect=actor:${actor.id}`)}
                                className={ITEM_CLASS}
                              >
                                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                                <span className="min-w-0 flex-1 truncate">{actor.name}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-secondary">
                                  Actor
                                </span>
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      ) : null}

                      {imageHits.length > 0 ? (
                        <Command.Group heading="Images" className={GROUP_CLASS}>
                          {imageHits.map((image) => {
                            const Icon = getIcon('image');
                            return (
                              <Command.Item
                                key={image.id}
                                value={`images ${image.id} ${image.prompt ?? ''}`}
                                onSelect={() => navigate(`/studio/${image.id}`)}
                                className={ITEM_CLASS}
                              >
                                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                                <span className="min-w-0 flex-1 truncate">
                                  {image.prompt ?? image.id}
                                </span>
                                <span className="ml-auto shrink-0 text-[11px] text-secondary">
                                  {image.rawStatus ?? 'Image'}
                                </span>
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      ) : null}

                      {promptHits.length > 0 ? (
                        <Command.Group heading="Prompts" className={GROUP_CLASS}>
                          {promptHits.map((group) => {
                            const Icon = getIcon('library');
                            return (
                              <Command.Item
                                key={group.type}
                                value={`prompts ${group.type} ${group.label}`}
                                onSelect={() =>
                                  navigate(`/prompts/${encodeURIComponent(group.type)}`)
                                }
                                className={ITEM_CLASS}
                              >
                                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                                <span className="min-w-0 flex-1 truncate">{group.label}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-secondary">
                                  v{group.latest.version}
                                </span>
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      ) : null}
                      {taskHits.length > 0 ? (
                        <Command.Group heading="Platform" className={GROUP_CLASS}>
                          {taskHits.map((task) => {
                            const Icon = getIcon('list-checks');
                            return (
                              <Command.Item
                                key={task.id}
                                value={`platform ${task.id} ${task.type} ${task.rawStatus}`}
                                onSelect={() =>
                                  navigate(`/jobs?inspect=task:${encodeURIComponent(task.id)}`)
                                }
                                className={ITEM_CLASS}
                              >
                                <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                                <span className="min-w-0 flex-1 truncate">{task.type}</span>
                                <span className="ml-auto shrink-0 text-[11px] text-secondary">
                                  {task.rawStatus}
                                </span>
                              </Command.Item>
                            );
                          })}
                        </Command.Group>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {mode === 'ai' ? (
                can('content.edit') ? (
                  query === '' ? (
                    <div className="px-3 py-6 text-center">
                      <Sparkles aria-hidden className="mx-auto mb-2 size-5 text-ai" />
                      <p className="text-sm text-secondary">
                        Type your question — it opens a new chat and sends it.
                      </p>
                    </div>
                  ) : (
                    <Command.Group heading="Ask AI" className={GROUP_CLASS}>
                      <Command.Item
                        value={`ask-ai ${query}`}
                        onSelect={() => {
                          pushRecent('route:/chat');
                          close();
                          router.push(`/chat?q=${encodeURIComponent(query)}`);
                        }}
                        className={ITEM_CLASS}
                      >
                        <Sparkles aria-hidden className="size-4 text-ai" />
                        <span className="truncate">Ask AI: “{query}”</span>
                      </Command.Item>
                    </Command.Group>
                  )
                ) : (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm text-secondary">
                      Ask AI is an editor action — your role reads the console without invoking
                      generation.
                    </p>
                  </div>
                )
              ) : null}
            </Command.List>

            <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2 text-[11px] text-secondary">
              <span className="flex items-center gap-1.5">
                <Kbd keys={['↑']} />
                <Kbd keys={['↓']} />
                to navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd keys={['↵']} /> open
                <Kbd keys={['Esc']} /> close
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
