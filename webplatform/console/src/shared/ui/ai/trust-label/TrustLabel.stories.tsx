import type { Meta, StoryObj } from '@storybook/react';
import { TrustLabel } from './TrustLabel';

const meta: Meta<typeof TrustLabel> = { title: 'ONYX/AI/TrustLabel', component: TrustLabel };
export default meta;
type Story = StoryObj<typeof TrustLabel>;

export const GeneratedWithSource: Story = { args: { trust: 'generated', sourceAvailable: true } };
export const VerifiedWithSource: Story = { args: { trust: 'verified', sourceAvailable: true } };
export const NeedsReviewNoSource: Story = {
  args: { trust: 'needs-review', sourceAvailable: false },
};
