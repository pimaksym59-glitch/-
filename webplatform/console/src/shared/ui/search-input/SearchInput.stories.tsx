import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
  title: 'ONYX/Form/SearchInput',
  component: SearchInput,
  args: { label: 'Search', hideLabel: true, placeholder: 'Search…' },
};
export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {};
export const WithPaletteHint: Story = { args: { showPaletteHint: true } };
