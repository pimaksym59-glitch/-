import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { RadioGroup } from '@/shared/ui/radio';
import { SegmentedControl } from '@/shared/ui/segmented-control';
import { Select } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';
import { expectNoAxeViolations } from '../setup/axe';

describe('Input (D2 §13.3)', () => {
  it('associates the label and helper text', () => {
    render(<Input label="Channel name" helper="Shown to subscribers." />);
    const input = screen.getByLabelText('Channel name');
    expect(input).toHaveAccessibleDescription('Shown to subscribers.');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('invalid state wires aria-invalid and the error text', () => {
    render(<Input label="Channel name" error="A channel name is required." />);
    const input = screen.getByLabelText('Channel name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('A channel name is required.');
  });

  it('supports disabled and readonly', () => {
    render(
      <>
        <Input label="A" disabled />
        <Input label="B" readOnly defaultValue="x" />
      </>,
    );
    expect(screen.getByLabelText('A')).toBeDisabled();
    expect(screen.getByLabelText('B')).toHaveAttribute('readonly');
  });

  it('passes axe (with a visible label)', async () => {
    const { container } = render(<Input label="Channel name" helper="Helper" />);
    await expectNoAxeViolations(container);
  });
});

describe('Textarea', () => {
  it('renders invalid state', () => {
    render(<Textarea label="Description" error="Too long." />);
    expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Select (D2 §13.4)', () => {
  const ITEMS = [
    { value: 'opus', label: 'claude-opus-4-8' },
    { value: 'haiku', label: 'claude-haiku-4-5' },
  ];

  it('opens the listbox and selects an option', async () => {
    const onValueChange = vi.fn();
    render(<Select label="Model" items={ITEMS} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByLabelText('Model'));
    await userEvent.click(await screen.findByRole('option', { name: 'claude-haiku-4-5' }));
    expect(onValueChange).toHaveBeenCalledWith('haiku');
  });

  it('shows the async loading row', async () => {
    render(<Select label="Model" items={[]} loading />);
    await userEvent.click(screen.getByLabelText('Model'));
    expect(await screen.findByRole('status')).toHaveTextContent('Loading options…');
  });
});

describe('Checkbox / Switch / RadioGroup / SegmentedControl', () => {
  it('checkbox toggles and supports indeterminate', async () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox label="Publish automatically" onCheckedChange={onCheckedChange} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Publish automatically' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    rerender(<Checkbox label="Publish automatically" checked="indeterminate" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'indeterminate');
  });

  it('switch toggles', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Enable scheduler" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Enable scheduler' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('radio group is labelled and exclusive', async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="Publishing mode"
        items={[
          { value: 'auto', label: 'Autonomous' },
          { value: 'review', label: 'Review first' },
        ]}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Publishing mode' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Review first' }));
    expect(onValueChange).toHaveBeenCalledWith('review');
  });

  it('segmented control uses radiogroup semantics', async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <SegmentedControl
        label="Range"
        items={[
          { value: '7d', label: '7d' },
          { value: '30d', label: '30d' },
        ]}
        value="7d"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: '30d' }));
    expect(onValueChange).toHaveBeenCalledWith('30d');
    await expectNoAxeViolations(container);
  });
});
