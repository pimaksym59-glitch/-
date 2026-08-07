import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Combobox, type ComboboxItem } from './Combobox';

const ITEMS: readonly ComboboxItem[] = [
  { value: 'tech', label: 'Tech Digest' },
  { value: 'daily', label: 'Daily Brief' },
  { value: 'art', label: 'Art Curator' },
  { value: 'off', label: 'Archived channel', disabled: true },
];

function Demo({ multiple }: { multiple?: boolean }): React.ReactElement {
  const [values, setValues] = useState<readonly string[]>(multiple ? ['tech', 'daily'] : []);
  return (
    <Combobox
      label="Channels"
      items={ITEMS}
      values={values}
      onValuesChange={setValues}
      {...(multiple !== undefined ? { multiple } : {})}
    />
  );
}

const meta: Meta<typeof Combobox> = {
  title: 'ONYX/Form/Combobox',
  component: Combobox,
};
export default meta;
type Story = StoryObj<typeof Combobox>;

export const Single: Story = { render: () => <Demo /> };
export const MultipleWithChips: Story = { render: () => <Demo multiple /> };
export const Loading: Story = {
  render: () => (
    <Combobox label="Channels" items={[]} values={[]} onValuesChange={() => {}} loading />
  ),
};
