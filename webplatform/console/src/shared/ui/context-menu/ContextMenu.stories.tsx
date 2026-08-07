import type { Meta, StoryObj } from '@storybook/react';
import { Pencil, Trash2 } from 'lucide-react';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from './ContextMenu';

const meta: Meta<typeof ContextMenu> = {
  title: 'ONYX/Overlays/ContextMenu',
  component: ContextMenu,
};
export default meta;
type Story = StoryObj<typeof ContextMenu>;

export const Default: Story = {
  render: () => (
    <ContextMenu
      label="Row actions"
      content={
        <>
          <ContextMenuItem icon={<Pencil className="size-4" />} onSelect={() => {}}>
            Edit
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem destructive icon={<Trash2 className="size-4" />} onSelect={() => {}}>
            Delete
          </ContextMenuItem>
        </>
      }
    >
      <div className="rounded-lg border border-border-default p-6 text-sm text-secondary">
        Right-click this row
      </div>
    </ContextMenu>
  ),
};
