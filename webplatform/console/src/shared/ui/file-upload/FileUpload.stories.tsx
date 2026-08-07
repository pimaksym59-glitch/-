import type { Meta, StoryObj } from '@storybook/react';
import { FileUpload } from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'ONYX/Form/FileUpload',
  component: FileUpload,
  args: {
    label: 'PDF, Markdown or text · up to 10 MB',
    accept: '.pdf,.md,text/plain',
    onFilesSelected: () => {},
    onRetry: () => {},
    onRemove: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Empty: Story = { args: { files: [] } };
export const AllStates: Story = {
  args: {
    files: [
      { id: '1', name: 'style-guide.pdf', sizeLabel: '1.2 MB', status: 'verified' },
      { id: '2', name: 'brand-voice.md', sizeLabel: '18 KB', status: 'uploading', progress: 64 },
      {
        id: '3',
        name: 'archive.zip',
        sizeLabel: '48 MB',
        status: 'error',
        error: 'Unsupported file type',
      },
      { id: '4', name: 'notes.txt', sizeLabel: '4 KB', status: 'queued' },
    ],
  },
};
