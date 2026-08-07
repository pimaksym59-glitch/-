'use client';

/**
 * Keyboard cheat-sheet (`⌘/`, D1 §6.5). Rendered **from the shortcut registry**
 * so it can never drift from actual behaviour. Shortcuts owned by later stages
 * are shown but marked — honest, not hidden (§F3.8).
 */
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { SHORTCUTS, SHORTCUT_SCOPE_LABEL } from '@/shared/config/shortcuts-catalog';
import type { ShortcutScope } from '@/shared/config/shortcuts';
import { useShortcuts } from '@/shared/providers';
import { Kbd } from '@/shared/ui/kbd';

const SCOPES: readonly ShortcutScope[] = ['global', 'navigation', 'chat', 'lists', 'detail'];

export function ShortcutCheatsheet(): React.ReactElement {
  const { cheatsheetOpen, setCheatsheetOpen } = useShortcuts();

  return (
    <Dialog.Root open={cheatsheetOpen} onOpenChange={setCheatsheetOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="onyx-scrim fixed inset-0 z-[var(--z-modal)]" />
        <Dialog.Content className="onyx-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] max-h-[80dvh] w-[min(640px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-primary">
                Keyboard shortcuts
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-secondary">
                Console is fully operable without a mouse.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-interactive-subtle hover:text-primary"
            >
              <X aria-hidden className="size-4" />
            </Dialog.Close>
          </div>

          <div className="mt-5 flex flex-col gap-5">
            {SCOPES.map((scope) => {
              const items = SHORTCUTS.filter((s) => s.scope === scope);
              if (items.length === 0) return null;
              return (
                <section key={scope}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                    {SHORTCUT_SCOPE_LABEL[scope]}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                        <span className={s.active ? 'text-primary' : 'text-secondary'}>
                          {s.label}
                          {s.active ? null : (
                            <span className="ml-2 text-[11px] text-secondary">(later stage)</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          {s.chord ? (
                            <>
                              <Kbd keys={[s.keys[0] ?? '']} />
                              <span className="text-[11px] text-secondary">then</span>
                              <Kbd keys={[s.keys[1] ?? '']} />
                            </>
                          ) : (
                            <Kbd keys={s.keys} />
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
