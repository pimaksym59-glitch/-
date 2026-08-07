import type { Meta, StoryObj } from '@storybook/react';
import { CodeBlock } from './CodeBlock';

const TS_SAMPLE = `export interface Channel {
  readonly id: string;
  readonly name: string; // display name
}

export function isActive(channel: Channel): boolean {
  return channel.name.length > 0;
}`;

const DIFF_SAMPLE = ` export function publish(post: Post): Promise<void> {
-  return telegram.send(post);
+  return telegram.sendWithRetry(post, { attempts: 3 });
 }`;

const meta: Meta<typeof CodeBlock> = { title: 'ONYX/Data/CodeBlock', component: CodeBlock };
export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const TypeScript: Story = {
  args: { code: TS_SAMPLE, language: 'typescript', showLineNumbers: true },
};
export const Diff: Story = { args: { code: DIFF_SAMPLE, diff: true, title: 'publish.ts' } };
export const PlainFallback: Story = {
  args: { code: 'plain text — unknown language', language: 'unknown' },
};
