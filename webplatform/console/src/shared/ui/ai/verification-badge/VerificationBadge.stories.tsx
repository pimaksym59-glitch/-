import type { Meta, StoryObj } from '@storybook/react';
import { VerificationBadge } from './VerificationBadge';

const meta: Meta<typeof VerificationBadge> = {
  title: 'ONYX/AI/VerificationBadge',
  component: VerificationBadge,
};
export default meta;
type Story = StoryObj<typeof VerificationBadge>;

export const Verified: Story = {
  args: { kind: 'verified', checks: ['Validation gates 6/6', 'Safety ok', 'Unique phash'] },
};
export const NeedsReview: Story = {
  args: { kind: 'needs-review', checks: ['At-least-once delivery ambiguity (§R7.4)'] },
};
