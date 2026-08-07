import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/shared/providers';
import { ThemeToggle } from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'ONYX/Navigation/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <ThemeProvider initialTheme="dark" initialDensity="comfortable">
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};
