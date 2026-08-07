import type { Meta, StoryObj } from '@storybook/react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../button';
import { Menu, MenuItem, MenuSection, MenuSeparator, MenuSub } from './Menu';

const meta: Meta<typeof Menu> = { title: 'ONYX/Overlays/Menu', component: Menu };
export default meta;
type Story = StoryObj<typeof Menu>;

export const Default: Story = {
  render: () => (
    <Menu label="Post actions" trigger={<Button variant="secondary">Actions</Button>}>
      <MenuSection label="Post">
        <MenuItem icon={<Pencil className="size-4" />} shortcut="e" onSelect={() => {}}>
          Edit
        </MenuItem>
        <MenuItem icon={<Copy className="size-4" />} onSelect={() => {}}>
          Duplicate
        </MenuItem>
        <MenuSub label="Move to">
          <MenuItem onSelect={() => {}}>Tech Digest</MenuItem>
          <MenuItem onSelect={() => {}}>Daily Brief</MenuItem>
        </MenuSub>
      </MenuSection>
      <MenuSeparator />
      <MenuItem destructive icon={<Trash2 className="size-4" />} onSelect={() => {}}>
        Delete
      </MenuItem>
    </Menu>
  ),
};
