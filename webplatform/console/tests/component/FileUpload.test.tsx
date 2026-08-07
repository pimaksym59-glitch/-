import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileUpload } from '@/shared/ui/file-upload';
import { expectNoAxeViolations } from '../setup/axe';

describe('FileUpload (D2 §13.21)', () => {
  it('accepts valid files and rejects wrong type / oversize with reasons', async () => {
    const onFilesSelected = vi.fn();
    const onRejected = vi.fn();
    render(
      <FileUpload
        label="PDF or Markdown · up to 10 bytes"
        accept=".pdf,.md"
        maxSizeBytes={10}
        files={[]}
        onFilesSelected={onFilesSelected}
        onRejected={onRejected}
      />,
    );
    const input = screen.getByLabelText('PDF or Markdown · up to 10 bytes');
    const good = new File(['ok'], 'guide.pdf', { type: 'application/pdf' });
    const wrongType = new File(['x'], 'notes.zip', { type: 'application/zip' });
    const tooBig = new File(['a'.repeat(64)], 'big.md', { type: 'text/markdown' });
    // applyAccept: false — userEvent must not pre-filter; the component's own
    // validation is what is under test.
    await userEvent.upload(input, [good, wrongType, tooBig], { applyAccept: false });
    expect(onFilesSelected).toHaveBeenCalledWith([good]);
    expect(onRejected).toHaveBeenCalledWith([
      { file: wrongType, reason: 'Unsupported file type' },
      { file: tooBig, reason: 'File is too large' },
    ]);
  });

  it('renders per-file states: uploading, error (retry), verified, queued', async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <FileUpload
        label="Files"
        files={[
          { id: '1', name: 'a.pdf', sizeLabel: '1 MB', status: 'verified' },
          { id: '2', name: 'b.md', sizeLabel: '2 KB', status: 'uploading', progress: 40 },
          { id: '3', name: 'c.txt', sizeLabel: '1 KB', status: 'error', error: 'Upload failed' },
          { id: '4', name: 'd.txt', sizeLabel: '1 KB', status: 'queued' },
        ]}
        onFilesSelected={() => {}}
        onRetry={onRetry}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Uploading b.md' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed');
    await userEvent.click(screen.getByRole('button', { name: 'Retry c.txt' }));
    expect(onRetry).toHaveBeenCalledWith('3');
    await expectNoAxeViolations(container);
  });
});
