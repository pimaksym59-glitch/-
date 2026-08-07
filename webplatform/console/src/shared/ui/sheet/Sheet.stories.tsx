import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '../button';
import { Sheet, type SheetSide } from './Sheet';

function Demo({ side }: { side: SheetSide }): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open {side} sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        side={side}
        title="Inspector"
        description="Entity details"
      >
        <p className="p-2 text-sm text-secondary">Sheet content.</p>
      </Sheet>
    </>
  );
}

const meta: Meta<typeof Sheet> = { title: 'ONYX/Overlays/Sheet', component: Sheet };
export default meta;
type Story = StoryObj<typeof Sheet>;

export const Right: Story = { render: () => <Demo side="right" /> };
export const Bottom: Story = { render: () => <Demo side="bottom" /> };
