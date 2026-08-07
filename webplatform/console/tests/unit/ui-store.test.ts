import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/shared/lib/store';

function reset(): void {
  useUiStore.setState({
    sidebar: 'expanded',
    activeChannelId: null,
    recentCommands: [],
    hydrated: false,
  });
}

describe('UI store (Stage 2 §7 — UI state only)', () => {
  beforeEach(reset);

  it('toggles the sidebar and reflects it on the document', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebar).toBe('rail');
    expect(document.documentElement.dataset['sidebar']).toBe('rail');

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebar).toBe('expanded');
  });

  it('keeps recents unique and bounded, most-recent first', () => {
    const { pushRecent } = useUiStore.getState();
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) pushRecent(id);
    pushRecent('c');

    const recents = useUiStore.getState().recentCommands;
    expect(recents[0]).toBe('c');
    expect(recents.length).toBeLessThanOrEqual(5);
    expect(new Set(recents).size).toBe(recents.length);
  });

  it('hydrates only once', () => {
    useUiStore.getState().hydrate({ sidebar: 'rail', activeChannelId: 'ch-1' });
    useUiStore.getState().hydrate({ sidebar: 'expanded', activeChannelId: 'ch-2' });

    expect(useUiStore.getState().sidebar).toBe('rail');
    expect(useUiStore.getState().activeChannelId).toBe('ch-1');
  });
});
