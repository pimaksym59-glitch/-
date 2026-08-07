import type { Metadata } from 'next';
import { LogsSeam } from '@/widgets/platform-seams';

export const metadata: Metadata = { title: 'Logs' };

/**
 * Logs (FS12 T-FS12.13 — D3 §18). The frozen contract carries **no endpoint
 * that returns log entries** (plan §5.2 D3), so this route renders a specific
 * honest absence instead of a simulated stream. It is a Server Component with
 * no query and no state: the screen costs its route nothing beyond the shell.
 */
export default function LogsPage(): React.ReactElement {
  return <LogsSeam />;
}
