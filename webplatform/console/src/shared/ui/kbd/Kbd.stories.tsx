import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from './Kbd';

const meta: Meta<typeof Kbd> = { title: 'ONYX/Containers/Kbd', component: Kbd };
export default meta;
type Story = StoryObj<typeof Kbd>;

export const Palette: Story = { args: { keys: ['⌘', 'K'] } };
export const Chord: Story = { args: { keys: ['g', 'd'] } };
