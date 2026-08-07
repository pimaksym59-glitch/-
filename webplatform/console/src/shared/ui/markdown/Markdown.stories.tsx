import type { Meta, StoryObj } from '@storybook/react';
import { Markdown } from './Markdown';

const SAMPLE = `# Reading-grade Markdown

Body text at a 72ch measure with **bold**, *italic* and \`inline code\`.

> [!AI] This summary was generated from 3 knowledge sources[^1].

> [!WARNING] Engagement metrics need a stats adapter — cost and quality are available now.

> A plain quote stays a quote.

## Table

| Metric | Value |
| --- | --- |
| Posts | 1,284 |
| Cost | $42.80 |

- [x] Draft generated
- [ ] Review pending

\`\`\`ts
const x: number = 42;
\`\`\`

[^1]: Source — style-guide.pdf
`;

const meta: Meta<typeof Markdown> = { title: 'ONYX/Data/Markdown', component: Markdown };
export default meta;
type Story = StoryObj<typeof Markdown>;

export const ReadingGrade: Story = {
  render: () => <Markdown onCitation={() => {}}>{SAMPLE}</Markdown>,
};
export const SanitizedHtml: Story = {
  render: () => (
    <Markdown>
      {
        'Raw HTML is stripped: <script>alert(1)</script><img src=x onerror=alert(1) /> — only safe content survives.'
      }
    </Markdown>
  ),
};
