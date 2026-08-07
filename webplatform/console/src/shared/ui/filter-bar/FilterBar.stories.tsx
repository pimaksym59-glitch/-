import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from '../search-input/SearchInput';
import { FilterBar, FilterChip } from './FilterBar';

const meta: Meta<typeof FilterBar> = {
  title: 'ONYX/Form/FilterBar',
  component: FilterBar,
};
export default meta;
type Story = StoryObj<typeof FilterBar>;

export const WithChips: Story = {
  render: () => (
    <FilterBar
      search={<SearchInput label="Search jobs" hideLabel placeholder="Search jobs…" />}
      onClearAll={() => {}}
    >
      <FilterChip label="Status: Failed" onRemove={() => {}} />
      <FilterChip label="Channel: Tech Digest" onRemove={() => {}} />
    </FilterBar>
  ),
};
