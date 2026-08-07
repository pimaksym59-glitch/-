'use client';

/**
 * Appearance (D3 §23 — the most-changed section, so it renders first and is the
 * only EAGER panel).
 *
 * This is the one settings surface that was already real before FS13: theme and
 * density have persisted to cookies since FS1 and are applied by the ROOT
 * LAYOUT during SSR, which is what makes the switch flip without a flash. FS13
 * gives that machinery a screen and **does not reimplement it** — it calls the
 * setters `ThemeProvider` already exposes, so `app/layout.tsx` and
 * `shared/config/theme.ts` stay byte-identical and the no-FOUC duty is
 * preserved by construction rather than by care.
 *
 * Accent is a named absence: ONYX defines exactly one accent (D1 §3.2, D2
 * §1.2), and an alternative would be a new primitive→semantic map — a DESIGN
 * change under D4 §12/§13, not an implementation choice. Token values are
 * frozen, so the screen states this instead of offering a picker.
 */
import { useTheme } from '@/shared/providers';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { AbsenceRow, LocalNote, Panel, PanelRow } from './Panel';

const THEME_ITEMS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const DENSITY_ITEMS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

export function AppearancePanel({ advanced }: { readonly advanced: boolean }): React.ReactElement {
  const { theme, density, setTheme, setDensity } = useTheme();

  return (
    <Panel
      title="Appearance"
      lead="Both themes are equal-weight, and density changes spacing rather than layout."
    >
      <PanelRow
        label="Theme"
        description="Applied on the server from a cookie, so a reload paints in the right theme with no flash."
        control={
          <SegmentedControl
            label="Theme"
            items={THEME_ITEMS}
            value={theme}
            onValueChange={(value) => setTheme(value === 'light' ? 'light' : 'dark')}
          />
        }
      />
      <PanelRow
        label="Density"
        description="Comfortable is the default; compact tightens rows for keyboard-heavy work."
        control={
          <SegmentedControl
            label="Density"
            items={DENSITY_ITEMS}
            value={density}
            onValueChange={(value) => setDensity(value === 'compact' ? 'compact' : 'comfortable')}
          />
        }
      />

      <LocalNote>
        Theme and density are stored in cookies in this browser. The platform API carries no
        preferences resource, so they do not follow you to another browser or device.
        {advanced
          ? ' Cookies: onyx-theme, onyx-density. Both are read during server rendering.'
          : ''}
      </LocalNote>

      <AbsenceRow
        title="Accent colour is not selectable"
        fact="ONYX ships one accent, used to signal interactivity and AI presence. There is no second accent to choose."
        remedy="A different accent is a design-system change (a new primitive→semantic token map), not a setting — so this screen offers no picker rather than one that could only ever have a single option."
      />
    </Panel>
  );
}
