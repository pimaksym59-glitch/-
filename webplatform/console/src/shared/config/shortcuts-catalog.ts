/**
 * Shortcut CATALOG — the display side of the keyboard registry (D1 §6.5): the
 * full list plus its scope labels, consumed ONLY by the lazy `⌘/` cheat-sheet.
 *
 * FS8 T-FS8.1 (commons offload): this data used to live beside the HANDLER side
 * in `shortcuts.ts`, which `ShortcutProvider`, `ChatView`, `KnowledgeView` and
 * `MemoryView` import — i.e. it sat in the shell commons and every new row was
 * a byte on `/chat`'s 1.0 kB of headroom. Splitting by concern keeps the
 * registry-driven invariant (the cheat-sheet is still GENERATED from this one
 * source, never hand-maintained) while the array itself now ships only inside
 * the cheat-sheet's own lazy chunk.
 *
 * `keys` are display tokens; the handlers in ShortcutProvider and on the screens
 * match on the same ids. Destructive actions never get a bare shortcut.
 */
import type { ShortcutDef, ShortcutScope } from './shortcuts';

export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: 'palette', keys: ['⌘', 'K'], label: 'Command palette', scope: 'global', active: true },
  { id: 'switcher', keys: ['⌘', '.'], label: 'Channel switcher', scope: 'global', active: true },
  {
    id: 'cheatsheet',
    keys: ['⌘', '/'],
    label: 'Keyboard shortcuts',
    scope: 'global',
    active: true,
  },
  { id: 'sidebar', keys: ['⌘', '\\'], label: 'Toggle sidebar rail', scope: 'global', active: true },
  {
    id: 'theme',
    keys: ['⌘', '⇧', 'L'],
    label: 'Toggle light/dark theme',
    scope: 'global',
    active: true,
  },
  {
    id: 'density',
    keys: ['⌘', '⇧', 'D'],
    label: 'Toggle comfortable/compact',
    scope: 'global',
    active: true,
  },
  { id: 'close', keys: ['Esc'], label: 'Close overlay / inspector', scope: 'global', active: true },

  {
    id: 'go-dashboard',
    keys: ['G', 'D'],
    label: 'Go to Dashboard',
    scope: 'navigation',
    chord: true,
    active: true,
  },
  {
    id: 'go-chat',
    keys: ['G', 'C'],
    label: 'Go to AI Chat',
    scope: 'navigation',
    chord: true,
    active: true,
  },
  {
    id: 'go-knowledge',
    keys: ['G', 'K'],
    label: 'Go to Knowledge',
    scope: 'navigation',
    chord: true,
    active: true,
  },
  {
    id: 'go-memory',
    keys: ['G', 'M'],
    label: 'Go to Memory',
    scope: 'navigation',
    chord: true,
    active: true,
  },
  {
    id: 'go-studio',
    keys: ['G', 'I'],
    label: 'Go to Image Studio',
    scope: 'navigation',
    chord: true,
    active: true,
  },
  {
    id: 'go-prompts',
    keys: ['G', 'P'],
    label: 'Go to Prompt Library',
    scope: 'navigation',
    chord: true,
    active: true,
  },
  {
    id: 'go-analytics',
    keys: ['G', 'A'],
    label: 'Go to Analytics',
    scope: 'navigation',
    chord: true,
    active: true,
  },
  {
    id: 'go-channels',
    keys: ['G', 'B'],
    label: 'Go to Channels',
    scope: 'navigation',
    chord: true,
    active: true,
  },

  // Chat scope — REAL since FS6 (handlers live on the chat screen/composer).
  { id: 'chat-send', keys: ['⌘', '↵'], label: 'Send message', scope: 'chat', active: true },
  { id: 'chat-newline', keys: ['⇧', '↵'], label: 'New line', scope: 'chat', active: true },
  { id: 'chat-stop', keys: ['⌘', '⌫'], label: 'Stop streaming', scope: 'chat', active: true },
  { id: 'chat-new', keys: ['⌘', '⇧', 'O'], label: 'New chat', scope: 'chat', active: true },
  {
    id: 'chat-prev-next',
    keys: ['[', ']'],
    label: 'Previous / next conversation',
    scope: 'chat',
    active: true,
  },
  // Knowledge scope — REAL since FS7 (handlers live on the knowledge screen;
  // `n` is edit-gated at the handler, D3 §7).
  { id: 'knowledge-add', keys: ['N'], label: 'Add source', scope: 'knowledge', active: true },
  {
    id: 'knowledge-search',
    keys: ['/'],
    label: 'Search knowledge',
    scope: 'knowledge',
    active: true,
  },
  // Memory scope — REAL since FS8 (handlers live on the memory screen; `e` is
  // edit-gated at the handler, D3 §8).
  { id: 'memory-search', keys: ['/'], label: 'Search memory', scope: 'memory', active: true },
  {
    id: 'memory-edit',
    keys: ['E'],
    label: 'Edit persona (guarded)',
    scope: 'memory',
    active: true,
  },
  // Studio scope — REAL since FS9 (handlers live on the studio screen; `r` is
  // edit-gated at the handler, D3 §9). `⌘↵ generate` and `a accept` are NOT
  // listed: the contract carries no call behind them (FS9 plan §5.2 D1/D4) and
  // an inert shortcut would be a promise the console cannot keep.
  {
    id: 'studio-search',
    keys: ['/'],
    label: 'Search image records',
    scope: 'studio',
    active: true,
  },
  {
    id: 'studio-regenerate',
    keys: ['R'],
    label: 'Regenerate the open image (guarded)',
    scope: 'studio',
    active: true,
  },
  // Prompt Library scope — REAL since FS10 (handlers live on the prompts
  // screen; `n` is edit-gated at the handler, D3 §10). `⌘↵ run in Playground`
  // is NOT listed: that screen does not exist yet, and a shortcut leading to a
  // stub is a promise the console cannot keep (FS10 plan §5.2 D8). The generic
  // `detail-save`/`detail-edit` rows below stay inactive — ⌘S here is scoped to
  // the version composer, not to every detail screen.
  {
    id: 'prompts-search',
    keys: ['/'],
    label: 'Search prompts',
    scope: 'prompts',
    active: true,
  },
  {
    id: 'prompts-new-version',
    keys: ['N'],
    label: 'New prompt version (guarded)',
    scope: 'prompts',
    active: true,
  },
  {
    id: 'prompts-diff',
    keys: ['D'],
    label: 'Compare the open version with the previous one',
    scope: 'prompts',
    active: true,
  },
  {
    id: 'prompts-save-version',
    keys: ['⌘', 'S'],
    label: 'Save the new version (in the composer)',
    scope: 'prompts',
    active: true,
  },
  // Analytics scope — REAL since FS11 (handlers live on the analytics screen).
  // `E` opens the export affordances that exist (copy link · client-side CSV);
  // there is no server export to promise (FS11 plan §5.2 D9). D3 §12's `/`
  // "ask AI" is NOT re-registered here: `/` already opens the palette's Ask-AI
  // mode globally, and a second binding for the same intent would drift.
  {
    id: 'analytics-range',
    keys: ['R'],
    label: 'Focus the date range',
    scope: 'analytics',
    active: true,
  },
  {
    id: 'analytics-period',
    keys: ['[', ']'],
    label: 'Previous / next period',
    scope: 'analytics',
    active: true,
  },
  // Platform scope — REAL since FS12 (handlers live on the platform screens).
  {
    id: 'platform-filter',
    keys: ['F'],
    label: 'Focus the filter (Jobs)',
    scope: 'platform',
    active: true,
  },
  {
    id: 'platform-recheck',
    keys: ['R'],
    label: 'Re-check readiness (Health)',
    scope: 'platform',
    active: true,
  },
  // Lists — real since FS5 (needs-review queue) / FS6 (history rail).
  { id: 'list-move', keys: ['J', 'K'], label: 'Move between rows', scope: 'lists', active: true },
  { id: 'list-open', keys: ['↵'], label: 'Open row', scope: 'lists', active: true },
  // Owned by later stages — listed so the cheat-sheet is complete and honest.
  { id: 'list-select', keys: ['X'], label: 'Select row', scope: 'lists', active: false },
  { id: 'detail-edit', keys: ['E'], label: 'Edit', scope: 'detail', active: false },
  { id: 'detail-save', keys: ['⌘', 'S'], label: 'Save', scope: 'detail', active: false },
];

export const SHORTCUT_SCOPE_LABEL: Readonly<Record<ShortcutScope, string>> = {
  global: 'Global',
  navigation: 'Navigation',
  chat: 'Chat',
  knowledge: 'Knowledge',
  memory: 'Memory',
  studio: 'Image Studio',
  prompts: 'Prompt Library',
  analytics: 'Analytics',
  platform: 'Platform & Admin',
  lists: 'Lists',
  detail: 'Detail',
};
