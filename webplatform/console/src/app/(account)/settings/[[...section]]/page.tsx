import type { Metadata } from 'next';
import { SettingsHonesty, SettingsView, parseSection } from '@/widgets/settings';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Settings (FS13 T-FS13.4 — D3 §23). An RSC shell with **no server fetch**:
 * the frozen contract carries no preferences resource, so there is nothing to
 * seed. The section comes from the path, which is what makes every settings
 * view a shareable link that Back reverses.
 */
export default async function SettingsPage({
  params,
}: {
  readonly params: Promise<{ readonly section?: readonly string[] }>;
}): Promise<React.ReactElement> {
  const { section } = await params;
  return (
    <>
      <SettingsView section={parseSection(section?.[0])} />
      <SettingsHonesty />
    </>
  );
}
