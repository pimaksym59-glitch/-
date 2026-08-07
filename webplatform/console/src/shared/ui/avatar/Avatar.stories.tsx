import type { Meta, StoryObj } from '@storybook/react';
import { Avatar, AvatarGroup } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'ONYX/Containers/Avatar',
  component: Avatar,
  args: { name: 'Ada Lovelace' },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const Initials: Story = {};
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {([20, 24, 32, 40, 64] as const).map((s) => (
        <Avatar key={s} name="Ada Lovelace" size={s} />
      ))}
    </div>
  ),
};
export const Presence: Story = { args: { presence: 'online', size: 40 } };
export const Group: Story = {
  render: () => (
    <AvatarGroup
      names={[
        'Ada Lovelace',
        'Alan Turing',
        'Grace Hopper',
        'Edsger Dijkstra',
        'Barbara Liskov',
        'Donald Knuth',
      ]}
    />
  ),
};
