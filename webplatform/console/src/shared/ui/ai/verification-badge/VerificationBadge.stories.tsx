import type { Meta, StoryObj } from '@storybook/react';
import { VerificationBadge } from './VerificationBadge';
import { TooltipProvider } from '../../tooltip';

const meta: Meta<typeof VerificationBadge> = {
  title: 'ONYX/AI/VerificationBadge',
  component: VerificationBadge,
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={200}>
        <Story />
      </TooltipProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof VerificationBadge>;

export const Verified: Story = {
  args: { kind: 'verified', checks: ['Validation gates 6/6', 'Safety ok', 'Unique phash'] },
};
export const NeedsReview: Story = {
  args: { kind: 'needs-review', checks: ['At-least-once delivery ambiguity (§R7.4)'] },
};
