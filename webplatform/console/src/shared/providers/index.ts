// Public API — shared/providers (the provider tree + their bound hooks, §7).
export { ThemeProvider, useTheme, useDensity } from './ThemeProvider';
export { QueryProvider } from './QueryProvider';
export { AuthProvider, useAuth, useSession, useCan } from './AuthProvider';
export {
  AccessibilityProvider,
  useAccessibility,
  useAnnouncer,
  type Politeness,
} from './AccessibilityProvider';
export { ShortcutProvider, useShortcuts, useCommandPalette } from './ShortcutProvider';
export {
  NotificationProvider,
  useToast,
  type ToastKind,
  type ToastOptions,
} from './NotificationProvider';
export { StreamingProvider, useStreaming } from './StreamingProvider';
