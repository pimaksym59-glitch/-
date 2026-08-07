import type { Meta, StoryObj } from '@storybook/react';
import { ImageResult } from './ImageResult';

/** Deterministic inline SVG sample — no network, no binary fixture. */
const SAMPLE_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%236E5BFF"/><circle cx="200" cy="200" r="120" fill="%234FD1E0"/></svg>',
)}`;

const meta: Meta<typeof ImageResult> = {
  title: 'ONYX/AI/ImageResult',
  component: ImageResult,
  args: { alt: 'Generated illustration for the quantum post' },
};
export default meta;
type Story = StoryObj<typeof ImageResult>;

export const Ready: Story = {
  args: {
    src: SAMPLE_SRC,
    verified: true,
    safetyOk: true,
    uniquePhash: true,
    regenCount: 1,
    prompt: 'Minimal abstract illustration, iris and cyan, no text.',
    onAccept: () => {},
    onRegenerate: () => {},
    onAttach: () => {},
    onDownload: () => {},
  },
};
export const Generating: Story = { args: { state: 'generating' } };
export const Failed: Story = {
  args: { state: 'failed', errorText: 'Safety check rejected the output.', onRegenerate: () => {} },
};
