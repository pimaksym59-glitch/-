import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { fontVariables } from '@/shared/config/fonts';
import { CHANNEL_COOKIE, SIDEBAR_COOKIE, parseSidebar } from '@/shared/config/shell';
import { DENSITY_COOKIE, THEME_COOKIE, parseDensity, parseTheme } from '@/shared/config/theme';
import { getServerSession } from './_auth/session';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Console', template: '%s · Console' },
  description: 'Premium AI-first control surface for the AI Telegram Automation Platform.',
  robots: { index: false, follow: false },
  applicationName: 'Console',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0b0d' },
    { media: '(prefers-color-scheme: light)', color: '#fafbfc' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.ReactElement> {
  const store = await cookies();
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);
  const density = parseDensity(store.get(DENSITY_COOKIE)?.value);
  const sidebar = parseSidebar(store.get(SIDEBAR_COOKIE)?.value);
  const channelId = store.get(CHANNEL_COOKIE)?.value ?? null;
  // Real session (FS4): resolved server-side via the AuthGateway (/auth/me).
  const session = await getServerSession();

  return (
    <html
      lang="en"
      data-theme={theme}
      data-density={density}
      data-sidebar={sidebar}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Providers
          initialTheme={theme}
          initialDensity={density}
          initialSidebar={sidebar}
          initialChannelId={channelId}
          session={session}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
