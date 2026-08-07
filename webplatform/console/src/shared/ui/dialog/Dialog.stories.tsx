import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '../button';
import { Input } from '../input/Input';
import { ConfirmDialog, Dialog } from './Dialog';

function FormDemo(): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>New channel</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Create channel"
        description="A channel publishes autonomously once configured."
        width="form"
        primaryAction={<Button onClick={() => setOpen(false)}>Create</Button>}
        secondaryAction={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        }
      >
        <Input label="Channel name" placeholder="e.g. Daily Digest" />
      </Dialog>
    </>
  );
}

function DestructiveDemo(): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete channel
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this channel?"
        description="Scheduled posts stop immediately. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

const meta: Meta<typeof Dialog> = { title: 'ONYX/Overlays/Dialog', component: Dialog };
export default meta;
type Story = StoryObj<typeof Dialog>;

export const FormWidth: Story = { render: () => <FormDemo /> };
export const DestructiveConfirm: Story = { render: () => <DestructiveDemo /> };
