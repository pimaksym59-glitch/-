'use client';

/**
 * Global overlays (command palette + shortcut cheat-sheet).
 *
 * Both are **interaction-triggered** surfaces, so they are `dynamic()` client
 * imports mounted only after their first open (Stage 2 §9: heavy client modules
 * are lazy). This keeps `cmdk` and the dialog stack out of the initial route
 * bundle — measured, not assumed: it is what brings the FS2 bundle gate back
 * under budget.
 */
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useShortcuts } from '@/shared/providers';

const CommandPalette = dynamic(
  () => import('@/widgets/command-palette').then((m) => m.CommandPalette),
  { ssr: false },
);

const ShortcutCheatsheet = dynamic(
  () => import('@/widgets/shortcut-cheatsheet').then((m) => m.ShortcutCheatsheet),
  { ssr: false },
);

export function GlobalOverlays(): React.ReactElement {
  const { paletteOpen, cheatsheetOpen } = useShortcuts();
  const [paletteMounted, setPaletteMounted] = useState(false);
  const [cheatsheetMounted, setCheatsheetMounted] = useState(false);

  useEffect(() => {
    if (paletteOpen) setPaletteMounted(true);
  }, [paletteOpen]);

  useEffect(() => {
    if (cheatsheetOpen) setCheatsheetMounted(true);
  }, [cheatsheetOpen]);

  return (
    <>
      {paletteMounted ? <CommandPalette /> : null}
      {cheatsheetMounted ? <ShortcutCheatsheet /> : null}
    </>
  );
}
