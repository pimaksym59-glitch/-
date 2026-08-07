/**
 * The six D3 §23 sections. Server-safe (no client imports) so both the RSC page
 * and the client view can resolve a section from the URL without duplicating
 * the list — the registry-driven pattern this project uses for routes,
 * shortcuts and statuses.
 */
export const SETTINGS_SECTIONS = [
  'appearance',
  'account',
  'security',
  'notifications',
  'experience',
  'advanced',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEFAULT_SECTION: SettingsSection = 'appearance';

export const SECTION_LABEL: Record<SettingsSection, string> = {
  appearance: 'Appearance',
  account: 'Account',
  security: 'Security',
  notifications: 'Notifications',
  experience: 'Experience',
  advanced: 'Advanced',
};

/** An unknown segment resolves to the default rather than 404-ing a preference
 *  screen — the `parseStatus` discipline applied to a URL segment. */
export function parseSection(value: string | undefined): SettingsSection {
  return SETTINGS_SECTIONS.includes(value as SettingsSection)
    ? (value as SettingsSection)
    : DEFAULT_SECTION;
}
