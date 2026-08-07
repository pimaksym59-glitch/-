import type { Meta, StoryObj } from '@storybook/react';
import { ErrorState } from './ErrorState';

const meta: Meta<typeof ErrorState> = {
  title: 'ONYX/Status/ErrorState',
  component: ErrorState,
  args: { title: 'Couldn’t load channel analytics', onRetry: () => {} },
};
export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Inline: Story = { args: { scope: 'inline', title: 'Couldn’t save' } };
export const Section: Story = {
  args: { scope: 'section', detail: 'The analytics service timed out after 10s.' },
};
export const Page: Story = {
  args: {
    scope: 'page',
    detail: 'The analytics service is unreachable.',
    correlationId: '018f6b2e-4c2a-7f3e',
  },
};
