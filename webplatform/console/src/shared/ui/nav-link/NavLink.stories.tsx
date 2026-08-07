import type { Meta, StoryObj } from '@storybook/react';
import { NavLink } from './NavLink';

/** Renders via the Storybook next/link mock (.storybook/mocks). */
const meta: Meta<typeof NavLink> = { title: 'ONYX/Navigation/NavLink', component: NavLink };
export default meta;
type Story = StoryObj<typeof NavLink>;

export const Default: Story = {
  render: () => (
    <NavLink href="/dashboard" className="text-sm text-primary underline-offset-2 hover:underline">
      Dashboard
    </NavLink>
  ),
};
