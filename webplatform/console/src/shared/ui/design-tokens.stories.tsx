import type { Meta, StoryObj } from '@storybook/react';

/**
 * ONYX token showcase (D2). Renders semantic surface/text/status swatches so
 * the visual-regression baseline (Chromatic) captures both themes + density.
 */
const SURFACES = [
  '--background-canvas',
  '--surface-base',
  '--surface-raised',
  '--surface-overlay',
  '--surface-inset',
];
const TEXT = ['--text-primary', '--text-secondary', '--text-tertiary'];
const STATUS = ['success', 'warning', 'danger', 'info'] as const;

function Swatch({ token }: { token: string }): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: `var(${token})`,
          border: '1px solid var(--border-default)',
        }}
      />
      <code style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{token}</code>
    </div>
  );
}

function Tokens(): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gap: 24,
        padding: 24,
        background: 'var(--background-canvas)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <section>
        <h3>Surfaces</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {SURFACES.map((t) => (
            <Swatch key={t} token={t} />
          ))}
        </div>
      </section>
      <section>
        <h3>Text</h3>
        {TEXT.map((t) => (
          <p key={t} style={{ color: `var(${t})` }}>
            The quick brown fox — {t}
          </p>
        ))}
      </section>
      <section>
        <h3>Status</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {STATUS.map((s) => (
            <span
              key={s}
              style={{
                display: 'inline-flex',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 12,
                color: `var(--status-${s}-fg)`,
                background: `var(--status-${s}-bg)`,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Tokens> = {
  title: 'ONYX/Design Tokens',
  component: Tokens,
};
export default meta;

type Story = StoryObj<typeof Tokens>;

export const Semantic: Story = {};
