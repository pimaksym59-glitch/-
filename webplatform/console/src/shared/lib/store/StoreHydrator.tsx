'use client';

/**
 * Seeds the UI store from server-read cookies exactly once. The DOM already
 * carries the correct `data-sidebar` attribute from SSR, so this only aligns
 * the client store — no flash, no hydration mismatch.
 */
import { useEffect } from 'react';
import type { SidebarState } from '@/shared/config/shell';
import { useUiStore } from './ui-store';

export interface StoreHydratorProps {
  readonly sidebar: SidebarState;
  readonly activeChannelId: string | null;
}

export function StoreHydrator({ sidebar, activeChannelId }: StoreHydratorProps): null {
  const hydrate = useUiStore((s) => s.hydrate);
  useEffect(() => {
    hydrate({ sidebar, activeChannelId });
  }, [hydrate, sidebar, activeChannelId]);
  return null;
}
