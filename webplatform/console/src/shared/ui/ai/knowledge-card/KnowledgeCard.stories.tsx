import type { Meta, StoryObj } from '@storybook/react';
import { KnowledgeCard } from './KnowledgeCard';

const meta: Meta<typeof KnowledgeCard> = {
  title: 'ONYX/AI/KnowledgeCard',
  component: KnowledgeCard,
  args: {
    title: 'Post-quantum migration guide',
    snippet: 'Hybrid TLS deployments quadrupled between Q1 and Q2, driven by procurement rules…',
    highlight: 'hybrid TLS',
    source: 'research.pdf',
    score: 0.91,
    onOpen: () => {},
    onInsert: () => {},
    onExclude: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof KnowledgeCard>;

export const Default: Story = {};
