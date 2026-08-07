import type { Meta, StoryObj } from '@storybook/react';
import { Citation } from './Citation';

const meta: Meta<typeof Citation> = { title: 'ONYX/AI/Citation', component: Citation };
export default meta;
type Story = StoryObj<typeof Citation>;

export const Inline: Story = {
  render: () => (
    <p className="max-w-md text-sm text-primary">
      Hybrid TLS adoption grew 4× this quarter
      <Citation
        index={1}
        sourceTitle="style-guide.pdf"
        snippet="…hybrid TLS deployments quadrupled between Q1 and Q2…"
        onOpen={() => {}}
      />
      according to the ingested research.
    </p>
  ),
};
