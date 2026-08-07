import type { Metadata } from 'next';
import { FlagsSeam } from '@/widgets/platform-seams';

export const metadata: Metadata = { title: 'Feature Flags' };

/**
 * Feature Flags (FS12 T-FS12.13 — D3 §20). There is no flag endpoint and no
 * `feature_flags` table among the frozen 25 (plan §5.2 D4). A toggle that wrote
 * nowhere would read as platform state, so none is rendered.
 */
export default function FlagsPage(): React.ReactElement {
  return <FlagsSeam />;
}
