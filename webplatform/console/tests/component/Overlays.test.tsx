import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog, Dialog } from '@/shared/ui/dialog';
import { Menu, MenuItem } from '@/shared/ui/menu';
import { Popover } from '@/shared/ui/popover';
import { TabPanel, Tabs } from '@/shared/ui/tabs';
import { expectNoAxeViolations } from '../setup/axe';

describe('Dialog (D2 §13.10)', () => {
  it('opens with dialog semantics and closes on esc', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Create channel" description="Configure it.">
        <p>Body</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Create channel' });
    expect(dialog).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('destructive confirm separates the danger action', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete this channel?"
        destructive
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('passes axe', async () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Create channel" description="Configure it." />,
    );
    await expectNoAxeViolations(screen.getByRole('dialog'));
  });
});

describe('Menu (D2 §13.11)', () => {
  it('opens on trigger and fires item onSelect', async () => {
    const onSelect = vi.fn();
    render(
      <Menu label="Post actions" trigger={<Button variant="secondary">Actions</Button>}>
        <MenuItem onSelect={onSelect}>Edit</MenuItem>
        <MenuItem destructive onSelect={() => {}}>
          Delete
        </MenuItem>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Post actions' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe('Popover', () => {
  it('opens rich content on click', async () => {
    render(
      <Popover trigger={<Button variant="secondary">Details</Button>}>
        <p>Retrieval details</p>
      </Popover>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(await screen.findByText('Retrieval details')).toBeInTheDocument();
  });
});

describe('Tabs (D2 §13.6)', () => {
  it('has tablist semantics and switches panels', async () => {
    render(
      <Tabs
        label="Sections"
        defaultValue="a"
        items={[
          { value: 'a', label: 'Posts', count: 3 },
          { value: 'b', label: 'Schedule' },
        ]}
      >
        <TabPanel value="a">Panel A</TabPanel>
        <TabPanel value="b">Panel B</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Schedule/ }));
    expect(await screen.findByText('Panel B')).toBeInTheDocument();
  });
});
