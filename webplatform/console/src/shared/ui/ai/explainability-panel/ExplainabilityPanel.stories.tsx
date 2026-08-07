import type { Meta, StoryObj } from '@storybook/react';
import { ExplainabilityPanel } from './ExplainabilityPanel';

const meta: Meta<typeof ExplainabilityPanel> = {
  title: 'ONYX/AI/ExplainabilityPanel',
  component: ExplainabilityPanel,
  args: {
    why: 'The channel’s last 12 posts skew short-form; this draft matches that cadence.',
    dataUsed: '3 knowledge chunks · channel memory (style, 4 entries) · topic history 30d',
    confidence: 0.82,
    limits: 'Engagement signals are gated — reach is not part of this reasoning.',
  },
};
export default meta;
type Story = StoryObj<typeof ExplainabilityPanel>;

export const Collapsed: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
