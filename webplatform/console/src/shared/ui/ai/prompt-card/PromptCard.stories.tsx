import type { Meta, StoryObj } from '@storybook/react';
import { PromptCard } from './PromptCard';

const meta: Meta<typeof PromptCard> = {
  title: 'ONYX/AI/PromptCard',
  component: PromptCard,
  args: {
    name: 'daily-digest',
    version: 'v4',
    variablesCount: 3,
    lastEditedLabel: '2 days ago',
    onDiff: () => {},
    onRunInPlayground: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof PromptCard>;

export const Draft: Story = { args: { onPromote: () => {} } };
export const Active: Story = { args: { active: true, onPromote: () => {} } };
export const ViewerNoPromote: Story = {};

/**
 * FS10 (D4 §13 MINOR): a source whose contract carries neither an activation
 * state nor a variables field — `active={null}` renders no badge and an omitted
 * `variablesCount` drops the clause, so nothing is fabricated. This is how the
 * Prompt Library renders the frozen `/prompts` rows.
 */
export const NoActivationNoVariables: Story = {
  render: () => (
    <PromptCard name="System" version="v3" active={null} lastEditedLabel="30 Jul 2026" />
  ),
};
